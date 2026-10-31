/* Family Fun 2.0.1 — GTA Stage 2: city life + graphics.
   Weather, street props, night glow, 3 enterable interiors, customisation
   helpers (house lights). No lethal content: interiors are a cafe, a garage
   workshop and a police station with desks and an empty evidence room. */
(function(){
'use strict';
var built = false;
var WEATHERS = [
  {id: 'clear', label: 'صاف', grip: 1, rain: false, fog: false},
  {id: 'sunset', label: 'غروب', grip: 1, rain: false, fog: false},
  {id: 'rain', label: 'بارانی', grip: 0.7, rain: true, fog: false},
  {id: 'fog', label: 'مه‌آلود', grip: 0.85, rain: false, fog: true}
];
var weather = WEATHERS[0], weatherTimer = 0;
var houseLamps = [];
function toast(m){ if (typeof showToast === 'function') showToast(m); }
function mat(color, opts){
  opts = opts || {};
  if (window.FFTextures) return window.FFTextures.material(color, opts.tex, opts);
  return new THREE.MeshStandardMaterial({color: color, roughness: opts.roughness !== undefined ? opts.roughness : 0.7});
}
function boxMesh(w, h, d, material, x, y, z, parent){
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || window.scene).add(m); return m;
}
function signPlane(title, icon, color, x, y, z, ry){
  if (!window.FFTextures) return null;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({map: window.FFTextures.sign(title, icon, color), transparent: true}));
  m.position.set(x, y, z); if (ry !== undefined) m.rotation.y = ry; window.scene.add(m); return m;
}
function room(cx, cz, w, d, wallColor, label, icon){
  var g = new THREE.Group(); g.position.set(cx, 0, cz); window.scene.add(g);
  var wm = mat(wallColor, {tex: 'wall', roughness: 0.85});
  var fm = mat(0xd4a96a, {tex: 'wood', roughness: 0.6});
  boxMesh(w, 0.2, d, fm, 0, 0.1, 0, g);
  boxMesh(w, 3, 0.3, wm, 0, 1.5, -d / 2, g);
  boxMesh(0.3, 3, d, wm, -w / 2, 1.5, 0, g);
  boxMesh(0.3, 3, d, wm, w / 2, 1.5, 0, g);
  boxMesh(w / 2 - 1, 3, 0.3, wm, -w / 4 - 0.5, 1.5, d / 2, g);
  boxMesh(w / 2 - 1, 3, 0.3, wm, w / 4 + 0.5, 1.5, d / 2, g);
  return g;
}
function build(){
  if (built || !window.scene || !window.isGameRunning) return;
  built = true;
  try {
    // Street props: benches, bins, billboards (Persian text)
    for (var i = 0; i < 8; i++) {
      var bx = -50 + i * 14, bz = (i % 2 === 0) ? 34 : -34;
      var bench = new THREE.Group(); bench.position.set(bx, 0, bz); window.scene.add(bench);
      boxMesh(1.8, 0.1, 0.5, mat(0x8a5a32, {tex: 'wood'}), 0, 0.5, 0, bench);
      boxMesh(0.12, 0.5, 0.45, mat(0x333333, {}), -0.7, 0.25, 0, bench);
      boxMesh(0.12, 0.5, 0.45, mat(0x333333, {}), 0.7, 0.25, 0, bench);
      var bin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.7, 10), mat(0x3a4a5a, {metalness: 0.4}));
      bin.position.set(bx + 2, 0.35, bz); bin.castShadow = true; window.scene.add(bin);
    }
    signPlane('شهر خانواده', '🏘️', '#f59e0b', 0, 5, -52);
    signPlane('کافه خانواده', '☕', '#b45309', 3, 4.5, 26, Math.PI);
    signPlane('گاراژ علی', '🔧', '#37474f', -18, 4.5, 14, Math.PI);
    // Extra lamps along the ring roads (emissive only, no extra real lights)
    for (var j = 0; j < 10; j++) {
      var lx = -55 + j * 12, lz = (j % 2 === 0) ? 58 : -58;
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 8), mat(0x25313d, {metalness: 0.5}));
      pole.position.set(lx, 1.7, lz); pole.castShadow = true; window.scene.add(pole);
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({color: 0xffd27d, emissive: 0xffa62b, emissiveIntensity: 1.2}));
      bulb.position.set(lx, 3.5, lz); window.scene.add(bulb);
      if (!window.FFEmissiveWindows) window.FFEmissiveWindows = [];
      window.FFEmissiveWindows.push(bulb.material);
    }
    // House garden lights (toggled from the GTA panel)
    [[-3, 12], [3, 12]].forEach(function(p){
      var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({color: 0xffd27d, emissive: 0xffa62b, emissiveIntensity: 0.1}));
      lamp.position.set(p[0], 0.6, p[1]); window.scene.add(lamp); houseLamps.push(lamp);
    });
    window.FFGTAHouse = function(on){
      houseLamps.forEach(function(l){ l.material.emissiveIntensity = on ? 2 : 0.1; });
    };
    if (window.FFGTA && window.FFGTA.state.gardenLights) window.FFGTAHouse(true);
    // Interiors (open-top so the third-person camera can see inside)
    var cafe = room(60, -60, 12, 9, 0xe8dcc8, 'کافه', '☕');
    boxMesh(4, 1, 1, mat(0x8a5a32, {tex: 'wood'}), -2, 0.55, -3, cafe);
    boxMesh(1.2, 0.8, 1.2, mat(0xf5e6d0, {}), 2, 0.45, -2, cafe);
    boxMesh(1.2, 0.8, 1.2, mat(0xf5e6d0, {}), 2, 0.45, 1, cafe);
    boxMesh(1.2, 0.8, 1.2, mat(0xd94b4b, {}), -2, 0.45, 2, cafe);
    var garage = room(60, 60, 13, 10, 0xcfd8dc, 'گاراژ', '🔧');
    boxMesh(3, 0.4, 5, mat(0x37474f, {metalness: 0.4}), 0, 0.5, 0, garage);
    boxMesh(2, 1.2, 0.8, mat(0x607d8b, {}), -4, 0.7, -3, garage);
    boxMesh(2, 1.2, 0.8, mat(0x607d8b, {}), 4, 0.7, 3, garage);
    var police = room(-60, 60, 12, 9, 0xdde3ea, 'پلیس', '🚔');
    boxMesh(2.5, 0.8, 1, mat(0x1e3a5f, {}), -3, 0.45, -2, police);
    boxMesh(2.5, 0.8, 1, mat(0x1e3a5f, {}), 3, 0.45, -2, police);
    boxMesh(0.15, 2.2, 3, mat(0x90a4ae, {metalness: 0.6}), 0, 1.1, 2, police);
    // Interior markers (glowing rings) + exit markers handled by story module's tryInterior
    window.FFGTAInteriors = [
      {id: 'cafe', label: 'کافه', door: {x: 3, z: 20}, room: {x: 60, z: -60}},
      {id: 'garage', label: 'گاراژ', door: {x: -18, z: 8}, room: {x: 60, z: 60}},
      {id: 'police', label: 'اداره پلیس', door: {x: 38, z: -38}, room: {x: -60, z: 60}}
    ];
    window.FFGTAInteriors.forEach(function(it){
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 6, 24), new THREE.MeshBasicMaterial({color: 0x71e5c0, transparent: true, opacity: 0.9}));
      ring.rotation.x = Math.PI / 2; ring.position.set(it.room.x, 0.15, it.room.z); window.scene.add(ring);
    });
    toast('🌆 فضای داخلی کافه، گاراژ و اداره پلیس آماده است — با E نزدیک درشان وارد شو');
  } catch (e) { console.warn('GTA city build', e); }
}
function update(dt, t){
  if (!built) { build(); return; }
  if (!window.isGameRunning || !window.scene) return;
  weatherTimer += dt;
  if (weatherTimer > 180) {
    weatherTimer = 0;
    weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
    window.FFGTAWeather = weather;
    if (window.FFParticles) window.FFParticles.setRain(weather.rain);
    toast('🌦️ هوا عوض شد: ' + weather.label + (weather.rain ? ' — جاده لغزنده است' : weather.fog ? ' — دید کم است، آرام‌تر بران' : ''));
  }
  // Apply after FFGraphics (GTA update runs after graphics in the core loop)
  if (weather.fog && window.scene.fog) window.scene.fog.density = Math.min(0.03, window.scene.fog.density + 0.008);
  if (weather.id === 'sunset' && window.scene.background && window.scene.background.setHSL) {
    window.scene.background.setHSL(0.07, 0.7, 0.45);
  }
}
window.FFGTAWeather = weather;
window.FFGTACityUpdate = update;
setInterval(function(){ if (!built) build(); }, 800);
})();
