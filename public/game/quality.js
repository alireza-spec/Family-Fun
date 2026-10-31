/* Family Fun 2.0 — quality presets. Default: Balanced on mobile, High on desktop.
   Stored in localStorage under ff-quality. Changing a preset re-applies pixel
   ratio, shadow size and particle density; the renderer is never recreated. */
(function(){
'use strict';
var PRESETS={
  low:{label:'سبک',pixelRatio:1,shadow:512,bloom:false,particles:0.35,dust:true},
  balanced:{label:'متعادل',pixelRatio:1.5,shadow:1024,bloom:false,particles:0.7,dust:true},
  high:{label:'بالا',pixelRatio:2,shadow:2048,bloom:true,particles:1,dust:true}
};
function isMobile(){
  try{ return window.matchMedia('(pointer: coarse)').matches || window.innerWidth<768 ||
    (navigator.hardwareConcurrency||8)<=4; }catch(e){ return window.innerWidth<768; }
}
var current = localStorage.getItem('ff-quality') || (isMobile()?'balanced':'high');
if(!PRESETS[current]) current='balanced';
function apply(name){
  if(!PRESETS[name]) return;
  current=name; try{ localStorage.setItem('ff-quality',name); }catch(e){}
  var q=PRESETS[name];
  try{
    if(window.renderer){
      window.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,q.pixelRatio));
      if(window.worldObjs && window.worldObjs.sun){
        var sun=window.worldObjs.sun;
        if(sun.shadow.mapSize.x!==q.shadow){
          sun.shadow.mapSize.set(q.shadow,q.shadow);
          if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; }
        }
      }
      if(window.FFComposer) window.FFComposer.setPixelRatio(Math.min(window.devicePixelRatio||1,q.pixelRatio));
    }
  }catch(e){ console.warn('quality apply',e); }
  var sel=document.getElementById('quality-select'); if(sel) sel.value=name;
  if(window.showToast) window.showToast('🎨 کیفیت گرافیک: '+q.label);
}
window.FFQuality={presets:PRESETS, get current(){return current;}, get def(){return PRESETS[current];},
  apply:apply, cycle:function(){ var order=['low','balanced','high'];
    apply(order[(order.indexOf(current)+1)%order.length]); }};
})();
