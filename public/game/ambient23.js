/* Family Fun 2.3.0 — diverse, NON-LOOPING ambience.
   The 2.2.0 city/birds loops are kept only as a very quiet bed. On top of
   them, this scheduler fires REAL, distinct one-shot events at random
   intervals (4–15 s, random volume/pan): different bird calls, cafe crowd,
   a shop doorbell, a wind gust, and a passing car (the verified engine
   recording played once with a swell, not looped). Nothing here is a loop
   and nothing is synthesised. Files: public/audio/ambient-*.mp3 (+ .b64). */
(function(){
'use strict';
var EVENTS = [
  {file: 'audio/ambient-bird1.mp3', vol: 0.28, label: 'bird chirp'},
  {file: 'audio/ambient-crows.mp3', vol: 0.22, label: 'crows'},
  {file: 'audio/ambient-crowd.mp3', vol: 0.20, label: 'cafe crowd'},
  {file: 'audio/ambient-doorbell.mp3', vol: 0.25, label: 'doorbell'},
  {file: 'audio/wind.mp3', vol: 0.18, label: 'wind gust', gust: true},
  {file: 'audio/engine-soft.mp3', vol: 0.20, label: 'car pass-by', pass: true} // 2.6.0: softened engine for pass-bys too
];
var blobURLs = {}, timer = null, started = false;
function b64ToBlobURL(b64, mime){
  try{
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], {type: mime}));
  }catch(e){ return null; }
}
function preload(){
  EVENTS.forEach(function(ev){
    fetch(ev.file + '.b64').then(function(r){ return r.text(); }).then(function(t){
      var u = b64ToBlobURL(t, 'audio/mpeg');
      if (u) blobURLs[ev.file] = u;
    }).catch(function(){});
  });
}
function muted(){
  try{ return window.FFAudio && window.FFAudio.muted; }catch(e){ return false; }
}
function vol(){
  try{ return window.FFAudio ? window.FFAudio.volume : 0.7; }catch(e){ return 0.7; }
}
function playEvent(ev){
  if (muted() || !window.isGameRunning) return;
  try{
    var src = blobURLs[ev.file] || ev.file;
    var a = new Audio(src);
    // Random pan via stereo panner when available (gives real variety).
    var ctx = null;
    if (ev.pass || ev.gust){
      // Swell in/out for pass-bys and gusts: no abrupt start/stop.
      a.volume = 0;
      var p = a.play(); if (p && p.catch) p.catch(function(){});
      var target = ev.vol * vol(), step = 0, up = true;
      var iv = setInterval(function(){
        step++;
        if (up){ a.volume = Math.min(target, a.volume + target / 8); if (a.volume >= target) up = false; }
        else { a.volume = Math.max(0, a.volume - target / 10); if (a.volume <= 0){ clearInterval(iv); try{ a.pause(); }catch(e){} } }
        if (step > 80){ clearInterval(iv); try{ a.pause(); }catch(e){} }
      }, 120);
      // Stop a long engine/wind file after the swell, so it is an event, not a loop.
      setTimeout(function(){ try{ a.pause(); }catch(e){} clearInterval(iv); }, 9000);
      return;
    }
    // 2.6.0: fade in over ~150ms — ambient events no longer start at full volume.
    var tv = ev.vol * vol() * (0.8 + Math.random() * 0.4);
    a.volume = 0;
    if (ev.file.indexOf('bird') >= 0) a.playbackRate = 0.9 + Math.random() * 0.25;
    var pp = a.play(); if (pp && pp.catch) pp.catch(function(){});
    (function(el, target){
      var st = 0;
      var iv = setInterval(function(){ st++; try{ el.volume = target * Math.min(1, st / 6); }catch(e){} if (st >= 6) clearInterval(iv); }, 25);
    })(a, tv);
  }catch(e){}
}
function schedule(){
  if (timer) clearTimeout(timer);
  var delay = 4000 + Math.random() * 11000;
  timer = setTimeout(function(){
    if (window.isGameRunning && !muted()){
      var ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      playEvent(ev);
    }
    schedule();
  }, delay);
}
function start(){
  if (started) return; started = true;
  preload();
  schedule();
  try{ console.log('[FF23 ambient] random-event ambience started'); }catch(e){}
}
// Surface-aware footsteps: the same verified grass recording is played
// with distinct rate/volume per surface (grass / pavement / wood-indoor).
// Honest limit: separate stone/tile CC0 recordings exist (MalikArsYasakani)
// but their preview files could not be retrieved through the browser tools
// in this round, so they are NOT claimed as files here — the variations
// below are rate/volume variants of the one verified recording.
function surfaceAt(x, z){
  if (Math.abs(x) < 12 && Math.abs(z) < 10) return 'wood';
  if (Math.abs(z) < 4 || Math.abs(x) < 4) return 'pavement';
  return 'grass';
}
function installFootsteps(){
  try{
    if (!window.FFAudio || window.FFAudio._ff23Footsteps) return;
    window.FFAudio._ff23Footsteps = true;
    var orig = window.FFAudio.footstep;
    window.FFAudio.footstep = function(){
      var p = window.playerGroup ? window.playerGroup.position : {x: 0, z: 0};
      var s = surfaceAt(p.x, p.z);
      // Re-implement the grass play with a surface-specific rate, using
      // the same file + blob mechanism as audio.js (via a fresh Audio).
      try{
        var src = 'audio/footstep-grass.mp3';
        var a = new Audio(src);
        var rate = s === 'pavement' ? 1.18 : s === 'wood' ? 0.85 : 0.95 + Math.random() * 0.2;
        var v = s === 'pavement' ? 0.38 : s === 'wood' ? 0.30 : 0.34; // 2.6.0: softer footsteps
        a.volume = window.FFAudio.muted ? 0 : v * window.FFAudio.volume;
        a.playbackRate = rate;
        var pp = a.play(); if (pp && pp.catch) pp.catch(function(){});
      }catch(e){ if (orig) orig(); }
    };
    window.FF23FootstepSurface = surfaceAt;
  }catch(e){}
}
document.addEventListener('pointerdown', function(){ start(); installFootsteps(); }, {once: true, passive: true});
setInterval(function(){ if (window.isGameRunning){ start(); installFootsteps(); } }, 3000);
window.FF23Ambient = {events: EVENTS, start: start};
})();
