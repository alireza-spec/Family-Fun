/* Family Fun 2.0 note: capsule humanoids with named joints (head/torso/arms/legs)
   and facial features. Walk/run/idle blending is done by the core animate() loop
   (walkT speed + idle breathing); this file has no render loop of its own. */
/* Family Fun Character Studio — layered 3D character replacement */
(()=>{
'use strict';
let done=false;
const T=()=>window.THREE;
function M(c,opt={}){return T().MeshStandardMaterial({color:c,roughness:.68,...opt})}
function part(g,n,geo,mat,x,y,z){const o=geo&&geo.isObject3D?geo:T().Mesh(geo,mat);o.name=n;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
function capsule(r,h,mat){const X=T();if(X.CapsuleGeometry){return new X.Mesh(new X.CapsuleGeometry(r,h/2,6,14),mat)}const g=new X.Group();part(g,'core',new X.CylinderGeometry(r,r,h,14),mat,0,0,0);part(g,'top',new X.SphereGeometry(r,14,10),mat,0,h/2,0);part(g,'bottom',new X.SphereGeometry(r,14,10),mat,0,-h/2,0);return g}
function hair(g,style,col){const m=M(col,{roughness:.82});
 if(style==='long'){part(g,'hairCap',T().SphereGeometry(.245,16,10,0,Math.PI*2,0,Math.PI*.62),m,0,.14,-.01);part(g,'hairBack',T().SphereGeometry(.24,14,10),m,0,-.08,-.13).scale.set(1,1.35,.48);for(let i=-2;i<=2;i++)part(g,'strand'+i,T().CylinderGeometry(.035,.06,.32,8),m,i*.08,-.14,-.16)}
 else if(style==='curly'){for(let i=-2;i<=2;i++)for(let j=0;j<2;j++)part(g,'curl'+i+j,T().SphereGeometry(.09,10,8),m,i*.085,.12+j*.08,.02-(j*.04))}
 else {part(g,'hairCap',T().SphereGeometry(.245,16,10,0,Math.PI*2,0,Math.PI*.6),m,0,.14,0);for(let i=-2;i<=2;i++)part(g,'fringe'+i,T().SphereGeometry(.06,9,7),m,i*.075,.08,.19)}
}
function face(head,skin,gender){
 const white=M(0xf7f7f2), iris=M(gender==='female'?0x4c8ad9:0x3a2416,{emissive:gender==='female'?0x102850:0});
 [-1,1].forEach((s,i)=>{part(head,'eyeWhite'+i,T().SphereGeometry(.045,10,8),white,s*.075,.025,.218);part(head,'iris'+i,T().SphereGeometry(.022,8,6),iris,s*.075,.025,.258)});
 part(head,'nose',T().SphereGeometry(.027,8,6),skin,0,-.035,.245);
 const mouth=part(head,'smile',T().TorusGeometry(.055,.012,6,12,Math.PI),M(0x7b2940),0,-.09,.23);mouth.rotation.x=Math.PI/2;
}
function make(def={}){const THREE=T(),g=new THREE.Group();const female=!!def.gender||!!def.isFemale;const skin=M(def.skinColor||0xd69b72);const shirt=M(def.shirtColor||def.color||0x2459b8);const pants=M(def.pantsColor||(female?0x4a246e:0x202942));const shoe=M(0x171b24,{metalness:.15});
 const hips=part(g,'hips',new THREE.SphereGeometry(.22,14,10),pants,0,.58,0);hips.scale.set(1,.62,.72);
 const torso=part(g,'torso',capsule(.24,.38,shirt),shirt,0,.9,0);torso.scale.set(1,.98,.72);
 const collar=part(g,'collar',new THREE.TorusGeometry(.115,.025,6,16),M(0xe6d6ba),0,1.15,.01);collar.rotation.x=Math.PI/2;
 const neck=part(g,'neck',new THREE.CylinderGeometry(.075,.08,.12,10),skin,0,1.2,0);
 const head=new THREE.Group();head.name='head';head.position.y=1.43;g.add(head);part(head,'face',new THREE.SphereGeometry(.245,16,12),skin,0,0,0).scale.set(.92,1.05,.86);face(head,skin, female?'female':'male');hair(head, female?'long':'short',def.hairColor||0x24150f);
 [-1,1].forEach((s,i)=>{const arm=new THREE.Group();arm.name=s<0?'leftArm':'rightArm';arm.position.set(s*.29,1.08,0);arm.rotation.z=s*.08;arm.add(capsule(.075,.34,shirt));part(arm,'hand',new THREE.SphereGeometry(.075,10,8),skin,0,-.28,.01);g.add(arm);
 const leg=new THREE.Group();leg.name=s<0?'leftLeg':'rightLeg';leg.position.set(s*.115,.54,0);leg.add(capsule(.095,.38,pants));part(leg,'ankle',new THREE.SphereGeometry(.08,9,7),skin,0,-.25,.02);part(leg,'shoe',new THREE.BoxGeometry(.18,.09,.3),shoe,0,-.31,.055);g.add(leg)});
 if(female){const scarf=part(g,'scarf',new THREE.TorusGeometry(.205,.028,7,18),M(def.scarfColor||0xe77b9b),0,1.22,0);scarf.rotation.x=Math.PI/2}
 g.userData.characterStudio=true;return g}
function replace(host,def){if(!host)return;const old=host.userData?.body||host;const fresh=make(def);if(old.parent){old.parent.add(fresh);fresh.position.copy(old.position);fresh.rotation.copy(old.rotation);old.parent.remove(old)}if(host.userData)host.userData.body=fresh;return fresh}
function boot(){if(done||!T()||!window.scene)return;try{
 if(window.playerBody){const isFemale=!!document.querySelector('#gbF.active');const fresh=replace({userData:{body:window.playerBody}}, {gender:isFemale,shirtColor:isFemale?0xd44289:0x2563d8,hairColor:0x24150f});window.playerBody=fresh;window.playerGroup&&window.playerGroup.add(fresh)}
 (window.npcs||[]).forEach((n,i)=>{if(n.userData?.body){const d=n.userData;replace(n,{gender:i%3===0?'female':'male',color:d.color||0x2c70b8,shirtColor:d.shirtColor||d.color,hairColor:i%2?0x24150f:0x4b2b1b})}});
 window.__familyFunCharacters=true;if(!window.playerBody)return;done=true;window.showToast&&window.showToast('🎭 مدل سه‌بعدی حرفه‌ای فعال شد');
 }catch(e){console.error('Character Studio',e)} }
const old=window.initGame;
if(typeof old==='function'){
 window.initGame=function(){
  old.apply(this,arguments);
  let tries=0;
  const poll=()=>{ if(done||tries++>24)return; boot(); if(!done)setTimeout(poll,250); };
  setTimeout(poll,400);
 };
}else{
 document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1000));
}
})();
