/* Family Fun: Open City Upgrade
 * Procedural, dependency-free city systems layered over the existing game.
 */
(() => {
  'use strict';
  const CFG={world:78,block:13,road:5,traffic:8};
  let started=false, cars=[], lamps=[], rain=null, rainOn=false, last=performance.now();
  const q=s=>document.querySelector(s);
  const toast=(m)=>window.showToast?window.showToast(m):console.info(m);
  const color=(n,opts={})=>new THREE.MeshStandardMaterial({color:n,roughness:.72,...opts});
  const mesh=(g,m,x=0,y=0,z=0,parent=window.scene)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent?.add(o);return o;};
  const group=()=>new THREE.Group();
  function label(text,accent='#f5b942'){
    const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');
    x.fillStyle='#101827';x.fillRect(0,0,512,128);x.fillStyle=accent;x.fillRect(0,112,512,16);x.fillStyle='#fff';x.font='bold 42px Arial';x.textAlign='center';x.fillText(text,256,78);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function sign(text,x,y,z,rot=0,accent='#f5b942'){
    const o=mesh(new THREE.PlaneGeometry(3.4,.85),new THREE.MeshBasicMaterial({map:label(text,accent),transparent:true}),x,y,z);o.rotation.y=rot;return o;
  }
  function buildRoads(){
    const root=group();root.name='NextGen_RoadNetwork';window.scene.add(root);
    const asphalt=color(0x242a32,{roughness:.98});const curb=color(0x737a82,{roughness:.9});const paint=color(0xf6d66b,{roughness:.7});
    for(let p=-CFG.world;p<=CFG.world;p+=CFG.block){
      mesh(new THREE.PlaneGeometry(CFG.world*2,CFG.road),asphalt,0,.018,p,root).rotation.x=-Math.PI/2;
      mesh(new THREE.PlaneGeometry(CFG.road,CFG.world*2),asphalt,p,.019,0,root).rotation.x=-Math.PI/2;
      mesh(new THREE.BoxGeometry(CFG.world*2,.12,.18),curb,0,.08,p-CFG.road/2,root);
      mesh(new THREE.BoxGeometry(CFG.world*2,.12,.18),curb,0,.08,p+CFG.road/2,root);
      for(let s=-CFG.world+2;s<CFG.world;s+=5){mesh(new THREE.PlaneGeometry(2.2,.08),paint,s,.045,p,root).rotation.x=-Math.PI/2;mesh(new THREE.PlaneGeometry(.08,2.2),paint,p,.046,s,root).rotation.x=-Math.PI/2;}
    }
    [-26,0,26].forEach(p=>{for(let i=-3;i<=3;i++){const z=p+i*.65;mesh(new THREE.PlaneGeometry(.5,3.3),color(0xe9edf2),-3.4,.055,z,root).rotation.x=-Math.PI/2;mesh(new THREE.PlaneGeometry(.5,3.3),color(0xe9edf2),3.4,.055,z,root).rotation.x=-Math.PI/2;}});
  }
  function building(x,z,w,h,d,style=0){
    const g=group();g.position.set(x,0,z);window.scene.add(g);const body=[0x6d7585,0xb78b6a,0x7b8c77,0x9c6b5c,0x5d7188][style%5];
    mesh(new THREE.BoxGeometry(w,h,d),color(body,{roughness:.86}),0,h/2,0,g);
    mesh(new THREE.BoxGeometry(w+.18,.18,d+.18),color(0x333945),0,h+.09,0,g);
    const glass=color(0x8ad5ec,{metalness:.2,roughness:.18,emissive:0x0a2533,emissiveIntensity:.18});
    const rows=Math.max(2,Math.floor(h/2.1));const cols=Math.max(2,Math.floor(w/2.2));
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const px=-w/2+1.1+c*(w-2.2)/Math.max(1,cols-1),py=1.35+r*1.8;
      if(py>h-.6)continue;mesh(new THREE.BoxGeometry(.72,.58,.04),glass,px,py,d/2+.025,g);
      if((r+c)%3===0)mesh(new THREE.BoxGeometry(.78,.08,.22),color(0xe6a15b),px,py-.42,d/2+.07,g);
    }
    return g;
  }
  function buildDistrict(){
    const occupied=[[-32,-32,8,5,9,1],[-18,-32,10,8,8,2],[16,-32,9,6,8,3],[31,-30,8,10,10,4],[-32,-16,9,7,7,0],[31,-14,10,5,8,2],[-32,15,8,9,9,3],[-18,30,12,6,8,4],[18,30,10,8,9,1],[32,17,8,6,10,0],[-32,32,9,5,8,2],[10,-17,8,11,8,3]];
    occupied.forEach(a=>building(...a));
    sign('بازارچه',-18,5,-36,0,'#ff8c69');sign('پمپ بنزین',30,5,-22,Math.PI/2,'#65d6a6');sign('کافه',-30,3,24,Math.PI/2,'#e6a15b');sign('فروشگاه',18,4,36,Math.PI,'#72a7ff');
    [[-10,-10],[11,-10],[-10,10],[11,10],[-24,22],[23,22]].forEach(([x,z])=>{
      const bed=mesh(new THREE.BoxGeometry(3.4,.12,1.4),color(0x5f422b),x,.1,z);for(let i=0;i<6;i++){mesh(new THREE.CylinderGeometry(.04,.06,.38,6),color(0x4d9a56),x-1.3+i*.5,.34,z+(i%2-.5)*.45);mesh(new THREE.SphereGeometry(.13,7,6),color([0xff7198,0xffd166,0xa58bff][i%3]),x-1.3+i*.5,.58,z+(i%2-.5)*.45);}
    });
  }
  function car(x,z,paintColor,axis){
    const g=group();const body=color(paintColor,{metalness:.62,roughness:.25});mesh(new THREE.BoxGeometry(2.1,.55,4),body,0,.62,0,g);mesh(new THREE.BoxGeometry(1.65,.45,1.65),color(0x182330,{roughness:.12,metalness:.5}),0,1.05,-.1,g);
    [-.76,.76].forEach(px=>[-1.25,1.25].forEach(pz=>{const w=mesh(new THREE.CylinderGeometry(.3,.3,.18,12),color(0x111318),px,.3,pz,g);w.rotation.z=Math.PI/2;}));
    g.position.set(x,0,z);g.userData={axis,speed:.7+Math.random()*.7};window.scene.add(g);cars.push(g);
  }
  function buildTraffic(){[[ -30,2,0xd95050,'x'],[8,-2,0x3478c5,'x'],[30,5,0xf0b429,'x'],[-2,-30,0x48a868,'z'],[2,30,0xb16be0,'z'],[-26,0,0xef7d32,'z']].forEach(a=>car(...a));}
  function buildLamps(){
    [[-7,-7],[-7,7],[7,-7],[7,7],[-33,-7],[33,7],[-7,33],[7,-33],[-33,20],[33,-20]].forEach(([x,z])=>{const g=group();mesh(new THREE.CylinderGeometry(.07,.11,3.2,8),color(0x303744,{metalness:.7,roughness:.35}),0,1.6,0,g);mesh(new THREE.SphereGeometry(.18,10,8),new THREE.MeshStandardMaterial({color:0xffd27d,emissive:0xffa62b,emissiveIntensity:1.5}),0,3.2,0,g);const l=new THREE.PointLight(0xffb35c,1.7,8);l.position.y=3.1;g.add(l);g.position.set(x,0,z);window.scene.add(g);lamps.push(l);});
  }
  function buildRain(){const n=520,pos=new Float32Array(n*3);for(let i=0;i<n;i++){pos[i*3]=(Math.random()-.5)*130;pos[i*3+1]=Math.random()*35;pos[i*3+2]=(Math.random()-.5)*130;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));rain=new THREE.Points(geo,new THREE.PointsMaterial({color:0x9bd8ff,size:.075,transparent:true,opacity:.55}));rain.visible=false;window.scene.add(rain);}
  function toggleRain(){rainOn=!rainOn;if(rain)rain.visible=rainOn;document.body.classList.toggle('weather-rain',rainOn);toast(rainOn?'🌧️ باران شروع شد':'☀️ هوا صاف شد');}
  function createMissionUI(){
    const el=document.createElement('div');el.id='nextgen-mission';el.innerHTML='<b>مأموریت روزانه</b><span>به بازارچه برو و با فروشنده صحبت کن</span><small>کلید M برای نمایش/مخفی‌کردن</small>';document.body.appendChild(el);
    window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='m')el.classList.toggle('hidden');if(e.key.toLowerCase()==='v')toggleRain();if(e.key.toLowerCase()==='f')toast('🚗 نزدیک‌ترین خودرو آماده‌ی حرکت است');});
  }
  function tick(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(started){cars.forEach(c=>{if(c.userData.axis==='x'){c.position.x+=c.userData.speed*dt*5;if(c.position.x>42)c.position.x=-42;}else{c.position.z+=c.userData.speed*dt*5;if(c.position.z>42)c.position.z=-42;}});if(rainOn&&rain){const a=rain.geometry.attributes.position.array;for(let i=1;i<a.length;i+=3){a[i]-=dt*18;if(a[i]<0)a[i]=35;}rain.geometry.attributes.position.needsUpdate=true;}}
    requestAnimationFrame(tick);
  }
  function start(){if(started||!window.scene||!window.THREE)return;started=true;try{buildRoads();buildDistrict();buildTraffic();buildLamps();buildRain();createMissionUI();toast('🌆 شهر بزرگ آماده است — M مأموریت | V آب‌وهوا | F خودرو');}catch(e){console.error('NextGen upgrade',e);}requestAnimationFrame(tick);}
  function wire(){const old=window.initGame;if(typeof old==='function'){window.initGame=function(){old.apply(this,arguments);setTimeout(start,300);};}else setTimeout(()=>{if(window.scene)start();},1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
