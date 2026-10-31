/* Family Fun: Cinematic World Layer — procedural art direction without a build step */
(()=>{
'use strict'; let booted=false, sky, stars, moon, sparks=[];
const C={}; const add=(o,p=window.scene)=>{p&&p.add(o);return o};
function mat(c,opt={}){return new THREE.MeshStandardMaterial({color:c,roughness:.8,...opt})}
function box(w,h,d,m,x,y,z,p){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return add(o,p)}
function plane(w,d,m,x,y,z,p=window.scene){const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);return add(o,p)}
function canvasTexture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
function makeMaterials(){
 C.asphalt=mat(0x202731,{roughness:.96,map:canvasTexture((x,w,h)=>{x.fillStyle='#242b34';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.055})`;x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*7,1)}})});
 C.asphalt.map.repeat.set(18,18);
 C.wall=mat(0xc59b76,{roughness:.92,map:canvasTexture((x,w,h)=>{x.fillStyle='#b88968';x.fillRect(0,0,w,h);for(let i=0;i<32;i++){x.strokeStyle='rgba(55,35,25,.16)';x.beginPath();x.moveTo(0,i*18);x.lineTo(w,i*18);x.stroke()}})});C.wall.map.repeat.set(2,2);
}
function buildSky(){
 const g=new THREE.SphereGeometry(145,32,16);const tex=canvasTexture((x,w,h)=>{const q=x.createLinearGradient(0,0,0,h);q.addColorStop(0,'#061226');q.addColorStop(.42,'#274d77');q.addColorStop(.72,'#f09b75');q.addColorStop(1,'#f6cf9a');x.fillStyle=q;x.fillRect(0,0,w,h);for(let i=0;i<60;i++){x.fillStyle=`rgba(255,255,255,${.04+Math.random()*.08})`;x.beginPath();x.ellipse(Math.random()*w,180+Math.random()*160,35+Math.random()*100,5+Math.random()*14,0,0,Math.PI*2);x.fill()}});
 sky=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,depthWrite:false}));sky.name='CinematicSky';add(sky);
 const sg=new THREE.BufferGeometry(),a=new Float32Array(700*3);for(let i=0;i<700;i++){const r=115+Math.random()*20,th=Math.random()*Math.PI*.48,ph=Math.random()*Math.PI*2;a[i*3]=r*Math.sin(th)*Math.cos(ph);a[i*3+1]=r*Math.cos(th);a[i*3+2]=r*Math.sin(th)*Math.sin(ph)}sg.setAttribute('position',new THREE.BufferAttribute(a,3));stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:.28,transparent:true,opacity:.72}));add(stars);
 const sm=mat(0xdde9ff,{emissive:0x6e91c7,emissiveIntensity:.7});moon=new THREE.Mesh(new THREE.SphereGeometry(4,20,12),sm);moon.position.set(-55,55,-65);add(moon);
}
function streetDetails(){
 const root=new THREE.Group();root.name='CinematicStreetDetails';add(root);
 for(let p=-65;p<=65;p+=13){for(let s=-63;s<=63;s+=6){plane(2.8,.12,mat(0xf7e7a4,{roughness:.5}),s,.06,p,root);plane(.12,2.8,mat(0xf7e7a4,{roughness:.5}),p,.061,s,root)}}
 [[-45,-45],[-19,-45],[19,-45],[45,-45],[-45,45],[-19,45],[19,45],[45,45],[-45,-19],[45,19]].forEach(([x,z],i)=>{const pole=box(.12,4.4,.12,mat(0x202936,{metalness:.7,roughness:.3}),x,2.2,z,root);box(1.1,.12,.12,mat(0x202936,{metalness:.7}),x+.35,4.35,z,root);const glow=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),new THREE.MeshStandardMaterial({color:0xffd88d,emissive:0xff8d29,emissiveIntensity:2}));glow.position.set(x+.75,4.25,z);add(glow,root);if(i%2===0){const l=new THREE.PointLight(0xffa84e,1.3,9);l.position.set(x+.75,4.2,z);add(l,root)}});
 // traffic signals at the main junction
 [-2.9,2.9].forEach(x=>{box(.16,3.1,.16,mat(0x252c36,{metalness:.5}),x,1.55,-2.9,root);const s=box(.48,1.18,.25,mat(0x11151b),x,3.05,-2.9,root);[0xff3b30,0xffc928,0x45d36b].forEach((c,i)=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.105,8,6),new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i===2?1.2:.25}));l.position.set(x,3.38-i*.34,-3.05);add(l,root)})});
}
function landmark(x,z,title,col){const g=new THREE.Group();g.position.set(x,0,z);add(g);box(8,.25,5,mat(0x2c343f),0,.14,0,g);box(7,3.4,4,mat(col,{roughness:.58}),0,1.85,0,g);box(7.4,.18,4.4,mat(0x18202b,{metalness:.6}),0,3.62,0,g);for(let i=-2;i<=2;i++){box(1,.9,.06,mat(0x8ad7e8,{emissive:0x145060,emissiveIntensity:.7}),i*1.25,2.2,2.04,g)};const c=document.createElement('canvas');c.width=512;c.height=96;const q=c.getContext('2d');q.fillStyle='#111827';q.fillRect(0,0,512,96);q.fillStyle=col;q.fillRect(0,80,512,16);q.fillStyle='white';q.font='bold 38px Arial';q.textAlign='center';q.fillText(title,256,58);const t=new THREE.CanvasTexture(c);const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.4,1),new THREE.MeshBasicMaterial({map:t,transparent:true}));sign.position.set(0,4.9,2.05);add(sign,g)}
function ambientParticles(){const n=260,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=(Math.random()-.5)*130;a[i*3+1]=.5+Math.random()*8;a[i*3+2]=(Math.random()-.5)*130}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xffd38b,size:.045,transparent:true,opacity:.35}));p.name='CinematicDust';add(p);sparks.push(p)}
function boot(){if(booted||!window.scene||!window.THREE)return;booted=true;try{makeMaterials();buildSky();streetDetails();landmark(-46,-24,'NIGHT MARKET','#ed7b54');landmark(42,25,'FAMILY CAFE','#61c7a4');landmark(0,45,'CITY CENTER','#73a5ff');ambientParticles();window.__familyFunCinematic=true;window.showToast&&window.showToast('✨ حالت سینمایی شهر فعال شد');}catch(e){console.error(e)}}
const old=window.initGame; if(typeof old==='function')window.initGame=function(){old.apply(this,arguments);setTimeout(boot,450)};else document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,800));
})();
