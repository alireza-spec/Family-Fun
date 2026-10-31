/* Family Fun 2.0 — ONE economy state. This replaces the old split where the
   main HUD used stats.money (capped at 100) while gameplay-overhaul kept its
   own local `cash` variable. All rewards now go through here and sync the HUD. */
(function(){
'use strict';
function stats(){ return window.stats || null; }
window.FFEconomy={
  get:function(){ var s=stats(); return s? s.money : 0; },
  set:function(v){ var s=stats(); if(!s) return;
    s.money=Math.max(0,Math.min(99999,Math.round(v)));
    if(typeof window.updateHUD==='function') window.updateHUD();
    if(window.FFSave) window.FFSave.markDirty(); },
  add:function(n,reason){ var s=stats(); if(!s) return;
    this.set(s.money+n);
    if(reason && window.showToast) window.showToast('💰 '+reason+' (+'+n+' سکه)'); },
  spend:function(n,reason){ var s=stats(); if(!s||s.money<n) return false;
    this.set(s.money-n);
    if(reason && window.showToast) window.showToast('💸 '+reason+' (-'+n+' سکه)');
    return true; }
};
})();
