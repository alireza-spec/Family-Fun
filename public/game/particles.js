/* Family Fun 2.0 — particles, driven by the ONE central loop (game-core animate).
   Dust/leaves drift, footstep dust puffs, interaction sparkles, and rain with
   ground splash fade. Reduced-motion mode cuts counts to near zero. */
(function(){
'use strict';
var systems=null, footTimer=0;
function makePoints(n,color,size,opacity){
  var geo=new THREE.BufferGeometry();
  var pos=new Float32Array(n*3), vel=new Float32Array(n*3), life=new Float32Array(n);
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  var mat=new THREE.PointsMaterial({color:color,size:size,transparent:true,opacity:opacity,depthWrite:false});
  var pts=new THREE.Points(geo,mat); pts.frustumCulled=false;
  return {pts:pts,pos:pos,vel:vel,life:life,n:n};
}
function init(){
  if(systems||!window.scene) return;
  var q=window.FFQuality?window.FFQuality.def:{particles:1};
  var scale=(window.FFReducedMotion?0.15:q.particles||1);
  var dust=makePoints(Math.round(90*scale),0xffe6a3,0.06,0.35);
  for(var i=0;i<dust.n;i++){ dust.pos[i*3]=(Math.random()-0.5)*90; dust.pos[i*3+1]=0.5+Math.random()*6; dust.pos[i*3+2]=(Math.random()-0.5)*90;
    dust.vel[i*3]=0.2+Math.random()*0.4; dust.vel[i*3+1]=0.05; dust.life[i]=1; }
  window.scene.add(dust.pts);
  var feet=makePoints(40,0xd8c9a8,0.09,0.0);
  window.scene.add(feet.pts);
  var spark=makePoints(24,0x71e6ba,0.12,0.0);
  window.scene.add(spark.pts);
  var rain=makePoints(Math.round(220*scale),0xaedcff,0.07,0.55);
  for(var j=0;j<rain.n;j++){ rain.pos[j*3]=(Math.random()-0.5)*90; rain.pos[j*3+1]=Math.random()*22; rain.pos[j*3+2]=(Math.random()-0.5)*90;
    rain.vel[j*3+1]=-14-Math.random()*8; rain.life[j]=1; }
  rain.pts.visible=false; window.scene.add(rain.pts);
  systems={dust:dust,feet:feet,spark:spark,rain:rain,feetIdx:0,sparkIdx:0};
}
window.FFParticles={
  setRain:function(on){ init(); if(systems) systems.rain.pts.visible=!!on; if(window.FFAudio) window.FFAudio.setRain(on); },
  get raining(){ return systems?systems.rain.pts.visible:false; },
  footstep:function(x,z){
    init(); if(!systems) return;
    var f=systems.feet;
    for(var k=0;k<3;k++){ var i=systems.feetIdx; systems.feetIdx=(systems.feetIdx+1)%f.n;
      f.pos[i*3]=x+(Math.random()-0.5)*0.4; f.pos[i*3+1]=0.12; f.pos[i*3+2]=z+(Math.random()-0.5)*0.4;
      f.vel[i*3]=(Math.random()-0.5)*0.6; f.vel[i*3+1]=0.7+Math.random()*0.5; f.vel[i*3+2]=(Math.random()-0.5)*0.6;
      f.life[i]=1; }
    f.pts.material.opacity=0.6;
  },
  sparkle:function(x,y,z){
    init(); if(!systems) return;
    var s=systems.spark;
    for(var k=0;k<4;k++){ var i=systems.sparkIdx; systems.sparkIdx=(systems.sparkIdx+1)%s.n;
      s.pos[i*3]=x; s.pos[i*3+1]=y; s.pos[i*3+2]=z;
      s.vel[i*3]=(Math.random()-0.5)*1.2; s.vel[i*3+1]=1+Math.random(); s.vel[i*3+2]=(Math.random()-0.5)*1.2;
      s.life[i]=1; }
    s.pts.material.opacity=0.9;
  },
  update:function(dt){
    init(); if(!systems||!window.scene) return;
    var s=systems, t=performance.now()/1000;
    // dust drift
    for(var i=0;i<s.dust.n;i++){ s.dust.pos[i*3]+=s.dust.vel[i*3]*dt; if(s.dust.pos[i*3]>45) s.dust.pos[i*3]=-45; }
    s.dust.pts.geometry.attributes.position.needsUpdate=true;
    // feet + sparkle life
    [s.feet,s.spark].forEach(function(sys){
      for(var j=0;j<sys.n;j++){ if(sys.life[j]<=0) continue;
        sys.life[j]-=dt*1.8; sys.pos[j*3]+=sys.vel[j*3]*dt; sys.pos[j*3+1]+=sys.vel[j*3+1]*dt; sys.pos[j*3+2]+=sys.vel[j*3+2]*dt;
        if(sys.life[j]<=0){ sys.pos[j*3+1]=-10; } }
      sys.pts.geometry.attributes.position.needsUpdate=true;
    });
    // rain fall + splash fade (reset to top, brief ground opacity handled by points themselves)
    if(s.rain.pts.visible){
      for(var k=0;k<s.rain.n;k++){ s.rain.pos[k*3+1]+=s.rain.vel[k*3+1]*dt;
        if(s.rain.pos[k*3+1]<0){ s.rain.pos[k*3+1]=20+Math.random()*3;
          if(window.playerGroup){ s.rain.pos[k*3]=window.playerGroup.position.x+(Math.random()-0.5)*45;
            s.rain.pos[k*3+2]=window.playerGroup.position.z+(Math.random()-0.5)*45; } } }
      s.rain.pts.geometry.attributes.position.needsUpdate=true;
    }
    // sparkle above player when the interact button is visible
    var btn=document.getElementById('interact-btn');
    if(btn && btn.style.display!=='none' && window.playerGroup && Math.sin(t*4)>0.2){
      s.sparkle(window.playerGroup.position.x,1.8,window.playerGroup.position.z);
    }
  }
};
window.FFFootstep=function(x,z){ window.FFParticles.footstep(x,z); };
})();
