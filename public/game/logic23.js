/* Family Fun 2.3.0 — game-feel logic: real colliders, sliding, camera
   collision, look-ahead. This file only PROVIDES helpers; game-core.js
   calls them (patched in 2.3.0). Colliders are building footprints
   (core city + GTA blocks + police station). The player house interior is
   deliberately NOT a collider (the player starts inside it). */
(function(){
'use strict';
// [x, z, halfX, halfZ, height] — footprints from buildCity + GTA blocks.
var COLLIDERS = [
  [18,5,3,3.5,6],[12,-15,4,4,5],[5,15,4.5,4,5],[-18,8,4,3.5,4],
  [28,12,5,4,4],[-10,-20,3,3,4],[8,-25,3.5,3.5,5],[20,-20,4,3.5,5],
  [-15,-5,3.5,3.5,6],[3,20,2.5,2.5,4],[25,25,6,5,6],[-20,15,3.5,3,4],
  [22,-10,3,3,4],[-8,25,3,3,4],
  [38,-38,5,4,5],[-50,-50,4,4.5,9],[50,-50,5,3.5,7],[-50,50,4.5,4,8],
  [50,50,5.5,5,10],[-58,-10,3.5,3,6],[58,10,3.5,3,6]
];
function inside(x, z, r, c){
  return Math.abs(x - c[0]) < c[2] + r && Math.abs(z - c[1]) < c[3] + r;
}
function collide(x, z, r){
  // Sliding collision: try full move, then X-only, then Z-only.
  // Returns {x, z, hit} — never lets a circle pass through a building.
  var radius = r === undefined ? 0.55 : r;
  var hit = false;
  for (var i = 0; i < COLLIDERS.length; i++){
    if (inside(x, z, radius, COLLIDERS[i])){ hit = true; break; }
  }
  if (!hit) return {x: x, z: z, hit: false};
  return {x: x, z: z, hit: true, blocked: true};
}
function resolveMove(px, pz, nx, nz, r){
  var radius = r === undefined ? 0.55 : r;
  var full = collide(nx, nz, radius);
  if (!full.hit) return {x: nx, z: nz, hit: false};
  var xOnly = collide(nx, pz, radius);
  if (!xOnly.hit) return {x: nx, z: pz, hit: true};
  var zOnly = collide(px, nz, radius);
  if (!zOnly.hit) return {x: px, z: nz, hit: true};
  return {x: px, z: pz, hit: true};
}
function cameraFree(cx, cy, cz){
  // A camera point is free if it is outside every building footprint,
  // or above that building's roof.
  for (var i = 0; i < COLLIDERS.length; i++){
    var c = COLLIDERS[i];
    if (Math.abs(cx - c[0]) < c[2] && Math.abs(cz - c[1]) < c[3] && cy < c[4] + 1) return false;
  }
  return true;
}
function cameraDistance(px, py, pz, yaw, dist, height){
  // 2.4.0 DEPRECATED: kept only as the game-core fallback. The real
  // camera (camera24.js) uses continuous raycast collision vs buildings
  // AND vehicles instead of these 0.5-unit steps (which popped) and
  // building-only checks (which let the camera inside a van).
  for (var d = dist; d >= 1.6; d -= 0.5){
    var cx = px - Math.sin(yaw) * d;
    var cy = py + height * (d / dist);
    var cz = pz - Math.cos(yaw) * d;
    if (cameraFree(cx, cy, cz)) return d;
  }
  return 1.6;
}
window.FFLogic = {
  colliders: COLLIDERS, collide: collide, resolveMove: resolveMove,
  cameraFree: cameraFree, cameraDistance: cameraDistance
};
})();
