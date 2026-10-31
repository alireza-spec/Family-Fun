/* Family Fun 2.0 — day/night, sky, moon, clouds, night glow, bloom hook.
   Day/night is driven by the game's own gameTime (minutes), so it stays in sync
   with the HUD clock. This is the graphics half of the central loop; it does
   NOT create its own requestAnimationFrame. */
(function(){
'use strict';
var built=false, moon=null, clouds=[], skyMat=null, starsMat=null;
function build(){
  if(built||!window.scene) return; built=true;
  try{
    moon=new THREE.Mesh(new THREE.SphereGeometry(2.2,16,12),
      new THREE.MeshBasicMaterial({color:0xe8eefc}));
    moon.position.set(-60,55,-40); moon.visible=false; window.scene.add(moon);
    window.scene.traverse(function(o){
      if(o.name==='FFW_CinematicSky' && o.material.uniforms) skyMat=o.material.uniforms;
      if(o.name==='FFW_Stars' && o.material) starsMat=o.material;
    });
    for(var i=0;i<6;i++){
      var cl=new THREE.Mesh(new THREE.SphereGeometry(3+Math.random()*3,10,8),
        new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.55,depthWrite:false}));
      cl.scale.set(2.2,0.55,1.2);
      cl.position.set((Math.random()-0.5)*120,22+Math.random()*12,(Math.random()-0.5)*120);
      window.scene.add(cl); clouds.push(cl);
    }
  }catch(e){ console.warn('graphics build',e); }
}
function setEmissive(list,intensity){
  (list||[]).forEach(function(m){ try{ if(m.emissive) m.emissiveIntensity=intensity; }catch(e){} });
}
window.FFGraphics={
  update:function(dt,t){
    build(); if(!window.scene||!window.worldObjs||!window.worldObjs.sun) return;
    var minutes=window.gameTime||480;
    var hour=minutes/60;
    // daylight: 0 at night, 1 at midday, smooth sine between 6:00 and 19:00
    var day=Math.max(0,Math.sin((hour-6)/13*Math.PI));
    var night=1-day;
    var sun=window.worldObjs.sun;
    sun.intensity=0.25+day*1.15;
    sun.color.setHSL(0.08,0.6,0.55+day*0.15);
    var ang=(hour/24)*Math.PI*2-Math.PI/2;
    sun.position.set(Math.cos(ang)*60,Math.max(12,Math.sin(ang)*70),30);
    if(window.scene.background && window.scene.background.setHSL)
      window.scene.background.setHSL(0.57,0.5,0.12+day*0.45);
    if(window.scene.fog){
      window.scene.fog.color.setHSL(0.58,0.35,0.14+day*0.42);
      window.scene.fog.density=0.010+night*0.006;
    }
    // sky shader from world-overhaul, if present. Cached once found; the
    // world layer starts slightly after the core, so rescan only while missing.
    if(!skyMat || !starsMat){
      window.scene.traverse(function(o){
        if(o.name==='FFW_CinematicSky' && o.material.uniforms) skyMat=o.material.uniforms;
        if(o.name==='FFW_Stars' && o.material) starsMat=o.material;
      });
    }
    if(skyMat) skyMat.mixT.value=0.15+day*0.55;
    if(starsMat) starsMat.opacity=night*0.9;
    if(moon){ moon.visible=night>0.4; moon.position.set(-Math.cos(ang)*55,Math.max(15,-Math.sin(ang)*55),-40); }
    clouds.forEach(function(c,i){ c.position.x+=dt*(0.4+i*0.1); if(c.position.x>70) c.position.x=-70;
      c.material.opacity=0.25+day*0.35; });
    // night glow: building windows (lamps are handled by core updateEnhancedLighting, 800ms)
    setEmissive(window.FFEmissiveWindows||[], night>0.35?0.9:0.15);
    // engine hum proxy: player hidden while driving (gameplay-overhaul hides it)
    if(window.FFAudio && window.playerGroup){
      window.FFAudio.setEngine(window.playerGroup.visible===false, 5);
    }
  },
  render:function(){
    // Bloom hook: lazily create the composer (from src/main.js) once the game
    // exists, only when quality=high. Otherwise fall back to plain rendering.
    if(window.FFQuality && window.FFQuality.def.bloom && !window.FFComposer && window.FFComposerFactory && window.renderer && window.scene && window.camera){
      try{ window.FFComposerFactory(window.renderer,window.scene,window.camera); }catch(e){}
    }
    if(window.FFComposer && window.FFQuality && window.FFQuality.def.bloom){
      try{ window.FFComposer.render(); return; }catch(e){}
    }
    window.renderer.render(window.scene,window.camera);
  }
};
window.FFRender=function(){ window.FFGraphics.render(); };
})();
