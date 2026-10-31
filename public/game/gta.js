/* Family Fun 2.0.1 — GTA Stage 1: open-world systems.
   Family-friendly by design: NO killing, NO weapons, NO graphic violence.
   GTA-like here means: open city, driving, police + wanted stars, traffic,
   pedestrians, missions — never gore. A "hit" pedestrian simply steps aside
   and the driver gets a wanted star for reckless driving. */
(function(){
'use strict';
var SAVE_KEY = 'ff-gta-v2';
var PALETTE = [0xd94b4b, 0x3e8ed0, 0xf0b429, 0x2fae7a, 0x8b5cf6, 0xe8e8e8, 0x222831, 0xff7a3c];
var DISTRICTS = [
  {name:'مرکز شهر', x0:-30, z0:-30, x1:30, z1:30},
  {name:'شمال شهر', x0:-72, z0:-72, x1:72, z1:-30},
  {name:'جنوب شهر', x0:-72, z0:30, x1:72, z1:72},
  {name:'محله قدیمی', x0:-72, z0:-30, x1:-30, z1:30},
  {name:'بندر شرقی', x0:30, z0:-30, x1:72, z1:30}
];
var state = {
  wanted: 0, heat: 0, rep: {}, achievements: [], owned: [],
  shirt: 0x2563d8, pants: 0x202942, hair: 0x24150f, carPaint: null,
  gardenLights: false, planters: false,
  story: {mission: 0, step: 0, done: []},
  sportsUnlocked: false
};
try {
  var raw = localStorage.getItem(SAVE_KEY);
  if (raw) { var d = JSON.parse(raw); for (var k in d) state[k] = d[k]; }
} catch (e) {}
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){} }
function toast(m){ if (typeof showToast === 'function') showToast(m); }
function econ(){ return window.FFEconomy || null; }
function playerPos(){ return window.playerGroup ? window.playerGroup.position : null; }
function districtAt(x, z){
  for (var i = 0; i < DISTRICTS.length; i++) {
    var d = DISTRICTS[i];
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.name;
  }
  return 'مرکز شهر';
}
function repLevel(name){
  var r = state.rep[name] || 0;
  if (r >= 60) return 'رئیس محله'; if (r >= 30) return 'محبوب';
  if (r >= 12) return 'آشنا'; return 'تازه‌کار';
}
function unlock(id, label){
  if (state.achievements.indexOf(id) >= 0) return;
  state.achievements.push(id); save();
  toast('🏆 دستاورد: ' + label);
}

var built = false, cars = [], peds = [], policeCars = [], lights = [];
var driving = null, driveSpeed = 0, driveHeading = 0, offenceCooldown = 0;
var wantedTimer = 0, decayTimer = 0, bustedTimer = 0, panelTimer = 0, smokeTimer = 0;
var interior = null, returnPos = null;
var panel = null, smoke = null;

function mat(color, opts){
  opts = opts || {};
  if (window.FFTextures) return window.FFTextures.material(color, opts.tex, opts);
  return new THREE.MeshStandardMaterial({color: color, roughness: opts.roughness !== undefined ? opts.roughness : 0.7, metalness: opts.metalness || 0});
}
function boxMesh(w, h, d, material, x, y, z, parent){
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || window.scene).add(m); return m;
}
function makeCarMesh(color, isPolice){
  var g = new THREE.Group();
  var bodyMat = mat(color, {roughness: 0.3, metalness: 0.4});
  var dark = mat(0x172333, {roughness: 0.15, metalness: 0.3});
  var glass = mat(0x9edbff, {roughness: 0.1, metalness: 0.2});
  boxMesh(2.3, 0.55, 4.1, bodyMat, 0, 0.58, 0, g);
  boxMesh(1.8, 0.5, 1.9, isPolice ? mat(0xf2f2f2, {}) : dark, 0, 1.05, -0.2, g);
  boxMesh(1.7, 0.35, 1.7, glass, 0, 1.12, -0.2, g);
  if (isPolice) {
    var r = boxMesh(0.5, 0.18, 0.5, new THREE.MeshStandardMaterial({color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2}), -0.45, 1.38, -0.2, g);
    var b = boxMesh(0.5, 0.18, 0.5, new THREE.MeshStandardMaterial({color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 2}), 0.45, 1.38, -0.2, g);
    g.userData.siren = [r, b];
  }
  [-0.78, 0.78].forEach(function(px){
    [-1.35, 1.35].forEach(function(pz){
      var w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12), mat(0x111318, {roughness: 0.8}));
      w.rotation.z = Math.PI / 2; w.position.set(px, 0.32, pz); w.castShadow = true; g.add(w);
    });
  });
  g.userData.bodyMat = bodyMat;
  return g;
}
function addCar(kind, x, z, heading, color){
  var g = makeCarMesh(color, kind === 'police');
  g.position.set(x, 0, z); g.rotation.y = heading;
  window.scene.add(g);
  var car = {group: g, kind: kind, x: x, z: z, heading: heading, speed: 0,
    health: 100, fuel: 60 + Math.random() * 40, route: null, wp: 0, stopped: false,
    color: color, police: kind === 'police'};
  g.userData.gtaCar = car;
  cars.push(car);
  if (kind === 'police') policeCars.push(car);
  return car;
}
function rectRoute(x, z, half, dir){
  var pts = [[-half, -half], [half, -half], [half, half], [-half, half]];
  if (dir < 0) pts.reverse();
  return pts.map(function(p){ return {x: x + p[0], z: z + p[1]}; });
}
function makePed(x, z){
  var g = new THREE.Group();
  var shirt = mat(PALETTE[Math.floor(Math.random() * PALETTE.length)], {});
  var pants = mat(0x2b3440, {});
  var skin = mat(0xd69b72, {});
  boxMesh(0.42, 0.55, 0.25, shirt, 0, 0.95, 0, g);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), skin);
  head.position.set(0, 1.42, 0); head.castShadow = true; g.add(head);
  var legL = boxMesh(0.15, 0.55, 0.15, pants, -0.11, 0.4, 0, g);
  var legR = boxMesh(0.15, 0.55, 0.15, pants, 0.11, 0.4, 0, g);
  var armL = boxMesh(0.11, 0.5, 0.11, shirt, -0.28, 0.95, 0, g);
  var armR = boxMesh(0.11, 0.5, 0.11, shirt, 0.28, 0.95, 0, g);
  g.position.set(x, 0, z); window.scene.add(g);
  var ped = {group: g, legL: legL, legR: legR, armL: armL, armR: armR,
    path: Math.random() < 0.5 ? 'x' : 'z', dir: Math.random() < 0.5 ? 1 : -1,
    speed: 1 + Math.random(), walk: Math.random() * 10, shelter: false};
  peds.push(ped); return ped;
}
function trafficLight(x, z){
  var g = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8), mat(0x25313d, {metalness: 0.5}));
  pole.position.set(0, 1.7, 0); pole.castShadow = true; g.add(pole);
  var box = boxMesh(0.35, 0.9, 0.35, mat(0x111827, {}), 0, 3.1, 0, g);
  var red = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshStandardMaterial({color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 2}));
  red.position.set(0, 3.35, 0.2); g.add(red);
  var green = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshStandardMaterial({color: 0x22cc66, emissive: 0x22cc66, emissiveIntensity: 0.2}));
  green.position.set(0, 2.85, 0.2); g.add(green);
  g.position.set(x, 0, z); window.scene.add(g);
  lights.push({group: g, red: red, green: green, x: x, z: z});
}
function buildPanel(){
  if (panel || !document.body) return;
  panel = document.createElement('div');
  panel.id = 'ff-gta-panel';
  panel.style.cssText = 'position:fixed;right:14px;top:170px;z-index:26;width:230px;padding:12px 14px;border-radius:14px;color:#fff;background:linear-gradient(135deg,rgba(10,18,32,.86),rgba(31,18,42,.7));border:1px solid rgba(255,209,102,.35);font-family:Vazirmatn,Arial,sans-serif;direction:rtl;font-size:12px;line-height:1.8;pointer-events:none;';
  panel.innerHTML = '<div id="ff-gta-wanted" style="font-size:15px;letter-spacing:2px">☆☆☆☆☆</div>' +
    '<div id="ff-gta-line">🚗 شهر خانواده</div>' +
    '<div id="ff-gta-car" style="color:#ffd166"></div>' +
    '<div id="ff-gta-story" style="color:#c3d0df"></div>' +
    '<div id="ff-gta-weather" style="color:#9bc7de"></div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;pointer-events:auto">' +
    '<button id="ff-gta-shirt" style="flex:1">👕 لباس</button>' +
    '<button id="ff-gta-hair" style="flex:1">💇 مو</button>' +
    '<button id="ff-gta-paint" style="flex:1">🚗 رنگ ماشین</button>' +
    '<button id="ff-gta-house" style="flex:1">🏡 حیاط خانه</button></div>';
  document.body.appendChild(panel);
  var st = document.createElement('style');
  st.textContent = '#ff-gta-panel button{padding:6px 4px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font-family:inherit;font-size:11px;cursor:pointer} #ff-gta-panel button:active{transform:scale(.95)} @media(max-width:650px){#ff-gta-panel{width:190px;right:8px;top:150px;font-size:11px}}';
  document.head.appendChild(st);
  document.getElementById('ff-gta-shirt').onclick = function(){ cycleLook('shirt'); };
  document.getElementById('ff-gta-hair').onclick = function(){ cycleLook('hair'); };
  document.getElementById('ff-gta-paint').onclick = function(){ paintCar(); };
  document.getElementById('ff-gta-house').onclick = function(){ toggleHouse(); };
}
function cycleLook(kind){
  var idx = PALETTE.indexOf(kind === 'shirt' ? state.shirt : kind === 'hair' ? state.hair : state.pants);
  var next = PALETTE[(idx + 1) % PALETTE.length];
  if (kind === 'shirt') state.shirt = next; else if (kind === 'hair') state.hair = next; else state.pants = next;
  save(); applyLook();
  toast(kind === 'shirt' ? '👕 رنگ لباس عوض شد' : kind === 'hair' ? '💇 رنگ مو عوض شد' : '👖 رنگ شلوار عوض شد');
}
function applyLook(){
  var body = window.playerBody; if (!body) return;
  try {
    var torso = body.getObjectByName('torso');
    if (torso && torso.material) torso.material.color.setHex(state.shirt);
    ['leftLeg', 'rightLeg'].forEach(function(n){
      var g = body.getObjectByName(n); if (!g) return;
      g.traverse(function(o){ if (o.isMesh && o.material) o.material.color.setHex(state.pants); });
    });
    var head = body.getObjectByName('head');
    if (head) head.traverse(function(o){
      if (!o.isMesh) return;
      var nm = o.name || '';
      if (nm.indexOf('hair') === 0 || nm.indexOf('curl') === 0 || nm.indexOf('fringe') === 0 || nm.indexOf('strand') === 0) {
        if (o.material) o.material.color.setHex(state.hair);
      }
    });
  } catch (e) {}
}
function paintCar(){
  if (!driving) { toast('🚗 اول سوار ماشین شو، بعد در گاراژ رنگش را عوض کن'); return; }
  var gp = {x: -18, z: 8};
  var d = Math.hypot(driving.group.position.x - gp.x, driving.group.position.z - gp.z);
  if (d > 10) { toast('🎨 برای رنگ کردن ماشین به گاراژ علی برو'); return; }
  var e = econ(); if (!e || !e.spend(20, 'رنگ ماشین')) { toast('💰 برای رنگ ماشین ۲۰ سکه لازم است'); return; }
  var idx = PALETTE.indexOf(driving.color);
  var next = PALETTE[(idx + 1) % PALETTE.length];
  driving.color = next; driving.group.userData.bodyMat.color.setHex(next); save();
  toast('🎨 رنگ ماشین عوض شد');
}
function toggleHouse(){
  state.gardenLights = !state.gardenLights; save();
  toast(state.gardenLights ? '🏡 چراغ‌های حیاط روشن شد' : '🏡 چراغ‌های حیاط خاموش شد');
  if (window.FFGTAHouse) window.FFGTAHouse(state.gardenLights);
}
function offence(reason){
  var now = performance.now();
  if (now - offenceCooldown < 5000) return;
  offenceCooldown = now;
  if (state.wanted < 5) {
    state.wanted++;
    save();
    toast('⭐ سطح تحت تعقیب: ' + state.wanted + ' — ' + reason);
    if (state.wanted >= 5) unlock('wanted5', 'فرار از تعقیب ۵ ستاره');
  }
  wantedTimer = 0;
}
function busted(){
  if (!window.playerGroup) return;
  var fine = state.wanted * 30;
  var e = econ();
  if (e) { if (!e.spend(fine, 'جریمه پلیس')) e.set(0); }
  state.wanted = 0; save();
  window.playerGroup.position.set(0, 0, 0);
  if (window.playerGroup) window.playerGroup.visible = true;
  if (driving) { driving = null; driveSpeed = 0; }
  toast('🚔 دستگیر شدی! جریمه پرداخت شد و به خانه برگشتی');
  if (window.FFGTAStory && window.FFGTAStory.onBusted) window.FFGTAStory.onBusted();
}
function enterCar(car){
  if (!window.playerGroup) return;
  driving = car; driveHeading = car.heading; driveSpeed = 0;
  car.group.userData.driver = true;
  window.playerGroup.visible = false;
  if (window.playerBody) window.playerBody.visible = false;
  if (car.police && state.wanted < 5) { state.wanted = Math.min(5, state.wanted + 1); save(); toast('🚔 ماشین پلیس را برداشتی! تحت تعقیب شدی'); }
  else toast('🚘 سوار شدی — WASD رانندگی | Space ترمز دستی | E پیاده شدن | R تعمیر در گاراژ');
  unlock('firstDrive', 'اولین رانندگی');
}
function exitCar(){
  if (!driving || !window.playerGroup) return;
  var c = driving.group.position;
  driving.group.userData.driver = false;
  window.playerGroup.position.set(c.x + 2, 0, c.z + 2);
  window.playerGroup.visible = true;
  if (window.playerBody) window.playerBody.visible = true;
  driving = null; driveSpeed = 0;
  toast('🚶 پیاده شدی');
}
function nearestCar(maxD){
  var p = playerPos(); if (!p) return null;
  var best = null, bd = maxD;
  cars.forEach(function(car){
    if (car.group.userData.driver) return;
    var d = Math.hypot(car.group.position.x - p.x, car.group.position.z - p.z);
    if (d < bd) { best = car; bd = d; }
  });
  return best;
}
function lightPhase(t){
  // 10s cycle: 0 = NS green, 1 = EW green
  return Math.floor(t / 10) % 2;
}
function build(){
  if (built || !window.scene || !window.isGameRunning) return;
  built = true;
  try {
    var roadMat = mat(0x2a2d33, {tex: 'asphalt', roughness: 0.92, rx: 2, ry: 20});
    var road = function(x, z, w, d){
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true; window.scene.add(m);
    };
    road(0, 30, 140, 6); road(0, -30, 140, 6); road(30, 0, 6, 140); road(-30, 0, 6, 140);
    road(0, 58, 120, 6); road(0, -58, 120, 6); road(58, 0, 6, 120); road(-58, 0, 6, 120);
    // District blocks (decorative, varied heights/colours)
    var blocks = [[-50, -50, 8, 9, 0xc98a6a], [50, -50, 10, 7, 0x7aa5c4], [-50, 50, 9, 8, 0x9db98a], [50, 50, 11, 10, 0xd4a96a], [-58, -10, 7, 6, 0xb08ac4], [58, 10, 7, 6, 0x6ac4b0]];
    blocks.forEach(function(b){
      var wm = mat(b[4], {tex: 'brick', roughness: 0.85});
      boxMesh(b[2], b[3], b[2], wm, b[0], b[3] / 2, b[1], window.scene);
      boxMesh(b[2] + 0.3, 0.25, b[2] + 0.3, mat(0x37474f, {}), b[0], b[3] + 0.12, b[1], window.scene);
      var winMat = new THREE.MeshStandardMaterial({color: 0x9edbff, roughness: 0.15, emissive: 0x102840, emissiveIntensity: 0.35});
      if (!window.FFEmissiveWindows) window.FFEmissiveWindows = [];
      window.FFEmissiveWindows.push(winMat);
      for (var i = -1; i <= 1; i++) boxMesh(1.2, 1, 0.1, winMat, b[0] + i * 2, b[3] * 0.6, b[1] + b[2] / 2 + 0.06, window.scene);
    });
    // District signs
    var signs = [[0, -58, 'شمال شهر', '🌆', '#38bdf8'], [0, 58, 'جنوب شهر', '🌳', '#4ade80'], [-58, 0, 'محله قدیمی', '🏘️', '#f59e0b'], [58, 0, 'بندر شرقی', '⚓', '#38bdf8']];
    signs.forEach(function(s){
      if (!window.FFTextures) return;
      var tex = window.FFTextures.sign(s[2], s[3], s[4]);
      var m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({map: tex, transparent: true}));
      m.position.set(s[0], 3.4, s[1]); window.scene.add(m);
    });
    // Police station
    boxMesh(10, 5, 8, mat(0xdde3ea, {tex: 'wall', roughness: 0.8}), 38, 2.5, -38, window.scene);
    boxMesh(10.4, 0.3, 8.4, mat(0x1e3a5f, {}), 38, 5.15, -38, window.scene);
    if (window.FFTextures) {
      var st = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({map: window.FFTextures.sign('اداره پلیس', '🚔', '#1e3a5f'), transparent: true}));
      st.position.set(38, 4, -33.9); window.scene.add(st);
    }
    // Traffic lights
    [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]].forEach(function(p){ trafficLight(p[0] + 4, p[1] + 4); });
    // Traffic cars on loops
    var routes = [rectRoute(0, 0, 55, 1), rectRoute(0, 0, 30, -1), rectRoute(0, 0, 55, -1), rectRoute(0, 0, 30, 1)];
    for (var i = 0; i < 8; i++) {
      var r = routes[i % routes.length];
      var wp = r[Math.floor(Math.random() * r.length)];
      var car = addCar('traffic', wp.x, wp.z, 0, PALETTE[i % PALETTE.length]);
      car.route = r; car.wp = 0; car.speed = 6 + Math.random() * 3;
    }
    // Parked cars
    [[-24, 12], [24, 18], [-14, -12], [14, -28], [-28, -22], [32, 20], [-38, 14], [44, -14], [-10, 32], [10, 32], [-44, -28], [44, 28]].forEach(function(p, i){
      addCar('parked', p[0], p[1], (i % 4) * Math.PI / 2, PALETTE[(i + 2) % PALETTE.length]);
    });
    // Police cars at the station
    addCar('police', 34, -32, 0, 0xf2f2f2);
    addCar('police', 38, -32, 0, 0xf2f2f2);
    addCar('police', 42, -32, 0, 0xf2f2f2);
    // Sports car (unlocked by story mission 6 or level 3)
    var sports = addCar('parked', 28, 18, Math.PI / 2, 0xff2d55);
    sports.sports = true; sports.group.visible = !!(state.sportsUnlocked || (window.stats && window.stats.level >= 3));
    sports.group.userData.sports = true;
    // Pedestrians
    for (var j = 0; j < 10; j++) makePed((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);
    // Damage smoke points
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(30 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    smoke = new THREE.Points(geo, new THREE.PointsMaterial({color: 0x888888, size: 0.5, transparent: true, opacity: 0.5, depthWrite: false}));
    smoke.frustumCulled = false; smoke.visible = false; window.scene.add(smoke);
    buildPanel();
    // Keys: E enter/exit, R repair/refuel at garage
    document.addEventListener('keydown', function(e){
      if (!window.isGameRunning) return;
      if (e.code === 'KeyE' && !e.repeat) {
        var dlg = document.getElementById('dialog-box');
        if (dlg && dlg.style.display === 'block') return;
        if (window.FFGTAStory && window.FFGTAStory.tryInterior && window.FFGTAStory.tryInterior()) return;
        if (driving) exitCar();
        else { var c = nearestCar(4.5); if (c) enterCar(c); }
      }
      if (e.code === 'KeyR' && !e.repeat && driving) {
        var gp = {x: -18, z: 8};
        var d = Math.hypot(driving.group.position.x - gp.x, driving.group.position.z - gp.z);
        if (d > 10) { toast('🔧 برای تعمیر و بنزین به گاراژ علی برو'); return; }
        var ee = econ(); if (!ee) return;
        var repairCost = Math.round((100 - driving.health) * 1);
        var fuelCost = Math.round((100 - driving.fuel) * 0.5);
        if (repairCost > 0 && !ee.spend(repairCost, 'تعمیر ماشین')) { toast('💰 پول تعمیر کافی نیست'); return; }
        if (fuelCost > 0 && !ee.spend(fuelCost, 'بنزین')) { toast('💰 پول بنزین کافی نیست'); return; }
        driving.health = 100; driving.fuel = 100; save();
        toast('🔧 ماشین تعمیر و باک پر شد');
      }
    });
    applyLook();
    toast('🚗 شهر بزرگ‌تر شد — با E سوار هر ماشینی شو، پلیس و وانتد فعال است');
  } catch (e) { console.warn('GTA build', e); }
}
function update(dt, t){
  if (!built) { build(); return; }
  if (!window.isGameRunning || !window.scene || !window.playerGroup) return;
  var p = window.playerGroup.position;
  var keys = window._keys || {};
  var weather = window.FFGTAWeather || {grip: 1, rain: false, fog: false};
  var grip = weather.grip || 1;
  // --- Driving ---
  var dialogOpen = false;
  var dlg = document.getElementById('dialog-box');
  if (dlg && dlg.style.display === 'block') dialogOpen = true;
  if (driving && !dialogOpen) {
    var joy = (window.FFJoy || {x: 0, y: 0});
    var gas = keys.KeyW || keys.ArrowUp || joy.y < -0.3, brake = keys.KeyS || keys.ArrowDown || joy.y > 0.3;
    var left = keys.KeyA || keys.ArrowLeft || joy.x < -0.3, right = keys.KeyD || keys.ArrowRight || joy.x > 0.3;
    var hand = !!keys.Space;
    if (gas) driveSpeed = Math.min(24 * grip, driveSpeed + dt * 14);
    else if (brake) driveSpeed = Math.max(-6, driveSpeed - dt * 16);
    else driveSpeed *= Math.pow(0.25, dt);
    if (driving.fuel <= 0) driveSpeed = Math.min(driveSpeed, 3);
    var steer = (right ? 1 : 0) - (left ? 1 : 0);
    if (Math.abs(joy.x) > 0.15) steer = joy.x; // 2.2.0: analogue joystick steering
    var steerRate = (hand ? 1.6 : 0.9 + Math.abs(driveSpeed) * 0.02) * grip * (hand ? 0.6 : 1);
    driveHeading += steer * dt * steerRate * (driveSpeed >= 0 ? 1 : -1);
    driving.heading = driveHeading;
    driving.group.rotation.y = driveHeading;
    var nx = driving.group.position.x + Math.sin(driveHeading) * driveSpeed * dt;
    var nz = driving.group.position.z + Math.cos(driveHeading) * driveSpeed * dt;
    var hit = false;
    // Building collision (approx: core buildings + GTA blocks)
    var blocks = [[18, 5, 3, 3.5], [12, -15, 4, 4], [5, 15, 4.5, 4], [-18, 8, 4, 3.5], [28, 12, 5, 4], [-10, -20, 3, 3], [8, -25, 3.5, 3.5], [20, -20, 4, 3.5], [-15, -5, 3.5, 3.5], [3, 20, 2.5, 2.5], [25, 25, 6, 5], [-20, 15, 3.5, 3], [22, -10, 3, 3], [-8, 25, 3, 3], [38, -38, 5, 4]];
    blocks.forEach(function(b){
      if (Math.abs(nx - b[0]) < b[2] + 1.2 && Math.abs(nz - b[1]) < b[3] + 1.2) hit = true;
    });
    cars.forEach(function(o){
      if (o === driving || o.group.userData.driver) return;
      var d = Math.hypot(o.group.position.x - nx, o.group.position.z - nz);
      if (d < 3.2) { hit = true; o.group.position.x += (o.group.position.x - nx) * 0.2; o.group.position.z += (o.group.position.z - nz) * 0.2; }
    });
    if (hit && Math.abs(driveSpeed) > 3) {
      driveSpeed *= -0.25;
      driving.health = Math.max(0, driving.health - 9);
      if (driving.health <= 0) { toast('💥 ماشین خراب شد! با R در گاراژ تعمیرش کن (یا پیاده شو)'); driveSpeed = 0; }
      offence('تصادف');
    } else if (!hit) {
      driving.group.position.x = Math.max(-70, Math.min(70, nx));
      driving.group.position.z = Math.max(-70, Math.min(70, nz));
    }
    if (Math.abs(driveSpeed) > 2 && driving.fuel > 0) driving.fuel = Math.max(0, driving.fuel - dt * 0.18);
    if (driving.fuel <= 0 && driving.fuel > -1) { /* crawl mode, warned once per low-fuel */ }
    window.playerGroup.position.copy(driving.group.position);
    window.playerGroup.visible = false;
    if (window.playerBody) window.playerBody.visible = false;
    if (window.FFAudio) window.FFAudio.setEngine(true, Math.abs(driveSpeed));
  }
  // --- Traffic ---
  var phase = lightPhase(t);
  lights.forEach(function(L){
    var nsGreen = phase === 0;
    L.red.material.emissiveIntensity = nsGreen ? 0.2 : 2;
    L.green.material.emissiveIntensity = nsGreen ? 2 : 0.2;
  });
  cars.forEach(function(car){
    if (car === driving || car.group.userData.driver) return;
    if (car.kind === 'parked') return;
    if (car.kind === 'police' && state.wanted > 0) return; // handled by chase below
    if (!car.route) return;
    var target = car.route[car.wp];
    var dx = target.x - car.group.position.x, dz = target.z - car.group.position.z;
    var dist = Math.hypot(dx, dz);
    if (dist < 2) { car.wp = (car.wp + 1) % car.route.length; return; }
    // Stop at red lights
    var stopped = false;
    lights.forEach(function(L){
      var dL = Math.hypot(L.x - car.group.position.x, L.z - car.group.position.z);
      if (dL < 8) {
        var movingX = Math.abs(dx) > Math.abs(dz);
        var redForMe = movingX ? (phase === 0) : (phase === 1);
        if (redForMe) stopped = true;
      }
    });
    // Stop for the player car ahead
    if (driving) {
      var dp = Math.hypot(driving.group.position.x - car.group.position.x, driving.group.position.z - car.group.position.z);
      if (dp < 5) stopped = true;
    }
    var sp = stopped ? 0 : car.speed * (weather.rain ? 0.8 : 1);
    car.group.position.x += (dx / dist) * sp * dt;
    car.group.position.z += (dz / dist) * sp * dt;
    var targetRot = Math.atan2(dx, dz);
    var diff = targetRot - car.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.group.rotation.y += diff * Math.min(1, dt * 4);
    car.heading = car.group.rotation.y;
  });
  // --- Police chase ---
  var nearestPolice = 999;
  if (state.wanted > 0) {
    policeCars.forEach(function(car, i){
      if (car === driving) return;
      var dx = p.x - car.group.position.x, dz = p.z - car.group.position.z;
      var dist = Math.hypot(dx, dz);
      if (dist < nearestPolice) nearestPolice = dist;
      var sp = (9 + state.wanted * 2) * dt;
      car.group.position.x += (dx / dist) * sp;
      car.group.position.z += (dz / dist) * sp;
      car.group.rotation.y = Math.atan2(dx, dz);
      if (car.group.userData.siren) {
        var on = Math.floor(t * 4 + i) % 2 === 0;
        car.group.userData.siren[0].material.emissiveIntensity = on ? 3 : 0.3;
        car.group.userData.siren[1].material.emissiveIntensity = on ? 0.3 : 3;
      }
      if (dist < 4 && !driving) {
        bustedTimer += dt;
        if (bustedTimer > 1.5) { bustedTimer = 0; busted(); }
      }
    });
    if (nearestPolice > 30) {
      wantedTimer += dt;
      if (wantedTimer > 15) {
        decayTimer += dt;
        var step = interior ? 5 : 10;
        if (decayTimer > step) { decayTimer = 0; state.wanted = Math.max(0, state.wanted - 1); save(); if (state.wanted === 0) toast('⭐ از دست پلیس فرار کردی!'); }
      }
    } else { wantedTimer = 0; decayTimer = 0; }
  } else {
    // Police idle: return to station
    policeCars.forEach(function(car){
      var tx = 38 + (policeCars.indexOf(car) - 1) * 4, tz = -32;
      var dx = tx - car.group.position.x, dz = tz - car.group.position.z;
      var dist = Math.hypot(dx, dz);
      if (dist > 1) {
        car.group.position.x += (dx / dist) * 5 * dt;
        car.group.position.z += (dz / dist) * 5 * dt;
        car.group.rotation.y = Math.atan2(dx, dz);
      }
    });
    bustedTimer = 0;
  }
  // --- Pedestrians ---
  peds.forEach(function(ped){
    var g = ped.group;
    var rain = weather.rain;
    var targetX = g.position.x, targetZ = g.position.z;
    if (rain && !ped.shelter) {
      // Seek nearest building front
      ped.shelter = true;
      targetX = Math.round(g.position.x / 10) * 10; targetZ = Math.round(g.position.z / 10) * 10;
    }
    if (ped.path === 'x') { g.position.x += ped.dir * ped.speed * dt; if (g.position.x > 68) ped.dir = -1; if (g.position.x < -68) ped.dir = 1; }
    else { g.position.z += ped.dir * ped.speed * dt; if (g.position.z > 68) ped.dir = -1; if (g.position.z < -68) ped.dir = 1; }
    ped.walk += dt * 8;
    ped.legL.rotation.x = Math.sin(ped.walk) * 0.5;
    ped.legR.rotation.x = -Math.sin(ped.walk) * 0.5;
    ped.armL.rotation.x = -Math.sin(ped.walk) * 0.3;
    ped.armR.rotation.x = Math.sin(ped.walk) * 0.3;
    g.rotation.y = ped.path === 'x' ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (ped.dir > 0 ? 0 : Math.PI);
    // Step aside from the player car (no hits, family-friendly)
    if (driving) {
      var d = Math.hypot(driving.group.position.x - g.position.x, driving.group.position.z - g.position.z);
      if (d < 2.2 && Math.abs(driveSpeed) > 4) {
        g.position.x += (g.position.x - driving.group.position.x) * 0.6;
        g.position.z += (g.position.z - driving.group.position.z) * 0.6;
        offence('رانندگی خطرناک نزدیک عابر');
      }
    }
  });
  // --- Damage smoke ---
  if (driving && driving.health < 40 && driving.health > 0 && smoke) {
    smoke.visible = true;
    smokeTimer += dt;
    if (smokeTimer > 0.25) {
      smokeTimer = 0;
      var pos = smoke.geometry.attributes.position.array;
      for (var i = 0; i < 30; i++) {
        pos[i * 3] = driving.group.position.x + (Math.random() - 0.5);
        pos[i * 3 + 1] = 1 + Math.random() * 1.5;
        pos[i * 3 + 2] = driving.group.position.z + (Math.random() - 0.5);
      }
      smoke.geometry.attributes.position.needsUpdate = true;
    }
  } else if (smoke) smoke.visible = false;
  // --- Panel (throttled) ---
  panelTimer += dt;
  if (panelTimer > 0.25) {
    panelTimer = 0;
    buildPanel();
    var stars = '';
    for (var s = 0; s < 5; s++) stars += s < state.wanted ? '★' : '☆';
    var wEl = document.getElementById('ff-gta-wanted');
    if (wEl) { wEl.textContent = stars; wEl.style.color = state.wanted > 0 ? '#ff5555' : '#ffd700'; }
    var line = document.getElementById('ff-gta-line');
    if (line) line.textContent = '📍 ' + districtAt(p.x, p.z) + ' — ' + repLevel(districtAt(p.x, p.z)) + ' | ⭐ سطح ' + (window.stats ? window.stats.level : 1);
    var carEl = document.getElementById('ff-gta-car');
    if (carEl) carEl.textContent = driving ? ('🚗 سرعت ' + Math.round(Math.abs(driveSpeed) * 3.6) + ' km/h | ❤️ ' + Math.round(driving.health) + '% | ⛽ ' + Math.round(driving.fuel) + '%') : '🚶 پیاده — E: سوار ماشین | R: تعمیر در گاراژ';
    var storyEl = document.getElementById('ff-gta-story');
    if (storyEl && window.FFGTAStory) storyEl.textContent = window.FFGTAStory.line();
    var wxEl = document.getElementById('ff-gta-weather');
    if (wxEl) wxEl.textContent = '🌦️ ' + (window.FFGTAWeather ? window.FFGTAWeather.label : 'صاف');
    // Sports car unlock check
    cars.forEach(function(c){
      if (c.sports && !c.group.visible && (state.sportsUnlocked || (window.stats && window.stats.level >= 3))) c.group.visible = true;
    });
  }
  // City + story updates (loaded after this module)
  try{ if (window.FFGTACityUpdate) window.FFGTACityUpdate(dt, t); }catch(e){}
  try{ if (window.FFGTAStoryUpdate) window.FFGTAStoryUpdate(dt, t); }catch(e){}
}
window.FFGTA = {
  state: state, save: save, unlock: unlock, offence: offence,
  get wanted(){ return state.wanted; },
  get driving(){ return driving; },
  get interior(){ return !!interior; },
  setInterior: function(v, ret){ interior = v; if (ret) returnPos = ret; },
  get returnPos(){ return returnPos; },
  districtAt: districtAt, repLevel: repLevel,
  addRep: function(name, n){ state.rep[name] = (state.rep[name] || 0) + n; save(); },
  applyLook: applyLook
};
window.FFGTAUpdate = update;
// Build poll (scene appears only after Play is pressed)
setInterval(function(){ if (!built) build(); }, 800);
})();
