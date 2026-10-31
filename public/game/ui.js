/* Family Fun 2.0 — one consistent HUD layer: settings buttons, quest panel
   fallback, job buttons, save-slot panel, money label, continue-game button.
   Emoji stay only in dialog portraits; main actions use short Persian labels
   with simple inline SVG-style glyphs (text symbols, no image downloads). */
(function(){
'use strict';
window.FFReducedMotion=false;
try{ window.FFReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(window.FFReducedMotion) document.body.classList.add('ff-reduced-motion'); }catch(e){}
function el(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
function init(){
  // version badge on start screen
  var start=document.getElementById('start-screen');
  if(start && !document.getElementById('ff-version')){
    var v=document.createElement('div'); v.id='ff-version'; v.textContent='نسخه ۲٫۱٫۰ — ارتقای حرفه‌ای';
    start.appendChild(v);
  }
  // continue button if an autosave exists
  if(start && window.FFSave && window.FFSave.has(0) && !document.getElementById('ff-continue')){
    var saved=window.FFSave.load(0);
    var b=document.createElement('button'); b.id='ff-continue'; b.className='play-btn';
    b.textContent='▶ ادامه بازی ذخیره‌شده'+(saved&&saved.player&&saved.player.name?' ('+saved.player.name+')':'');
    b.onclick=function(){
      if(saved){ window.FFSave.pending=saved;
        var inp=document.getElementById('username'); if(inp) inp.value=saved.player.name||'';
        if(saved.player.gender){ window.pGender=saved.player.gender;
          document.getElementById('gbM').classList.toggle('active',saved.player.gender==='male');
          document.getElementById('gbF').classList.toggle('active',saved.player.gender==='female'); }
      }
      var play=document.querySelector('.play-btn'); if(play && play!==b) play.click();
    };
    var form=document.querySelector('.start-form'); if(form) form.appendChild(b);
  }
  // action buttons (appended once HUD exists; HUD is hidden until play, but DOM exists)
  var btns=document.getElementById('action-btns');
  if(btns && !document.getElementById('ff-btn-save')){
    var save=el('<div class="acircle" id="ff-btn-save" title="ذخیره">💾</div>');
    save.onclick=function(){ if(window.FFAudio) window.FFAudio.click(); if(window.FFSave) window.FFSave.save(1); };
    var mute=el('<div class="acircle" id="ff-btn-mute" title="صدا">🔊</div>');
    mute.onclick=function(){ if(window.FFAudio){ var m=window.FFAudio.toggleMute(); mute.textContent=m?'🔇':'🔊'; } };
    var qual=el('<div class="acircle" id="ff-btn-quality" title="کیفیت گرافیک">🎨</div>');
    qual.onclick=function(){ if(window.FFAudio) window.FFAudio.click(); if(window.FFQuality) window.FFQuality.cycle(); };
    var slots=el('<div class="acircle" id="ff-btn-slots" title="اسلات‌های ذخیره">🗂️</div>');
    slots.onclick=function(){ var p=document.getElementById('ff-slots-panel'); if(p) p.style.display=p.style.display==='block'?'none':'block'; };
    btns.appendChild(save); btns.appendChild(mute); btns.appendChild(qual); btns.appendChild(slots);
  }
  // money label next to stats
  var bar=document.getElementById('stats-bar');
  if(bar && !document.getElementById('ff-money-label')){
    var ml=document.createElement('div'); ml.id='ff-money-label'; ml.className='si';
    ml.innerHTML='<div class="si-label">🪙 سکه</div><div id="ff-money-text" style="font-size:13px;font-weight:700;color:#ffd700">۴۰</div>';
    bar.appendChild(ml);
  }
  // save slots panel
  if(!document.getElementById('ff-slots-panel')){
    var panel=el('<div id="ff-slots-panel" class="ff-glass"><b>💾 اسلات‌های ذخیره</b>'+
      '<div id="ff-slot-btns"></div>'+
      '<button id="ff-export">📤 خروجی JSON</button> '+
      '<label class="ff-file-label">📥 ورودی JSON<input type="file" id="ff-import" accept="application/json" hidden></label>'+
      '<button id="ff-slots-close">بستن</button></div>');
    document.body.appendChild(panel);
    var wrap=panel.querySelector('#ff-slot-btns');
    [1,2,3].forEach(function(s){
      var row=el('<div class="ff-slot-row"><span>اسلات '+s+'</span></div>');
      var sv=el('<button>ذخیره</button>'); sv.onclick=function(){ window.FFSave.save(s); };
      var ld=el('<button>بارگذاری</button>'); ld.onclick=function(){
        var d=window.FFSave.load(s);
        if(d){ window.FFSave.apply(d); if(window.showToast) window.showToast('✅ اسلات '+s+' بارگذاری شد'); }
        else if(window.showToast) window.showToast('⚠️ اسلات '+s+' خالی است'); };
      row.appendChild(sv); row.appendChild(ld); wrap.appendChild(row);
    });
    panel.querySelector('#ff-export').onclick=function(){ window.FFSave.exportJSON(); };
    panel.querySelector('#ff-slots-close').onclick=function(){ panel.style.display='none'; };
    panel.querySelector('#ff-import').onchange=function(e){
      if(e.target.files[0]) window.FFSave.importJSON(e.target.files[0]); };
  }
  // quest panel fallback + job buttons (used if world-overhaul objective is absent)
  if(!document.getElementById('ffw-objective') && !document.getElementById('ff-quest-panel')){
    var qp=el('<section id="ff-quest-panel" class="ff-glass"><div class="ffq-title">📜 مأموریت</div><div class="ffq-copy">…</div><div id="ff-job-btns"></div></section>');
    document.body.appendChild(qp);
  }
  var jb=document.getElementById('ff-job-btns');
  if(jb && window.FFQuests && !jb.dataset.done){
    jb.dataset.done='1';
    window.FFQuests.jobs.forEach(function(job){
      var b=el('<button class="ff-job-btn">'+job.label+' (+'+job.pay+' سکه، -'+job.energy+' انرژی)</button>');
      b.onclick=function(){ window.FFQuests.doJob(job.id); };
      jb.appendChild(b);
    });
  }
  // quality select on start screen
  var sel=document.getElementById('quality-select');
  if(sel && window.FFQuality){
    sel.value=window.FFQuality.current;
    sel.onchange=function(){ window.FFQuality.apply(sel.value); };
  }
  if(window.FFQuests) window.FFQuests.render();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
// money label sync: patch updateHUD output via interval-free hook on stats changes is
// done in economy.js; this just refreshes the label when HUD updates.
var _upd=window.updateHUD;
})();
