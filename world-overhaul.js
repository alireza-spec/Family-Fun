/* Family Fun — World Overhaul
   Additive Three.js layer. It does not replace initGame(), controls, player motion, or rendering. */
(() => {
  'use strict';
  const VERSION = '1.0.0';
  const state = {
    started:false, destroyed:false, group:null, ui:null, canvas:null, ctx:null,
    clock:0, last:performance.now(), lastMap:0, day:0.33, rain:false, audio:null,
    audioReady:false, interaction:null, objective:{title:'مسیر تازه', text:'به نشان نورانی میدان شهر نزدیک شو.', progress:34},
    playerLast:null, playerVelocity:null, cameraPosition:null, resources:[], lights:[], markers:[], rainPoints:null,
    sky:null, stars:null, sun:null, hemi:null, baseFog:null, originalBackground:null, cssOwned:false, frame:0,
    handlers:[]
  };
  const W = window, D = document;
  const rnd = (i) => { const x=Math.sin(i*9283.17+71.3)*43758.5453; return x-Math.floor(x); };
  const say = (text) => typeof W.showToast === 'function' ? W.showToast(text) : console.info('[Family Fun]', text);
  const addEvent = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); state.handlers.push([target,type,fn,opts]); };
  const isReady = () => !!(W.THREE && W.scene && W.camera && W.playerGroup);

  function addStylesheet(){
    if (D.getElementById('ffw-stylesheet')) return;
    const link=D.createElement('link'); link.id='ffw-stylesheet'; link.rel='stylesheet'; link.href='world-overhaul.css';
    link.dataset.ffwOwned='1'; D.head.appendChild(link); state.cssOwned=true;
  }
  function track(material){ state.resources.push(material); return material; }
  function material(color, options={}){ return track(new W.THREE.MeshStandardMaterial({color, roughness:.72, ...options})); }
  function add(mesh, parent=state.group){ parent.add(mesh); return mesh; }
  function mesh(geometry, mat, x=0,y=0,z=0,parent=state.group){
    const m=new W.THREE.Mesh(geometry,mat); m.position.set(x,y,z); m.castShadow=false; m.receiveShadow=true; parent.add(m); return m;
  }
  function safeColor(value){ return new W.THREE.Color(value); }

  function makeUI(){
    const root=D.createElement('section'); root.id='ff-world-ui'; root.setAttribute('aria-label','وضعیت جهان Family Fun');
    root.innerHTML=`<section id="ffw-objective" class="ffw-glass"><div class="ffw-kicker"><i class="ffw-dot"></i><span>راهنمای شهر</span></div><div class="ffw-title"></div><div class="ffw-copy"></div><div class="ffw-meter"><i></i></div></section><div id="ffw-map-wrap"><canvas id="ffw-map" width="240" height="240" aria-label="نقشه کوچک"></canvas><div class="ffw-map-ring"></div><b class="ffw-north">N</b></div><div id="ffw-weather">☀️ عصر آرام</div><div id="ffw-status" class="ffw-glass"><div><div class="ffw-speed">0</div><div class="ffw-unit">KM / H</div></div><div class="ffw-vline"></div><div class="ffw-status-copy"><b>پیاده در شهر</b><span>محله‌ی خانواده</span></div></div><div id="ffw-tip" class="ffw-glass"></div>`;
    D.body.appendChild(root); state.ui=root; state.canvas=root.querySelector('#ffw-map'); state.ctx=state.canvas.getContext('2d');
    updateObjective();
  }
  function updateObjective(){
    if(!state.ui)return; const o=state.objective;
    state.ui.querySelector('.ffw-title').textContent=o.title;
    state.ui.querySelector('.ffw-copy').textContent=o.text;
    state.ui.querySelector('.ffw-meter i').style.width=`${Math.max(0,Math.min(100,o.progress||0))}%`;
  }
  function tip(html, hold=0){
    const el=state.ui?.querySelector('#ffw-tip'); if(!el)return;
    el.innerHTML=html; el.classList.add('ffw-tip-show');
    if(hold) W.setTimeout(()=>el.classList.remove('ffw-tip-show'),hold);
  }

  function setupAtmosphere(){
    const T=W.THREE, scene=W.scene;
    state.originalBackground=scene.background; state.baseFog=scene.fog ? {color:scene.fog.color.clone(),density:scene.fog.density} : null;
    if(!scene.fog) scene.fog=new T.FogExp2(0x8ca9b8,.009);
    const skyMat=track(new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:safeColor('#10284b')},bottom:{value:safeColor('#d4a376')},mixT:{value:.55}},vertexShader:'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 bottom;uniform float mixT;varying vec3 vP;void main(){float h=clamp(normalize(vP).y*.55+.48,0.,1.);gl_FragColor=vec4(mix(bottom,top,pow(h,.72)),1.);}'}));
    state.sky=mesh(new T.SphereGeometry(118,24,14),skyMat,0,0,0); state.sky.name='FFW_CinematicSky';
    const count=220, positions=new Float32Array(count*3);
    for(let i=0;i<count;i++){ const a=rnd(i)*Math.PI*2, r=72+rnd(i+13)*33, y=15+rnd(i+71)*45; positions.set([Math.cos(a)*r,y,Math.sin(a)*r],i*3); }
    const geo=new T.BufferGeometry(); geo.setAttribute('position',new T.BufferAttribute(positions,3));
    state.stars=add(new T.Points(geo,track(new T.PointsMaterial({color:0xe9f5ff,size:.24,transparent:true,opacity:0,depthWrite:false})))); state.stars.name='FFW_Stars';
    state.hemi=new T.HemisphereLight(0xb9d8ff,0x34452f,.28); state.hemi.name='FFW_Hemisphere'; add(state.hemi);
    state.sun=new T.DirectionalLight(0xffd9a1,.38); state.sun.position.set(-45,48,24); state.sun.name='FFW_SunFill'; state.sun.castShadow=false; add(state.sun);
  }

  function setupCity(){
    const T=W.THREE, root=new T.Group(); root.name='FFW_ProceduralCity'; add(root);
    const trunk=material(0x644632,{roughness:.95}), leaf=material(0x416f48,{roughness:.92}), leaf2=material(0x5a8b54,{roughness:.9});
    const trees=[[-35,-35],[-29,23],[-40,9],[-21,39],[-8,-36],[9,39],[24,36],[40,-20],[36,5],[28,-39],[-39,-11],[-18,15],[17,17],[8,-16],[-26,-1],[43,31],[-42,35],[0,42]];
    const trunks=new T.InstancedMesh(new T.CylinderGeometry(.12,.19,2.2,6),trunk,trees.length);
    const crowns=new T.InstancedMesh(new T.IcosahedronGeometry(1.12,1),leaf,trees.length);
    const crowns2=new T.InstancedMesh(new T.IcosahedronGeometry(.78,1),leaf2,trees.length); const mat4=new T.Matrix4();
    trees.forEach(([x,z],i)=>{ const s=.8+rnd(i)*.45; mat4.compose(new T.Vector3(x,1.1,z),new T.Quaternion(),new T.Vector3(s,1,s));trunks.setMatrixAt(i,mat4);mat4.compose(new T.Vector3(x,2.65,z),new T.Quaternion(),new T.Vector3(s,s*.95,s));crowns.setMatrixAt(i,mat4);mat4.compose(new T.Vector3(x+.45,3.3,z-.12),new T.Quaternion(),new T.Vector3(s*.72,s*.72,s*.72));crowns2.setMatrixAt(i,mat4); });
    trunks.instanceMatrix.needsUpdate=crowns.instanceMatrix.needsUpdate=crowns2.instanceMatrix.needsUpdate=true; [trunks,crowns,crowns2].forEach(o=>{o.castShadow=false;o.receiveShadow=true;root.add(o);});
    const winMat=material(0x8dd4e7,{roughness:.24,metalness:.12,emissive:0x305f6a,emissiveIntensity:.7});
    const windows=[[-31,-28,5],[-18,-28,7],[17,-28,6],[31,-25,8],[-30,-12,5],[31,-11,5],[-31,19,7],[-18,27,5],[18,27,6],[31,18,5],[10,-15,9]];
    const instances=windows.reduce((n,a)=>n+a[2],0), panes=new T.InstancedMesh(new T.BoxGeometry(.74,.62,.055),winMat,instances); let p=0;
    windows.forEach(([x,z,n],j)=>{for(let i=0;i<n;i++){const col=i%3,row=Math.floor(i/3); const side=(j%2?1:-1); mat4.compose(new T.Vector3(x+(col-1)*1.0,1.5+row*1.05,z+side*(3.75+rnd(i+j)*.2)),new T.Quaternion(),new T.Vector3(1,1,1));panes.setMatrixAt(p++,mat4);}}); panes.instanceMatrix.needsUpdate=true; root.add(panes);
    const lampPlaces=[[-7,-19],[7,-19],[-7,19],[7,19],[-33,-5],[33,5],[-20,6],[21,-6],[-42,25],[42,-25]];
    lampPlaces.forEach(([x,z],i)=>makeLamp(x,z,i,root));
    makeSign(root);
    const planterMat=material(0x4b5962,{roughness:.88}), flowerMat=material(0xffb16e,{emissive:0x4a1205,emissiveIntensity:.25});
    [[-10,10],[11,10],[-23,22],[22,22]].forEach(([x,z],j)=>{mesh(new T.BoxGeometry(3.7,.22,1.45),planterMat,x,.12,z,root);for(let i=0;i<5;i++){const b=mesh(new T.SphereGeometry(.13,6,5),flowerMat,x-1.2+i*.6,.46,z+(i%2?.3:-.3),root);b.userData.ffwFlower=true;}});
  }
  function makeLamp(x,z,i,parent){
    const T=W.THREE, g=new T.Group(), metal=material(0x25313d,{metalness:.6,roughness:.42}), glass=material(0xffd28a,{emissive:0xff9e3c,emissiveIntensity:.55,roughness:.35});
    mesh(new T.CylinderGeometry(.055,.09,3.7,8),metal,0,1.85,0,g); mesh(new T.BoxGeometry(.7,.08,.08),metal,.27,3.52,0,g); mesh(new T.SphereGeometry(.16,10,8),glass,.58,3.38,0,g);
    const light=new T.PointLight(0xffb560,0,7,2); light.position.set(.58,3.34,0); g.add(light); g.position.set(x,0,z); g.name='FFW_Lamp'; parent.add(g); state.lights.push({light,glass,phase:i*.37});
  }
  function makeSign(parent){
    const T=W.THREE, g=new T.Group(); g.name='FFW_CitySign';
    const post=material(0x273645,{metalness:.55,roughness:.45}); mesh(new T.CylinderGeometry(.08,.11,3.5,8),post,0,1.75,0,g); mesh(new T.CylinderGeometry(.08,.11,3.5,8),post,4,1.75,0,g);
    const loader=new T.TextureLoader(); loader.load('assets/world-overhaul-sign.svg', texture=>{texture.colorSpace=T.SRGBColorSpace;const panel=mesh(new T.PlaneGeometry(5.7,2.05),track(new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false})),2,4.35,0,g);panel.rotation.y=Math.PI;},undefined,()=>{});
    g.position.set(0,0,-45); parent.add(g);
  }

  function setupMarkers(){
    const T=W.THREE; const locations=[{name:'میدان شهر',text:'چراغ‌های میدان را بررسی کن',x:0,z:40,reward:'+ ۲۵ شادی'},{name:'بازار شبانه',text:'برای یک گفت‌وگوی کوتاه نزدیک شو',x:-42,z:-24,reward:'+ ۱۰ سکه'},{name:'کافه خانواده',text:'نقطه‌ی استراحت محله',x:42,z:25,reward:'+ انرژی'}];
    locations.forEach((loc,i)=>{const g=new T.Group(); g.name='FFW_Marker_'+i; const ring=mesh(new T.TorusGeometry(.62,.035,5,20),track(new T.MeshBasicMaterial({color:i?0xffbd73:0x71e5c0,transparent:true,opacity:.85})),0,.11,0,g);ring.rotation.x=Math.PI/2; const beam=mesh(new T.CylinderGeometry(.025,.2,2.7,8,1,true),track(new T.MeshBasicMaterial({color:i?0xffbd73:0x71e5c0,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide})),0,1.4,0,g); g.position.set(loc.x,0,loc.z); W.scene.add(g); state.markers.push({g,ring,beam,loc,used:false});});
  }
  function setupRain(){
    const T=W.THREE, n=180, a=new Float32Array(n*3); for(let i=0;i<n;i++){a[i*3]=(rnd(i)-.5)*86;a[i*3+1]=rnd(i+17)*22;a[i*3+2]=(rnd(i+43)-.5)*86;}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(a,3)); state.rainPoints=add(new T.Points(geo,track(new T.PointsMaterial({color:0xaedcff,size:.055,transparent:true,opacity:.55,depthWrite:false})))); state.rainPoints.name='FFW_LightRain';state.rainPoints.visible=false;
  }

  function unlockAudio(){
    if(state.audioReady)return; const AC=W.AudioContext||W.webkitAudioContext; if(!AC)return;
    try{state.audio=new AC(); if(state.audio.state==='suspended')state.audio.resume(); state.audioReady=true;}catch(e){}
  }
  function sound(kind='ping'){
    if(!state.audioReady||!state.audio)return; const a=state.audio, now=a.currentTime, osc=a.createOscillator(), gain=a.createGain();
    const tones=kind==='rain'?[160,100]:kind==='discover'?[523,784]:[420,620]; osc.type=kind==='rain'?'sine':'triangle'; osc.frequency.setValueAtTime(tones[0],now);osc.frequency.exponentialRampToValueAtTime(tones[1],now+.12); gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='rain'?.018:.055,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);osc.connect(gain).connect(a.destination);osc.start(now);osc.stop(now+.21);
  }
  function playerPosition(){
    const cars=W.__familyCars||[]; const driven=cars.find(c=>c?.userData&&(c.userData.overhaulDriving||c.userData.driver)); return driven?.position || W.playerGroup?.position || null;
  }
  function activeVehicle(){ return (W.__familyCars||[]).find(c=>c?.userData&&(c.userData.overhaulDriving||c.userData.driver)); }
  function interactionCheck(){
    const pos=playerPosition();if(!pos)return; let near=null, distance=Infinity;
    state.markers.forEach(m=>{if(m.used)return; const d=Math.hypot(pos.x-m.loc.x,pos.z-m.loc.z);if(d<distance){near=m;distance=d;}});
    state.interaction=(near&&distance<4.2)?near:null;
    if(state.interaction) tip(`<span class="ffw-key">Q</span> ${state.interaction.loc.text}`); else if(!state.ui?.querySelector('#ffw-tip')?.classList.contains('ffw-tip-show')) tip('');
  }
  function interact(){
    const m=state.interaction;if(!m)return;
    m.used=true;m.g.visible=false;state.objective={title:'نقطه کشف شد',text:`${m.loc.name} ثبت شد — ${m.loc.reward}`,progress:Math.min(100,state.objective.progress+33)};updateObjective();sound('discover');say(`✨ ${m.loc.name} کشف شد! ${m.loc.reward}`);tip('✨ کشف جدید ثبت شد',1800);
  }

  function updateWorld(now){
    if(state.destroyed)return; state.frame=W.requestAnimationFrame(updateWorld);
    if(!state.started||!W.scene||!W.playerGroup){return;}
    const dt=Math.min(.05,(now-state.last)/1000||0);state.last=now;state.clock+=dt; state.day=(state.day+dt/420)%1;
    updateLighting(); updateRain(dt); updateCamera(dt); interactionCheck(); updateHUD(dt);
  }
  function updateLighting(){
    const T=W.THREE, a=state.day*Math.PI*2, daylight=Math.max(0,Math.sin(a-.55)*.5+.5), night=1-daylight;
    const sky=state.sky.material.uniforms;sky.top.value.setHSL(.60,.42,.09+.20*daylight);sky.bottom.value.setHSL(.075,.64,.16+.59*daylight);
    W.scene.fog.color.setHSL(.57,.25,.10+.55*daylight); W.scene.fog.density=.0075+night*.006;
    state.sun.intensity=.12+daylight*.65;state.sun.position.set(Math.cos(a)*55,18+daylight*54,Math.sin(a)*42);state.hemi.intensity=.16+daylight*.34;
    state.stars.material.opacity=Math.max(0,(night-.2)*.95);state.stars.rotation.y+=.00014;
    state.lights.forEach(({light,glass,phase})=>{const v=Math.max(0,(night-.25)/.75);light.intensity=v*(1.05+.1*Math.sin(state.clock+phase));glass.emissiveIntensity=.2+v*1.5;});
    const weather=state.ui?.querySelector('#ffw-weather'); if(weather)weather.textContent=state.rain?'🌧️ باران ملایم':(night>.58?'🌙 شب آرام':'☀️ عصر آرام');
  }
  function updateRain(dt){
    if(!state.rain||!state.rainPoints)return;const a=state.rainPoints.geometry.attributes.position.array;for(let i=1;i<a.length;i+=3){a[i]-=dt*18;if(a[i]<0)a[i]=18+rnd(i)*8;}state.rainPoints.geometry.attributes.position.needsUpdate=true;
  }
  function updateCamera(dt){
    const p=W.playerGroup, cam=W.camera;if(!p||!cam||W.playerBody?.visible===false)return;
    const last=state.playerLast; if(!last){state.playerLast=p.position.clone();state.playerVelocity=new W.THREE.Vector3();return;}
    const v=p.position.clone().sub(last).multiplyScalar(1/Math.max(dt,.001));v.y=0;state.playerVelocity.lerp(v,.14);last.copy(p.position);
    if(state.playerVelocity.lengthSq()<.015)return;
    // Keep the game's yaw/orbit choice: only lead the look target and damp tiny camera jitter.
    const offset=cam.position.clone().sub(p.position); if(offset.lengthSq()<.3)return;
    const desired=p.position.clone().add(offset); const follow=Math.min(1,dt*7);
    if(!state.cameraPosition)state.cameraPosition=cam.position.clone(); state.cameraPosition.lerp(desired,follow);cam.position.copy(state.cameraPosition);
    const lead=state.playerVelocity.clone().clampLength(0,.72);cam.lookAt(p.position.x+lead.x,p.position.y+.9,p.position.z+lead.z);
  }
  function updateHUD(dt){
    const p=playerPosition();if(!p||!state.ui)return; const driven=activeVehicle();let kmh=0;
    if(!state._hudLast){state._hudLast=p.clone();}else{kmh=Math.min(99,p.distanceTo(state._hudLast)/Math.max(dt,.001)*3.6);state._hudLast.copy(p);}
    if(!driven)kmh=Math.min(kmh,18);const speed=state.ui.querySelector('.ffw-speed');speed.textContent=Math.round(kmh);
    const copy=state.ui.querySelector('.ffw-status-copy');copy.innerHTML=driven?'<b>رانندگی آزاد</b><span>مراقب چهارراه باش</span>':'<b>پیاده در شهر</b><span>محله‌ی خانواده</span>';
    if(performance.now()-state.lastMap>160){drawMap(p);state.lastMap=performance.now();}
  }
  function drawMap(p){
    const x=state.ctx, cv=state.canvas;if(!x||!cv)return;const w=cv.width,c=w/2,scale=2.15;x.clearRect(0,0,w,w);x.fillStyle='#0b1723';x.fillRect(0,0,w,w);x.strokeStyle='rgba(148,188,218,.28)';x.lineWidth=9;
    [-39,-26,-13,0,13,26,39].forEach(n=>{x.beginPath();x.moveTo(c+n*scale,0);x.lineTo(c+n*scale,w);x.stroke();x.beginPath();x.moveTo(0,c+n*scale);x.lineTo(w,c+n*scale);x.stroke();});
    state.markers.forEach(m=>{if(m.used)return;x.fillStyle='#ffbd73';x.beginPath();x.arc(c+m.loc.x*scale,c+m.loc.z*scale,4,0,Math.PI*2);x.fill();});
    (W.__familyCars||[]).slice(0,8).forEach(car=>{x.fillStyle='#75aeff';x.fillRect(c+car.position.x*scale-2,c+car.position.z*scale-2,4,4);});
    x.save();x.translate(c+p.x*scale,c+p.z*scale);x.fillStyle='#78e5c1';x.beginPath();x.moveTo(0,-7);x.lineTo(5,6);x.lineTo(-5,6);x.closePath();x.fill();x.restore();
  }

  function setRain(value){state.rain=typeof value==='boolean'?value:!state.rain;if(state.rainPoints)state.rainPoints.visible=state.rain;sound('rain');say(state.rain?'🌧️ باران ملایم شروع شد':'☀️ باران قطع شد');return state.rain;}
  function setObjective(title,text,progress=0){state.objective={title:String(title),text:String(text),progress:Number(progress)||0};updateObjective();}
  function bindInput(){
    addEvent(D,'pointerdown',unlockAudio,{once:true,passive:true}); addEvent(D,'keydown',e=>{if(e.code==='KeyQ'&&!e.repeat){unlockAudio();interact();}if(e.code==='KeyR'&&!e.repeat){unlockAudio();setRain();}},false);
  }
  function disposeObject(root){root?.traverse(o=>{o.geometry?.dispose?.();const m=o.material;if(Array.isArray(m))m.forEach(v=>v.dispose?.());else m?.dispose?.();});}
  function destroy(){
    state.destroyed=true;if(state.frame)W.cancelAnimationFrame(state.frame);state.handlers.forEach(([t,n,f,o])=>t.removeEventListener(n,f,o));state.handlers.length=0;
    if(state.group){W.scene?.remove(state.group);disposeObject(state.group);} state.markers.forEach(m=>{W.scene?.remove(m.g);disposeObject(m.g);});
    [state.sky,state.stars,state.hemi,state.sun,state.rainPoints].forEach(o=>{if(o){W.scene?.remove(o);disposeObject(o);}});state.resources.forEach(r=>r.dispose?.());
    if(W.scene&&state.baseFog){W.scene.fog.color.copy(state.baseFog.color);W.scene.fog.density=state.baseFog.density;}if(W.scene&&state.originalBackground)W.scene.background=state.originalBackground;
    state.ui?.remove();if(state.cssOwned)D.getElementById('ffw-stylesheet')?.remove();state.audio?.close?.();delete W.FamilyFunWorldOverhaul;
  }
  function start(){
    if(state.started||state.destroyed)return;state.started=true;addStylesheet();state.group=new W.THREE.Group();state.group.name='FamilyFunWorldOverhaul';W.scene.add(state.group);
    makeUI();setupAtmosphere();setupCity();setupMarkers();setupRain();bindInput();state.last=performance.now();state.frame=W.requestAnimationFrame(updateWorld);say('🌆 لایه‌ی جهان زنده فعال شد — Q تعامل · R باران');
  }
  function wait(tries=0){if(state.destroyed)return;if(isReady())return start();W.setTimeout(()=>wait(tries+1),Math.min(1000,220+tries*15));}
  W.FamilyFunWorldOverhaul={version:VERSION,init:()=>{if(!state.started){state.destroyed=false;wait();}return W.FamilyFunWorldOverhaul;},destroy,setRain,setObjective,getState:()=>({started:state.started,rain:state.rain,objective:{...state.objective}})};
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',()=>wait(),{once:true});else wait();
})();
