/* Family Fun 2.4.0 — GTA-style third-person camera (THE ONLY camera
   controller for TPV; game-core.js calls this instead of its old inline
   camera code, so exactly one system moves the camera per frame).

   What was wrong in 2.3.0 (from the user's 2.3.0 phone screenshots):
   - camera.position.lerp(target, 0.08) every frame: a FIXED fraction, so
     the smoothing speed depended on the frame rate (fast phone = twitchy,
     slow phone = laggy) and the camera never converged the same way twice.
   - lookAt() was instant while position lerped, so rotation jumped while
     the position glided — the visible "shake".
   - cameraDistance() stepped the distance in 0.5-unit jumps (a pop every
     time a threshold was crossed) and only checked BUILDING footprints:
     a van/truck between the player and the camera was never a blocker,
     so the camera ended up INSIDE the van (screenshot 2).
   - Camera height shrank in proportion to the shrunk distance, so a
     pulled-in camera dived toward the ground.

   2.4.0 fixes, all in this file:
   - Frame-rate-independent exponential damping everywhere:
     k = 1 - exp(-rate * dt). Yaw rate 5/s, position 6/s, look 8/s, FOV 4/s.
   - The camera sits BEHIND the character (over the shoulder, slightly
     above), following the smoothed drag yaw. Because movement itself is
     camera-relative (joystick-up = away from the camera), the camera is
     by construction behind the direction of travel — the GTA feel.
   - CONTINUOUS collision: a ray from the player's head to the desired
     camera position is tested against every building AABB (expanded by
     0.45) AND every vehicle (sphere from its fitted length/width), and
     the distance is shortened to the FIRST hit minus a 0.35 margin —
     no steps, no pops. Minimum distance 1.2, and the height keeps a
     floor so a pulled-in camera stays above the player's head.
   - Driving mode: farther (8.6), higher (3.9), wider FOV (74), same
     collision + smoothing rules. POV mode is untouched (game-core). */
(function(){
'use strict';
// 2.5.0 CAMERA MODES + closer default. The 2.4.0 default (dist 6.0, FOV 68)
// made a 1.8-unit player only ~21% of screen height, and the user read
// that as 'too small'. Follow (default) is now dist 4.8 / height 2.7 /
// FOV 64: slant = sqrt(4.8^2 + (2.7-1.45)^2) = 4.97, screen fraction =
// 1.8 / (2 * 4.97 * tan(32 deg)) = 1.8 / 6.21 = 29% — the GTA target
// band (25-30%). Shoulder is closer/sideways, Wide is for city/driving.
var MODES = {
  follow:   {foot: [4.8, 2.7, 64, 0.55], drive: [8.6, 3.9, 74, 0.4]},
  shoulder: {foot: [3.4, 2.3, 62, 1.05], drive: [6.5, 3.2, 70, 0.8]},
  wide:     {foot: [7.5, 3.8, 70, 0.30], drive: [11.0, 4.8, 76, 0.3]}
};
var MODE_ORDER = ['follow', 'shoulder', 'wide'];
var MODE_LABEL = {follow: 'دنبال‌کننده', shoulder: 'شانه‌ای', wide: 'باز'};
var camMode25 = 'follow';
try{ var saved = localStorage.getItem('ff-camera-mode'); if (MODES[saved]) camMode25 = saved; }catch(e){}
var FOOT_DIST = 4.8, FOOT_H = 2.7, FOOT_FOV = 64;
var DRIVE_DIST = 8.6, DRIVE_H = 3.9, DRIVE_FOV = 74;
var MIN_DIST = 1.2, MARGIN = 0.35, BLOCK_R = 0.45;
var st = {
  init: false, yaw: 0,
  pos: null, look: null, fov: FOOT_FOV,
  prevPos: null, velX: 0, velZ: 0, carCache: [], carCacheTick: 0
};
function damp(rate, dt){ return 1 - Math.exp(-rate * dt); }
function shortArc(a){
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
// Ray (head -> desired) vs one building AABB. Returns the segment
// fraction t of the first entry, or null. Box: [x, z, hx, hz, height].
function rayBox(hx, hy, hz, dx, dy, dz, c){
  var tmin = 0, tmax = 1;
  // Per axis: [origin, dir, min, max] in x, y, z order.
  var data = [
    [hx, dx, c[0] - c[2] - BLOCK_R, c[0] + c[2] + BLOCK_R],
    [hy, dy, 0, c[4] + 0.5],
    [hz, dz, c[1] - c[3] - BLOCK_R, c[1] + c[3] + BLOCK_R]
  ];
  for (var i = 0; i < 3; i++){
    var o = data[i][0], d = data[i][1], mn = data[i][2], mx = data[i][3];
    if (Math.abs(d) < 1e-9){
      if (o < mn || o > mx) return null;
    } else {
      var t1 = (mn - o) / d, t2 = (mx - o) / d;
      if (t1 > t2){ var tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  if (tmax < 0 || tmin > 1) return null;
  return tmin < 0 ? 0 : tmin;
}
// Ray vs sphere. Returns smallest t in [0,1], or null.
function raySphere(hx, hy, hz, dx, dy, dz, cx, cy, cz, r){
  var ox = hx - cx, oy = hy - cy, oz = hz - cz;
  var b = ox * dx + oy * dy + oz * dz;
  var cc = ox * ox + oy * oy + oz * oz - r * r;
  var disc = b * b - cc;
  if (disc < 0) return null;
  var t = -b - Math.sqrt(disc);
  if (t < 0) t = -b + Math.sqrt(disc);
  if (t < 0 || t > 1) return null;
  return t;
}
function collectCars(){
  // Rebuilt at most once per 60 frames: modelled cars (GTA + traffic)
  // carry their fitted radius; unmodelled GTA cars get a 1.8 estimate.
  var list = [], seen = {};
  try{
    var mc = (window.FFModels && window.FFModels.cars) || [];
    mc.forEach(function(rec){
      var g = rec.group; if (!g || seen[g]) return; seen[g] = true;
      list.push({g: g, r: rec.radius || 1.8});
    });
    (window.__familyCars || []).forEach(function(g){
      if (!g || seen[g]) return; seen[g] = true;
      list.push({g: g, r: (g.userData && g.userData.ff24Radius) || 1.8});
    });
    if (window.scene){
      window.scene.traverse(function(o){
        if (o && o.userData && o.userData.gtaCar && !seen[o]){
          seen[o] = true;
          list.push({g: o, r: (o.userData && o.userData.ff24Radius) || 1.8});
        }
      });
    }
  }catch(e){}
  return list;
}
function collideDistance(head, desired, dist){
  // Returns the largest distance <= dist that keeps the camera out of
  // buildings AND vehicles. Continuous (no 0.5 steps).
  var dx = desired.x - head.x, dy = desired.y - head.y, dz = desired.z - head.z;
  var tHit = 1;
  try{
    var cols = (window.FFLogic && window.FFLogic.colliders) || [];
    for (var i = 0; i < cols.length; i++){
      var t = rayBox(head.x, head.y, head.z, dx, dy, dz, cols[i]);
      if (t !== null && t < tHit) tHit = t;
    }
    var cars = st.carCache;
    for (var j = 0; j < cars.length; j++){
      var g = cars[j].g; if (!g) continue;
      var p = g.position;
      // Skip the car the player is driving: FFGTA.driving IS the car
      // object (its group is .group), and its centre is the camera
      // anchor — testing against it would pull the camera into the car.
      if (window.FFGTA && window.FFGTA.driving && window.FFGTA.driving.group === g) continue;
      var tc = raySphere(head.x, head.y, head.z, dx, dy, dz,
        p.x, p.y + 1.0, p.z, cars[j].r);
      if (tc !== null && tc < tHit) tHit = tc;
    }
  }catch(e){}
  if (tHit >= 1) return dist;
  // tHit is a fraction of the segment; pull in front of the hit.
  var allowed = dist * tHit - MARGIN;
  return Math.max(MIN_DIST, allowed);
}
function camModeButton(){
  try{
    var sys = document.getElementById('ff-drawer-sys');
    if (!sys || document.getElementById('ff-cam-mode-btn')) return;
    var b = document.createElement('button');
    b.id = 'ff-cam-mode-btn'; b.className = 'acircle'; b.textContent = '🎥';
    b.title = 'دوربین: ' + MODE_LABEL[camMode25] + ' (بزن تا عوض شود)';
    b.onclick = function(){
      var i = MODE_ORDER.indexOf(camMode25); camMode25 = MODE_ORDER[(i + 1) % MODE_ORDER.length];
      try{ localStorage.setItem('ff-camera-mode', camMode25); }catch(e){}
      b.title = 'دوربین: ' + MODE_LABEL[camMode25] + ' (بزن تا عوض شود)';
      try{ if (typeof showToast === 'function') showToast('🎥 دوربین: ' + MODE_LABEL[camMode25]); }catch(e){}
    };
    sys.appendChild(b);
  }catch(e){}
}
window.FFCamera24 = {
  snap: function(){ st.init = false; },
  setMode: function(m){ if (MODES[m]){ camMode25 = m; try{ localStorage.setItem('ff-camera-mode', m); }catch(e){} } },
  getMode: function(){ return camMode25; },
  cycleMode: function(){ var i = MODE_ORDER.indexOf(camMode25); camMode25 = MODE_ORDER[(i + 1) % MODE_ORDER.length]; try{ localStorage.setItem('ff-camera-mode', camMode25); }catch(e){} return camMode25; },
  update: function(dt, o){
    var camera = window.camera; if (!camera || !o || !o.pos) return;
    camModeButton();
    dt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);
    var driving = !!o.driving;
    var mp = MODES[camMode25] || MODES.follow;
    var cfg = driving ? mp.drive : mp.foot;
    var dist = cfg[0], height = cfg[1], fovT = cfg[2], side = cfg[3];
    var px = o.pos.x, py = o.pos.y || 0, pz = o.pos.z;
    // Smoothed yaw follows the drag yaw (game-core camYaw) on foot.
    // While driving, the GTA follow-cam instead swings behind the CAR:
    // the car's forward is +Z rotated by its heading, which is exactly
    // the direction the camera formula below treats as "facing", so the
    // target yaw is the car's heading (drag is overridden smoothly).
    var targetYaw = o.yaw || 0;
    if (driving && window.FFGTA && window.FFGTA.driving &&
        typeof window.FFGTA.driving.heading === 'number'){
      targetYaw = window.FFGTA.driving.heading;
    }
    if (!st.init) st.yaw = targetYaw;
    else st.yaw += shortArc(targetYaw - st.yaw) * damp(5, dt);
    var sy = Math.sin(st.yaw), cy = Math.cos(st.yaw);
    // Velocity (for look-ahead) from the player's own movement.
    if (st.prevPos){
      var vx = (px - st.prevPos.x) / dt, vz = (pz - st.prevPos.z) / dt;
      var k = damp(6, dt);
      st.velX += (vx - st.velX) * k; st.velZ += (vz - st.velZ) * k;
    }
    st.prevPos = {x: px, z: pz};
    var speed = Math.sqrt(st.velX * st.velX + st.velZ * st.velZ);
    var la = speed > 0.1 ? Math.min(speed * 0.12, 1.0) : 0;
    var lax = speed > 0.1 ? (st.velX / speed) * la : 0;
    var laz = speed > 0.1 ? (st.velZ / speed) * la : 0;
    // Head anchor + desired position, then collision-shortened distance.
    var head = {x: px, y: py + (driving ? 1.6 : 1.65), z: pz}; // 2.5.0: head of a 1.8-unit player
    if (st.carCacheTick++ % 60 === 0) st.carCache = collectCars();
    // Over-shoulder side offset: screen-right for this yaw is
    // F x up = (-cos, sin), so +side moves the camera to screen-right.
    var desired = {
      x: px - sy * dist + (-cy) * side,
      y: py + height,
      z: pz - cy * dist + sy * side
    };
    var okDist = collideDistance(head, desired, dist);
    // Height keeps a floor: a pulled-in camera must stay above the head,
    // never dive to the ground the way the old proportional formula did.
    var frac = okDist / dist;
    var hy = py + Math.max(height * (0.55 + 0.45 * frac), 1.9);
    desired = {x: px - sy * okDist + (-cy) * side * frac, y: hy, z: pz - cy * okDist + sy * side * frac};
    var lookT = {
      x: px + lax,
      y: py + (driving ? 1.4 : 1.45),
      z: pz + laz
    };
    if (!st.init){
      camera.position.set(desired.x, desired.y, desired.z);
      camera.lookAt(lookT.x, lookT.y, lookT.z);
      st.pos = {x: desired.x, y: desired.y, z: desired.z};
      st.look = {x: lookT.x, y: lookT.y, z: lookT.z};
      st.fov = fovT; camera.fov = fovT; camera.updateProjectionMatrix();
      st.init = true;
      return;
    }
    var kp = damp(6, dt), kl = damp(8, dt);
    camera.position.x += (desired.x - camera.position.x) * kp;
    camera.position.y += (desired.y - camera.position.y) * kp;
    camera.position.z += (desired.z - camera.position.z) * kp;
    st.look.x += (lookT.x - st.look.x) * kl;
    st.look.y += (lookT.y - st.look.y) * kl;
    st.look.z += (lookT.z - st.look.z) * kl;
    camera.lookAt(st.look.x, st.look.y, st.look.z);
    if (Math.abs(camera.fov - fovT) > 0.05){
      camera.fov += (fovT - camera.fov) * damp(4, dt);
      camera.updateProjectionMatrix();
    }
  }
};
})();
