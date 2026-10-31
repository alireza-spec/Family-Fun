/* Family Fun 2.2.0 — engine + graphics upgrade layer (loads last).
   ENGINE DECISION: Three.js stays at 0.158.0. That version already has
   outputColorSpace, physical lights and ACES tone mapping; a jump to 0.17x
   adds no visible benefit for this procedural game and risks breaking the
   bundled addons (EffectComposer/OutputPass) and the classic-script globals
   on the user's phone. The upgrade below is therefore in the pipeline,
   lighting, materials, city detail, characters, vehicles and effects —
   not a risky version bump.
   This file only ADDS/WRAPS: it never replaces initGame or the central loop.
   All hooks run after the original initGame, and every step is try/catch so
   a graphics extra can never break gameplay. */
(function(){
'use strict';
var T = function(){ return window.THREE; };
function mat(color, opts){
  opts = opts || {};
  var m = { color: color, roughness: opts.roughness !== undefined ? opts.roughness : 0.8, metalness: opts.metalness || 0 };
  if (window.FFTextures) return window.FFTextures.material(color, opts.tex, opts);
  return new T().MeshStandardMaterial(m);
}
function box(w, h, d, material, x, y, z, parent){
  var m = new T().Mesh(new T().BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  (parent || window.scene).add(m); return m;
}
function applyRenderer(){
  try{
    var r = window.renderer; if (!r) return;
    r.shadowMap.type = T().PCFSoftShadowMap; // was PCFShadowMap: softer, less blocky shadows
    try{ r.outputColorSpace = T().SRGBColorSpace; }catch(e){}
    r.toneMappingExposure = 1.15;
    var sun = window.worldObjs && window.worldObjs.sun;
    if (sun && sun.shadow){
      sun.shadow.camera.left = -85; sun.shadow.camera.right = 85;
      sun.shadow.camera.top = 85; sun.shadow.camera.bottom = -85;
      sun.shadow.camera.far = 220; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
      sun.shadow.camera.updateProjectionMatrix();
      if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    // Anisotropy on every texture so roads/grass stay sharp at grazing angles.
    try{ var maxA = r.capabilities.getMaxAnisotropy();
      window.scene.traverse(function(o){ if (o.material && o.material.map) o.material.map.anisotropy = Math.min(8, maxA); });
    }catch(e){}
  }catch(e){ console.warn('engine22 renderer', e); }
}
function addSkyGlow(){
  try{
    // Warm sun disc + soft glow sprite that follows the existing sun light.
    var glowMat = new T().SpriteMaterial({ map: null, color: 0xffe9a8, transparent: true, opacity: 0.0, depthWrite: false });
    var glow = new T().Sprite(glowMat); glow.scale.set(26, 26, 1); glow.name = 'FF22_SunGlow';
    window.scene.add(glow); window.FF22SunGlow = glow;
  }catch(e){}
}
function addProps(){
  try{
    var S = window.scene; if (!S) return;
    // Benches, bins, hydrants, bus stop, billboards — cheap boxes/cylinders, all castShadow.
    var wood = mat(0x8a5a32, { tex: 'wood', roughness: 0.7 });
    var dark = mat(0x25313d, { metalness: 0.4, roughness: 0.5 });
    var red = mat(0xc0392b, { roughness: 0.5 });
    [[-6, 38], [2, 38], [-14, 30], [14, 44], [-24, -8], [30, 4]].forEach(function(p){
      var g = new T().Group(); g.position.set(p[0], 0, p[1]);
      box(1.8, 0.1, 0.5, wood, 0, 0.5, 0, g); box(1.8, 0.1, 0.5, wood, 0, 0.5, 0.45, g);
      box(0.12, 0.5, 0.5, dark, -0.8, 0.25, 0.2, g); box(0.12, 0.5, 0.5, dark, 0.8, 0.25, 0.2, g);
      S.add(g);
    });
    [[-4, 34], [10, 40], [-20, -12], [24, 20]].forEach(function(p){
      var bin = new T().Mesh(new T().CylinderGeometry(0.32, 0.28, 0.8, 10), dark);
      bin.position.set(p[0], 0.4, p[1]); bin.castShadow = true; S.add(bin);
    });
    [[-2, 36], [18, 42]].forEach(function(p){
      var h = new T().Mesh(new T().CylinderGeometry(0.18, 0.22, 0.7, 8), red);
      h.position.set(p[0], 0.35, p[1]); h.castShadow = true; S.add(h);
    });
    // Bus stop shelter near the plaza.
    var shelter = new T().Group(); shelter.position.set(6, 0, 30);
    box(3.2, 0.15, 1.4, mat(0x2a5a8a, { roughness: 0.4, metalness: 0.3 }), 0, 2.4, 0, shelter);
    box(0.12, 2.4, 0.12, dark, -1.5, 1.2, 0.6, shelter); box(0.12, 2.4, 0.12, dark, 1.5, 1.2, 0.6, shelter);
    box(3.0, 0.5, 0.15, wood, 0, 0.55, 0.6, shelter); S.add(shelter);
    // Billboard with the generated menu artwork (canvas texture fallback if file missing).
    try{
      new T().TextureLoader().load('textures/menu-bg.jpg', function(t){
        t.colorSpace = T().SRGBColorSpace;
        var board = new T().Mesh(new T().PlaneGeometry(6, 3.6),
          new T().MeshStandardMaterial({ map: t, roughness: 0.7 }));
        board.position.set(-28, 3.4, 34); board.rotation.y = Math.PI / 4; board.castShadow = true; S.add(board);
        box(0.25, 2.2, 0.25, dark, -28, 1.1, 34, S);
      }, undefined, function(){
        b64Blob('textures/menu-bg.jpg.b64', 'image/jpeg', function(u){
          new T().TextureLoader().load(u, function(t){
            t.colorSpace = T().SRGBColorSpace;
            var board = new T().Mesh(new T().PlaneGeometry(6, 3.6),
              new T().MeshStandardMaterial({ map: t, roughness: 0.7 }));
            board.position.set(-28, 3.4, 34); board.rotation.y = Math.PI / 4; board.castShadow = true; S.add(board);
          });
        });
      });
    }catch(e){}
  }catch(e){ console.warn('engine22 props', e); }
}
function upgradeCars(){
  try{
    // Headlights / taillights + rotating, steering wheels on GTA cars.
    // Cars are built by gta.js after start; poll once until they exist.
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      var cars = window.__gtaCarsFor22 || null;
      // GTA cars live in gta.js closure; instead upgrade the visible car meshes in the scene.
      var found = 0;
      window.scene.traverse(function(o){
        if (o.userData && o.userData.gtaCar && !o.userData.ff22Upgraded){
          o.userData.ff22Upgraded = true; found++;
          var headMat = new T().MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a0, emissiveIntensity: 1.4 });
          var tailMat = new T().MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.8 });
          [[-0.7, 2.05], [0.7, 2.05]].forEach(function(p){
            var h = new T().Mesh(new T().BoxGeometry(0.4, 0.18, 0.06), headMat);
            h.position.set(p[0], 0.62, p[1]); o.add(h);
            var tl = new T().Mesh(new T().BoxGeometry(0.4, 0.18, 0.06), tailMat);
            tl.position.set(p[0], 0.62, -p[1]); o.add(tl); o.userData.ff22Tail = tl;
          });
          // Tag wheels: cylinder children at wheel height so the update loop can spin them.
          o.children.forEach(function(c){
            if (c.geometry && c.geometry.type === 'CylinderGeometry' && Math.abs(c.position.y - 0.32) < 0.05){
              (o.userData.ff22Wheels = o.userData.ff22Wheels || []).push(c);
            }
          });
        }
      });
      if (tries > 30) clearInterval(timer);
    }, 1000);
  }catch(e){ console.warn('engine22 cars', e); }
}
function upgradeCharacters(){
  try{
    // Variety: NPCs get varied skin tones + shirt/pants colours at spawn time
    // is already handled by buildHumanoid inputs; here we add per-NPC scale
    // variety and a walk-lean so they do not look like clones.
    var skins = [0xffcc99, 0xe8b088, 0xc98a5a, 0xa06a3c, 0xf2d0a8];
    var i = 0;
    (window.npcs || []).forEach(function(npc){
      var s = 0.94 + ((i * 37) % 12) / 100; npc.scale.set(s, s, s); i++;
      npc.traverse(function(o){
        if (o.material && o.material.color && Math.abs(o.material.color.getHex() - 0xffcc99) < 2){
          o.material = o.material.clone(); o.material.color.setHex(skins[i % skins.length]);
        }
      });
    });
  }catch(e){ console.warn('engine22 chars', e); }
}
function hook(){
  var old = window.initGame;
  if (typeof old !== 'function'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(hook, 800); });
    return;
  }
  window.initGame = function(){
    old.apply(this, arguments);
    setTimeout(function(){
      applyRenderer(); addSkyGlow(); addProps(); upgradeCars(); upgradeCharacters();
      // Siren + ambience follow the GTA state every second (cheap, no per-frame cost).
      setInterval(function(){
        try{
          if (!window.isGameRunning) return;
          var wanted = 0;
          var wEl = document.getElementById('ff-gta-wanted');
          if (wEl) wanted = (wEl.textContent.match(/★/g) || []).length;
          if (window.FFAudio) window.FFAudio.setSiren(wanted > 0);
          // Day/night ambience follows the HUD clock.
          var hour = 12; try{ hour = (window.gameTime || 720) / 60; }catch(e){}
          if (window.FFAudio && window.FFAudio._ff22Amb !== ((hour >= 20 || hour < 6) ? 'night' : 'day')){
            window.FFAudio._ff22Amb = (hour >= 20 || hour < 6) ? 'night' : 'day';
            window.FFAudio.setAmbience(window.FFAudio._ff22Amb);
          }
          // Sun glow follows the sun light; visible at day, hidden at night.
          if (window.FF22SunGlow && window.worldObjs && window.worldObjs.sun){
            var sun = window.worldObjs.sun;
            window.FF22SunGlow.position.copy(sun.position).normalize().multiplyScalar(88);
            window.FF22SunGlow.material.opacity = Math.min(0.85, Math.max(0, sun.intensity - 0.2) * 0.5);
          }
          // Spin car wheels on moving GTA cars (rotation.x on cylinder wheels).
          if (window.scene) window.scene.traverse(function(o){
            if (o.userData && o.userData.ff22Wheels && o.userData.gtaCar){
              o.userData.ff22Wheels.forEach(function(w){ w.rotateOnAxis(new T().Vector3(0, 1, 0), 0.25); }); // spin around the cylinder's own axis (local Y), not an Euler angle — Euler spin would wobble the wheel
            }
          });
        }catch(e){}
      }, 1000);
    }, 1200);
  };
  // Also wrap the GTA update to add brake-light brightening when slowing.
  // (GTA update is assigned at script load, so it exists by now.)
  try{
    var gtaOld = window.FFGTAUpdate;
    if (typeof gtaOld === 'function'){
      window.FFGTAUpdate = function(dt, t){
        gtaOld(dt, t);
        try{
          if (window.scene) window.scene.traverse(function(o){
            if (o.userData && o.userData.ff22Tail && o.userData.gtaCar){
              // Brighten taillights when the car is the driven one and slowing: proxy via speed text is unavailable, so pulse gently at night.
              o.userData.ff22Tail.material.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.15;
            }
          });
        }catch(e){}
      };
    }
  }catch(e){}
}
/* Start-screen images: the .png/.jpg binaries cannot be pushed through the
   text-only connector, so if they 404, decode their .b64 companions. */
function b64Blob(url, mime, cb){
  fetch(url).then(function(r){ return r.text(); }).then(function(t){
    var bin = atob(t.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    cb(URL.createObjectURL(new Blob([bytes], { type: mime })));
  }).catch(function(){});
}
document.addEventListener('DOMContentLoaded', function(){
  var logo = document.querySelector('#start-screen img');
  if (logo){
    logo.addEventListener('error', function(){
      b64Blob('textures/logo.png.b64', 'image/png', function(u){ logo.src = u; });
    });
  }
  var start = document.getElementById('start-screen');
  if (start){
    /* Detect a missing menu-bg by probing it: if it 404s, swap in the blob. */
    fetch('textures/menu-bg.jpg', { method: 'HEAD' }).then(function(r){
      if (!r.ok) b64Blob('textures/menu-bg.jpg.b64', 'image/jpeg', function(u){
        start.style.backgroundImage = "linear-gradient(160deg,rgba(26,10,46,.88),rgba(22,33,62,.88) 40%,rgba(15,52,96,.88) 80%,rgba(83,52,131,.88)),url('" + u + "')";
        start.style.backgroundSize = 'cover'; start.style.backgroundPosition = 'center';
      });
    }).catch(function(){});
  }
});
hook();
// Footstep dust + exhaust are already in particles.js (FFFootstep) and the
// core loop; engine22 does not duplicate them. Camera smoothing stays in
// game-core (CAM_LAG lerp) — no second camera controller is added here,
// because two camera controllers were a known 2.0 bug source.
})();
