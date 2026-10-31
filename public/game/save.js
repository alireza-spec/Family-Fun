/* Family Fun 2.0 — save system. Primary: localStorage slot 0 (autosave) plus
   3 manual slots. Export/import is a plain JSON file the player can keep.
   No account, no server, no personal data beyond the in-game name. */
(function(){
'use strict';
var KEY='ff-save-v2', dirty=false;
function collect(){
  var p=window.playerGroup?window.playerGroup.position:null;
  return {version:'2.0.0',savedAt:new Date().toISOString(),
    player:{name:window.pName||'',gender:window.pGender||'male'},
    stats:window.stats?JSON.parse(JSON.stringify(window.stats)):null,
    gameTime:window.gameTime, gameDay:window.gameDay,
    position:p?{x:p.x,z:p.z}:null,
    quests:window.FFQuests?window.FFQuests.serialize():null,
    inventory:window.inventory||[],
    quality:window.FFQuality?window.FFQuality.current:null,
    audioMuted:window.FFAudio?window.FFAudio.muted:false};
}
function apply(data){
  if(!data) return false;
  try{
    if(data.stats && window.stats) Object.assign(window.stats,data.stats);
    if(typeof data.gameTime==='number') window.gameTime=data.gameTime;
    if(typeof data.gameDay==='number') window.gameDay=data.gameDay;
    if(data.inventory) window.inventory=data.inventory;
    if(data.quests && window.FFQuests) window.FFQuests.restore(data.quests);
    if(data.position && window.playerGroup) window.playerGroup.position.set(data.position.x,0,data.position.z);
    if(window.updateHUD) window.updateHUD();
    if(window.FFQuests) window.FFQuests.render();
    return true;
  }catch(e){ console.warn('save apply',e); return false; }
}
function read(slot){ try{ var raw=localStorage.getItem(KEY+'-'+slot); return raw?JSON.parse(raw):null; }catch(e){ return null; } }
function write(slot,data){ try{ localStorage.setItem(KEY+'-'+slot,JSON.stringify(data)); return true; }catch(e){ return false; } }
window.FFSave={
  markDirty:function(){ dirty=true; },
  save:function(slot){
    slot=slot===undefined?1:slot;
    var ok=write(slot,collect());
    if(window.showToast) window.showToast(ok?('💾 ذخیره شد (اسلات '+(slot===0?'خودکار':slot)+')'):'⚠️ ذخیره نشد');
    dirty=false; return ok;
  },
  autosave:function(){ if(!window.isGameRunning) return; write(0,collect()); dirty=false; },
  load:function(slot){ var d=read(slot); return d; },
  apply:apply,
  has:function(slot){ return !!read(slot); },
  pending:null,
  exportJSON:function(){
    var blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='family-fun-save.json'; a.click(); URL.revokeObjectURL(a.href);
  },
  importJSON:function(file,cb){
    var r=new FileReader();
    r.onload=function(){ try{ var d=JSON.parse(r.result); window.FFSave.pending=d;
      if(cb) cb(true); if(window.showToast) window.showToast('📥 فایل ذخیره خوانده شد — بازی را با همان اسم شروع کن تا اعمال شود.'); }
      catch(e){ if(cb) cb(false); } };
    r.readAsText(file);
  }
};
setInterval(function(){ if(dirty) window.FFSave.autosave(); },30000);
setInterval(function(){ if(window.isGameRunning) window.FFSave.autosave(); },120000);
})();
