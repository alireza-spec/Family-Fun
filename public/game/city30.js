/* Family Fun 3.0.0 — THE BIG REBUILD LAYER.
   Engine decision (kept, on purpose): Three.js 0.158.0 stays. Switching
   engines would throw away quests, jobs, GTA police/wanted, save,
   enter-car, collisions and the Persian UI and ship a broken tech demo.
   Everything below upgrades what the player actually sees and does,
   inside the 2.8.0 performance budget (DPR caps, player-following
   90x90 shadow box, small props cast no shadow, NPC animation LOD,
   throttled HUD, dt clamp 0.05, FPS meter).
   Contents:
   - 4 residential houses with gardens (fence, hedge, flower bed, path,
     mailbox) + 3 market stalls + a playground, all colliders registered.
   - REAL Gobkit GLB trees/bushes/rocks, instanced (1-2 draw calls each),
     plus 5 drifting GLB clouds.
   - Stars + moon driven by the real game clock (window.gameTime).
   - Rain toggle (drawer button, persisted) with falling drops + rain sound.
   - A pet corgi that follows the player (Walk/Idle) + a park dog, and
     seated/talking figures (OfficeManager Sit, Receptionist Talk) placed
     by hand — no wandering, so they never walk away from their spot.
   - 10 collectible gold coins (one InstancedMesh, spin + pickup).
   - DYNAMIC objective marker: the 2.7.0 static plaza ring is MOVED to
     the real current quest target (NPC position / location / job site).
   - Surface footsteps with real files (grass / stone / wood) via .b64
     blob URLs, and truck pass-by ambient events.
   Everything is try/catch and poll-based: dressing can never break
   gameplay, and nothing here replaces initGame or the central loop. */
(function(){
'use strict';
var done = false, built = false;
var mixers = [], clouds = [], rainPts = null, rainOn = false;
var pet = null, parkDog = null, coins = null, coinData = [];
var footBlobs = {}, truckBlob = null;

function T(){ return window.THREE; }
function S(){ return window.scene; }
function mat(c, o){
  o = o || {};
  if (window.FFTextures) return window.FFTextures.material(c, o.tex, o);
  return new T().MeshStandardMaterial({color: c, roughness: o.roughness !== undefined ? o.roughness : 0.9, metalness: o.metalness || 0});
}
function box(w, h, d, m, x, y, z, parent, cast){
  var mesh = new T().Mesh(new T().BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = !!cast; mesh.receiveShadow = true;
  (parent || S()).add(mesh); return mesh;
}
function flat(w, d, m, x, z, y){
  var mesh = new T().Mesh(new T().PlaneGeometry(w, d), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y === undefined ? 0.045 : y, z);
  mesh.receiveShadow = true; S().add(mesh); return mesh;
}
function collider(x, z, hx, hz, h){
  try{ if (window.FFLogic && window.FFLogic.colliders) window.FFLogic.colliders.push([x, z, hx, hz, h]); }catch(e){}
}
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
function texFile(name, mime){
  // Texture from public/textures/<name>, with .b64 fallback (connector push is text-only).
  return new Promise(function(resolve){
    var loader = new T().TextureLoader();
    loader.load('textures/' + name, function(t){ t.colorSpace = T().SRGBColorSpace; resolve(t); }, undefined, function(){
      fetch('textures/' + name + '.b64').then(function(r){ return r.text(); }).then(function(t){
        var u = b64ToBlobURL(t, mime || 'image/jpeg');
        if (!u){ resolve(null); return; }
        loader.load(u, function(t2){ t2.colorSpace = T().SRGBColorSpace; resolve(t2); }, undefined, function(){ resolve(null); });
      }).catch(function(){ resolve(null); });
    });
  });
}
function measureSkinned(scene){
  // Same robust method as models23 fitCharacter: Box3 ignores skinning.
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
        var v = new T().Vector4(), tmp = new T().Vector4(), skin = new T().Vector4();
        for (var i = 0; i < pos.count; i++){
          v.set(pos.getX(i), pos.getY(i), pos.getZ(i), 1).applyMatrix4(bind);
          skin.set(0, 0, 0, 0);
          for (var k = 0; k < 4; k++){
            var ji = jt[i * 4 + k], w = wt[i * 4 + k]; if (!w) continue;
            tmp.copy(v).applyMatrix4(new T().Matrix4().fromArray(bm, ji * 16)).multiplyScalar(w);
            skin.add(tmp);
          }
          skin.applyMatrix4(bindInv);
          var wv = new T().Vector3(skin.x, skin.y, skin.z).applyMatrix4(mw);
          if (wv.y < minY) minY = wv.y; if (wv.y > maxY) maxY = wv.y; found = true;
        }
      }catch(e){}
    });
    if (found && maxY - minY > 0.05) return {height: maxY - minY, minY: minY};
  }catch(e){}
  return null;
}
function fitFigure(scene, targetH){
  var wrapper = new T().Group();
  try{
    var m = measureSkinned(scene), s, footY;
    if (m){ s = (targetH || 1.8) / m.height; footY = m.minY * s; }
    else {
      var b = new T().Box3().setFromObject(scene); var sz = new T().Vector3(); b.getSize(sz);
      s = 1.8 / Math.max(sz.y, 0.1); footY = 0;
    }
    scene.scale.setScalar(s); scene.position.y = -footY;
    scene.traverse(function(o){ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  }catch(e){}
  wrapper.add(scene); return wrapper;
}
function cloneSkinned(template){
  if (window.FFSkeletonUtils && window.FFSkeletonUtils.clone) return window.FFSkeletonUtils.clone(template.scene);
  return template.scene.clone(true);
}
function makeMixer(wrapper, template, initial){
  try{
    if (template.animations && template.animations.length){
      var mixer = new T().AnimationMixer(wrapper), actions = {};
      template.animations.forEach(function(clip){ try{ actions[clip.name] = mixer.clipAction(clip); }catch(e){} });
      var first = actions[initial] || actions['Idle'] || actions['idle'] || actions[Object.keys(actions)[0]];
      if (first) first.play();
      var entry = {mixer: mixer, actions: actions, current: first ? first._clip.name : null};
      mixers.push(entry); return entry;
    }
  }catch(e){}
  return null;
}
function setAnim(entry, name){
  if (!entry || !entry.actions) return;
  var a = entry.actions[name] || entry.actions[name.charAt(0).toUpperCase() + name.slice(1)] || entry.actions[name.toLowerCase()];
  if (!a || entry.current === a._clip.name) return;
  try{
    var prev = entry.actions[entry.current];
    if (prev) prev.fadeOut(0.2);
    a.reset().fadeIn(0.2).play(); entry.current = a._clip.name;
  }catch(e){}
}

/* ---------------- houses, market, playground ---------------- */
function buildHouses(){
  var wallMats = [], soilMats = [], pathMats = [];
  texFile('facade2.jpg').then(function(t){ if (t) wallMats.forEach(function(m){ m.map = t; m.bumpMap = t; m.needsUpdate = true; }); });
  texFile('plaza.jpg').then(function(t){ if (t) pathMats.forEach(function(m){ m.map = t; m.needsUpdate = true; }); });
  texFile('soil.jpg').then(function(t){ if (t) soilMats.forEach(function(m){ m.map = t; m.needsUpdate = true; }); });
  // Positions verified clear of roads (x=0, z=0, x=-32, z=32), the
  // city27 district buildings, and the park block.
  var houses = [
    {x: 30, z: 44, c: 0xe8c9a0, roof: 0xa83a2a},
    {x: -30, z: 44, c: 0xc9d6e8, roof: 0x5a3d2a},
    {x: 30, z: -44, c: 0xd6e8c9, roof: 0x8a2a2a},
    {x: -30, z: -44, c: 0xe8d6c9, roof: 0x2a5a8a}
  ];
  houses.forEach(function(h){
    var g = new T().Group(); g.position.set(h.x, 0, h.z); S().add(g);
    var wallM = mat(h.c, {tex: 'brick'}); wallMats.push(wallM);
    box(6, 4.5, 6, wallM, 0, 2.25, 0, g, true);
    // Pyramid roof.
    var roof = new T().Mesh(new T().ConeGeometry(4.6, 2.0, 4), mat(h.roof, {tex: 'roof', roughness: 0.8}));
    roof.position.set(0, 5.5, 0); roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    // Door + lit windows on the street side (facing the centre).
    var face = h.z > 0 ? -1 : 1;
    box(1.1, 2.1, 0.15, mat(0x4a2c14, {tex: 'wood'}), 0, 1.05, face * 3.05, g);
    var litM = new T().MeshStandardMaterial({color: 0xffe9a8, emissive: 0xffc95c, emissiveIntensity: 0.7});
    var winM = new T().MeshStandardMaterial({color: 0x1c2b3a, roughness: 0.2, metalness: 0.3});
    [-1.8, 1.8].forEach(function(wx, wi){
      var wm = new T().Mesh(new T().PlaneGeometry(1.1, 1.2), wi === 0 ? litM : winM);
      wm.position.set(wx, 2.2, face * 3.06); if (face < 0) wm.rotation.y = Math.PI; g.add(wm);
    });
    // Porch + path + garden: fence, hedge, flower bed, mailbox.
    box(2.4, 0.15, 1.4, mat(0x8a5a32, {tex: 'wood'}), 0, 0.08, face * 3.8, g);
    var pathM = mat(0xc9bba6, {tex: 'sidewalk'}); pathMats.push(pathM);
    box(1.6, 0.06, 2.2, pathM, 0, 0.03, face * 5.0, g);
    var fenceM = mat(0xefe8dc, {roughness: 0.8});
    box(7, 0.9, 0.12, fenceM, 0, 0.45, face * 6.2, g);
    box(0.12, 0.9, 7, fenceM, -3.5, 0.45, face * 2.6, g);
    box(0.12, 0.9, 7, fenceM, 3.5, 0.45, face * 2.6, g);
    box(2.6, 0.7, 1.2, mat(0x2d6a2d, {roughness: 1}), -1.9, 0.35, face * 4.6, g);
    var soilM = mat(0x4a3220, {roughness: 1}); soilMats.push(soilM);
    box(2.2, 0.35, 1.0, soilM, 1.9, 0.18, face * 4.6, g);
    var blooms = [0xe91e63, 0xffeb3b, 0xff7043, 0xffffff];
    for (var fi = 0; fi < 4; fi++){
      var f = new T().Mesh(new T().SphereGeometry(0.15, 8, 6), new T().MeshStandardMaterial({color: blooms[fi], roughness: 0.6}));
      f.position.set(1.15 + fi * 0.5, 0.45, face * 4.6); g.add(f);
    }
    box(0.35, 0.5, 0.25, mat(0x2a5a8a, {metalness: 0.3, roughness: 0.5}), 2.8, 0.9, face * 6.2, g);
    collider(h.x, h.z, 3.1, 3.1, 6.5);
  });
  // Market stalls (street side, clear of the tree row at z=38 and the
  // district building at (20,44)).
  var signs = [['بازار', '🛍️', 0xc0392b], ['میوه', '🍎', 0x27ae60], ['نان', '🍞', 0xd4a017]];
  [[-14, 40.5], [-8, 40.5], [34, 40.5]].forEach(function(p, si){
    var g = new T().Group(); g.position.set(p[0], 0, p[1]); g.rotation.y = Math.PI; S().add(g);
    box(3.0, 0.9, 1.6, mat(0x8a5a32, {tex: 'wood'}), 0, 0.45, 0, g);
    [[-1.4, -0.7], [1.4, -0.7], [-1.4, 0.7], [1.4, 0.7]].forEach(function(pp){
      box(0.12, 2.3, 0.12, mat(0x25313d, {metalness: 0.4}), pp[0], 1.15, pp[1], g);
    });
    var awn = box(3.4, 0.12, 2.0, new T().MeshStandardMaterial({color: signs[si][2], roughness: 0.8}), 0, 2.35, 0, g);
    awn.castShadow = false;
    try{
      if (window.FFTextures){
        var st = new T().Mesh(new T().PlaneGeometry(2.6, 0.65), new T().MeshBasicMaterial({map: window.FFTextures.sign(signs[si][0], signs[si][1], '#ffd166')}));
        st.position.set(0, 2.0, -0.85); g.add(st);
      }
    }catch(e){}
    // Goods: fruit crates / bread baskets (coloured spheres + boxes).
    for (var gi = 0; gi < 4; gi++){
      var good = new T().Mesh(new T().SphereGeometry(0.16, 8, 6), new T().MeshStandardMaterial({color: [0xe74c3c, 0xf39c12, 0x27ae60, 0xe8c9a0][gi], roughness: 0.7}));
      good.position.set(-1.0 + gi * 0.65, 1.05, 0); g.add(good);
    }
    collider(p[0], p[1], 1.7, 1.1, 2.4);
  });
  // Playground next to the park block (-20, 20).
  (function(){
    var g = new T().Group(); g.position.set(-20, 0, 20); S().add(g);
    var slide = box(0.8, 0.15, 3.2, mat(0xe74c3c, {roughness: 0.4}), 1.2, 1.0, 0, g);
    slide.rotation.x = -0.5;
    box(0.8, 1.1, 0.15, mat(0x2980b9, {roughness: 0.5}), 1.2, 0.55, 1.55, g);
    [[-1.6, -1.2], [-1.6, 1.2]].forEach(function(pp){
      box(0.12, 2.4, 0.12, mat(0x25313d, {metalness: 0.4}), pp[0], 1.2, pp[1], g);
    });
    box(0.15, 0.15, 2.8, mat(0x25313d, {metalness: 0.4}), -1.6, 2.4, 0, g);
    [-0.7, 0.7].forEach(function(sz){
      box(0.5, 0.08, 0.4, mat(0xf39c12, {roughness: 0.7}), -1.6, 1.5, sz, g);
    });
    box(3.0, 0.25, 2.4, mat(0xd6c9a0, {roughness: 1}), -1.0, 0.13, -2.6, g);
    collider(-20, 20, 3.2, 3.2, 1.2);
  })();
}

/* ---------------- real GLB nature, instanced ---------------- */
function instancedFromGLB(file, spots, targetH, matOverride){
  return loadGLB(file).then(function(g){
    var mesh = null;
    g.scene.traverse(function(o){ if (!mesh && o.isMesh) mesh = o; });
    if (!mesh) return;
    var geo = mesh.geometry;
    var b = new T().Box3().setFromObject(g.scene); var sz = new T().Vector3(); b.getSize(sz);
    var sc = targetH / Math.max(sz.y, 0.1);
    var inst = new T().InstancedMesh(geo, matOverride || mesh.material, spots.length);
    var m4 = new T().Matrix4(), q = new T().Quaternion(), one = new T().Vector3(1, 1, 1);
    var rot = new T().Quaternion(), eul = new T().Euler();
    spots.forEach(function(p, i){
      eul.set(0, p[2] || 0, 0); rot.setFromEuler(eul);
      var s = sc * (p[3] || 1);
      m4.compose(new T().Vector3(p[0], -b.min.y * s, p[1]), rot, new T().Vector3(s, s, s));
      inst.setMatrixAt(i, m4);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false; inst.receiveShadow = true; // 2.8.0: small props cast no shadow
    S().add(inst);
  }).catch(function(){});
}
function buildNature(){
  var spots = [], bushes = [], rocks = [];
  function clearOf(x, z){
    if (Math.abs(x) < 4 || Math.abs(z) < 4) return false;
    if (Math.abs(x + 32) < 4 || Math.abs(z - 32) < 4) return false;
    if (Math.abs(x) < 14 && Math.abs(z) < 13) return false; // house block
    if (x > -30 && x < -10 && z > 16 && z < 32) return false; // park block
    if (x > 24 && x < 36 && z > 38 && z < 50) return false; // house (30,44)
    if (x > -36 && x < -24 && z > 38 && z < 50) return false; // house (-30,44)
    return true;
  }
  var rnd = (function(){ var seed = 42; return function(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; })();
  for (var i = 0; i < 60; i++){
    var x = (rnd() * 2 - 1) * 58, z = (rnd() * 2 - 1) * 58;
    if (!clearOf(x, z)) continue;
    spots.push([x, z, rnd() * Math.PI * 2, 0.85 + rnd() * 0.4]);
    if (bushes.length < 24 && rnd() < 0.5) bushes.push([x + 2.5, z + 2, rnd() * Math.PI * 2, 0.8 + rnd() * 0.5]);
    if (rocks.length < 14 && rnd() < 0.3) rocks.push([x - 2.5, z - 2, rnd() * Math.PI * 2, 0.7 + rnd() * 0.6]);
  }
  instancedFromGLB('prop-tree-low.glb', spots.filter(function(_, i){ return i % 3 === 0; }), 2.6);
  instancedFromGLB('prop-tree-med.glb', spots.filter(function(_, i){ return i % 3 === 1; }), 4.2);
  instancedFromGLB('prop-tree-high.glb', spots.filter(function(_, i){ return i % 3 === 2; }), 6.0);
  instancedFromGLB('prop-bush.glb', bushes, 0.9);
  instancedFromGLB('prop-rock.glb', rocks, 0.7);
  // Drifting clouds (5 real GLB clouds, high up, slow drift).
  loadGLB('prop-cloud.glb').then(function(g){
    var mesh = null;
    g.scene.traverse(function(o){ if (!mesh && o.isMesh) mesh = o; });
    if (!mesh) return;
    for (var ci = 0; ci < 5; ci++){
      var c = new T().Mesh(mesh.geometry, mesh.material);
      // 3.0.0 unit fix: Gobkit props are NOT in metres — the cloud GLB is
      // 235 units tall in file space, so scale to ~12-16 units, not 6x.
      c.scale.setScalar(0.05 + ci * 0.008);
      c.position.set(-60 + ci * 28, 26 + (ci % 3) * 4, -40 + (ci % 2) * 50);
      c.material = mesh.material.clone(); c.material.transparent = true; c.material.opacity = 0.85;
      S().add(c); clouds.push(c);
    }
  }).catch(function(){});
}

/* ---------------- sky: stars + moon on the real clock ---------------- */
var stars = null, moon = null;
function buildSky(){
  try{
    var n = 320, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++){
      var a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI * 0.45 + 0.1, r = 175;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
      pos[i * 3 + 1] = Math.sin(e) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    var geo = new T().BufferGeometry();
    geo.setAttribute('position', new T().BufferAttribute(pos, 3));
    var m = new T().PointsMaterial({color: 0xffffff, size: 1.4, transparent: true, opacity: 0, depthWrite: false});
    stars = new T().Points(geo, m); S().add(stars);
    moon = new T().Mesh(new T().CircleGeometry(6, 24), new T().MeshBasicMaterial({color: 0xf4f1de, transparent: true, opacity: 0, fog: false}));
    moon.position.set(-90, 110, -120); moon.lookAt(0, 0, 0); S().add(moon);
  }catch(e){}
}
function nightFactor(){
  try{
    var gt = window.gameTime || 480;
    var t = (gt % 1440) / 1440;
    var daylight = Math.max(0, Math.sin((t - 0.25) * Math.PI * 2));
    return 1 - daylight;
  }catch(e){ return 0; }
}

/* ---------------- rain ---------------- */
function buildRain(){
  try{
    var n = 500, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++){ pos[i * 3] = (Math.random() - 0.5) * 44; pos[i * 3 + 1] = Math.random() * 20; pos[i * 3 + 2] = (Math.random() - 0.5) * 44; }
    var geo = new T().BufferGeometry();
    geo.setAttribute('position', new T().BufferAttribute(pos, 3));
    rainPts = new T().Points(geo, new T().PointsMaterial({color: 0xaaccff, size: 0.14, transparent: true, opacity: 0.7, depthWrite: false}));
    rainPts.visible = false; rainPts.frustumCulled = false; S().add(rainPts);
  }catch(e){}
}
function setRain(on){
  rainOn = !!on;
  try{ localStorage.setItem('ff-rain', rainOn ? '1' : '0'); }catch(e){}
  try{ if (rainPts) rainPts.visible = rainOn; }catch(e){}
  try{ if (window.FFAudio && window.FFAudio.setRain) window.FFAudio.setRain(rainOn); }catch(e){}
  var b = document.getElementById('ff30-rain-btn');
  if (b) b.style.opacity = rainOn ? '1' : '0.55';
}
function addRainButton(){
  var sys = document.getElementById('ff-drawer-sys');
  if (!sys || document.getElementById('ff30-rain-btn')) return;
  var b = document.createElement('button');
  b.id = 'ff30-rain-btn'; b.className = 'acircle'; b.textContent = '🌧️';
  b.title = 'باران: روشن/خاموش';
  b.style.opacity = rainOn ? '1' : '0.55';
  b.onclick = function(){ setRain(!rainOn); };
  sys.appendChild(b);
  try{ if (localStorage.getItem('ff-rain') === '1') setRain(true); }catch(e){}
}

/* ---------------- corgi pet + park dog ---------------- */
function buildDogs(){
  loadGLB('pet-corgi.glb').then(function(g){
    try{
      var clone = cloneSkinned(g);
      var b = new T().Box3().setFromObject(clone); var sz = new T().Vector3(); b.getSize(sz);
      var sc = 0.55 / Math.max(sz.y, 0.1);
      clone.scale.setScalar(sc); clone.position.y = -b.min.y * sc;
      var wrapper = new T().Group(); wrapper.add(clone); S().add(wrapper);
      var entry = makeMixer(wrapper, g, 'idle');
      pet = {group: wrapper, entry: entry, prev: null};
      var clone2 = cloneSkinned(g);
      clone2.scale.setScalar(sc); clone2.position.y = -b.min.y * sc;
      var wrapper2 = new T().Group(); wrapper2.add(clone2); wrapper2.position.set(-20, 0, 26); S().add(wrapper2);
      var entry2 = makeMixer(wrapper2, g, 'walk');
      parkDog = {group: wrapper2, entry: entry2, ang: 0};
    }catch(e){}
  }).catch(function(){});
}

/* ---------------- seated + talking figures ---------------- */
function buildFigures(){
  loadGLB('char-officemanager.glb').then(function(g){
    try{
      var wrapper = fitFigure(cloneSkinned(g), 1.8);
      wrapper.position.set(-24.5, 0, 24.5); wrapper.rotation.y = Math.PI * 0.75; S().add(wrapper);
      var entry = makeMixer(wrapper, g, 'Sit');
      if (entry) entry.ff30Static = true;
    }catch(e){}
  }).catch(function(){});
  loadGLB('char-receptionist.glb').then(function(g){
    try{
      var wrapper = fitFigure(cloneSkinned(g), 1.8);
      wrapper.position.set(-14, 0, 39.2); wrapper.rotation.y = Math.PI; S().add(wrapper);
      var entry = makeMixer(wrapper, g, 'Talk');
      if (entry) entry.ff30Static = true;
    }catch(e){}
  }).catch(function(){});
}

/* ---------------- collectible coins ---------------- */
function buildCoins(){
  try{
    var spots = [[-10, 44], [-20, 26], [-14, 40.5], [3, 20], [18, 5], [12, -15], [-18, 8], [28, 12], [5, 15], [-15, -5]];
    var geo = new T().CylinderGeometry(0.35, 0.35, 0.08, 20);
    geo.rotateX(Math.PI / 2);
    coins = new T().InstancedMesh(geo, new T().MeshStandardMaterial({color: 0xffd700, metalness: 0.8, roughness: 0.25, emissive: 0xaa7700, emissiveIntensity: 0.5}), spots.length);
    coins.castShadow = false; S().add(coins);
    coinData = spots.map(function(p){ return {x: p[0], z: p[1], taken: false, phase: Math.random() * 6}; });
  }catch(e){}
}

/* ---------------- dynamic objective marker ---------------- */
var LOCMAP = {
  home: [0, 0], boutique: [18, 5], hospital: [12, -15], school: [5, 15], garage: [-18, 8],
  showroom: [28, 12], therapy: [-10, -20], library: [8, -25], bank: [20, -20], mosque: [-15, -5],
  cafe: [3, 20], wedding: [25, 25], gamenet: [-20, 15], studio: [22, -10], dojo: [-8, 25]
};
var JOBLOC = {cafe: [3, 20], library: [8, -25], garage: [-18, 8], taxi: [28, 12], delivery: [3, 20], gardener: [-20, 26], firefighter: [12, -15]};
function resolveObjective(){
  try{
    var q = window.FFQuests, st = q && q.state;
    if (!q || st === undefined) return [-10, 44];
    var cur = q.data && q.data[st.current];
    if (!cur) return [-10, 44];
    var step = cur.steps && cur.steps[st.step];
    if (!step || !step.target) return [-10, 44];
    var t = step.target;
    if (t.type === 'talk'){
      var list = window.npcs || [];
      for (var i = 0; i < list.length; i++){
        if (list[i].userData && list[i].userData.id === t.npc) return [list[i].position.x, list[i].position.z];
      }
      return [-10, 44];
    }
    if (t.type === 'enter' && LOCMAP[t.loc]) return LOCMAP[t.loc];
    if (t.type === 'job'){
      // Point at the most likely job site (jobs are picked from the drawer; the marker
      // defaults to the cafe, the first job site, when no job is selected yet).
      return JOBLOC.cafe;
    }
    if (t.type === 'talkAny'){
      var pg = window.playerGroup, best = null, bd = 1e9;
      (window.npcs || []).forEach(function(n){
        var d = pg ? Math.hypot(n.position.x - pg.position.x, n.position.z - pg.position.z) : 0;
        if (d < bd){ bd = d; best = n; }
      });
      if (best) return [best.position.x, best.position.z];
    }
  }catch(e){}
  return [-10, 44];
}
function updateObjectiveMarker(){
  try{
    var ring = window.FFQuiet27Ring;
    if (!ring) return;
    var p = resolveObjective();
    ring.position.set(p[0], 0.08, p[1]);
    window.FF30Objective = {x: p[0], z: p[1]};
  }catch(e){}
}

/* ---------------- footsteps + truck ambience ---------------- */
function surfaceAt(x, z){
  if (Math.abs(x) < 12 && Math.abs(z) < 10) return 'wood';
  if (Math.abs(z) < 4 || Math.abs(x) < 4) return 'pavement';
  return 'grass';
}
function preloadFootBlobs(){
  ['footstep-grass.mp3', 'footstep-stone.mp3', 'footstep-wood.mp3'].forEach(function(f){
    fetch('audio/' + f + '.b64').then(function(r){ return r.text(); }).then(function(t){
      var u = b64ToBlobURL(t, 'audio/mpeg'); if (u) footBlobs[f] = u;
    }).catch(function(){});
  });
  fetch('audio/engine-truck.mp3.b64').then(function(r){ return r.text(); }).then(function(t){
    var u = b64ToBlobURL(t, 'audio/mpeg');
    if (u){
      truckBlob = u;
      try{
        if (window.FF23Ambient && window.FF23Ambient.events) window.FF23Ambient.events.push({file: u, vol: 0.20, label: 'truck pass-by', pass: true});
      }catch(e){}
    }
  }).catch(function(){});
}
function installFootsteps(){
  try{
    if (!window.FFAudio || window.FFAudio._ff30Footsteps) return;
    window.FFAudio._ff30Footsteps = true;
    window.FFAudio.footstep = function(){
      var p = window.playerGroup ? window.playerGroup.position : {x: 0, z: 0};
      var s = surfaceAt(p.x, p.z);
      var file = s === 'pavement' ? 'footstep-stone.mp3' : s === 'wood' ? 'footstep-wood.mp3' : 'footstep-grass.mp3';
      try{
        var a = new Audio(footBlobs[file] || ('audio/' + file));
        a.playbackRate = s === 'pavement' ? 1.12 : s === 'wood' ? 0.85 : 0.95 + Math.random() * 0.2;
        a.volume = window.FFAudio.muted ? 0 : (s === 'pavement' ? 0.38 : s === 'wood' ? 0.30 : 0.34) * window.FFAudio.volume;
        var pp = a.play(); if (pp && pp.catch) pp.catch(function(){});
      }catch(e){}
    };
  }catch(e){}
}

/* ---------------- NPC wave/greet near the player ---------------- */
var lastWave = 0;
function npcWaves(){
  try{
    if (!window.FFModels || !window.FFModels.setNPCAnim || !window.FFModels.npcEntries) return;
    var now = Date.now();
    if (now - lastWave < 6000) return;
    var pg = window.playerGroup; if (!pg) return;
    var cands = window.FFModels.npcEntries.filter(function(rec){
      if (!rec || !rec.entry || !rec.group) return false;
      var d = Math.hypot(rec.group.position.x - pg.position.x, rec.group.position.z - pg.position.z);
      return d < 5 && d > 0.5;
    });
    if (!cands.length) return;
    var rec = cands[Math.floor(Math.random() * cands.length)];
    var acted = window.FFModels.setNPCAnim(rec.entry, 'Wave', 2600) || window.FFModels.setNPCAnim(rec.entry, 'Greet', 2600) || window.FFModels.setNPCAnim(rec.entry, 'Talk', 4000);
    if (acted) lastWave = now;
  }catch(e){}
}

/* ---------------- minimap N marker + round canvas ---------------- */
function addMinimapN(){
  try{
    var cv = document.getElementById('mm-canvas');
    if (!cv) return;
    cv.style.borderRadius = '50%';
    var n = document.getElementById('ff30-north');
    if (!n){
      n = document.createElement('div');
      n.id = 'ff30-north'; n.textContent = 'N';
      n.style.cssText = 'position:fixed;font-size:10px;font-weight:900;color:#ffd700;pointer-events:none;z-index:60;text-shadow:0 1px 3px #000;';
      document.body.appendChild(n);
    }
    var r = cv.getBoundingClientRect();
    if (r.width > 0){ n.style.left = (r.left + r.width / 2 - 4) + 'px'; n.style.top = (r.top + 1) + 'px'; n.style.display = 'block'; }
  }catch(e){}
}

/* ---------------- main loop (cheap: ~25 objects) ---------------- */
var lastT = performance.now(), objT = 0, waveT = 0;
function loop(){
  requestAnimationFrame(loop);
  var now = performance.now();
  var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
  lastT = now;
  try{
    var running = !!window.isGameRunning;
    // Mixers for city30 figures + dogs (static figures animate always once loaded).
    mixers.forEach(function(e){ try{ e.mixer.update(dt); }catch(err){} });
    // Clouds drift.
    clouds.forEach(function(c, i){
      c.position.x += dt * (0.6 + i * 0.15);
      if (c.position.x > 90) c.position.x = -90;
    });
    // Stars/moon follow the real clock.
    var nf = nightFactor();
    if (stars) stars.material.opacity = nf * 0.9;
    if (moon) moon.material.opacity = nf * 0.95;
    // Rain falls around the player.
    if (rainPts && rainPts.visible){
      var pg = window.playerGroup;
      var arr = rainPts.geometry.attributes.position.array;
      for (var i = 0; i < arr.length; i += 3){
        arr[i + 1] -= dt * 26;
        if (arr[i + 1] < 0){
          arr[i + 1] = 18 + Math.random() * 3;
          var bx = pg ? pg.position.x : 0, bz = pg ? pg.position.z : 0;
          arr[i] = bx + (Math.random() - 0.5) * 44;
          arr[i + 2] = bz + (Math.random() - 0.5) * 44;
        }
      }
      rainPts.geometry.attributes.position.needsUpdate = true;
      if (pg) rainPts.position.set(0, 0, 0);
    }
    if (running){
      // Pet follows the player.
      if (pet && window.playerGroup){
        var pp = window.playerGroup.position, gp = pet.group.position;
        var dx = pp.x - gp.x, dz = pp.z - gp.z;
        var dist = Math.hypot(dx, dz);
        if (dist > 2.4){
          var sp = 3.6 * dt;
          gp.x += dx / dist * sp; gp.z += dz / dist * sp;
          pet.group.rotation.y = Math.atan2(dx, dz);
          setAnim(pet.entry, 'walk');
        } else setAnim(pet.entry, 'idle');
        pet.group.position.y = 0;
      }
      // Park dog wanders a circle.
      if (parkDog){
        parkDog.ang += dt * 0.35;
        var cx = -20 + Math.cos(parkDog.ang) * 5, cz = 26 + Math.sin(parkDog.ang) * 4;
        parkDog.group.position.set(cx, 0, cz);
        parkDog.group.rotation.y = Math.atan2(-Math.sin(parkDog.ang), Math.cos(parkDog.ang)) + Math.PI / 2;
      }
      // Coins spin + pickup.
      if (coins && window.playerGroup){
        var m4 = new T().Matrix4(), q = new T().Quaternion(), e = new T().Euler(), one = new T().Vector3(1, 1, 1);
        var t = now / 1000;
        coinData.forEach(function(cd, i){
          if (cd.taken){ m4.compose(new T().Vector3(cd.x, -10, cd.z), q, new T().Vector3(0.001, 0.001, 0.001)); }
          else {
            e.set(0, t + cd.phase, 0); q.setFromEuler(e);
            m4.compose(new T().Vector3(cd.x, 0.7 + Math.sin(t * 2 + cd.phase) * 0.15, cd.z), q, one);
            var pd = Math.hypot(window.playerGroup.position.x - cd.x, window.playerGroup.position.z - cd.z);
            if (pd < 1.3){
              cd.taken = true;
              try{ if (window.FFEconomy) window.FFEconomy.add(5, 'سکه طلایی'); }catch(err){}
              try{ if (window.FFAudio) window.FFAudio.coin(); }catch(err){}
              try{ if (window.showToast) window.showToast('🪙 سکه طلایی! +۵'); }catch(err){}
            }
          }
          coins.setMatrixAt(i, m4);
        });
        coins.instanceMatrix.needsUpdate = true;
      }
      if (now - objT > 500){ objT = now; updateObjectiveMarker(); }
      if (now - waveT > 3000){ waveT = now; npcWaves(); }
    }
  }catch(e){ /* city dressing never breaks gameplay */ }
}

function build(){
  if (built || !window.scene || !window.THREE) return;
  built = true;
  try{ buildHouses(); }catch(e){}
  try{ buildNature(); }catch(e){}
  try{ buildSky(); }catch(e){}
  try{ buildRain(); }catch(e){}
  try{ buildDogs(); }catch(e){}
  try{ buildFigures(); }catch(e){}
  try{ buildCoins(); }catch(e){}
  try{ preloadFootBlobs(); }catch(e){}
  try{ updateObjectiveMarker(); }catch(e){}
  loop();
}
setInterval(function(){
  try{ build(); }catch(e){}
  try{ addRainButton(); }catch(e){}
  try{ addMinimapN(); }catch(e){}
  try{ installFootsteps(); }catch(e){}
}, 900);
window.FF30 = {
  get objective(){ return window.FF30Objective || {x: -10, z: 44}; },
  get rain(){ return rainOn; },
  setRain: setRain
};
})();
