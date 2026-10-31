/* Family Fun 2.0 — data-driven quests + jobs. Original 24 NPCs and 14 locations
   are kept; quests only reference their ids. Progress is plain JSON so the save
   system can store it. Rewards always go through FFEconomy (one money state). */
(function(){
'use strict';
var QUESTS=[
 {id:'welcome',title:'آشنایی با شهر',steps:[
   {id:'talk-alireza',text:'با علیرضا (بوتیک) حرف بزن',target:{type:'talk',npc:'alireza'}},
   {id:'enter-cafe',text:'وارد کافه شو',target:{type:'enter',loc:'cafe'}},
   {id:'talk-baharak',text:'با بهارک در کافه حرف بزن',target:{type:'talk',npc:'baharak'}}],
  reward:{money:40,xp:20}},
 {id:'work',title:'کار و درآمد',steps:[
   {id:'do-job',text:'یک شیفت کاری انجام بده',target:{type:'job'}},
   {id:'talk-mohammad',text:'با محمد (بیمارستان) حرف بزن',target:{type:'talk',npc:'mohammad'}}],
  reward:{money:60,xp:25}},
 {id:'friends',title:'دوست‌های جدید',steps:[
   {id:'talk-3',text:'با ۳ شخصیت مختلف حرف بزن',target:{type:'talkAny',count:3}}],
  reward:{money:50,happy:10,xp:30}},
 {id:'delivery',title:'پیک شهر',steps:[
   {id:'d-talk',text:'با علیرضا (بوتیک) حرف بزن',target:{type:'talk',npc:'alireza'}},
   {id:'d-job',text:'یک شیفت پیک انجام بده',target:{type:'job'}},
   {id:'d-talk2',text:'با بهارک در کافه حرف بزن',target:{type:'talk',npc:'baharak'}}],
  reward:{money:80,xp:35}},
 {id:'pro',title:'حرفه‌ای شهر',steps:[
   {id:'p-job1',text:'یک شیفت کاری انجام بده',target:{type:'job'}},
   {id:'p-job2',text:'یک شیفت دیگر انجام بده',target:{type:'job'}},
   {id:'p-talk',text:'با محمد (بیمارستان) حرف بزن',target:{type:'talk',npc:'mohammad'}}],
  reward:{money:100,xp:50}},
 {id:'citylife',title:'زندگی در شهر',steps:[
   {id:'c-talk5',text:'با ۵ شخصیت مختلف حرف بزن',target:{type:'talkAny',count:5}},
   {id:'c-cafe',text:'وارد کافه شو',target:{type:'enter',loc:'cafe'}}],
  reward:{money:70,happy:15,xp:40}}
];
var JOBS=[
 {id:'cafe',label:'شیفت کافه',pay:30,energy:15,time:60},
 {id:'library',label:'شیفت کتابخانه',pay:25,energy:10,time:60},
 {id:'garage',label:'شیفت گاراژ',pay:40,energy:20,time:90},
 {id:'taxi',label:'راننده تاکسی 🚕',pay:50,energy:15,time:75},
 {id:'delivery',label:'پیک موتوری/ماشینی 📦',pay:45,energy:15,time:60},
 {id:'gardener',label:'باغبان پارک 🌳',pay:30,energy:10,time:45},
 {id:'firefighter',label:'آتش‌نشان 🚒',pay:55,energy:20,time:90}
];
var state={current:0,done:[],step:0,talked:{},talkedCount:0};
function cur(){ return QUESTS[state.current]||null; }
function step(){ var q=cur(); return q?q.steps[state.step]:null; }
function render(){
  var q=cur(); if(!q) return;
  var titleEl=document.querySelector('#ffw-objective .ffw-title');
  var copyEl=document.querySelector('#ffw-objective .ffw-copy');
  var meterEl=document.querySelector('#ffw-objective .ffw-meter i');
  var s=step();
  var txt='🎉 همه مأموریت‌ها کامل شد! شهر مال توست.';
  if(s) txt='▸ '+s.text;
  if(titleEl) titleEl.textContent='📜 '+q.title;
  if(copyEl) copyEl.textContent=txt;
  if(meterEl) meterEl.style.width=Math.round((state.step/(q?q.steps.length:1))*100)+'%';
  var panel=document.getElementById('ff-quest-panel');
  if(panel){ var t=panel.querySelector('.ffq-title'); var c=panel.querySelector('.ffq-copy');
    if(t) t.textContent='📜 '+(q?q.title:'تمام شد');
    if(c) c.textContent=s?s.text:txt; }
}
function advance(reason){
  var q=cur(), s=step(); if(!q||!s) return;
  state.step++;
  if(window.showToast) window.showToast('✅ قدم مأموریت انجام شد');
  if(state.step>=q.steps.length){
    if(window.FFEconomy) window.FFEconomy.add(q.reward.money,'پاداش مأموریت «'+q.title+'»');
    if(window.stats && q.reward.xp && typeof window.addXP==='function') window.addXP(q.reward.xp);
    if(window.stats && q.reward.happy) { window.stats.happy=Math.min(100,window.stats.happy+q.reward.happy); if(window.updateHUD) window.updateHUD(); }
    if(window.FFAudio) window.FFAudio.coin();
    state.done.push(q.id); state.current++; state.step=0;
    if(window.showToast) window.showToast('🎉 مأموریت «'+q.title+'» کامل شد!');
  }
  render(); if(window.FFSave) window.FFSave.markDirty();
}
window.FFQuests={
  data:QUESTS, jobs:JOBS, get state(){return state;},
  render:render,
  onTalk:function(npcId){
    if(!npcId) return;
    if(!state.talked[npcId]){ state.talked[npcId]=true; state.talkedCount++; }
    var s=step(); if(!s) return;
    var t=s.target;
    if(t.type==='talk' && t.npc===npcId) advance('talk');
    else if(t.type==='talkAny' && state.talkedCount>=t.count) advance('talkAny');
    else render();
  },
  onEnter:function(locId){
    var s=step(); if(!s) return;
    if(s.target.type==='enter' && s.target.loc===locId) advance('enter');
  },
  doJob:function(jobId){
    var job=JOBS.find(function(j){return j.id===jobId;}); if(!job) return;
    var st=window.stats; if(!st) return;
    if(st.energy<job.energy){ if(window.showToast) window.showToast('⚡ انرژی کافی نداری! اول استراحت کن.'); return; }
    st.energy-=job.energy;
    if(typeof window.gameTime==='number'){ window.gameTime+=job.time; }
    if(window.FFEconomy) window.FFEconomy.add(job.pay,job.label);
    if(window.updateHUD) window.updateHUD();
    if(window.showToast) window.showToast('💼 '+job.label+' انجام شد! +'+job.pay+' سکه');
    var s=step(); if(s && s.target.type==='job') advance('job');
    if(window.FFSave) window.FFSave.markDirty();
  },
  serialize:function(){ return JSON.parse(JSON.stringify(state)); },
  restore:function(s){ if(!s) return; state.current=s.current||0; state.done=s.done||[];
    state.step=s.step||0; state.talked=s.talked||{}; state.talkedCount=s.talkedCount||0; render(); }
};
})();
