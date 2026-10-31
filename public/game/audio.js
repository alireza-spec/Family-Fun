/* Family Fun 2.0 — procedural WebAudio only (no recorded SFX are claimed).
   UI click, footstep, door chime, car-engine hum, rain noise and a quiet
   day/night pad. Mute + volume persist in localStorage (ff-audio). */
(function(){
'use strict';
var ctx=null, master=null, muted=false, volume=0.7, engineOsc=null, engineGain=null, rainSrc=null, rainGain=null, padOsc=[];
try{ muted=localStorage.getItem('ff-audio-muted')==='1';
  volume=parseFloat(localStorage.getItem('ff-audio-volume')||'0.7')||0.7; }catch(e){}
function ensure(){
  if(ctx) { if(ctx.state==='suspended') ctx.resume(); return true; }
  var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
  ctx=new AC(); master=ctx.createGain(); master.gain.value=muted?0:volume; master.connect(ctx.destination);
  return true;
}
function tone(freq,dur,type,vol,slideTo){
  if(!ensure()||muted) return;
  var t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(freq,t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.08,t+0.015);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.05);
}
function noiseLoop(){
  if(!ctx) return null;
  var len=ctx.sampleRate*2, buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
  for(var i=0;i<len;i++) d[i]=Math.random()*2-1;
  var src=ctx.createBufferSource(); src.buffer=buf; src.loop=true; return src;
}
window.FFAudio={
  get muted(){return muted;}, get volume(){return volume;},
  unlock:ensure,
  click:function(){ tone(660,0.07,'triangle',0.06,880); },
  footstep:function(){ tone(90,0.09,'sine',0.05,60); },
  door:function(){ tone(523,0.12,'triangle',0.07); setTimeout(function(){tone(784,0.16,'triangle',0.07);},90); },
  coin:function(){ tone(880,0.09,'sine',0.08); setTimeout(function(){tone(1320,0.14,'sine',0.07);},70); },
  setEngine:function(on,speed){
    if(!ensure()) return;
    if(on && !engineOsc){
      engineOsc=ctx.createOscillator(); engineGain=ctx.createGain();
      engineOsc.type='sawtooth'; engineOsc.frequency.value=60;
      engineGain.gain.value=0.0; engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
    }
    if(!on && engineOsc){ try{engineOsc.stop();}catch(e){} engineOsc=null; engineGain=null; return; }
    if(engineOsc){ engineOsc.frequency.value=55+Math.abs(speed||0)*6;
      engineGain.gain.setTargetAtTime(muted?0:0.035,ctx.currentTime,0.1); }
  },
  setRain:function(on){
    if(!ensure()) return;
    if(on && !rainSrc){
      rainSrc=noiseLoop(); var f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
      rainGain=ctx.createGain(); rainGain.gain.value=0;
      rainSrc.connect(f); f.connect(rainGain); rainGain.connect(master); rainSrc.start();
      rainGain.gain.setTargetAtTime(muted?0:0.05,ctx.currentTime,0.5);
    }
    if(!on && rainSrc){ try{rainSrc.stop();}catch(e){} rainSrc=null; rainGain=null; }
  },
  startPad:function(){
    if(!ensure()||padOsc.length) return;
    [220,277,330].forEach(function(fr){
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.value=fr; g.gain.value=0.012;
      o.connect(g); g.connect(master); o.start(); padOsc.push(o);
    });
  },
  toggleMute:function(){ muted=!muted;
    try{localStorage.setItem('ff-audio-muted',muted?'1':'0');}catch(e){}
    if(master) master.gain.value=muted?0:volume;
    if(window.showToast) window.showToast(muted?'🔇 صدا قطع شد':'🔊 صدا وصل شد');
    return muted; }
};
document.addEventListener('pointerdown',ensure,{once:true,passive:true});
})();
