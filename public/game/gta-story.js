/* Family Fun 2.0.1 — GTA Stage 3: story + progression.
   6 chained story missions with cutscene-style dialog, side jobs (taxi /
   delivery / courier), property income, district reputation, achievements
   and level unlocks. Family-friendly throughout: no weapons, no violence;
   "busted" only resets the current mission step and charges a fine. */
(function(){
'use strict';
var built = false, marker = null, markerBeam = null;
var MISSIONS = [
  {id: 'm1', title: 'آشنایی با محله', speaker: 'علیرضا', lines: ['سلام! به شهر ما خوش اومدی.', 'اول برو میدان شهر و بعد با بهارک در کافه حرف بزن.'],
   steps: [{type: 'go', x: 0, z: 40, text: 'به میدان شهر برو'}, {type: 'talk', npc: 'baharak', text: 'با بهارک حرف بزن'}],
   reward: {money: 80, xp: 30}},
  {id: 'm2', title: 'اولین رانندگی', speaker: 'آرین', lines: ['ماشین سواری بلدی؟', 'سوار هر ماشینی شو و تا نمایشگاه من بیا.'],
   steps: [{type: 'driveTo', x: 28, z: 12, text: 'با ماشین به نمایشگاه آرین برو'}],
   reward: {money: 100, xp: 35}},
  {id: 'm3', title: 'تاکسی محله', speaker: 'بهارک', lines: ['یک مسافر منتظر کافه است.', 'سوار ماشین شو، او را بردار و به بیمارستان برسان.'],
   steps: [{type: 'taxi', pickup: {x: 3, z: 20}, dest: {x: 12, z: -15}, text: 'مسافر کافه را به بیمارستان برسان'}],
   reward: {money: 120, xp: 40}},
  {id: 'm4', title: 'تحویل مرسوله', speaker: 'علی', lines: ['یک بسته فوری برای کتابخانه دارم.', '۹۰ ثانیه وقت داری؛ از گاراژ تا کتابخانه.'],
   steps: [{type: 'deliver', from: {x: -18, z: 8}, to: {x: 8, z: -25}, seconds: 90, text: 'بسته را در ۹۰ ثانیه به کتابخانه برسان'}],
   reward: {money: 150, xp: 45}},
  {id: 'm5', title: 'فرار از تعقیب', speaker: 'ساغر', lines: ['پلیس دنبالت است! نترس، فقط دستگیر نشو.', 'پنهان شو تا ستاره‌هایت صفر شود.'],
   steps: [{type: 'evade', text: 'تحت تعقیب را به صفر برسان (پنهان شو یا به فضای داخلی برو)'}],
   reward: {money: 180, xp: 50}},
  {id: 'm6', title: 'رئیس محله', speaker: 'علیرضا', lines: ['حالا دیگر همه تو را می‌شناسند.', 'با سه نفر حرف بزن و به تالار عروسی برو تا رئیس محله شوی.'],
   steps: [{type: 'talkCount', count: 3, text: 'با ۳ شخصیت حرف بزن'}, {type: 'go', x: 25, z: 25, text: 'به تالار عروسی برو'}],
   reward: {money: 300, xp: 80}}
];
var PROPERTIES = [
  {id: 'cafe', label: 'کافه خانواده', pos: {x: 3, z: 20}, cost: 500, income: 15},
  {id: 'boutique', label: 'بوتیک علیرضا', pos: {x: 18, z: 5}, cost: 800, income: 20},
  {id: 'garageBiz', label: 'گاراژ علی', pos: {x: -18, z: 8}, cost: 1200, income: 30}
];
var JOBS = [
  {id: 'taxi', label: 'تاکسی', pay: 60, text: 'مسافر ببر'},
  {id: 'delivery', label: 'تحویل کالا', pay: 40, text: 'دو توقف تحویل بده'},
  {id: 'courier', label: 'پیک فوری', pay: 80, text: 'در ۹۰ ثانیه برسان'}
];
var st = null, cutscene = null, cutIdx = 0, cutLines = [];
var job = null, jobTimer = 0, deliverTimer = 0, incomeTimer = 0, talkCount = 0;
var talkedSet = {};
function gta(){ return window.FFGTA; }
function toast(m){ if (typeof showToast === 'function') showToast(m); }
function econ(){ return window.FFEconomy; }
function playerPos(){ return window.playerGroup ? window.playerGroup.position : null; }
function curMission(){ var s = gta() ? gta().state.story : null; if (!s) return null; return MISSIONS[s.mission] || null; }
function curStep(){ var m = curMission(); if (!m) return null; var s = gta().state.story; return m.steps[s.step] || null; }
function line(){
  var m = curMission();
  if (!m) return '🎉 داستان کامل شد! شغل جانبی بگیر یا ملک بخر.';
  var step = curStep();
  return '📜 ' + m.title + ' — ' + (step ? step.text : '…');
}
function setMarker(x, z){
  if (!window.scene) return;
  if (!marker) {
    marker = new THREE.Group();
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 6, 28), new THREE.MeshBasicMaterial({color: 0xffd166, transparent: true, opacity: 0.95}));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; marker.add(ring);
    markerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.5, 6, 8, 1, true), new THREE.MeshBasicMaterial({color: 0xffd166, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false}));
    markerBeam.position.y = 3; marker.add(markerBeam);
    window.scene.add(marker);
  }
  marker.position.set(x, 0, z); marker.visible = true;
}
function hideMarker(){ if (marker) marker.visible = false; }
function showCutscene(speaker, lines, onDone){
  cutLines = lines; cutIdx = 0;
  if (!cutscene) {
    cutscene = document.createElement('div');
    cutscene.id = 'ff-gta-cutscene';
    cutscene.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:60;width:min(88vw,440px);padding:16px 18px;border-radius:16px;color:#fff;background:linear-gradient(135deg,rgba(10,18,32,.94),rgba(31,18,42,.9));border:1px solid rgba(255,209,102,.4);font-family:Vazirmatn,Arial,sans-serif;direction:rtl;font-size:14px;line-height:1.9;display:none;';
    cutscene.innerHTML = '<div id="ff-cut-speaker" style="font-weight:900;color:#ffd166"></div><div id="ff-cut-text"></div><div style="display:flex;gap:8px;margin-top:10px"><button id="ff-cut-next" style="flex:1;padding:9px;border-radius:10px;border:none;background:#ffd700;color:#1a0a2e;font-family:inherit;font-weight:700;cursor:pointer">ادامه ←</button><button id="ff-cut-skip" style="padding:9px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font-family:inherit;cursor:pointer">رد کن</button></div>';
    document.body.appendChild(cutscene);
    document.getElementById('ff-cut-next').onclick = function(){ cutIdx++; renderCut(onDone); };
    document.getElementById('ff-cut-skip').onclick = function(){ cutscene.style.display = 'none'; if (onDone) onDone(); };
  }
  document.getElementById('ff-cut-speaker').textContent = '🎬 ' + speaker;
  cutscene.style.display = 'block';
  renderCut(onDone);
  function renderCut(done){
    if (cutIdx >= cutLines.length) { cutscene.style.display = 'none'; if (done) done(); return; }
    document.getElementById('ff-cut-text').textContent = cutLines[cutIdx];
  }
}
function startMission(i, withCutscene){
  var s = gta().state.story; s.mission = i; s.step = 0; gta().save();
  var m = MISSIONS[i]; if (!m) { hideMarker(); return; }
  var go = function(){
    var step = curStep();
    if (step && step.x !== undefined) setMarker(step.x, step.z);
    else if (step && step.pickup) setMarker(step.pickup.x, step.pickup.z);
    else if (step && step.from) setMarker(step.from.x, step.from.z);
    else hideMarker();
    toast('📜 مأموریت جدید: ' + m.title);
  };
  if (withCutscene) showCutscene(m.speaker, m.lines, go); else go();
}
function advance(){
  var s = gta().state.story; var m = curMission(); if (!m) return;
  s.step++;
  if (s.step >= m.steps.length) {
    if (econ()) econ().add(m.reward.money, 'پاداش داستان «' + m.title + '»');
    if (typeof addXP === 'function') addXP(m.reward.xp);
    s.done.push(m.id); s.mission++; s.step = 0;
    toast('🎉 داستان «' + m.title + '» کامل شد!');
    if (m.id === 'm6') {
      if (gta()) { gta().state.sportsUnlocked = true; gta().save(); }
      toast('🏎️ ماشین اسپرت در نمایشگاه باز شد!');
      if (gta()) gta().unlock('storyComplete', 'پایان داستان');
    }
    gta().save();
    var next = curMission();
    if (next) startMission(s.mission, true); else hideMarker();
    return;
  }
  gta().save();
  var step = curStep();
  if (step && step.x !== undefined) setMarker(step.x, step.z);
  else if (step && step.pickup) setMarker(step.pickup.x, step.pickup.z);
  else if (step && step.from) setMarker(step.from.x, step.from.z);
  else hideMarker();
  toast('✅ قدم داستان انجام شد');
}
function onTalk(npcId){
  if (!npcId) return;
  if (!talkedSet[npcId]) { talkedSet[npcId] = true; talkCount++; }
  var step = curStep(); if (!step) return;
  if (step.type === 'talk' && step.npc === npcId) advance();
  else if (step.type === 'talkCount' && talkCount >= step.count) advance();
}
function onBusted(){
  var s = gta().state.story;
  if (curMission()) { s.step = 0; gta().save(); toast('📜 مأموریت از اول قدم شروع می‌شود (دستگیر شدی)'); var step = curStep(); if (step && step.x !== undefined) setMarker(step.x, step.z); }
}
function tryInterior(){
  var p = playerPos(); if (!p) return false;
  if (gta() && gta().driving) return false;
  var ints = window.FFGTAInteriors || [];
  // Exit first
  if (gta() && gta().interior) {
    var rp = gta().returnPos;
    if (rp && Math.hypot(p.x - rp.x, p.z - rp.z) < 6) return false; // exit handled below by distance check in update
  }
  for (var i = 0; i < ints.length; i++) {
    var it = ints[i];
    if (Math.hypot(p.x - it.door.x, p.z - it.door.z) < 4) {
      if (gta()) gta().setInterior(true, {x: p.x, z: p.z});
      window.playerGroup.position.set(it.room.x, 0, it.room.z);
      toast('🚪 وارد ' + it.label + ' شدی — برای خروج، به نشان برگشت برو و E بزن');
      if (window.FFGTAStory) window.FFGTAStory._interiorId = it.id;
      return true;
    }
  }
  // Exit interior: near room centre marker
  if (gta() && gta().interior) {
    for (var j = 0; j < ints.length; j++) {
      var it2 = ints[j];
      if (Math.hypot(p.x - it2.room.x, p.z - it2.room.z) < 2.5) {
        var ret = gta().returnPos || {x: 0, z: 0};
        window.playerGroup.position.set(ret.x, 0, ret.z);
        gta().setInterior(false, null);
        toast('🚪 از فضای داخلی برگشتی');
        return true;
      }
    }
  }
  return false;
}
function startJob(jobId){
  var p = playerPos(); if (!p) return;
  var j = JOBS.find(function(x){ return x.id === jobId; }); if (!j) return;
  if (jobId === 'taxi' && !(gta() && gta().driving)) { toast('🚕 برای تاکسی اول سوار ماشین شو'); return; }
  var spots = [[3, 20], [12, -15], [-18, 8], [8, -25], [25, 25], [-20, 15]];
  var a = spots[Math.floor(Math.random() * spots.length)];
  var b = spots[Math.floor(Math.random() * spots.length)];
  job = {id: jobId, stage: 0, a: {x: a[0], z: a[1]}, b: {x: b[0], z: b[1]}, pay: j.pay};
  jobTimer = jobId === 'courier' ? 90 : 0;
  setMarker(a[0], a[1]);
  toast('💼 شغل ' + j.label + ' شروع شد — به نشان برو');
}
function completeJob(){
  if (!job) return;
  if (econ()) econ().add(job.pay, 'دستمزد شغل');
  if (typeof addXP === 'function') addXP(15);
  toast('💼 شغل کامل شد! +' + job.pay + ' سکه');
  job = null; hideMarker();
  if (gta()) gta().unlock('firstJob', 'اولین شغل جانبی');
}
function buyProperty(){
  var p = playerPos(); if (!p) return;
  for (var i = 0; i < PROPERTIES.length; i++) {
    var pr = PROPERTIES[i];
    if (Math.hypot(p.x - pr.pos.x, p.z - pr.pos.z) < 6) {
      if ((gta().state.owned || []).indexOf(pr.id) >= 0) { toast('🏠 این ملک را قبلاً خریده‌ای'); return; }
      if (!econ() || !econ().spend(pr.cost, 'خرید ' + pr.label)) { toast('💰 برای خرید ' + pr.label + ' به ' + pr.cost + ' سکه نیاز داری'); return; }
      gta().state.owned.push(pr.id); gta().save();
      toast('🏠 ' + pr.label + ' را خریدی! هر ۹۰ ثانیه ' + pr.income + ' سکه درآمد دارد');
      gta().unlock('firstProperty', 'اولین ملک');
      return;
    }
  }
  toast('🏠 نزدیک یک ملک قابل خرید برو (کافه، بوتیک یا گاراژ)');
}
var buttonsDone = false;
function attachButtons(){
  if (buttonsDone) return;
  var panel = document.getElementById('ff-gta-panel');
  if (!panel) return;
  buttonsDone = true;
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;pointer-events:auto';
  wrap.innerHTML = '<button id="ff-job-taxi" style="flex:1">🚕 تاکسی</button><button id="ff-job-delivery" style="flex:1">📦 تحویل</button><button id="ff-job-courier" style="flex:1">🛵 پیک</button><button id="ff-buy-prop" style="flex:1">🏠 خرید ملک</button><button id="ff-story-retry" style="flex:1">📜 شروع داستان</button>';
  panel.appendChild(wrap);
  document.getElementById('ff-job-taxi').onclick = function(){ startJob('taxi'); };
  document.getElementById('ff-job-delivery').onclick = function(){ startJob('delivery'); };
  document.getElementById('ff-job-courier').onclick = function(){ startJob('courier'); };
  document.getElementById('ff-buy-prop').onclick = function(){ buyProperty(); };
  document.getElementById('ff-story-retry').onclick = function(){ startMission(gta().state.story.mission, true); };
}
function build(){
  if (built || !window.scene || !window.isGameRunning) return;
  built = true;
  try {
    st = gta().state.story;
    // Wrap FFQuests talk/enter so story advances on the same events
    if (window.FFQuests) {
      var oldTalk = window.FFQuests.onTalk;
      window.FFQuests.onTalk = function(id){ try{ if (oldTalk) oldTalk(id); }catch(e){} onTalk(id); };
    }
    attachButtons();
    // Start story if not started
    if (st && st.mission === 0 && st.step === 0 && st.done.length === 0) {
      setTimeout(function(){ startMission(0, true); }, 3000);
    } else if (curMission()) {
      var step = curStep();
      if (step && step.x !== undefined) setMarker(step.x, step.z);
    }
    toast('📜 داستان GTA آماده است — ۶ مأموریت زنجیره‌ای + شغل و ملک');
  } catch (e) { console.warn('GTA story build', e); }
}
function update(dt, t){
  if (!built) { build(); return; }
  attachButtons();
  if (!window.isGameRunning || !window.playerGroup) return;
  var p = window.playerGroup.position;
  var step = curStep();
  // Story steps
  if (step) {
    if (step.type === 'go' || step.type === 'driveTo') {
      if (Math.hypot(p.x - step.x, p.z - step.z) < 4) {
        if (step.type === 'driveTo' && !(gta() && gta().driving)) { /* must be driving */ }
        else advance();
      }
    } else if (step.type === 'taxi') {
      if (!job || job.id !== 'taxi') { job = {id: 'taxi', stage: 0, a: step.pickup, b: step.dest, pay: 0}; setMarker(step.pickup.x, step.pickup.z); }
      var target = job.stage === 0 ? job.a : job.b;
      if (Math.hypot(p.x - target.x, p.z - target.z) < 4) {
        if (job.stage === 0) { job.stage = 1; setMarker(job.b.x, job.b.z); toast('🚕 مسافر سوار شد — به مقصد برو'); }
        else { job = null; advance(); }
      }
    } else if (step.type === 'deliver') {
      if (!job || job.id !== 'deliver') { job = {id: 'deliver', stage: 0, a: step.from, b: step.to, pay: 0}; deliverTimer = step.seconds; setMarker(step.from.x, step.from.z); }
      deliverTimer -= dt;
      if (deliverTimer <= 0) { job = null; toast('⏰ وقت تحویل تمام شد — قدم از اول شروع می‌شود'); setMarker(step.from.x, step.from.z); }
      else {
        var tgt = job.stage === 0 ? job.a : job.b;
        if (Math.hypot(p.x - tgt.x, p.z - tgt.z) < 4) {
          if (job.stage === 0) { job.stage = 1; setMarker(job.b.x, job.b.z); toast('📦 بسته را گرفتی — به مقصد برو'); }
          else { job = null; advance(); }
        }
      }
    } else if (step.type === 'evade') {
      if (gta() && gta().wanted === 0) {
        // Only count after it was actually raised by the mission start
        if (step._raised) advance();
      }
    }
  }
  // Evade mission start: raise wanted once
  if (step && step.type === 'evade' && !step._raised) {
    step._raised = true;
    if (gta()) { gta().state.wanted = 2; gta().save(); toast('⭐ تحت تعقیب شدی! پنهان شو تا صفر شود'); }
  }
  // Side jobs (non-story)
  if (job && (!curMission() || (curStep() && curStep().type !== 'taxi' && curStep().type !== 'deliver'))) {
    if (job.id === 'taxi' || job.id === 'delivery') {
      var tgt2 = job.stage === 0 ? job.a : job.b;
      if (Math.hypot(p.x - tgt2.x, p.z - tgt2.z) < 4) {
        if (job.stage === 0) { job.stage = 1; setMarker(job.b.x, job.b.z); toast('✅ مرحله اول شغل انجام شد'); }
        else completeJob();
      }
    } else if (job.id === 'courier') {
      jobTimer -= dt;
      if (jobTimer <= 0) { job = null; hideMarker(); toast('⏰ وقت پیک تمام شد'); }
      else if (Math.hypot(p.x - job.b.x, p.z - job.b.z) < 4) completeJob();
      else if (Math.hypot(p.x - job.a.x, p.z - job.a.z) < 4 && job.stage === 0) { job.stage = 1; setMarker(job.b.x, job.b.z); }
    }
  }
  if (job && job.id === 'courier' && job.stage === 0) {
    // courier pickup marker is job.a
  }
  // Property income
  incomeTimer += dt;
  if (incomeTimer > 90) {
    incomeTimer = 0;
    var owned = (gta() && gta().state.owned) || [];
    var total = 0;
    owned.forEach(function(id){
      var pr = PROPERTIES.find(function(x){ return x.id === id; });
      if (pr) total += pr.income;
    });
    if (total > 0 && econ()) { econ().add(total, 'درآمد ملک‌ها'); }
  }
  // Marker pulse
  if (marker && marker.visible) {
    marker.children[0].rotation.z += dt * 2;
    marker.position.y = 0.2 + Math.sin(t * 3) * 0.15;
  }
}
window.FFGTAStory = {
  line: line, onTalk: onTalk, onBusted: onBusted, tryInterior: tryInterior,
  startMission: startMission, buyProperty: buyProperty, startJob: startJob
};
window.FFGTAStoryUpdate = update;
setInterval(function(){ if (!built) build(); }, 800);
})();
