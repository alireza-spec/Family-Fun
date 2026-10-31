/* Family Fun 2.7.0 — QUIET TEXT + close camera helpers.
   Loaded last so its CSS wins over index.html + landscape-hud.js.
   - Interact/exit button: small quiet pill, bottom-right, no glow/pulse.
   - Stats labels: tiny + faint, even when the stats row is expanded.
   - Quest card: collapsed = tiny dot + short title only, narrow.
   - Toasts: small, top, single (game-core already caps at 1).
   - Dialog headers compact; location sign small.
   - A small pulsing ground ring at the central plaza (the default
     objective area, "میدان شهر") replaces floating text guidance with
     a 3D marker in the world itself. */
(function(){
'use strict';
var css = [
  /* Interact: beat landscape-hud's bottom:150px!important with our own. */
  '#interact-btn{bottom:44px!important;right:88px!important;left:auto!important;transform:none!important;animation:none!important;box-shadow:0 2px 10px rgba(0,0,0,.35)!important;padding:10px 16px!important;font-size:12px!important;font-weight:600!important;background:rgba(0,0,0,.55)!important;color:#fff!important;border:1px solid rgba(255,255,255,.25)!important}',
  /* Name tags: small, subtle (distance fade is in game-core updateTag). */
  '.name-tag .nt-name{font-size:10px!important;padding:1px 7px!important;background:rgba(8,8,18,.55)!important}',
  '.name-tag .nt-name span{font-size:8px!important}',
  /* Stats: labels tiny + faint even when expanded by tapping the bar. */
  '#stats-bar .si-label{font-size:8px!important;opacity:.45!important}',
  '#stats-bar .si{min-width:44px!important}',
  '#stats-bar .si-bg{width:44px!important}',
  /* Quest card: collapsed = dot + short title, narrow, quiet. */
  '#ffw-objective{width:160px!important;padding:8px 10px!important}',
  '#ffw-objective .ffw-title{font-size:11px!important}',
  '#ffw-objective .ffw-kicker{font-size:9px!important;opacity:.6!important}',
  /* Toasts: smaller, quieter. */
  '#toast-area .toast{font-size:11px!important;padding:7px 14px!important;background:rgba(12,12,22,.75)!important}',
  /* Location sign + weather + tip: small, never centre. */
  '#location-sign{font-size:10px!important;opacity:.7!important}',
  '#ffw-weather{font-size:10px!important;opacity:.7!important}',
  '#ffw-tip{font-size:11px!important}',
  /* Dialog: compact header. */
  '#dialog-box{padding:10px 14px!important}',
  '#dialog-npc{font-size:12px!important}',
  '#dialog-portrait{font-size:26px!important}'
].join('\n');
var st = document.createElement('style');
st.id = 'ff-quiet27-style';
st.textContent = css;
document.head.appendChild(st);

/* Pulsing ground ring at the central plaza (-10, 44) — a 3D objective
   marker in the world, so guidance does not need floating text. */
var ringDone = false;
function addRing(){
  if (ringDone || !window.scene || !window.THREE) return;
  try{
    var T = window.THREE;
    var geo = new T.RingGeometry(1.6, 2.0, 40);
    var mat = new T.MeshBasicMaterial({color: 0x22d3ee, transparent: true, opacity: 0.55, side: T.DoubleSide});
    var ring = new T.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-10, 0.08, 44);
    window.scene.add(ring);
    window.FFQuiet27Ring = ring;
    ringDone = true;
    // Pulse via the central loop hook: reuse requestAnimationFrame lightly.
    (function pulse(){
      try{
        var t = Date.now() / 1000;
        var s = 1 + Math.sin(t * 2.2) * 0.12;
        ring.scale.set(s, s, 1);
        mat.opacity = 0.45 + Math.sin(t * 2.2) * 0.15;
      }catch(e){}
      requestAnimationFrame(pulse);
    })();
  }catch(e){}
}
setInterval(addRing, 900);
})();
