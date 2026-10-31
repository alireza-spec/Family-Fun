/* Family Fun 2.3.0 — REAL GLB models (not code shapes), with mandatory
   capsule/box fallback. Every GLB is loaded from models/*.glb first; if that
   file is absent (binary never pushed) the models/*.glb.b64 text companion
   is decoded to a blob URL and loaded instead. If BOTH fail, the original
   capsule character / box car stays visible — the game never shows an
   invisible player or car. Failures are only logged to console.
   Characters: Gobkit human packs, CC0 (Idle/Walk/Run clips).
   Cars: Kenney Car Kit, CC0 (wheels are separate nodes, front = +Z).
   Van: Cesium Milk Truck, Khronos Sample Assets, CC BY 4.0 (see CREDITS). */
(function(){
'use strict';
var CHAR_FILES = ['char-courier.glb','char-cashier.glb','char-accountant.glb','char-patrol.glb','char-paramedic.glb','char-grandma.glb','char-officelady.glb','char-schoolkid.glb','char-stockclerk.glb','char-officemanager.glb','char-receptionist.glb','char-nurse.glb','char-doctor.glb','char-firechief.glb','char-policechief.glb'];
var CAR_FILES = {race:'car-race.glb', suv:'car-suv.glb', truck:'car-truck.glb', ambulance:'car-ambulance.glb', van:'car-van.glb', tractor:'car-tractor.glb'};
var templates = {}, mixers = [], playerModel = null, modelledCars = [], modelledNPCs = [], modelledTraffic = [];
var backpackOn = true, backpackGroup = null, phoneGroup = null;
function log(){ try{ console.log.apply(console, ['[FF23 models]'].concat([].slice.call(arguments))); }catch(e){} }
function warn(){ try{ console.warn.apply(console, ['[FF23 models]'].concat([].slice.call(arguments))); }catch(e){} }
function b64ToBlobURL(b64, mime){
  try{
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], {type: mime}));
  }catch(e){ return null; }
}
function loadGLB(file){
  return new Promise(function(resolve, reject){
    var Loader = window.FFGLTFLoader;
    if (!Loader){ reject(new Error('no GLTFLoader')); return; }
    var loader = new Loader();
    loader.load('models/' + file, function(g){ resolve(g); }, undefined, function(){
      fetch('models/' + file + '.b64').then(function(r){ return r.text(); }).then(function(t){
        var u = b64ToBlobURL(t, 'model/gltf-binary');
        if (!u){ reject(new Error('b64 decode failed ' + file)); return; }
        loader.load(u, function(g){ resolve(g); }, undefined, function(e2){ reject(e2 || new Error('b64 load failed ' + file)); });
      }).catch(function(e){ reject(e); });
    });
  });
}
function measureSkinned(scene){
  // 2.5.0 ROBUST height: Box3 ignores skinning (it measured 0.15 for a
  // character whose SKINNED render is 0.4455 in scene space, measured with
  // three r158's own shader formula). So measure the skinned vertices
  // directly: skinVertex = bindMatrix * pos; skinned = sum(boneMat *
  // skinVertex * weight); world = bindMatrixInverse^-1... exactly the
  // vertex-shader path (bindMatrix, boneMatrices, bindMatrixInverse,
  // matrixWorld). Returns {height, minY} in scene space, or null.
  try{
    scene.updateMatrixWorld(true);
    var minY = Infinity, maxY = -Infinity, found = false;
    scene.traverse(function(o){
      if (!o.isSkinnedMesh || !o.skeleton) return;
      try{
        o.skeleton.update();
        var pos = o.geometry.attributes.position;
        var jt = o.geometry.attributes.skinIndex.array;
        var wt = o.geometry.attributes.skinWeight.array;
        var bm = o.skeleton.boneMatrices;
        var bind = o.bindMatrix, bindInv = o.bindMatrixInverse, mw = o.matrixWorld;
        var v = new THREE.Vector4(), tmp = new THREE.Vector4(), skin = new THREE.Vector4();
        for (var i = 0; i < pos.count; i++){
          v.set(pos.getX(i), pos.getY(i), pos.getZ(i), 1).applyMatrix4(bind);
          skin.set(0, 0, 0, 0);
          for (var k = 0; k < 4; k++){
            var ji = jt[i * 4 + k], w = wt[i * 4 + k]; if (!w) continue;
            tmp.copy(v).applyMatrix4(new THREE.Matrix4().fromArray(bm, ji * 16)).multiplyScalar(w);
            skin.add(tmp);
          }
          skin.applyMatrix4(bindInv);
          var wv = new THREE.Vector3(skin.x, skin.y, skin.z).applyMatrix4(mw);
          if (wv.y < minY) minY = wv.y; if (wv.y > maxY) maxY = wv.y; found = true;
        }
      }catch(e){}
    });
    if (found && maxY - minY > 0.05) return {height: maxY - minY, minY: minY};
  }catch(e){ warn('measureSkinned', e); }
  return null;
}
function fitCharacter(scene){
  // 2.5.0 SCALE FIX (replaces the 2.4.0 magic 0.5 factor, which overshot):
  // target RENDERED height is exactly 1.8 units for every character, by
  // construction: s = 1.8 / measuredSkinnedHeight. Measured in three r158:
  // courier 0.4455, cashier 0.3907, accountant 0.3415, patrol 0.3756,
  // paramedic 0.3883 (scene space) -> scales 4.04 / 4.61 / 5.27 / 4.79 / 4.64.
  // A sedan is 4.1 long and ~1.0-1.7 high, so a 1.8 person next to a car
  // reads as a person next to a car (head near a sedan roof, below a van).
  var wrapper = new THREE.Group();
  try{
    var m = measureSkinned(scene);
    var s, footY;
    if (m){ s = 1.8 / m.height; footY = m.minY * s; }
    else {
      var box = new THREE.Box3().setFromObject(scene);
      var size = new THREE.Vector3(); box.getSize(size);
      var h = size.y || 0.15; s = (1.7 / h) * 0.5; footY = 0;
      log('fitCharacter FALLBACK boxH=' + h.toFixed(3) + ' scale=' + s.toFixed(2));
    }
    scene.scale.setScalar(s);
    scene.position.y = -footY;
    scene.traverse(function(o){ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    log('fitCharacter skinned=' + (m ? m.height.toFixed(4) : 'n/a') + ' scale=' + s.toFixed(2) + ' -> rendered 1.8');
  }catch(e){ warn('fitCharacter', e); }
  wrapper.add(scene);
  return wrapper;
}
function fitCar(scene, targetLen){
  // 2.4.0: length = the LONGEST horizontal extent (some packs are
  // X-long in local space), rotate an X-dominant model -90° about Y so
  // its front faces +Z like every other car, and cap the width at 2.1
  // so a scaled truck never becomes a wall. Fitted dims are stored on
  // the wrapper for the 2.4.0 camera's vehicle collision spheres.
  var wrapper = new THREE.Group();
  try{
    var box = new THREE.Box3().setFromObject(scene);
    var size = new THREE.Vector3(); box.getSize(size);
    if (size.x > size.z * 1.05){
      scene.rotation.y = -Math.PI / 2; // +X front -> +Z front
      scene.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(scene);
      box.getSize(size);
    }
    var len = Math.max(size.z, 0.1);
    var s = Math.min((targetLen || 4.1) / len, 2.1 / Math.max(size.x, 0.1));
    scene.scale.setScalar(s);
    var box2 = new THREE.Box3().setFromObject(scene);
    scene.position.y = -box2.min.y;
    scene.traverse(function(o){ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    wrapper.userData.ff24 = {len: size.z * s, wid: size.x * s, height: size.y * s};
  }catch(e){ warn('fitCar', e); }
  wrapper.add(scene);
  return wrapper;
}
function cloneSkinned(template){
  // Skeleton-aware clone (plain .clone() breaks skinned rigs).
  if (window.FFSkeletonUtils && window.FFSkeletonUtils.clone) return window.FFSkeletonUtils.clone(template.scene);
  return template.scene.clone(true);
}
function makeMixer(wrapper, template, initial){
  var mixer = null, actions = {};
  try{
    if (template.animations && template.animations.length){
      mixer = new THREE.AnimationMixer(wrapper);
      template.animations.forEach(function(clip){
        try{ actions[clip.name] = mixer.clipAction(clip); }catch(e){}
      });
      var first = actions[initial] || actions['Idle'] || actions['idle'] || actions[Object.keys(actions)[0]];
      if (first){ first.play(); }
      mixers.push({mixer: mixer, actions: actions, current: first ? first._clip.name : null, wrapper: wrapper});
      return mixers[mixers.length - 1];
    }
  }catch(e){ warn('mixer', e); }
  return null;
}
function setAnim(entry, name){
  if (!entry || !entry.actions) return;
  var a = entry.actions[name] || entry.actions[name.charAt(0).toUpperCase() + name.slice(1)] || entry.actions[name.toLowerCase()];
  if (!a) return;
  if (entry.current === a._clip.name) return;
  try{
    var prev = entry.actions[entry.current];
    if (prev) prev.fadeOut(0.2);
    a.reset().fadeIn(0.2).play();
    entry.current = a._clip.name;
  }catch(e){}
}
function hideChildren(group){
  group.children.slice().forEach(function(c){ if (c !== group) c.visible = false; });
  // Keep the group itself (position/rotation are driven by GTA code).
}
function buildBackpack(){
  if (backpackGroup) return backpackGroup;
  var g = new THREE.Group();
  var fabric = new THREE.MeshStandardMaterial({color: 0x2f6fb2, roughness: 0.9});
  var dark = new THREE.MeshStandardMaterial({color: 0x1d2733, roughness: 0.9});
  var pocket = new THREE.MeshStandardMaterial({color: 0xf0b429, roughness: 0.85});
  function bx(w,h,d,mt,x,y,z,parent){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mt);
    m.position.set(x,y,z); m.castShadow = true; (parent||g).add(m); return m;
  }
  bx(0.36,0.46,0.18, fabric, 0,0,0);
  bx(0.30,0.20,0.05, pocket, 0,-0.08,0.11);
  bx(0.36,0.03,0.19, dark, 0,0.22,0);
  bx(0.07,0.42,0.03, dark, -0.13,0, -0.10);
  bx(0.07,0.42,0.03, dark, 0.13,0, -0.10);
  bx(0.10,0.05,0.03, dark, 0,0.26,0);
  backpackGroup = g;
  return g;
}
function buildPhone(){
  if (phoneGroup) return phoneGroup;
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.10,0.20,0.016),
    new THREE.MeshStandardMaterial({color: 0x111827, roughness: 0.4, metalness: 0.3}));
  body.castShadow = true; g.add(body);
  try{
    var c = document.createElement('canvas'); c.width = 128; c.height = 256;
    var x = c.getContext('2d');
    x.fillStyle = '#0ea5e9'; x.fillRect(0,0,128,256);
    x.fillStyle = '#fff'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.fillText('08:13', 64, 44);
    x.font = '16px Arial'; x.fillText('علیرضا', 64, 74);
    x.fillStyle = '#22c55e'; x.beginPath(); x.arc(64, 200, 26, 0, Math.PI*2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 20px Arial'; x.fillText('📞', 64, 208);
    var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(0.088,0.176),
      new THREE.MeshBasicMaterial({map: tex}));
    scr.position.z = 0.009; g.add(scr);
  }catch(e){}
  phoneGroup = g;
  return g;
}
var prevPlayerPos = null, prevCarState = {}, lastLoopT = performance.now();
function loop(){
  requestAnimationFrame(loop);
  var now = performance.now();
  var dt = Math.min(0.05, (now - lastLoopT) / 1000 || 0.016);
  lastLoopT = now;
  // Mixers (player + NPCs): drive Walk/Run/Idle from position delta.
  try{
    // 2.8.0 MIXER LOD: the player is always full rate; NPC mixers farther
    // than 25 units update every 2nd frame (dt*2) and farther than 45
    // every 4th frame (dt*4) — same total animation time, a quarter of
    // the skeleton work for distant characters.
    var _mf = (window._ffMixFrame = (window._ffMixFrame || 0) + 1);
    mixers.forEach(function(entry){
      if (!entry.mixer) return;
      var _d = 0;
      try{ if (entry.wrapper && window.playerGroup) _d = Math.hypot(entry.wrapper.position.x - window.playerGroup.position.x, entry.wrapper.position.z - window.playerGroup.position.z); }catch(e){}
      var _step = _d > 45 ? 4 : (_d > 25 ? 2 : 1);
      if (_mf % _step !== 0) return;
      entry.mixer.update(dt * _step);
    });
  }catch(e){}
  try{
    var pg = window.playerGroup, pb = window.playerBody;
    if (pg){
      var p = pg.position;
      var moving = 0;
      if (prevPlayerPos){
        var dx = p.x - prevPlayerPos.x, dz = p.z - prevPlayerPos.z;
        moving = Math.sqrt(dx*dx + dz*dz) / Math.max(dt, 0.001);
      }
      prevPlayerPos = {x: p.x, z: p.z};
      if (playerModel){
        // 2.4.0: follow the capsule body's facing SMOOTHLY (shortest
        // arc, dt-based) — the old direct assignment re-introduced the
        // snap that game-core's smoothed yaw had just removed.
        if (pb){
          if (playerModel.smoothYaw === undefined) playerModel.smoothYaw = pb.rotation.y;
          var dy = pb.rotation.y - playerModel.smoothYaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          playerModel.smoothYaw += dy * Math.min(1, dt * 10);
          playerModel.group.rotation.y = playerModel.smoothYaw;
        }
        var entry = playerModel.entry;
        if (entry){
          if (moving > 6) setAnim(entry, 'Run');
          else if (moving > 0.4) setAnim(entry, 'Walk');
          else setAnim(entry, 'Idle');
          // 2.4.0: playback rate follows ground speed, so the walk does
          // not look like a fixed-speed treadmill.
          if (entry.mixer) entry.mixer.timeScale = moving <= 0.4 ? 1 : (moving > 6 ? 1.3 : 0.7 + moving * 0.06);
        }
        // Backpack: worn on the back, facing with the body.
        // 2.4.0 positions re-tuned for the corrected 1.7-unit player
        // (was 1.02/0.30 for the old ~2.7+ giant player).
        if (backpackGroup && backpackGroup.parent === pg){
          var yaw = pb ? pb.rotation.y : 0;
          backpackGroup.rotation.y = yaw;
          backpackGroup.position.set(-Math.sin(yaw)*0.24, 0.88, -Math.cos(yaw)*0.24); // 2.5.0: 1.8-unit player
          backpackGroup.visible = backpackOn;
        }
        // Phone: only while a dialog/call box is open, held at the head side.
        if (phoneGroup && phoneGroup.parent === pg){
          var dlg = document.getElementById('dialog-box');
          var open = dlg && dlg.style.display === 'block';
          phoneGroup.visible = !!open;
          if (open){
            var y2 = pb ? pb.rotation.y : 0;
            phoneGroup.rotation.y = y2; phoneGroup.rotation.z = -0.25;
            phoneGroup.position.set(Math.cos(y2)*0.20 + Math.sin(y2)*0.08, 1.48, -Math.sin(y2)*0.20 + Math.cos(y2)*0.08); // 2.5.0: 1.8-unit player
          }
        }
      }
    }
    // NPC mixers from their own movement.
    modelledNPCs.forEach(function(rec){
      var g = rec.group, pos = g.position;
      var dx = pos.x - rec.prev.x, dz = pos.z - rec.prev.z;
      var sp = Math.sqrt(dx*dx + dz*dz) / Math.max(dt, 0.001);
      rec.prev = {x: pos.x, z: pos.z};
      if (rec.entry && !(rec.entry.ff30HoldUntil && performance.now() < rec.entry.ff30HoldUntil)){
        if (sp > 1.2) setAnim(rec.entry, 'Walk');
        else setAnim(rec.entry, 'Idle');
        if (rec.entry.mixer) rec.entry.mixer.timeScale = sp > 1.2 ? 0.9 : 1;
      }
    });
    // Car wheels: spin from position delta, steer from heading delta.
    modelledCars.forEach(function(rec){
      var g = rec.group, pos = g.position, hd = g.rotation.y;
      var prev = prevCarState[rec.id] || {x: pos.x, z: pos.z, h: hd};
      var dx = pos.x - prev.x, dz = pos.z - prev.z;
      var dist = Math.sqrt(dx*dx + dz*dz);
      var speed = dist / Math.max(dt, 0.001);
      var dh = hd - prev.h;
      while (dh > Math.PI) dh -= Math.PI*2;
      while (dh < -Math.PI) dh += Math.PI*2;
      prevCarState[rec.id] = {x: pos.x, z: pos.z, h: hd};
      rec.steer += ((Math.max(-0.45, Math.min(0.45, dh * 8))) - rec.steer) * Math.min(1, dt*8);
      rec.spin += (speed * dt) / 0.35;
      rec.wheels.forEach(function(w){
        try{
          if (w.isFront) w.node.rotation.set(rec.spin, rec.steer, 0);
          else w.node.rotation.set(rec.spin, 0, 0);
        }catch(e){}
      });
    });
  }catch(e){ /* never break the game loop for a visual extra */ }
}
function installPlayer(){
  if (playerModel) return;
  var pg = window.playerGroup, pb = window.playerBody;
  if (!pg || !pb) return;
  var tpl = templates['char-courier.glb'];
  if (!tpl) return;
  try{
    var clone = cloneSkinned(tpl);
    var wrapper = fitCharacter(clone);
    pg.add(wrapper);
    pb.visible = false;
    var entry = makeMixer(wrapper, tpl, 'Idle');
    playerModel = {group: wrapper, entry: entry};
    window.FFModels.player = playerModel;
    // Backpack + phone props live on the player group.
    var bp = buildBackpack(); pg.add(bp);
    var ph = buildPhone(); pg.add(ph); ph.visible = false;
    log('player model installed (Gobkit courier)');
  }catch(e){ warn('player install failed, capsule stays', e); }
}
function installNPCs(){
  var list = window.npcs || [];
  list.forEach(function(npc, idx){
    if (!npc || modelledNPCs.some(function(r){ return r.group === npc; })) return;
    var tpl = templates[CHAR_FILES[idx % CHAR_FILES.length]];
    if (!tpl || !npc.userData || !npc.userData.body) return;
    try{
      var clone = cloneSkinned(tpl);
      var wrapper = fitCharacter(clone);
      // 2.4.0: every NPC gets a GLB at the SAME scale as the player
      // (fitCharacter), with only ±6% deterministic height variation —
      // never the tiny-box look from the screenshots, which was the
      // giant player making normal NPCs look small by comparison.
      wrapper.scale.multiplyScalar(0.94 + (idx % 5) * 0.03);
      (function(){ var _f = CHAR_FILES[idx % CHAR_FILES.length] || '';
        if (_f.indexOf('schoolkid') >= 0) wrapper.scale.multiplyScalar(0.78);
        else if (_f.indexOf('grandma') >= 0) wrapper.scale.multiplyScalar(0.93); })();
      npc.userData.speedFactor = 0.85 + (idx % 5) * 0.08; // 2.5.0: varied walk speeds
      npc.add(wrapper);
      npc.userData.body.visible = false;
      var entry = makeMixer(wrapper, tpl, 'Idle');
      modelledNPCs.push({group: npc, entry: entry, prev: {x: npc.position.x, z: npc.position.z}});
    }catch(e){ warn('npc install failed', e); }
  });
}
var CAR_PAINTS = [0xd7263d, 0x1f6feb, 0xf2b705, 0x2ecc71, 0x8e44ad, 0xe67e22, 0x20c2c2, 0xe8e8e8];
function paintCar(wrapper, seed, forceColor){
  // 2.5.0: Kenney cars shipped all-white and flat-looking. Give each car
  // a real paint job (metalness + varied colour, cloned per instance so
  // cars do not share one material) and dark wheels so they read as cars.
  // 3.0.0: forceColor overrides the palette (police white, taxi yellow).
  try{
    var paint = (forceColor !== undefined && forceColor !== null) ? forceColor : CAR_PAINTS[Math.abs(seed) % CAR_PAINTS.length];
    wrapper.traverse(function(n){
      if (!n.isMesh) return;
      var nm = (n.name || '').toLowerCase();
      if (nm.indexOf('wheel') >= 0){
        n.material = new THREE.MeshStandardMaterial({color: 0x16181c, roughness: 0.9, metalness: 0.1});
      } else if (nm === 'body' || nm.indexOf('body') >= 0){
        var m = n.material ? n.material.clone() : new THREE.MeshStandardMaterial({});
        m.color = new THREE.Color(paint); m.metalness = 0.55; m.roughness = 0.38; n.material = m;
      }
      n.castShadow = true;
    });
  }catch(e){}
}
function installPeds(){
  // 2.5.0: GTA traffic pedestrians (gta.js makePed) are capsule/box figures
  // in a separate list — NOT window.npcs — so installNPCs never touched
  // them. That is the yellow capsule figure in the 2.4.0 screenshot.
  // Replace each with a GLB model at the corrected 1.8 scale; the GTA
  // update keeps driving ped.group rotation/position, and the mixer is
  // driven from position delta via the modelledNPCs list.
  var list = [];
  try{ list = (window.FFGTA && window.FFGTA.peds) || []; }catch(e){}
  list.forEach(function(ped, idx){
    if (!ped || !ped.group || ped.group.userData.ff25PedModelled) return;
    var tpl = templates[CHAR_FILES[idx % CHAR_FILES.length]];
    if (!tpl) return;
    try{
      var clone = cloneSkinned(tpl);
      var wrapper = fitCharacter(clone);
      wrapper.scale.multiplyScalar(0.94 + (idx % 5) * 0.03);
      (function(){ var _f = CHAR_FILES[idx % CHAR_FILES.length] || '';
        if (_f.indexOf('schoolkid') >= 0) wrapper.scale.multiplyScalar(0.78);
        else if (_f.indexOf('grandma') >= 0) wrapper.scale.multiplyScalar(0.93); })();
      ped.group.add(wrapper);
      ped.group.children.forEach(function(c){ if (c !== wrapper) c.visible = false; });
      ped.group.userData.ff25PedModelled = true;
      var entry = makeMixer(wrapper, tpl, 'Walk');
      modelledNPCs.push({group: ped.group, entry: entry, prev: {x: ped.group.position.x, z: ped.group.position.z}});
    }catch(e){ warn('ped install failed', e); }
  });
}
function carModelFor(car){
  if (!car) return 'race';
  if (car.kind === 'police') return 'suv'; // 3.0.0: white SUV + light bar reads as a police car (ambulance body stays for ambulances)
  if (car.sports) return 'race';
  if (car.kind === 'parked') return ['suv','van','truck','tractor'][Math.floor(Math.random()*4)];
  return ['race','suv','truck','van','tractor'][Math.floor(Math.random()*5)];
}
function installCars(){
  if (!window.scene) return;
  var idSeq = 0;
  window.scene.traverse(function(o){
    if (!o || !o.userData) return;
    var car = o.userData.gtaCar;
    if (car && !o.userData.ff23Modelled){
      var key = carModelFor(car);
      var tpl = templates[CAR_FILES[key]];
      if (!tpl) return;
      try{
        var clone = tpl.scene.clone(true);
        var wrapper = fitCar(clone, key === 'van' || key === 'truck' ? 4.6 : 4.1);
        paintCar(wrapper, idSeq, car.kind === 'police' ? 0xf5f5f5 : null);
        if (car.kind === 'traffic' && idSeq % 4 === 0){
          // 3.0.0 TAXI: every 4th traffic car is repainted yellow with a roof sign.
          paintCar(wrapper, 0, 0xf7c948);
          try{
            var _c = document.createElement('canvas'); _c.width = 128; _c.height = 48;
            var _x = _c.getContext('2d'); _x.fillStyle = '#111111'; _x.fillRect(0,0,128,48);
            _x.fillStyle = '#f7c948'; _x.font = 'bold 30px Arial'; _x.textAlign = 'center'; _x.fillText('TAXI', 64, 34);
            var _t = new THREE.CanvasTexture(_c); _t.colorSpace = THREE.SRGBColorSpace;
            var _sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshStandardMaterial({color: 0x111111}));
            _sign.position.set(0, 1.45, 0); wrapper.add(_sign);
            var _face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.18), new THREE.MeshBasicMaterial({map: _t}));
            _face.position.set(0, 1.45, 0.16); wrapper.add(_face);
          }catch(e){}
        }
        o.add(wrapper);
        hideChildren(o);
        // Re-show the wrapper (hideChildren only hid pre-existing children).
        wrapper.visible = true;
        var wheels = [];
        wrapper.traverse(function(n){
          var nm = (n.name || '').toLowerCase();
          if (nm.indexOf('wheel') >= 0) wheels.push({node: n, isFront: nm.indexOf('front') >= 0});
        });
        // Police/emergency: add a small red/blue light bar on top.
        if (car.kind === 'police'){
          try{
            var r = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.3), new THREE.MeshStandardMaterial({color:0xff2222, emissive:0xff2222, emissiveIntensity:1.5}));
            r.position.set(-0.3, 1.55, 0); wrapper.add(r);
            var b = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.16,0.3), new THREE.MeshStandardMaterial({color:0x2244ff, emissive:0x2244ff, emissiveIntensity:1.5}));
            b.position.set(0.3, 1.55, 0); wrapper.add(b);
          }catch(e){}
        }
        o.userData.ff23Modelled = true;
        // 2.4.0: collision radius for the GTA camera (sphere around the
        // fitted car), so the camera can no longer end up inside a van.
        var fd = wrapper.userData.ff24 || {len: 4.1, wid: 2.0};
        o.userData.ff24Radius = Math.sqrt(Math.pow(fd.len / 2, 2) + Math.pow(fd.wid / 2, 2)) * 0.7;
        modelledCars.push({group: o, wheels: wheels, spin: 0, steer: 0, id: 'gta' + (idSeq++), radius: o.userData.ff24Radius});
      }catch(e){ warn('gta car install failed', e); }
    }
  });
  // Core traffic cars (game-core makeCar): groups with axis/speed, no gtaCar.
  var fam = window.__familyCars || [];
  fam.forEach(function(g, i){
    if (!g || g.userData.ff23Modelled) return;
    var tpl = templates[CAR_FILES[['race','suv','van','tractor'][i % 4]]];
    if (!tpl) return;
    try{
      var clone = tpl.scene.clone(true);
      var wrapper = fitCar(clone, 4.1);
      paintCar(wrapper, i);
      g.add(wrapper);
      hideChildren(g); wrapper.visible = true;
      var wheels = [];
      wrapper.traverse(function(n){
        var nm = (n.name || '').toLowerCase();
        if (nm.indexOf('wheel') >= 0) wheels.push({node: n, isFront: nm.indexOf('front') >= 0});
      });
      g.userData.ff23Modelled = true;
      var fd2 = wrapper.userData.ff24 || {len: 4.1, wid: 2.0};
      g.userData.ff24Radius = Math.sqrt(Math.pow(fd2.len / 2, 2) + Math.pow(fd2.wid / 2, 2)) * 0.7;
      modelledCars.push({group: g, wheels: wheels, spin: 0, steer: 0, id: 'core' + i, radius: g.userData.ff24Radius});
    }catch(e){ warn('core car install failed', e); }
  });
}
function addDrawerButtons(){
  var sys = document.getElementById('ff-drawer-sys');
  if (!sys || document.getElementById('ff23-backpack-btn')) return;
  var b = document.createElement('button');
  b.id = 'ff23-backpack-btn'; b.className = 'acircle'; b.textContent = '🎒';
  b.title = 'کوله‌پشتی: نمایش/پنهان';
  b.onclick = function(){ backpackOn = !backpackOn; if (backpackGroup) backpackGroup.visible = backpackOn; };
  sys.appendChild(b);
}
window.FFModels = {
  player: null,
  npcEntries: modelledNPCs, // 3.0.0: city30 drives Wave/Greet/Talk on idle NPCs through this list
  setNPCAnim: function(entry, name, holdMs){
    if (!entry || !entry.actions) return false;
    var a = entry.actions[name]; if (!a) return false;
    try{
      var prev = entry.actions[entry.current];
      if (prev) prev.fadeOut(0.2);
      a.reset().fadeIn(0.2).play();
      entry.current = a._clip.name;
      if (holdMs) entry.ff30HoldUntil = performance.now() + holdMs;
      return true;
    }catch(e){ return false; }
  },
  cars: modelledCars, // 2.4.0: live list for the GTA camera's vehicle collision
  get backpackOn(){ return backpackOn; },
  setBackpack: function(v){ backpackOn = !!v; if (backpackGroup) backpackGroup.visible = backpackOn; return backpackOn; },
  toggleBackpack: function(){ return this.setBackpack(!backpackOn); }
};
// Load templates, then install as the scene appears (player/NPCs/cars only
// exist after Play is pressed, and GTA builds on a poll).
var toLoad = CHAR_FILES.concat(Object.keys(CAR_FILES).map(function(k){ return CAR_FILES[k]; }));
var loaded = 0;
toLoad.forEach(function(f){
  loadGLB(f).then(function(g){
    templates[f] = g; loaded++;
    log('loaded', f, '(' + loaded + '/' + toLoad.length + ')');
  }).catch(function(e){ warn('template failed (fallback stays)', f, e && e.message); });
});
setInterval(function(){
  try{ installPlayer(); }catch(e){}
  try{ installNPCs(); }catch(e){}
  try{ installPeds(); }catch(e){}
  try{ installCars(); }catch(e){}
  try{ addDrawerButtons(); }catch(e){}
}, 900);
loop();
})();
