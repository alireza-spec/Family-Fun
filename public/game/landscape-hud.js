/* Family Fun 2.1.0 — LANDSCAPE-ONLY + HUD DECLUTTER.
   Loaded LAST so it can wrap initGame and move panels created by earlier
   layers (GTA panel, quest panel, job buttons, system buttons) into one menu
   drawer. It deletes nothing from the game logic: GTA functions, jobs and
   saves keep working, they are just no longer all on screen at once.
   - Start screen: any orientation (overlay is in-game only).
   - In game: landscape only. On Play we try fullscreen + orientation lock
     (best-effort, failures ignored). In portrait, a full-screen rotate
     overlay covers the game until the device is landscape again.
   - If screen.orientation is undefined, the overlay is the enforcement. */
(function(){
'use strict';
var isTouch = (typeof window !== 'undefined') && (('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));

/* ---------- injected CSS: one slim HUD, no centre clutter ---------- */
var css = [
  /* Z order: canvas < HUD(10) < dialogs(30) < drawer(100) < rotate overlay(20000) */
  '#hud{z-index:10}',
  '#dialog-box{z-index:30}',
  '#phone-overlay{z-index:90}',
  '#call-screen{z-index:95}',
  /* Slim top bar: avatar+name+level+money+clock only. Stats hidden by default. */
  '#stats-bar{height:46px!important;padding:6px 12px!important;align-items:center!important}',
  '#stats-bar .si{display:none!important}',
  '#stats-bar #ff-money-label{display:flex!important}',
  '#stats-bar #ff-money-label .si-label{font-size:10px}',
  'body.ff-stats-show #stats-bar .si{display:flex!important}',
  'body.ff-stats-show #stats-bar{height:auto!important}',
  '#stats-bar .hud-avatar{width:32px!important;height:32px!important;font-size:15px!important}',
  '#stats-bar .hud-name{font-size:12px!important}',
  '#stats-bar .hud-level{font-size:9px!important}',
  /* Clock merged visually into the top bar (top-right, small). */
  '#time-widget{top:6px!important;right:10px!important;padding:4px 10px!important}',
  '#time-widget #time-disp{font-size:14px!important}',
  '#time-widget #day-disp{font-size:9px!important}',
  /* One small minimap, left, below the top bar. No label. */
  '#minimap{width:90px!important;height:90px!important;top:54px!important;left:10px!important}',
  '#minimap-label{display:none!important}',
  /* Location sign: small, under the minimap, never centre. */
  '#location-sign{top:150px!important;left:10px!important;right:auto!important;font-size:10px!important}',
  /* Objective: ONE collapsed card, left column, title only until tapped. */
  '#ffw-objective{left:10px!important;right:auto!important;top:182px!important;width:200px!important;padding:10px 12px!important}',
  '#ffw-objective .ffw-copy,#ffw-objective .ffw-meter{display:none!important}',
  '#ffw-objective.ff-expanded .ffw-copy,#ffw-objective.ff-expanded .ffw-meter{display:block!important}',
  '#ffw-objective .ffw-title{font-size:12px!important}',
  '#ffw-objective .ffw-kicker{font-size:9px!important}',
  /* Fallback quest panel is a duplicate of the objective: hide it outright.
     Its job buttons are moved into the drawer (see movePanels). */
  '#ff-quest-panel{display:none!important}',
  /* GTA panel lives inside the drawer now: kill its fixed positioning. */
  '#ff-menu-drawer #ff-gta-panel{position:static!important;width:auto!important;top:auto!important;right:auto!important;background:none!important;border:none!important;box-shadow:none!important;padding:0!important;pointer-events:auto!important}',
  '#ff-menu-drawer #ff-gta-panel button{pointer-events:auto}',
  /* Speed readout: bottom-centre, NEVER over joystick/action cluster. */
  '#ff-overhaul{left:50%!important;right:auto!important;transform:translateX(-50%)!important;bottom:132px!important;top:auto!important;align-items:center!important}',
  '#ff-overhaul .ff-card{text-align:center}',
  'body:not(.ff-driving) #ff-overhaul .ff-card:first-child{display:none!important}',
  'body:not(.ff-prompt-near) #ff-overhaul #ff-prompt{display:none!important}',
  /* Action cluster: phone + camera + menu only (max 4 with interact). */
  '#action-btns{gap:8px!important;bottom:calc(28px + env(safe-area-inset-bottom, 0px))!important;right:14px!important}',
  '#action-btns .acircle{width:50px!important;height:50px!important;font-size:19px!important}',
  '#action-btns #ff-btn-save,#action-btns #ff-btn-mute,#action-btns #ff-btn-quality,#action-btns #ff-btn-slots{display:none!important}',
  /* Joystick: bottom-left with safe area, sprint above it, interact centre-bottom. */
  '#joystick-zone{width:110px!important;height:110px!important;left:18px!important;bottom:calc(28px + env(safe-area-inset-bottom, 0px))!important}',
  '#joystick-knob{width:44px!important;height:44px!important}',
  '#sprint-btn{bottom:auto!important;top:auto!important;right:auto!important;left:150px!important;bottom:calc(34px + env(safe-area-inset-bottom, 0px))!important}',
  '#interact-btn{bottom:150px!important}',
  /* Toasts: below the top bar, never centre-screen. */
  '#toast-area{top:56px!important}',
  /* Menu drawer */
  '#ff-menu-drawer{position:fixed;top:0;right:0;bottom:0;width:min(300px,86vw);z-index:100;background:linear-gradient(140deg,rgba(9,18,31,.96),rgba(24,35,54,.92));border-left:1px solid rgba(184,219,255,.25);box-shadow:-12px 0 36px rgba(0,0,0,.4);color:#eef5ff;font-family:Vazirmatn,Arial,sans-serif;direction:rtl;padding:16px;overflow-y:auto;transform:translateX(105%);transition:transform .25s ease}',
  '#ff-menu-drawer.ff-open{transform:translateX(0)}',
  '#ff-menu-drawer h3{font-size:15px;margin:0 0 4px}',
  '#ff-menu-drawer .ff-drawer-sub{font-size:11px;opacity:.65;margin-bottom:12px;line-height:1.7}',
  '#ff-menu-drawer button{font-family:inherit}',
  '#ff-menu-drawer .ff-job-btn{width:100%;margin-top:6px}',
  '#ff-menu-drawer .ff-sys-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}',
  '#ff-menu-drawer .ff-sys-row .acircle{width:46px!important;height:46px!important;font-size:17px!important;display:flex!important;position:static!important}',
  '#ff-menu-backdrop{position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.5);display:none}',
  '#ff-menu-backdrop.ff-open{display:block}',
  /* Rotate overlay: full-screen, in-game + portrait only. */
  '#ff-rotate-overlay{position:fixed;inset:0;z-index:20000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0f0f1e;color:#fff;font-family:Vazirmatn,Arial,sans-serif;text-align:center;padding:24px;direction:rtl}',
  'body.ff-portrait-block #ff-rotate-overlay{display:flex}',
  '#ff-rotate-phone{font-size:64px;animation:ffRotate 1.8s ease-in-out infinite}',
  '@keyframes ffRotate{0%,100%{transform:rotate(0deg)}50%{transform:rotate(90deg)}}',
  '#ff-rotate-overlay b{font-size:20px}',
  '#ff-rotate-overlay span{font-size:13px;opacity:.7;line-height:1.8}',
  '@media (prefers-reduced-motion: reduce){#ff-rotate-phone{animation:none}}'
].join('\n');
var st = document.createElement('style');
st.id = 'ff-landscape-hud-style';
st.textContent = css;
document.head.appendChild(st);

/* ---------- rotate overlay element ---------- */
var overlay = document.createElement('div');
overlay.id = 'ff-rotate-overlay';
overlay.innerHTML = '<div id="ff-rotate-phone">📱</div><b>برای بازی گوشی را افقی بچرخانید</b><span>بازی فقط در حالت افقی اجرا می‌شود.<br>به‌محض افقی شدن گوشی، بازی خودش ادامه پیدا می‌کند.</span>';
document.body.appendChild(overlay);

function isPortrait(){ return window.innerHeight > window.innerWidth; }
function updateRotate(){
  if (document.body.classList.contains('ff-in-game') && isPortrait()) {
    document.body.classList.add('ff-portrait-block');
  } else {
    document.body.classList.remove('ff-portrait-block');
  }
}
window.addEventListener('resize', updateRotate);
window.addEventListener('orientationchange', function(){ setTimeout(updateRotate, 300); });
try {
  var mq = window.matchMedia('(orientation: portrait)');
  if (mq.addEventListener) mq.addEventListener('change', updateRotate);
  else if (mq.addListener) mq.addListener(updateRotate);
} catch (e) {}

/* ---------- menu drawer ---------- */
var backdrop = document.createElement('div');
backdrop.id = 'ff-menu-backdrop';
document.body.appendChild(backdrop);
var drawer = document.createElement('div');
drawer.id = 'ff-menu-drawer';
drawer.innerHTML = '<h3>☰ منوی بازی</h3><div class="ff-drawer-sub">همه‌ی امکانات GTA، شغل‌ها و تنظیمات اینجاست — صفحه‌ی بازی خلوت می‌ماند.</div><div id="ff-drawer-gta"></div><div id="ff-drawer-jobs"></div><div class="ff-sys-row" id="ff-drawer-sys"></div><div class="ff-drawer-sub" style="margin-top:14px">💡 نکته: برای بستن منو، همین دکمه را دوباره بزن یا بیرون از منو ضربه بزن.</div>';
document.body.appendChild(drawer);
function toggleDrawer(force){
  var open = (typeof force === 'boolean') ? force : !drawer.classList.contains('ff-open');
  drawer.classList.toggle('ff-open', open);
  backdrop.classList.toggle('ff-open', open);
}
backdrop.onclick = function(){ toggleDrawer(false); };

var menuBtn = document.createElement('div');
menuBtn.className = 'acircle';
menuBtn.id = 'ff-btn-menu';
menuBtn.title = 'منو';
menuBtn.textContent = '☰';
menuBtn.onclick = function(){ toggleDrawer(); };
var actionBtns = document.getElementById('action-btns');
if (actionBtns && !document.getElementById('ff-btn-menu')) actionBtns.appendChild(menuBtn);

/* ---------- move panels into the drawer (poll: GTA builds after start) ---------- */
var moved = {gta:false, jobs:false, sys:false};
function movePanels(){
  var gtaPanel = document.getElementById('ff-gta-panel');
  if (gtaPanel && !moved.gta) {
    document.getElementById('ff-drawer-gta').appendChild(gtaPanel);
    moved.gta = true;
  }
  var jobBtns = document.getElementById('ff-job-btns');
  if (jobBtns && !moved.jobs) {
    var sec = document.createElement('div');
    sec.innerHTML = '<div style="font-weight:700;font-size:13px;margin:10px 0 2px">💼 شیفت‌های کاری</div>';
    document.getElementById('ff-drawer-jobs').appendChild(sec);
    document.getElementById('ff-drawer-jobs').appendChild(jobBtns);
    moved.jobs = true;
  }
  var sysRow = document.getElementById('ff-drawer-sys');
  ['ff-btn-save','ff-btn-mute','ff-btn-quality','ff-btn-slots'].forEach(function(id){
    var b = document.getElementById(id);
    if (b && sysRow && !b.dataset.inDrawer) { b.dataset.inDrawer = '1'; sysRow.appendChild(b); }
  });
  if (sysRow && sysRow.children.length) moved.sys = true;
}
var moveTries = 0;
var moveTimer = setInterval(function(){
  movePanels();
  moveTries++;
  if (moved.gta && moved.jobs && moved.sys) clearInterval(moveTimer);
  if (moveTries > 40) clearInterval(moveTimer);
}, 1000);

/* ---------- objective: tap to expand / collapse ---------- */
document.addEventListener('click', function(e){
  var obj = e.target.closest ? e.target.closest('#ffw-objective') : null;
  if (obj) obj.classList.toggle('ff-expanded');
  var bar = e.target.closest ? e.target.closest('#stats-bar') : null;
  if (bar) {
    document.body.classList.toggle('ff-stats-pinned');
    document.body.classList.toggle('ff-stats-show', document.body.classList.contains('ff-stats-pinned'));
  }
});

/* ---------- stats auto-show on HUD update, hide after 4s ---------- */
var statsTimer = null;
function showStatsBriefly(){
  if (document.body.classList.contains('ff-stats-pinned')) return;
  document.body.classList.add('ff-stats-show');
  if (statsTimer) clearTimeout(statsTimer);
  statsTimer = setTimeout(function(){
    if (!document.body.classList.contains('ff-stats-pinned')) document.body.classList.remove('ff-stats-show');
  }, 4000);
}
try {
  var origHUD = window.updateHUD;
  if (typeof origHUD === 'function') {
    window.updateHUD = function(){ origHUD.apply(this, arguments); showStatsBriefly(); };
  }
} catch (e) {}

/* ---------- speed prompt: driving only, near-point only ---------- */
function refreshDriveState(){
  var driveEl = document.getElementById('ff-drive');
  var promptEl = document.getElementById('ff-prompt');
  var driving = !!(driveEl && /رانندگی/.test(driveEl.textContent) && !/پیاده/.test(driveEl.textContent));
  document.body.classList.toggle('ff-driving', driving);
  var near = !!(promptEl && /تعامل با|کنترل نرم|سوار|پیاده شدن/.test(promptEl.textContent));
  document.body.classList.toggle('ff-prompt-near', near);
}
var driveObs = null;
function watchDrive(){
  var el = document.getElementById('ff-overhaul');
  if (!el || driveObs) return;
  driveObs = new MutationObserver(refreshDriveState);
  driveObs.observe(el, {childList:true, subtree:true, characterData:true});
  refreshDriveState();
}
setInterval(watchDrive, 1500);
setInterval(refreshDriveState, 1500);

/* ---------- touch hints: replace desktop keys on touch devices ---------- */
if (isTouch) {
  setInterval(function(){
    ['#ff-drive', '#ff-prompt'].forEach(function(sel){
      var el = document.querySelector(sel);
      if (!el) return;
      var t = el.textContent;
      var n = t.replace(/WASD/g, 'جوی‌استیک').replace(/Shift/g, 'دکمه دویدن')
        .replace(/\bE\b/g, 'دکمه تعامل').replace(/Space/g, 'ترمز دستی').replace(/KeyR|R تعمیر/g, 'دکمه تعمیر');
      if (n !== t) el.textContent = n;
    });
    var toasts = document.querySelectorAll('#toast-area .toast');
    toasts.forEach(function(el){
      var t = el.textContent;
      var n = t.replace(/WASD/g, 'جوی‌استیک').replace(/Shift/g, 'دکمه دویدن');
      if (n !== t) el.textContent = n;
    });
  }, 1500);
}

/* ---------- landscape lock on Play + city props after start ---------- */
var cityBuilt = false;
function buildCityExtras(){
  if (cityBuilt || !window.scene || !window.THREE) return;
  cityBuilt = true;
  try {
    var T = window.THREE, scene = window.scene;
    function M(c, o){
      o = o || {};
      if (window.FFTextures) return window.FFTextures.material(c, o.tex, o);
      return new T.MeshStandardMaterial({color: c, roughness: 0.85});
    }
    /* Central plaza at (-10, 44): pavement disc, fountain, benches, lamps. */
    var pave = new T.Mesh(new T.CircleGeometry(7, 28), M(0xb8a88a, {tex: 'pavement'}));
    pave.rotation.x = -Math.PI / 2; pave.position.set(-10, 0.03, 44); pave.receiveShadow = true; scene.add(pave);
    var basin = new T.Mesh(new T.CylinderGeometry(2.2, 2.5, 0.5, 20), M(0x9aa5b1, {}));
    basin.position.set(-10, 0.25, 44); basin.castShadow = true; scene.add(basin);
    var water = new T.Mesh(new T.CircleGeometry(1.9, 20), new T.MeshStandardMaterial({color: 0x4db8e8, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85}));
    water.rotation.x = -Math.PI / 2; water.position.set(-10, 0.52, 44); scene.add(water);
    var jet = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 1.2, 8), M(0xcfd8dc, {}));
    jet.position.set(-10, 1.1, 44); scene.add(jet);
    [[-14, 40], [-6, 40], [-14, 48], [-6, 48]].forEach(function(p){
      var bench = new T.Group(); bench.position.set(p[0], 0, p[1]); scene.add(bench);
      var seat = new T.Mesh(new T.BoxGeometry(1.8, 0.1, 0.5), M(0x8a5a32, {tex: 'wood'}));
      seat.position.y = 0.5; seat.castShadow = true; bench.add(seat);
      [-0.7, 0.7].forEach(function(dx){
        var leg = new T.Mesh(new T.BoxGeometry(0.12, 0.5, 0.45), M(0x333333, {}));
        leg.position.set(dx, 0.25, 0); bench.add(leg);
      });
    });
    /* Road dashes on the two main GTA roads (instanced, cheap). */
    var dashGeo = new T.PlaneGeometry(1.6, 0.3);
    var dashMat = new T.MeshBasicMaterial({color: 0xf5f5f5});
    var count = 0; var positions = [];
    for (var i = -68; i <= 68; i += 4) { positions.push([i, 30]); positions.push([i, -30]); }
    var dashes = new T.InstancedMesh(dashGeo, dashMat, positions.length);
    var m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1);
    var eul = new T.Euler(-Math.PI / 2, 0, 0); q.setFromEuler(eul);
    positions.forEach(function(p, idx){
      m4.compose(new T.Vector3(p[0], 0.04, p[1]), q, sc);
      dashes.setMatrixAt(idx, m4);
    });
    dashes.instanceMatrix.needsUpdate = true; scene.add(dashes);
    /* Varied trees (trunk + mixed foliage), away from roads/buildings. */
    var treeSpots = [[-44, 20], [44, -20], [-20, 44], [20, -44], [-44, -44], [44, 44], [-14, -44], [14, 44]];
    treeSpots.forEach(function(p, idx){
      var trunk = new T.Mesh(new T.CylinderGeometry(0.14, 0.22, 2.2, 7), M(0x5c3d1e, {}));
      trunk.position.set(p[0], 1.1, p[1]); trunk.castShadow = true; scene.add(trunk);
      var col = [0x2d6a2d, 0x4f9b58, 0x3a7d3a][idx % 3];
      var fol = new T.Mesh(new T.SphereGeometry(1.3, 10, 8), M(col, {}));
      fol.position.set(p[0], 2.9, p[1]); fol.castShadow = true; scene.add(fol);
      var fol2 = new T.Mesh(new T.ConeGeometry(0.9, 1.4, 8), M(col, {}));
      fol2.position.set(p[0] + 0.5, 3.6, p[1]); fol2.castShadow = true; scene.add(fol2);
    });
    /* 4 lamps that really light at night: updateEnhancedLighting() in the
       core loop sets userData.lamp intensity by night, so register them. */
    [[-16, 38], [-4, 38], [-16, 50], [-4, 50]].forEach(function(p){
      var g = new T.Group(); g.position.set(p[0], 0, p[1]); scene.add(g);
      var pole = new T.Mesh(new T.CylinderGeometry(0.07, 0.1, 3.4, 8), M(0x25313d, {metalness: 0.5}));
      pole.position.set(0, 1.7, 0); pole.castShadow = true; g.add(pole);
      var bulb = new T.Mesh(new T.SphereGeometry(0.18, 10, 8), new T.MeshStandardMaterial({color: 0xffd27d, emissive: 0xffa62b, emissiveIntensity: 1.2}));
      bulb.position.set(0, 3.5, 0); g.add(bulb);
      var light = new T.PointLight(0xffb35c, 0, 9);
      light.position.set(0, 3.4, 0); g.add(light);
      g.userData.lamp = light;
    });
    /* Persian billboards (reuse the texture sign helper). */
    if (window.FFTextures && window.FFTextures.sign) {
      [[ 'میدان خانواده', '🏘️', '#f59e0b', -10, 6, 52, Math.PI ],
       [ 'بازار شبانه', '🛍️', '#0ea5e9', -52, 5, 0, Math.PI / 2 ]].forEach(function(b){
        var m = new T.Mesh(new T.PlaneGeometry(6, 1.5), new T.MeshBasicMaterial({map: window.FFTextures.sign(b[0], b[1], b[2]), transparent: true}));
        m.position.set(b[3], b[4], b[5]); m.rotation.y = b[6]; scene.add(m);
      });
    }
  } catch (e) { console.warn('landscape city extras', e); }
}

try {
  var origInit = window.initGame;
  if (typeof origInit === 'function' && !window.initGame.__ffLandscape) {
    var wrapped = function(){
      document.body.classList.add('ff-in-game');
      function tryLock(){
        try {
          if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
            var lp = window.screen.orientation.lock('landscape');
            if (lp && lp.catch) lp.catch(function(){});
          }
        } catch (e) {}
      }
      try {
        var el = document.documentElement;
        if (el.requestFullscreen) {
          var fp = el.requestFullscreen();
          if (fp && fp.then) fp.then(tryLock, tryLock); else tryLock();
        } else tryLock();
      } catch (e) { tryLock(); }
      updateRotate();
      var out = origInit.apply(this, arguments);
      setTimeout(function(){ movePanels(); buildCityExtras(); }, 1200);
      return out;
    };
    wrapped.__ffLandscape = true;
    window.initGame = wrapped;
  }
} catch (e) {}
updateRotate();
window.FFLandscape = { updateRotate: updateRotate, toggleDrawer: toggleDrawer, movePanels: movePanels };
})();
