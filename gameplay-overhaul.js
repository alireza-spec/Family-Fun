/* Family Fun — Gameplay Overhaul: physics, collisions, driving, missions and interaction */
(()=>{
'use strict';
let ready=false, driving=null, speed=0, heading=0, mission=0, cash=120, last=performance.now(), safePos=null;
const obstacles=[[-32,-32,8,5,9],[-18,-32,10,8,8],[16,-32,9,6,8],[31,-30,8,10,10],[-32,-16,9,7,7],[31,-14,10,5,8],[-32,15,8,9,9],[-18,30,12,6,8],[18,30,10,8,9],[32,17,8,6,10],[-32,32,9,5,8],[10,-17,8,11,8],[-46,-24,8,3.4,5],[42,25,8,3.4,5],[0,45,8,3.4,5]];
const $=s=>document.querySelector(s), toast=m=>window.showToast?window.showToast(m):console.info(m);
function css(){if($('#ff-overhaul-style'))return;const s=document.createElement('style');s.id='ff-overhaul-style';s.textContent=`
#ff-overhaul{position:absolute;left:16px;bottom:92px;z-index:25;direction:rtl;color:#fff;font:600 12px Vazirmatn,Arial;pointer-events:none;display:flex;gap:8px;flex-direction:column;align-items:flex-start}
.ff-card{background:linear-gradient(135deg,rgba(10,18,32,.86),rgba(31,18,42,.7));border:1px solid rgba(255,209,102,.35);box-shadow:0 12px 35px #0005;border-radius:14px;padding:10px 13px;backdrop-filter:blur(12px)}
#ff-speed{font-size:21px;color:#ffd166;direction:ltr;text-align:left}.ff-mini{font-size:10px;opacity:.65}.ff-accent{color:#71e6ba}.ff-prompt{color:#fff0a7}
#ff-cross{position:absolute;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%);border:1px solid #fff9;border-radius:50%;z-index:11;pointer-events:none;box-shadow:0 0 12px #fff8}
#ff-mission{position:absolute;right:16px;top:105px;z-index:24;direction:rtl;color:#fff;background:linear-gradient(135deg,#17182bdf,#301b38d9);border:1px solid #ffcf6a66;border-radius:16px;padding:13px 15px;width:225px;box-shadow:0 12px 35px #0006;font:13px Vazirmatn,Arial}.ff-mtitle{font-weight:900;color:#ffd166;margin-bottom:5px}.ff-mtext{opacity:.9;line-height:1.7}.ff-mreward{color:#71e6ba;font-size:11px;margin-top:5px}
`;document.head.appendChild(s);const hud=document.createElement('div');hud.id='ff-overhaul';hud.innerHTML='<div class="ff-card"><div id="ff-speed">0 km/h</div><div class="ff-mini" id="ff-drive">پیاده — WASD برای حرکت</div></div><div class="ff-card ff-prompt" id="ff-prompt">در حال آماده‌سازی شهر…</div>';document.body.appendChild(hud);const cross=document.createElement('div');cross.id='ff-cross';document.body.appendChild(cross);const m=document.createElement('div');m.id='ff-mission';m.innerHTML='<div class="ff-mtitle">مأموریت: شروع دوباره</div><div class="ff-mtext">به بازارچه برو و با فروشنده صحبت کن.</div><div class="ff-mreward">پاداش: ۴۰ سکه</div>';document.body.appendChild(m)}
function boxHit(x,z,r=.45){return obstacles.some(([ox,oz,w,,d])=>Math.abs(x-ox)<w/2+r&&Math.abs(z-oz)<d/2+r)}
function moveSafe(obj,dx,dz,r=.45){const x=obj.position.x+dx,z=obj.position.z+dz;if(!boxHit(x,obj.position.z,r))obj.position.x=x;if(!boxHit(obj.position.x,z,r))obj.position.z=z;obj.position.x=Math.max(-72,Math.min(72,obj.position.x));obj.position.z=Math.max(-72,Math.min(72,obj.position.z))}
function nearestCar(){const list=window.__familyCars||[];let best=null,bd=4;list.forEach(c=>{const d=playerGroup.position.distanceTo(c.position);if(d<bd){best=c;bd=d}});return best}
function enterExit(){if(!window.isGameRunning||!playerGroup)return;if(driving){driving.userData.driver=false;driving.userData.overhaulDriving=false;playerGroup.visible=true;playerBody.visible=true;playerGroup.position.set(driving.position.x+Math.cos(heading)*2,0,driving.position.z+Math.sin(heading)*2);driving=null;speed=0;toast('🚶 پیاده شدی');return}const c=nearestCar();if(!c){toast('🚗 برای سوار شدن نزدیک یک خودرو برو');return}driving=c;c.userData.overhaulDriving=true;c.userData.driver=true;heading=c.rotation.y||0;playerGroup.visible=false;playerBody.visible=false;toast('🚘 سوار شدی — WASD رانندگی | E پیاده شدن')}
function nearestPoint(){if(!playerGroup)return null;const p=playerGroup.position;const pts=[{x:-18,z:-36,name:'بازارچه'},{x:-30,z:24,name:'کافه'},{x:30,z:-22,name:'پمپ بنزین'},{x:18,z:36,name:'فروشگاه'}];return pts.sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0]}
function interact(){if(driving)return;const q=nearestPoint();if(!q||Math.hypot(playerGroup.position.x-q.x,playerGroup.position.z-q.z)>5){toast('✨ نزدیک یک مکان مهم برو و E را بزن');return}if(mission===0&&q.name==='بازارچه'){mission=1;cash+=40;toast('✅ فروشنده را پیدا کردی! حالا به کافه برو — +۴۰ سکه');$('ff-mission').innerHTML='<div class="ff-mtitle">مأموریت: قرار دوستانه</div><div class="ff-mtext">به کافه برو و دوستت را پیدا کن.</div><div class="ff-mreward">پاداش: ۷۵ سکه</div>'}else if(mission===1&&q.name==='کافه'){mission=2;cash+=75;toast('🎉 مأموریت کامل شد! +۷۵ سکه');$('ff-mission').innerHTML='<div class="ff-mtitle">شهر مال توست</div><div class="ff-mtext">یک خودرو انتخاب کن و در شهر بچرخ.</div><div class="ff-mreward">موجودی: '+cash+' سکه</div>'}else toast('📍 '+q.name+' — اینجا بعداً تعامل‌های بیشتری خواهد داشت')}
function drive(dt){const k=window._keys||{};const gas=k.KeyW||k.ArrowUp, brake=k.KeyS||k.ArrowDown, left=k.KeyA||k.ArrowLeft,right=k.KeyD||k.ArrowRight;if(gas)speed=Math.min(13,speed+dt*10);else if(brake)speed=Math.max(-4,speed-dt*13);else speed*=Math.pow(.12,dt);const steer=(right?1:0)-(left?1:0);heading+=steer*dt*(.75+Math.abs(speed)*.08)*(speed>=0?1:-1);driving.rotation.y=heading;const dx=Math.sin(heading)*speed*dt,dz=Math.cos(heading)*speed*dt;const ox=driving.position.x,oz=driving.position.z;moveSafe(driving,dx,dz,1.25);if(Math.hypot(driving.position.x-ox,driving.position.z-oz)<Math.abs(speed*dt)*.35){speed*=-.22;toast('💥 برخورد! سرعت کم شد')}playerGroup.position.copy(driving.position);}
function walk(dt){if(!playerGroup||!window.isGameRunning)return;const p=playerGroup.position;if(boxHit(p.x,p.z,.55)&&safePos)playerGroup.position.copy(safePos);else safePos=p.clone();}
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(ready&&window.isGameRunning){if(driving)drive(dt);else walk(dt);const p=driving?driving.position:playerGroup?.position;const q=nearestPoint();if(p){$('#ff-speed').textContent=driving?Math.round(Math.abs(speed)*8)+' km/h':'0 km/h';$('#ff-drive').textContent=driving?'WASD رانندگی · E خروج':'پیاده · WASD حرکت · Shift دویدن';const d=q?Math.hypot(p.x-q.x,p.z-q.z):99;$('#ff-prompt').textContent=driving?'کنترل نرم، مراقب ساختمان‌ها باش':(d<5?'E تعامل با '+q.name:'E تعامل · نزدیک نقاط مهم شو')}}requestAnimationFrame(tick)}
function art(){try{
 const loader=new THREE.TextureLoader();
 loader.load('assets/family-fun-street-sign.svg',t=>{
  t.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Mesh(new THREE.PlaneGeometry(5.2,1.55),new THREE.MeshBasicMaterial({map:t,transparent:true}));
  s.position.set(0,3.6,-4.2);s.rotation.y=Math.PI;s.name='FamilyDistrictSign';scene.add(s);
 });
 loader.load('assets/family-fun-car-decal.svg',t=>{
  t.colorSpace=THREE.SRGBColorSpace;
  (window.__familyCars||[]).slice(0,3).forEach(c=>{
   const d=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.33),new THREE.MeshBasicMaterial({map:t,transparent:true}));
   d.position.set(0,.75,2.03);c.add(d);
  });
 });
}catch(e){console.warn('Family Fun art',e)}}
function boot(){if(ready||!window.scene)return;ready=true;css();art();document.addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat){if(driving)enterExit();else{const c=nearestCar();if(c)enterExit();else interact()}}});toast('🎮 گیم‌پلی پیشرفته فعال شد — E تعامل / خودرو');requestAnimationFrame(tick)}
const old=window.initGame;if(typeof old==='function')window.initGame=function(){old.apply(this,arguments);setTimeout(boot,600)};else document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1200));
})();
