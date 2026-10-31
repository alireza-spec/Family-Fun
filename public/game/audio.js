/* Family Fun 2.6.0 — SOFT mix (see CHANGELOG 2.6.0). 2.2.0 introduced
   REAL recorded sounds as files (Freesound CC0, see
   public/audio/CREDITS.md). This REPLACES the old procedural beep system:
   no oscillator beeps are used unless a file fails to load, in which case a
   tiny synth fallback plays so the game is never silent-by-accident.
   Nothing plays before the first user gesture (autoplay policy): unlock()
   runs on pointerdown and from initGame (the Play click). */
(function(){
'use strict';
var FILES = {
  click: 'audio/click.mp3',
  footstep: 'audio/footstep-grass.mp3', // verified CC0 single footstep; pavement variant could not be verified CC0, so this covers all surfaces
  door: 'audio/door.mp3',
  coin: 'audio/coin.mp3',
  horn: 'audio/horn.mp3',
  engine: 'audio/engine-soft.mp3', // 2.6.0: lowpassed + softened derivative of the CC0 engine
  siren: 'audio/siren-soft.mp3', // 2.6.0: lowpassed + -6dB + faded derivative of the CC0 siren
  city: 'audio/city.mp3',
  birds: 'audio/birds.mp3',
  rain: 'audio/rain.mp3',
  wind: 'audio/wind.mp3',
  crickets: 'audio/crickets.mp3'
};
var muted = false, volume = 0.55, unlocked = false, failed = {}; // 2.6.0: softer default master (was 0.7)
var blobURLs = {};
function b64ToBlobURL(b64, mime){
  try{
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  }catch(e){ return null; }
}
function loadB64(name, url, mime){
  fetch(url).then(function(r){ return r.text(); }).then(function(t){
    var u = b64ToBlobURL(t, mime);
    if (!u) return;
    blobURLs[name] = u;
    var L = loops[name];
    if (L && L.el && L.el.src && L.el.src.indexOf('blob:') !== 0){
      var wasPlaying = !L.el.paused; L.el.src = u;
      if (wasPlaying || L.base > 0){ var pr = L.el.play(); if (pr && pr.catch) pr.catch(function(){}); }
    }
  }).catch(function(){});
}
var loops = {}; // name -> {el, base}
try{ muted = localStorage.getItem('ff-audio-muted') === '1';
  volume = parseFloat(localStorage.getItem('ff-audio-volume') || '0.55') || 0.55; }catch(e){}
function savePrefs(){ try{ localStorage.setItem('ff-audio-muted', muted ? '1' : '0');
  localStorage.setItem('ff-audio-volume', String(volume)); }catch(e){} }
function effVol(base){ return muted ? 0 : base * volume; }
/* 2.6.0 soft-mix graph: loops are routed through a WebAudio DynamicsCompressor
   (threshold -20dB, ratio 5) so stacked loops can never hard-clip. If the graph
   cannot be built, every call below falls back to plain el.volume control. */
var _actx = null, _comp = null;
function ensureGraph(el, name){
  try{
    if (!_actx) {
      _actx = new (window.AudioContext || window.webkitAudioContext)();
      _comp = _actx.createDynamicsCompressor();
      _comp.threshold.value = -20; _comp.knee.value = 20; _comp.ratio.value = 5;
      _comp.attack.value = 0.005; _comp.release.value = 0.15;
      _comp.connect(_actx.destination);
    }
    if (_actx.state === 'suspended') _actx.resume();
    if (!el._ffGain) {
      var src = _actx.createMediaElementSource(el);
      var gn = _actx.createGain(); gn.gain.value = 0;
      src.connect(gn); gn.connect(_comp);
      el._ffGain = gn; el.volume = 1; // volume is now controlled ONLY by the gain node
    }
    return el._ffGain;
  }catch(e){ return null; }
}
function loopVol(L, v){
  try{
    if (L.el._ffGain) { L.el._ffGain.gain.setTargetAtTime(v, _actx.currentTime, 0.08); return; }
  }catch(e){}
  L.el.volume = v;
}
function loopVolNow(L, v){
  try{
    if (L.el._ffGain) { L.el._ffGain.gain.value = v; return; }
  }catch(e){}
  L.el.volume = v;
}
// Tiny synth fallback, used ONLY when a file failed to load.
var actx = null;
function tone(freq, dur, type, vol, slideTo){
  try{
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
  }catch(e){}
}
var FALLBACK = { click: function(){ tone(660, 0.07, 'triangle', 0.06, 880); },
  footstep: function(){ tone(90, 0.09, 'sine', 0.05, 60); },
  door: function(){ tone(523, 0.12, 'triangle', 0.07); setTimeout(function(){ tone(784, 0.16, 'triangle', 0.07); }, 90); },
  coin: function(){ tone(880, 0.09, 'sine', 0.08); setTimeout(function(){ tone(1320, 0.14, 'sine', 0.07); }, 70); } };
function unlock(){
  if (unlocked) return true;
  unlocked = true;
  Object.keys(FILES).forEach(function(name){
    /* Try the real file first, then the .b64 text companion (the shipped format). */
    loadB64(name, FILES[name] + '.b64', 'audio/mpeg');
    var a = new Audio(); a.preload = 'auto'; a.src = FILES[name];
    a.addEventListener('error', function(){ failed[name] = true; });
    if (name === 'engine' || name === 'siren' || name === 'city' || name === 'birds' || name === 'rain' || name === 'wind' || name === 'crickets'){
      a.loop = true; loops[name] = { el: a, base: 0 };
      ensureGraph(a, name); // soft-mix compressor; silently ignored if unavailable
    }
  });
  return true;
}
function play(name, vol, rate){
  if (!unlocked) unlock();
  if (failed[name]) { if (FALLBACK[name]) FALLBACK[name](); return; }
  try{
    var src = blobURLs[name] || FILES[name];
    var a = new Audio(src);
    var targetVol = effVol(vol === undefined ? 0.7 : vol);
    a.volume = 0; // 2.6.0: fade in over ~80ms — no click/pop attack, nothing starts at full blast
    if (rate) a.playbackRate = rate;
    (function(el, tv){
      var step = 0;
      var iv = setInterval(function(){
        step++;
        try{ el.volume = tv * Math.min(1, step / 4); }catch(e){}
        if (step >= 4) clearInterval(iv);
      }, 20);
      if (name === 'horn'){ // 2.6.0: a horn blast must not run 3.2s at full scale — fade out after 0.9s
        setTimeout(function(){
          var s2 = 0;
          var iv2 = setInterval(function(){
            s2++;
            try{ el.volume = tv * Math.max(0, 1 - s2 / 15); }catch(e){}
            if (s2 >= 15){ clearInterval(iv2); try{ el.pause(); }catch(e){} }
          }, 20);
        }, 900);
      }
    })(a, targetVol);
    /* If the real file 404s (binary never pushed) and the .b64 blob is not
       ready yet, retry once from the blob URL, else use the synth fallback. */
    a.addEventListener('error', function(){
      setTimeout(function(){
        if (blobURLs[name]){ var b = new Audio(blobURLs[name]); b.volume = effVol(vol === undefined ? 0.7 : vol);
          if (rate) b.playbackRate = rate; var pp = b.play(); if (pp && pp.catch) pp.catch(function(){}); }
        else if (FALLBACK[name]) FALLBACK[name]();
      }, 800);
    });
    var p = a.play(); if (p && p.catch) p.catch(function(){});
  }catch(e){ if (FALLBACK[name]) FALLBACK[name](); }
}
function fadeLoop(name, targetBase, ms){
  var L = loops[name]; if (!L) return;
  var el = L.el; L.base = targetBase;
  var to = effVol(targetBase);
  if (targetBase > 0 && el.paused){ loopVolNow(L, 0); var p = el.play(); if (p && p.catch) p.catch(function(){}); }
  if (el._ffGain){ // 2.6.0: smooth exponential fade through the compressor graph
    try{ el._ffGain.gain.setTargetAtTime(to, _actx.currentTime, (ms || 800) / 3000); }catch(e){ el.volume = to; }
    if (L._fade) clearTimeout(L._fade);
    if (targetBase <= 0) L._fade = setTimeout(function(){ try{ el.pause(); }catch(e){} }, (ms || 800) + 400);
    return;
  }
  var from = el.volume, steps = Math.max(1, Math.round((ms || 800) / 100)), i = 0;
  if (L._fade) clearInterval(L._fade);
  L._fade = setInterval(function(){
    i++;
    el.volume = from + (to - from) * (i / steps);
    if (i >= steps){ clearInterval(L._fade); L._fade = null;
      if (targetBase <= 0) el.pause(); }
  }, 100);
}
function applyLoopVolumes(){
  Object.keys(loops).forEach(function(n){ var L = loops[n];
    if (!L.el.paused) loopVolNow(L, effVol(L.base)); });
}
window.FFAudio = {
  get muted(){ return muted; }, get volume(){ return volume; },
  unlock: unlock,
  click: function(){ play('click', 0.35); },
  footstep: function(){ play('footstep', 0.32, 0.9 + Math.random() * 0.25); },
  door: function(){ play('door', 0.42); },
  coin: function(){ play('coin', 0.40); },
  horn: function(){ play('horn', 0.45); },
  // 2.3.0 engine variants: kind changes the base pitch — regular car 1.0,
  // van/truck 0.75 (deeper), police/ambulance 1.18 (higher, urgent).
  // Same verified recording, different pitch — no second engine file was
  // verified CC0 in this round, so this is a pitch variant, not a new file.
  setEngine: function(on, speed, kind){
    if (!unlocked) unlock(); var L = loops.engine; if (!L) return;
    if (on){
      if (L.el.paused){ loopVolNow(L, 0); var p = L.el.play(); if (p && p.catch) p.catch(function(){}); }
      var sp = Math.abs(speed || 0);
      // 2.6.0: the old rate reached 2.24x (0.7+24*0.05, x1.18 police) — a pure
      // whine. Now capped at 1.25x, police only 1.05x, van/truck deeper 0.82x,
      // and the file itself is lowpassed (engine-soft.mp3).
      var kf = (kind === 'police' || kind === 'ambulance') ? 1.05 : (kind === 'van' || kind === 'truck') ? 0.82 : 1.0;
      try{ L.el.playbackRate = Math.min(1.25, (0.8 + sp * 0.018) * kf); }catch(e){}
      L.base = 0.03 + Math.min(sp, 24) * 0.0025; loopVol(L, effVol(L.base));
    } else { fadeLoop('engine', 0, 300); }
  },
  setRain: function(on){ fadeLoop('rain', on ? 0.20 : 0, 900); fadeLoop('wind', on ? 0.07 : 0, 900); },
  // 2.6.0 distance-attenuated siren: full-ish only when a police car is close,
  // a whisper at 35+ units, never an abrupt full-volume two-tone in your ear.
  setSiren: function(on, dist){
    var base = 0;
    if (on){
      if (dist === undefined || dist === null) base = 0.05;
      else if (dist <= 6) base = 0.09;
      else if (dist >= 35) base = 0.012;
      else base = 0.09 - (dist - 6) * (0.078 / 29);
    }
    fadeLoop('siren', base, 900);
  },
  setAmbience: function(mode){
    if (mode === 'night'){ fadeLoop('city', 0, 1200); fadeLoop('birds', 0, 1200); fadeLoop('crickets', 0.14, 1200); }
    else if (mode === 'rain'){ fadeLoop('city', 0.05, 1200); fadeLoop('birds', 0, 1200); fadeLoop('crickets', 0, 1200); }
    else { fadeLoop('city', 0.14, 1200); fadeLoop('birds', 0.10, 1200); fadeLoop('crickets', 0, 1200); }
  },
  startPad: function(){ // called from initGame (a user gesture): start the city ambience
    if (!unlocked) unlock();
    var hour = 8; try{ hour = (window.gameTime || 480) / 60; }catch(e){}
    this.setAmbience((hour >= 20 || hour < 6) ? 'night' : 'day');
  },
  setVolume: function(v){
    volume = Math.max(0, Math.min(1, v)); savePrefs(); applyLoopVolumes();
    if (window.showToast) window.showToast('🔊 صدا: ' + Math.round(volume * 100) + '٪');
    return volume;
  },
  toggleMute: function(){ muted = !muted; savePrefs(); applyLoopVolumes();
    if (window.showToast) window.showToast(muted ? '🔇 صدا قطع شد' : '🔊 صدا وصل شد');
    return muted; }
};
document.addEventListener('pointerdown', unlock, { once: true, passive: true });
})();
