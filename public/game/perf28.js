/* Family Fun 2.8.0 — performance + smoothness layer (loads last).
   What it does, cheaply:
   - Shadow camera follows the PLAYER (tight ±45 box around the player,
     not the old ±85 box around the world origin) and the shadow map
     stays at the quality preset (1024 Balanced / 2048 High). Smaller
     area at the same resolution = ~3.5x denser, crisper shadows AND
     fewer casters in the frustum.
   - Re-affirms the DPR cap (Balanced 1.5, High 2 — never DPR 3).
   - An FPS meter toggle in the ☰ drawer (off by default, persisted in
     localStorage as ff-fps-meter) + a 1-second average FPS line in the
     console only, so the next feedback round can be measured, not felt.
   Everything is try/catch: a perf extra can never break gameplay. */
(function(){
'use strict';
function applyShadowFollow(){
  try{
    var r = window.renderer; if (!r) return;
    // DPR cap re-affirmed (quality.js already caps, this is the guard).
    if (window.FFQuality && window.FFQuality.def){
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.FFQuality.def.pixelRatio));
    }
    var sun = window.worldObjs && window.worldObjs.sun;
    if (sun && sun.shadow){
      sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
      sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
      sun.shadow.camera.far = 220;
      sun.shadow.camera.updateProjectionMatrix();
      if (sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  }catch(e){ console.warn('perf28 shadow', e); }
}
function shadowFollowTick(){
  try{
    var sun = window.worldObjs && window.worldObjs.sun;
    if (!sun || !window.playerGroup) return;
    // Point the shadow frustum at the player: the ±45 ortho box then
    // covers the player and the nearby street, not the empty origin.
    sun.target.position.copy(window.playerGroup.position);
    sun.target.updateMatrixWorld();
  }catch(e){}
}
function fpsMeter(){
  var enabled = false;
  try{ enabled = localStorage.getItem('ff-fps-meter') === '1'; }catch(e){}
  var el = null;
  function ensureEl(){
    if (el) return el;
    el = document.createElement('div');
    el.id = 'ff-fps-meter';
    el.style.cssText = 'position:fixed;left:8px;top:44px;z-index:9000;pointer-events:none;font-family:Vazirmatn,Arial,sans-serif;font-size:11px;font-weight:700;color:#fff;background:rgba(10,15,30,.72);padding:3px 8px;border-radius:8px;display:none;direction:ltr;';
    document.body.appendChild(el);
    return el;
  }
  function addButton(){
    try{
      var sys = document.getElementById('ff-drawer-sys');
      if (!sys || document.getElementById('ff-fps-btn')) return true;
      var b = document.createElement('button');
      b.id = 'ff-fps-btn'; b.className = 'acircle'; b.textContent = '📊';
      b.title = 'نمایش نرخ فریم (FPS)';
      b.onclick = function(){
        enabled = !enabled;
        try{ localStorage.setItem('ff-fps-meter', enabled ? '1' : '0'); }catch(e){}
        var o = ensureEl(); o.style.display = enabled ? 'block' : 'none';
      };
      sys.appendChild(b);
      return true;
    }catch(e){ return false; }
  }
  var frames = 0, lastLog = performance.now(), lastHud = 0;
  function tick(now){
    requestAnimationFrame(tick);
    frames++;
    if (!window.isGameRunning) return;
    if (now - lastLog >= 1000){
      var fps = Math.round(frames * 1000 / (now - lastLog));
      console.log('[FF FPS] avg ' + fps + ' fps');
      frames = 0; lastLog = now;
      if (enabled){
        var o = ensureEl();
        if (now - lastHud >= 500){ o.textContent = fps + ' FPS'; lastHud = now; }
      }
    }
  }
  var btnTimer = setInterval(function(){ if (addButton()) clearInterval(btnTimer); }, 1000);
  setTimeout(function(){ clearInterval(btnTimer); }, 30000);
  if (enabled) ensureEl().style.display = 'block';
  requestAnimationFrame(tick);
}
function hook(){
  var old = window.initGame;
  if (typeof old !== 'function'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(hook, 800); });
    return;
  }
  window.initGame = function(){
    old.apply(this, arguments);
    // engine22 applies its renderer settings ~1200ms after initGame;
    // run ours after that (2000ms) so the tighter shadow box wins.
    setTimeout(function(){
      applyShadowFollow();
      setInterval(shadowFollowTick, 500);
      fpsMeter();
    }, 2000);
  };
}
hook();
})();
