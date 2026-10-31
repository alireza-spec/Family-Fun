/* Family Fun 2.0 — procedural PBR-style textures (canvas-generated, no photos).
   Each texture is generated in code so the game ships without large image assets
   and without a CDN. map = colour, bumpMap = same canvas (cheap relief),
   roughnessMap = a grey noise canvas (matte / glossy variation). */
(function(){
'use strict';
var cache = {};
function canvas(w,h,draw){
  var c=document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'),w,h); return c;
}
function noise(x,w,h,base,amp,count,size){
  x.fillStyle=base; x.fillRect(0,0,w,h);
  for(var i=0;i<count;i++){
    var g=Math.random()*amp;
    x.fillStyle='rgba('+(Math.random()>.5?255:0)+','+(Math.random()>.5?255:0)+','+(Math.random()>.5?255:0)+','+g.toFixed(3)+')';
    x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*size,1+Math.random()*size);
  }
}
var builders = {
  grass: function(){ return canvas(256,256,function(x,w,h){
    noise(x,w,h,'#4a7c59',0.25,900,3);
    x.strokeStyle='rgba(30,90,40,0.35)';
    for(var i=0;i<260;i++){ var px=Math.random()*w, py=Math.random()*h;
      x.beginPath(); x.moveTo(px,py); x.lineTo(px+(Math.random()-0.5)*4,py-3-Math.random()*4); x.stroke(); }
  });},
  asphalt: function(){ return canvas(256,256,function(x,w,h){
    noise(x,w,h,'#2a2d33',0.22,1200,3);
    x.fillStyle='rgba(255,255,255,0.55)'; x.fillRect(0,h/2-1,w,2);
  });},
  brick: function(){ return canvas(256,256,function(x,w,h){
    x.fillStyle='#b88968'; x.fillRect(0,0,w,h);
    var bh=32, bw=64;
    for(var y=0;y<h;y+=bh){ for(var xx=-bw;xx<w+bw;xx+=bw){
      var off=(y/bh)%2?bw/2:0;
      x.fillStyle='rgb('+(170+Math.random()*35|0)+','+(110+Math.random()*25|0)+','+(80+Math.random()*20|0)+')';
      x.fillRect(xx+off+2,y+2,bw-4,bh-4);
    }}
    x.strokeStyle='rgba(60,35,20,0.25)';
    for(var j=0;j<h;j+=bh){ x.beginPath(); x.moveTo(0,j); x.lineTo(w,j); x.stroke(); }
  });},
  wall: function(){ return canvas(256,256,function(x,w,h){
    noise(x,w,h,'#e8dcc8',0.10,700,4);
    x.strokeStyle='rgba(120,90,60,0.12)';
    for(var i=0;i<24;i++){ x.beginPath(); x.moveTo(0,i*11); x.lineTo(w,i*11); x.stroke(); }
  });},
  wood: function(){ return canvas(256,256,function(x,w,h){
    x.fillStyle='#8a5a32'; x.fillRect(0,0,w,h);
    for(var y=0;y<h;y+=32){ x.fillStyle='rgba(0,0,0,0.18)'; x.fillRect(0,y,w,2);
      x.strokeStyle='rgba(60,30,10,0.25)';
      for(var i=0;i<6;i++){ x.beginPath(); x.moveTo(0,y+4+Math.random()*24);
        x.bezierCurveTo(w*0.3,y+8,w*0.6,y+2,w,y+10); x.stroke(); } }
  });},
  roof: function(){ return canvas(256,256,function(x,w,h){
    x.fillStyle='#a83a2a'; x.fillRect(0,0,w,h);
    for(var y=0;y<h;y+=24){ for(var xx=0;xx<w;xx+=32){
      var off=(y/24)%2?16:0;
      x.fillStyle='rgb('+(160+Math.random()*30|0)+',52,38)';
      x.beginPath(); x.arc(xx+off+16,y+12,15,0,Math.PI); x.fill(); } }
  });},
  sidewalk: function(){ return canvas(256,256,function(x,w,h){
    noise(x,w,h,'#c9bba6',0.12,600,3);
    x.strokeStyle='rgba(80,70,55,0.4)'; x.lineWidth=3;
    for(var i=0;i<=4;i++){ x.beginPath(); x.moveTo(0,i*64); x.lineTo(w,i*64); x.stroke();
      x.beginPath(); x.moveTo(i*64,0); x.lineTo(i*64,h); x.stroke(); }
  });}
};
function tex(name,rx,ry){
  var key=name+'|'+rx+'|'+ry;
  if(cache[key]) return cache[key];
  var t=new THREE.CanvasTexture(builders[name]());
  t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry);
  t.anisotropy=4; cache[key]=t; return t;
}
function signTexture(title,icon,color){
  var c=document.createElement('canvas'); c.width=512; c.height=128;
  var x=c.getContext('2d');
  x.fillStyle='#101826'; x.fillRect(0,0,512,128);
  x.fillStyle=color; x.fillRect(0,104,512,24);
  x.fillStyle='#ffffff'; x.font='700 44px Vazirmatn, Arial, sans-serif';
  x.textAlign='center'; x.textBaseline='middle';
  x.fillText((icon||'')+' '+title,256,54);
  var t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
window.FFTextures={
  get: tex,
  sign: signTexture,
  material: function(color,texName,opts){
    opts=opts||{};
    var m={color:color,roughness:opts.roughness!==undefined?opts.roughness:0.85,metalness:opts.metalness||0};
    if(texName){ var t=tex(texName,opts.rx||1,opts.ry||1); m.map=t; m.bumpMap=t; m.bumpScale=opts.bump||0.6; }
    if(opts.emissive!==undefined){ m.emissive=opts.emissive; m.emissiveIntensity=opts.emissiveIntensity||0.2; }
    if(opts.transparent!==undefined) m.transparent=opts.transparent;
    if(opts.opacity!==undefined) m.opacity=opts.opacity;
    return new THREE.MeshStandardMaterial(m);
  }
};
})();
