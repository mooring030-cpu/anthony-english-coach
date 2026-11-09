(() => {
'use strict';
const CONTENT=window.ANTHONY_ENGLISH_CONTENT||{categories:[],items:[],levels:['ALL','A1','A2','B1','B2','C1']};
const CAT=Object.fromEntries(CONTENT.categories.map(x=>[x.id,x]));
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let activeUser='guest', state=defaultState(), selectedLevel='ALL', session=null, lastCategory='vocab', voices=[], dailyChoiceTarget='daily', attendanceMonthOffset=0;
const APP_VERSION='1.3.0';

const YOMIAN_EN_BASE='/anthony-english-coach/';
function initLaunchIsolation(){
  try{
    if('launchQueue' in window && typeof window.launchQueue.setConsumer==='function'){
      window.launchQueue.setConsumer(params=>{
        try{
          const raw=params?.targetURL||'';
          if(!raw)return;
          const target=new URL(raw,location.origin);
          if(target.origin!==location.origin){location.href=target.href;return}
          if(!target.pathname.startsWith(YOMIAN_EN_BASE)){
            // Chrome가 다른 YOMIAN PWA 창을 잘못 재사용한 경우 원래 실행 대상 URL을 존중한다.
            location.href=target.href;
            return;
          }
          if(location.pathname!==target.pathname||location.search!==target.search||location.hash!==target.hash){
            location.replace(target.href);
          }
        }catch(_){ }
      });
    }
  }catch(_){ }
}

const SW_CHECK_MS=5*60*1000;
let swReg=null,swUpdatePending=false,swApplying=false,swReloading=false,swCheckTimer=null,lastSwCheck=0,swNoticeShown=false;

function defaultState(){return{version:2,totalSessions:0,learnedIds:[],correct:0,attempts:0,streak:0,lastStudy:'',attendance:{},dailyDone:{},cards:{},activeSession:null,settings:{accent:'en-US',rate:.85,voice:'auto',sessionSize:10,reviewBaseDays:3,reviewAutoGrow:true},_updatedAt:Date.now()}}
function normalizeState(s){let d=defaultState();s=s&&typeof s==='object'?s:{};let n={...d,...s};n.learnedIds=Array.isArray(n.learnedIds)?n.learnedIds:[];n.attendance=n.attendance||{};n.dailyDone=n.dailyDone||{};n.cards=n.cards||{};n.activeSession=n.activeSession&&typeof n.activeSession==='object'?n.activeSession:null;n.settings={...d.settings,...(n.settings||{})};n.settings.sessionSize=clamp(Number(n.settings.sessionSize||10),5,30);n.settings.reviewBaseDays=clamp(Number(n.settings.reviewBaseDays||3),1,30);n.settings.reviewAutoGrow=n.settings.reviewAutoGrow!==false;return n}
function storageKey(uid=activeUser){return`anthony_en_state_v1_${uid||'guest'}`}
function backupKey(uid=activeUser){return`yomian_en_auto_backup_${uid||'guest'}`}
function saveBackupSnapshot(){try{localStorage.setItem(backupKey(),JSON.stringify({...state,_backupAt:Date.now()}))}catch(_){}}
function saveState(sync=true){state._updatedAt=Date.now();try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(_){ }saveBackupSnapshot();saveStateIDB(state).catch(()=>{});if(sync)window.DACOCloud?.scheduleSync?.();renderHomeStats()}
function loadLocalForUser(uid){activeUser=uid||'guest';try{state=normalizeState(JSON.parse(localStorage.getItem(storageKey())||'null'))}catch(_){state=defaultState()}renderAll();return state}
function applyExternalState(s){state=normalizeState(s);try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(_){ }saveBackupSnapshot();saveStateIDB(state).catch(()=>{});renderAll()}
let stateDBPromise=null;
function openStateDB(){if(!('indexedDB'in window))return Promise.reject(new Error('no idb'));if(stateDBPromise)return stateDBPromise;stateDBPromise=new Promise((resolve,reject)=>{let r=indexedDB.open('yomian-english-state',1);r.onupgradeneeded=()=>{let db=r.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return stateDBPromise}
async function saveStateIDB(v){let db=await openStateDB();return new Promise((resolve,reject)=>{let tx=db.transaction('state','readwrite');tx.objectStore('state').put(JSON.parse(JSON.stringify(v)),activeUser||'guest');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function hydrateFromIDB(){try{let db=await openStateDB(),v=await new Promise((resolve,reject)=>{let tx=db.transaction('state','readonly'),r=tx.objectStore('state').get(activeUser||'guest');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});if(v&&Number(v._updatedAt||0)>Number(state._updatedAt||0)){state=normalizeState(v);try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(_){}renderAll()}}catch(_){}}
async function requestPersistentStorage(){try{if(navigator.storage?.persist)await navigator.storage.persist()}catch(_){}}
function restoreAutoBackup(){try{let raw=localStorage.getItem(backupKey());if(!raw)return toast('복원할 자동 백업이 없습니다.');if(!confirm('자동 백업으로 현재 학습기록을 복원할까요?'))return;state=normalizeState(JSON.parse(raw));saveState();renderAll();toast('자동 백업을 복원했습니다.')}catch(_){toast('자동 백업을 복원하지 못했습니다.')}}
window.restoreAutoBackup=restoreAutoBackup;
function getState(){return JSON.parse(JSON.stringify(state))}
function hasMeaningfulState(s){return !!(s&&(Number(s.totalSessions||0)>0||(s.learnedIds||[]).length||Object.keys(s.cards||{}).length))}
function setGuestMode(){state=loadLocalForUser('guest');renderAll()}
function summary(s=state){s=normalizeState(s);let attendanceDays=Object.keys(s.attendance||{}).filter(k=>s.attendance[k]).length;let firstAccuracy=s.attempts?Math.round((s.correct/s.attempts)*100):0;let score=(s.learnedIds?.length||0)*10+Number(s.correct||0)*3+Number(s.totalSessions||0)*20+attendanceDays*5;return{totalSessions:s.totalSessions||0,streak:s.streak||0,learned:s.learnedIds?.length||0,lastStudy:s.lastStudy||'',attendanceDays,firstAccuracy,score}}
function getDefaultState(){return defaultState()}
window.DACOApp={getState,applyExternalState,loadLocalForUser,hasMeaningfulState,summary,getDefaultState,setGuestMode};

function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));$(id)?.classList.add('on');document.querySelectorAll('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'});setTimeout(maybeApplyUpdate,0)}
function currentViewId(){return document.querySelector('.view.on')?.id||''}
function authGateVisible(){let g=$('authGate');return !!(g&&!g.classList.contains('hidden'))}
function isSafeForUpdate(){return !session&&currentViewId()==='homeView'&&!document.querySelector('.modal.on')&&!authGateVisible()}
function workerVersion(worker){return new Promise(resolve=>{if(!worker)return resolve('');let done=false,t=setTimeout(()=>{if(!done){done=true;resolve('')}},700);try{let ch=new MessageChannel();ch.port1.onmessage=e=>{if(done)return;done=true;clearTimeout(t);resolve(String(e.data?.version||''))};worker.postMessage({type:'GET_VERSION'},[ch.port2])}catch(_){clearTimeout(t);resolve('')}})}
async function activeWorkerIsNewer(){if(!swReg?.active)return false;let v=await workerVersion(swReg.active);return !!(v&&v!==APP_VERSION)}
function announcePendingUpdate(){if(swNoticeShown)return;swNoticeShown=true;toast('새 버전을 받았습니다. 학습이 끝나면 자동 적용됩니다.')}
async function maybeApplyUpdate(){if(swApplying||swReloading||!swReg)return;if(!isSafeForUpdate()){if(swUpdatePending)announcePendingUpdate();return}
  if(swReg.waiting){swApplying=true;let w=swReg.waiting;let activated=false;let reload=()=>{if(activated||swReloading)return;activated=true;swReloading=true;setTimeout(()=>location.reload(),120)};w.addEventListener('statechange',()=>{if(w.state==='activated')reload()});try{w.postMessage({type:'SKIP_WAITING'})}catch(_){swApplying=false}return}
  if(await activeWorkerIsNewer()){swReloading=true;setTimeout(()=>location.reload(),120)}
}
function watchInstallingWorker(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){swUpdatePending=true;announcePendingUpdate();maybeApplyUpdate()}})}
async function checkForAppUpdate(force=false){if(!swReg||document.visibilityState==='hidden')return;let now=Date.now();if(!force&&now-lastSwCheck<30000)return;lastSwCheck=now;try{await swReg.update()}catch(_){ }if(swReg.waiting){swUpdatePending=true;announcePendingUpdate()}maybeApplyUpdate()}
async function initSmartUpdate(){if(!('serviceWorker'in navigator))return;try{swReg=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});if(swReg.installing)watchInstallingWorker(swReg.installing);swReg.addEventListener('updatefound',()=>watchInstallingWorker(swReg.installing));if(swReg.waiting&&navigator.serviceWorker.controller){swUpdatePending=true;announcePendingUpdate()}let gate=$('authGate');if(gate)new MutationObserver(()=>setTimeout(maybeApplyUpdate,0)).observe(gate,{attributes:true,attributeFilter:['class']});await checkForAppUpdate(true);clearInterval(swCheckTimer);swCheckTimer=setInterval(()=>checkForAppUpdate(false),SW_CHECK_MS);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForAppUpdate(true)});window.addEventListener('focus',()=>checkForAppUpdate(true));window.addEventListener('online',()=>checkForAppUpdate(true))}catch(_){ }}
function goHome(){if(session)saveActiveSession();session=null;document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'));try{speechSynthesis?.cancel?.()}catch(_){ }showView('homeView');renderAll();setTimeout(maybeApplyUpdate,80)}
window.goHome=goHome;
window.ANTHONY_UPDATE={version:APP_VERSION,check:()=>checkForAppUpdate(true),apply:maybeApplyUpdate,isSafe:isSafeForUpdate};
function closeModal(id){$(id)?.classList.remove('on');setTimeout(maybeApplyUpdate,0)}
window.closeModal=closeModal;
function toast(t){let e=$('toast');if(!e)return;e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1800)}
window.toast=toast;

function updateStreak(){let t=today(),last=state.lastStudy;if(last===t)return;let d=new Date(t+'T12:00:00'),p=new Date(d);p.setDate(p.getDate()-1);let y=p.toLocaleDateString('en-CA');state.streak=(last===y)?Number(state.streak||0)+1:1;state.lastStudy=t;state.attendance[t]=true}
function reviewDaysForCard(c){let base=Number(state.settings.reviewBaseDays||3);if(!state.settings.reviewAutoGrow)return base;let mult=c.seen>=6?8:c.seen>=4?4:c.seen>=2?2:1;return Math.min(60,Math.max(1,Math.round(base*mult)))}
function markStudied(item,correct){updateStreak();if(!state.learnedIds.includes(item.id))state.learnedIds.push(item.id);state.attempts++;if(correct)state.correct++;let c=state.cards[item.id]||{seen:0,wrong:0,due:''};c.seen++;if(correct){c.wrong=Math.max(0,Number(c.wrong||0)-1);let d=new Date();d.setDate(d.getDate()+reviewDaysForCard(c));c.due=d.toLocaleDateString('en-CA')}else{c.wrong=Number(c.wrong||0)+1;c.due=today()}state.cards[item.id]=c;saveState();saveActiveSession()}
function markCategoryDone(cat){state.dailyDone[today()]??={};state.dailyDone[today()][cat]=true;saveState()}
function isDone(cat){return !!state.dailyDone?.[today()]?.[cat]}

function renderLevelTabs(){let box=$('levelTabs');if(!box)return;box.innerHTML=CONTENT.levels.map(l=>`<button class="${selectedLevel===l?'on':''}" onclick="setLevel('${l}')">${l==='ALL'?'전체':l}</button>`).join('')}
function setLevel(l){selectedLevel=l;renderLevelTabs();renderCategories()}
window.setLevel=setLevel;
function filteredItems(cat){return CONTENT.items.filter(x=>x.category===cat&&(selectedLevel==='ALL'||x.level===selectedLevel))}
function renderCategories(){const card=c=>{let n=filteredItems(c.id).length,done=isDone(c.id),disabled=n===0;return`<button class="categoryCard ${done?'completed':''}" ${disabled?'disabled aria-disabled="true"':''} onclick="startCategory('${c.id}')"><div class="categoryIcon">${c.icon}</div>${done?'<span class="completeBadge">오늘 완료</span>':''}<h4>${esc(c.title)}</h4><p>${esc(c.desc)}</p><div class="categoryMeta"><span class="${done?'done':'todo'}">${disabled?'선택 레벨 자료 없음':done?'✓ 복습·추가학습':'오늘 학습하기'}</span><span class="miniPill">${n}개</span></div></button>`};let core=$('coreCategoryGrid'),biz=$('businessCategoryGrid');if(core)core.innerHTML=CONTENT.categories.filter(c=>c.group!=='business').map(card).join('');if(biz)biz.innerHTML=CONTENT.categories.filter(c=>c.group==='business').map(card).join('')}
function renderHomeStats(){let m=summary();if($('statSessions'))$('statSessions').textContent=m.totalSessions;if($('statLearned'))$('statLearned').textContent=m.learned;if($('statStreak'))$('statStreak').textContent=m.streak+'일';if($('statAccuracy'))$('statAccuracy').textContent=m.firstAccuracy+'%';let due=CONTENT.items.filter(x=>state.cards?.[x.id]?.due&&state.cards[x.id].due<=today()).length;if($('statDue'))$('statDue').textContent=due;let day=state.dailyDone?.[today()]||{},done=CONTENT.categories.filter(c=>day[c.id]).length,daily=!!day._daily,studied=m.lastStudy===today(),resumable=hasActiveSession();if($('todayText'))$('todayText').textContent=resumable?`진행 중 학습이 있습니다 · ${activeSessionProgress()} · 눌러서 이어가세요.`:daily?`오늘 10분 학습 완료 · 카테고리 ${done}개 완료 · ${m.streak}일 연속 학습 중`:done?`${CONTENT.categories.length}개 카테고리 중 ${done}개 완료 · ${m.streak}일 연속 학습 중`:studied?'오늘 학습 기록이 있습니다. 이어서 조금 더 학습해 보세요.':'아직 오늘 학습 전입니다. 10분 세션부터 시작해 보세요.';if($('todayActionBtn'))$('todayActionBtn').textContent=resumable?'이어하기':'오늘 시작';if($('heroSummary'))$('heroSummary').innerHTML=`<span>오늘 완료 <b>${done}</b>개</span><span>복습 대기 <b>${due}</b>개</span><span>연속 <b>${m.streak}</b>일</span>`}
function renderAll(){renderLevelTabs();renderCategories();renderHomeStats();refreshVoices();applySettingUI()}

function sessionSize(){return Number(state.settings.sessionSize||10)}
function sessionItems(cat,count=sessionSize(),excludeLearned=false){let pool=filteredItems(cat);if(excludeLearned){let fresh=pool.filter(x=>!state.learnedIds.includes(x.id));if(fresh.length)pool=fresh}return shuffle(pool).slice(0,Math.min(count,pool.length))}
function buildDailyQueue(extra=false){let count=sessionSize(),bizCats=CONTENT.categories.filter(c=>c.group==='business').map(c=>c.id),bizPick=bizCats.length?shuffle(bizCats)[0]:'business';let preferred=['vocab','conversation','listening','speaking','grammar','sentence',bizPick],queue=[];for(let c of preferred){let pool=filteredItems(c).filter(x=>!extra||!state.learnedIds.includes(x.id));if(!pool.length)pool=filteredItems(c);if(pool.length)queue.push(shuffle(pool)[0]);if(queue.length>=count)break}while(queue.length<count){let p=shuffle(CONTENT.items.filter(x=>(selectedLevel==='ALL'||x.level===selectedLevel)&&(!extra||!state.learnedIds.includes(x.id))));if(!p.length&&extra)p=shuffle(CONTENT.items.filter(x=>selectedLevel==='ALL'||x.level===selectedLevel));let x=p.find(y=>!queue.some(q=>q.id===y.id));if(!x)break;queue.push(x)}return queue}
function startDaily(force=false){if(!force&&state.dailyDone?.[today()]?._daily)return openDailyChoice('daily');startSession(buildDailyQueue(false),'daily')}
window.startDaily=startDaily;
function startCategory(cat,force=false,extra=false){lastCategory=cat;if(!force&&isDone(cat))return openDailyChoice(cat);startSession(sessionItems(cat,sessionSize(),extra),cat)}
window.startCategory=startCategory;
function openDailyChoice(target){dailyChoiceTarget=target||'daily';let c=CAT[dailyChoiceTarget],title=dailyChoiceTarget==='daily'?'오늘의 영어':c?.title||'학습';if($('dailyChoiceTitle'))$('dailyChoiceTitle').textContent=`${title} · 오늘 완료`;if($('dailyChoiceText'))$('dailyChoiceText').textContent='이미 오늘 학습한 영역입니다. 약한 항목을 복습하거나 아직 덜 본 항목을 추가로 학습할 수 있습니다.';$('dailyChoiceModal')?.classList.add('on')}
function closeDailyChoice(){closeModal('dailyChoiceModal')}
function runDailyChoice(mode){closeDailyChoice();if(mode==='review'){let pool=CONTENT.items.filter(x=>(dailyChoiceTarget==='daily'||x.category===dailyChoiceTarget)&&state.learnedIds.includes(x.id));if(!pool.length)pool=dailyChoiceTarget==='daily'?CONTENT.items:filteredItems(dailyChoiceTarget);startSession(shuffle(pool).slice(0,Math.min(sessionSize(),pool.length)),dailyChoiceTarget==='daily'?'review':dailyChoiceTarget)}else{if(dailyChoiceTarget==='daily')startSession(buildDailyQueue(true),'daily');else startCategory(dailyChoiceTarget,true,true)}}
window.closeDailyChoice=closeDailyChoice;window.runDailyChoice=runDailyChoice;
function resumeOrDaily(){if(hasActiveSession())resumeLearning();else startDaily()}
window.resumeOrDaily=resumeOrDaily;
function openReview(){let due=CONTENT.items.filter(x=>{let c=state.cards?.[x.id];return c&&(Number(c.wrong||0)>0||(c.due&&c.due<=today()))});if(!due.length){toast('복습 대기 항목이 없어 최근 학습 항목으로 시작합니다.');due=CONTENT.items.filter(x=>state.learnedIds.includes(x.id)).slice(-20)}if(!due.length){toast('먼저 오늘의 영어를 시작해 주세요.');return}startSession(shuffle(due).slice(0,Math.min(sessionSize(),due.length)),'review')}
window.openReview=openReview;
function startSession(items,type){if(!items.length){toast('선택한 난이도의 학습 항목이 없습니다.');return}session={items,index:0,type,correct:0,answered:0,revealed:false,choiceDone:false,built:[],speechScore:null,transcript:''};saveActiveSession();showView('studyView');renderStudy()}
function serializeSession(){if(!session)return null;return{type:session.type,itemIds:(session.items||[]).map(x=>x.id),index:session.index||0,correct:session.correct||0,answered:session.answered||0,revealed:!!session.revealed,choiceDone:!!session.choiceDone,built:(session.built||[]).map(x=>x.w),speechScore:session.speechScore??null,transcript:session.transcript||'',savedAt:Date.now()}}
function saveActiveSession(){if(!session)return;state.activeSession=serializeSession();state._updatedAt=Date.now();try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(_){}saveBackupSnapshot()}
function hasActiveSession(){let a=state.activeSession;return !!(a&&Array.isArray(a.itemIds)&&a.itemIds.length&&Number(a.index||0)<a.itemIds.length)}
function activeSessionProgress(){let a=state.activeSession;if(!a)return'';return`${Math.min(Number(a.index||0)+1,a.itemIds.length)}/${a.itemIds.length}`}
function resumeLearning(){let a=state.activeSession;if(!hasActiveSession())return startDaily(true);let map=new Map(CONTENT.items.map(x=>[x.id,x])),items=a.itemIds.map(id=>map.get(id)).filter(Boolean);if(!items.length){state.activeSession=null;saveState();return startDaily(true)}session={items,index:clamp(Number(a.index||0),0,items.length-1),type:a.type||'daily',correct:Number(a.correct||0),answered:Number(a.answered||0),revealed:!!a.revealed,choiceDone:false,built:[],speechScore:null,transcript:''};showView('studyView');renderStudy();toast('저장된 학습을 이어서 시작합니다.')}
window.resumeLearning=resumeLearning;
function exitStudy(){if(!session)return goHome();if(confirm('현재 위치를 저장하고 홈으로 이동할까요?\n언제든 이어하기로 계속할 수 있습니다.')){saveActiveSession();session=null;showView('homeView');renderAll();toast('학습 위치를 저장했습니다.')}}
window.exitStudy=exitStudy;
function current(){return session?.items?.[session.index]}
function renderStudy(){let item=current();if(!item)return finishSession(true);saveActiveSession();let cat=CAT[item.category]||{icon:'📘',title:item.category};$('studyCount').textContent=`${session.index+1}/${session.items.length}`;$('studyProgress').style.width=`${((session.index+1)/session.items.length)*100}%`;let mode=item.category==='sentence'?'sentence':item.category==='listening'?'listening':item.category==='speaking'?'speaking':'quiz';$('studyCard').innerHTML=mode==='sentence'?renderSentence(item,cat):mode==='listening'?renderListening(item,cat):mode==='speaking'?renderSpeaking(item,cat):renderQuiz(item,cat)}
function header(item,cat){return`<div class="lessonBadge">${cat.icon} ${esc(cat.title)} · ${esc(item.level)}</div>`}
function ipa(item){let v=state.settings.accent==='en-GB'?item.ipaUK:item.ipaUS;return v?`<div class="ipa">${esc(v)}</div>`:''}
function details(item){return`${item.example?`<div class="example"><b>${esc(item.example)}</b><span>${esc(item.exampleKo||'')}</span></div>`:''}${item.note?`<div class="note">💡 ${esc(item.note)}</div>`:''}`}
function renderQuiz(item,cat){let revealed=session.revealed;if(!revealed)return`${header(item,cat)}<div class="prompt"><div class="ko">${esc(item.ko)}</div><div style="color:#7a8799;margin-bottom:12px">영어 표현을 떠올린 뒤 정답을 확인하세요.</div><button class="actionBtn listen" onclick="speak('${jsq(item.en)}')">🔊 먼저 듣기</button></div><div class="actions"><button class="actionBtn reveal" onclick="revealAnswer()">정답 보기</button></div>`;let choices=makeChoices(item);return`${header(item,cat)}<div class="prompt"><div class="ko">${esc(item.ko)}</div><div class="en">${esc(item.en)}</div>${ipa(item)}${details(item)}<div class="choiceGrid">${choices.map(c=>`<button class="choice" onclick="answerChoice(this,'${jsq(c)}','${jsq(item.en)}')">${esc(c)}</button>`).join('')}</div></div><div class="actions"><button class="actionBtn listen" onclick="speak('${jsq(item.en)}')">🔊 듣기</button><button class="actionBtn speak" onclick="startSpeech()">🎙 따라 말하기</button></div>`}
function makeChoices(item){let seen=new Set([normalize(item.en)]),alts=[];for(const v of shuffle(CONTENT.items.filter(x=>x.category===item.category&&x.id!==item.id).map(x=>x.en))){let k=normalize(v);if(!k||seen.has(k))continue;seen.add(k);alts.push(v);if(alts.length>=3)break}return shuffle([item.en,...alts])}
function revealAnswer(){session.revealed=true;renderStudy();setTimeout(()=>speak(current().en),100)}
window.revealAnswer=revealAnswer;
function answerChoice(btn,val,ans){if(session.choiceDone)return;session.choiceDone=true;let ok=normalize(val)===normalize(ans);document.querySelectorAll('.choice').forEach(b=>{if(normalize(b.textContent)===normalize(ans))b.classList.add('correct')});if(!ok)btn.classList.add('bad');session.answered++;if(ok)session.correct++;markStudied(current(),ok);let actions=document.querySelector('#studyCard .actions');if(actions)actions.insertAdjacentHTML('beforeend',`<button class="actionBtn ${ok?'good':'wrong'}" onclick="nextCard()">${ok?'✓ 정답 · 다음':'↺ 오답 저장 · 다음'}</button>`)}
window.answerChoice=answerChoice;

function renderSentence(item,cat){let words=item.en.replace(/([?.!,])/g,' $1').split(/\s+/).filter(Boolean);if(!session._wordPool||session._wordId!==item.id){session._wordId=item.id;session._wordPool=shuffle(words.map((w,i)=>({w,i,uid:i+'-'+Math.random()})));session.built=[]}let built=session.built.map(x=>x.w).join(' ').replace(/\s+([?.!,])/g,'$1');return`${header(item,cat)}<div class="prompt"><div class="ko">${esc(item.ko)}</div><div class="builtLine">${session.built.length?session.built.map((x,i)=>`<button class="wordChip" onclick="removeWord(${i})">${esc(x.w)}</button>`).join(''):'<span style="color:#99a3b1">아래 단어를 눌러 문장을 완성하세요.</span>'}</div><div class="sentenceBuild">${session._wordPool.map((x,i)=>`<button class="wordChip ${session.built.some(b=>b.uid===x.uid)?'used':''}" onclick="addWord(${i})">${esc(x.w)}</button>`).join('')}</div>${session.choiceDone?`<div class="${normalize(built)===normalize(item.en)?'note':'note'}"><b>${normalize(built)===normalize(item.en)?'✓ 정답':'정답: '+esc(item.en)}</b></div>${details(item)}`:''}</div><div class="actions"><button class="actionBtn listen" onclick="speak('${jsq(item.en)}')">🔊 듣기</button><button class="actionBtn reveal" onclick="checkSentence()">문장 확인</button>${session.choiceDone?'<button class="actionBtn good" onclick="nextCard()">다음 →</button>':''}</div>`}
function addWord(i){let x=session._wordPool[i];if(!session.built.some(b=>b.uid===x.uid))session.built.push(x);renderStudy()}
function removeWord(i){session.built.splice(i,1);renderStudy()}
window.addWord=addWord;window.removeWord=removeWord;
function checkSentence(){if(session.choiceDone)return;let built=session.built.map(x=>x.w).join(' ').replace(/\s+([?.!,])/g,'$1');let ok=normalize(built)===normalize(current().en);session.choiceDone=true;session.answered++;if(ok)session.correct++;markStudied(current(),ok);renderStudy();if(ok)speak(current().en)}
window.checkSentence=checkSentence;

function renderListening(item,cat){return`${header(item,cat)}<div class="prompt"><div class="ko">${session.revealed?esc(item.ko):'문장을 보지 말고 먼저 들어보세요.'}</div><button class="micOrb" style="background:linear-gradient(135deg,#547cff,#8a67e8)" onclick="speak('${jsq(item.en)}')">🎧</button>${session.revealed?`<div class="en">${esc(item.en)}</div>${ipa(item)}${details(item)}`:'<div style="color:#7a8799;margin-top:12px">2~3회 들은 뒤 정답을 확인하세요.</div>'}</div><div class="actions">${!session.revealed?'<button class="actionBtn reveal" onclick="revealListening()">문장 확인</button>':`<button class="actionBtn wrong" onclick="selfRate(false)">다시 듣기 필요</button><button class="actionBtn good" onclick="selfRate(true)">이해했어요</button>`}</div>`}
function revealListening(){session.revealed=true;renderStudy()}
window.revealListening=revealListening;
function selfRate(ok){session.answered++;if(ok)session.correct++;markStudied(current(),ok);nextCard()}
window.selfRate=selfRate;

function renderSpeaking(item,cat){return`${header(item,cat)}<div class="prompt"><div class="ko">${esc(item.ko)}</div><div class="en">${esc(item.en)}</div>${ipa(item)}<div style="margin:16px 0"><button class="actionBtn listen" onclick="speak('${jsq(item.en)}')">🔊 ${state.settings.accent==='en-GB'?'UK':'US'} 발음 듣기</button></div><button id="micBtn" class="micOrb" onclick="startSpeech()">🎙️</button>${session.speechScore!==null?`<div class="speechResult"><div class="score">${session.speechScore}%</div><b>인식 결과</b><div>${esc(session.transcript||'')}</div></div>`:''}${details(item)}</div><div class="actions">${session.speechScore!==null?'<button class="actionBtn good" onclick="finishSpeechCard()">다음 →</button>':'<span style="color:#7a8799">마이크를 누르고 문장을 따라 말해 보세요.</span>'}</div>`}
function startSpeech(){let item=current();let SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome/Edge를 이용해 주세요.');return}let rec=new SR();rec.lang=state.settings.accent||'en-US';rec.interimResults=false;rec.maxAlternatives=1;let b=$('micBtn');b?.classList.add('listening');rec.onresult=e=>{let tr=e.results?.[0]?.[0]?.transcript||'',score=similarity(item.en,tr);if(item.category==='speaking'){session.transcript=tr;session.speechScore=score;renderStudy()}else{toast(`인식 ${score}% · ${tr||'인식 결과 없음'}`)}};rec.onerror=()=>{toast('음성 인식에 실패했습니다. 마이크 권한을 확인해 주세요.');b?.classList.remove('listening')};rec.onend=()=>b?.classList.remove('listening');rec.start()}
window.startSpeech=startSpeech;
function finishSpeechCard(){let ok=(session.speechScore||0)>=70;session.answered++;if(ok)session.correct++;markStudied(current(),ok);nextCard()}
window.finishSpeechCard=finishSpeechCard;
function similarity(a,b){let A=normalize(a).split(' ').filter(Boolean),B=normalize(b).split(' ').filter(Boolean);if(!A.length)return 0;let hits=A.filter(w=>B.includes(w)).length;let order=0,bi=0;for(let w of A){let j=B.indexOf(w,bi);if(j>=0){order++;bi=j+1}}return clamp(Math.round((hits/A.length*.72+order/A.length*.28)*100),0,100)}
function normalize(s){return String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9가-힣\s]/g,' ').replace(/\s+/g,' ').trim()}
function nextCard(){session.index++;session.revealed=false;session.choiceDone=false;session.built=[];session.speechScore=null;session.transcript='';session._wordPool=null;if(session.index>=session.items.length)finishSession(true);else{saveActiveSession();renderStudy()}}
window.nextCard=nextCard;
function finishSession(completed){let s=session||{items:[],answered:0,correct:0,type:'daily'};state.activeSession=null;state.totalSessions++;updateStreak();if(completed&&s.type==='daily'){state.dailyDone[today()]??={};state.dailyDone[today()]._daily=true}else if(completed&&s.type&&CAT[s.type])markCategoryDone(s.type);saveState();lastCategory=CAT[s.type]?s.type:lastCategory;$('sumCount').textContent=s.items.length;$('sumCorrect').textContent=s.correct;$('sumScore').textContent=(s.answered?Math.round(s.correct/s.answered*100):0)+'%';$('sumWrong').textContent=Math.max(0,s.answered-s.correct);$('summaryTitle').textContent=completed?'오늘 공부 끝!':'학습 기록 저장 완료';$('summaryText').textContent=completed?'완료 상태가 저장되었습니다. 같은 영역은 복습 또는 추가학습으로 다시 들어갈 수 있습니다.':'진행한 항목은 학습기록에 반영했습니다.';session=null;showView('summaryView');window.DACOCloud?.syncNow?.(false)}
function repeatLastCategory(){startCategory(lastCategory,true,true)}
window.repeatLastCategory=repeatLastCategory;

function openBrowse(){showView('browseView');let sel=$('browseCategory');if(sel&&!sel.options.length)sel.innerHTML='<option value="ALL">전체 카테고리</option>'+CONTENT.categories.map(c=>`<option value="${c.id}">${c.icon} ${esc(c.title)}</option>`).join('');renderBrowse()}
window.openBrowse=openBrowse;
function renderBrowse(){let q=normalize($('browseSearch')?.value||''),cat=$('browseCategory')?.value||'ALL';let rows=CONTENT.items.filter(x=>(cat==='ALL'||x.category===cat)&&(selectedLevel==='ALL'||x.level===selectedLevel)&&(!q||normalize(x.en+' '+x.ko+' '+(x.example||'')).includes(q))).slice(0,160);$('browseList').innerHTML=rows.map(x=>`<div class="browseRow"><div class="level">${esc(x.level)}<br><span>${CAT[x.category]?.icon||''}</span></div><div><b>${esc(x.en)}</b><br><span>${esc(x.ko)}</span></div><button class="iconbtn" onclick="browseSpeak('${jsq(x.en)}')">🔊 듣기</button></div>`).join('')||'<div class="setupWarn">검색 결과가 없습니다.</div>'}
window.renderBrowse=renderBrowse;window.browseSpeak=speak;

function openSettings(){$('settingsModal').classList.add('on');refreshVoices();applySettingUI()}
window.openSettings=openSettings;
function setAccent(v){state.settings.accent=v;state.settings.voice='auto';saveState();refreshVoices();applySettingUI()}
function setRate(v){state.settings.rate=Number(v);saveState();applySettingUI()}
function setVoice(v){state.settings.voice=v;saveState()}
function setSessionSize(v){state.settings.sessionSize=clamp(Number(v||10),5,30);saveState();applySettingUI();toast(`${state.settings.sessionSize}문제로 설정했습니다.`)}
function setReviewBaseDays(v){state.settings.reviewBaseDays=clamp(Number(v||3),1,30);saveState();applySettingUI()}
function toggleReviewAutoGrow(){state.settings.reviewAutoGrow=!state.settings.reviewAutoGrow;saveState();applySettingUI()}
window.setAccent=setAccent;window.setRate=setRate;window.setVoice=setVoice;window.setSessionSize=setSessionSize;window.setReviewBaseDays=setReviewBaseDays;window.toggleReviewAutoGrow=toggleReviewAutoGrow;
function applySettingUI(){document.querySelectorAll('#accentSeg button').forEach(b=>b.classList.toggle('on',b.dataset.accent===state.settings.accent));document.querySelectorAll('#rateSeg button').forEach(b=>b.classList.toggle('on',Number(b.dataset.rate)===Number(state.settings.rate)));document.querySelectorAll('#countSeg button').forEach(b=>b.classList.toggle('on',Number(b.dataset.count)===Number(state.settings.sessionSize)));document.querySelectorAll('#reviewSeg button').forEach(b=>b.classList.toggle('on',Number(b.dataset.days)===Number(state.settings.reviewBaseDays)));if($('reviewGrowBtn'))$('reviewGrowBtn').textContent=`자동 증가 ${state.settings.reviewAutoGrow?'ON':'OFF'}`;if($('voiceSelect'))$('voiceSelect').value=state.settings.voice||'auto'}
function refreshVoices(){if(!('speechSynthesis'in window))return;voices=speechSynthesis.getVoices()||[];let sel=$('voiceSelect');if(!sel)return;let lang=(state.settings.accent||'en-US').toLowerCase().slice(0,2),opts=voices.filter(v=>v.lang.toLowerCase().startsWith(lang)).slice(0,12);sel.innerHTML='<option value="auto">자동</option>'+opts.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');sel.value=state.settings.voice||'auto'}
if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=refreshVoices;
function speak(text){if(!('speechSynthesis'in window)){toast('이 브라우저는 음성 재생을 지원하지 않습니다.');return}speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(String(text||''));u.lang=state.settings.accent||'en-US';u.rate=Number(state.settings.rate||.85);let desired=state.settings.voice;let v=(desired&&desired!=='auto')?voices.find(x=>x.name===desired):voices.find(x=>x.lang===u.lang)||voices.find(x=>x.lang.toLowerCase().startsWith(u.lang.slice(0,2).toLowerCase()));if(v)u.voice=v;speechSynthesis.speak(u)}
window.speak=speak;

function attendanceCalendarHtml(){let base=new Date();base.setDate(1);base.setMonth(base.getMonth()+attendanceMonthOffset);let y=base.getFullYear(),m=base.getMonth(),first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),cells=[];for(let i=0;i<first;i++)cells.push('<div class="calDay empty"></div>');for(let d=1;d<=last;d++){let key=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,hit=!!state.attendance[key],isToday=key===today();cells.push(`<div class="calDay ${hit?'hit':''} ${isToday?'today':''}"><span>${d}</span>${hit?'<b>✓</b>':''}</div>`)}return`<div class="calendarHead"><button class="iconbtn" onclick="changeAttendanceMonth(-1)">‹</button><b>${y}년 ${m+1}월</b><button class="iconbtn" onclick="changeAttendanceMonth(1)">›</button></div><div class="calendarWeek"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="calendarGrid">${cells.join('')}</div>`}
function changeAttendanceMonth(n){attendanceMonthOffset+=Number(n||0);openAttendance(true)}
window.changeAttendanceMonth=changeAttendanceMonth;
function openAttendance(refresh=false){let days=Object.keys(state.attendance).filter(k=>state.attendance[k]).sort().reverse();$('attendanceContent').innerHTML=`<div class="adminCards attendanceStats"><div><b>${state.streak||0}일</b><span>연속 학습</span></div><div><b>${days.length}일</b><span>총 출석</span></div><div><b>${state.totalSessions||0}</b><span>학습 세션</span></div><div><b>${state.learnedIds.length}</b><span>학습 카드</span></div></div><div class="calendarCard">${attendanceCalendarHtml()}</div>`;$('attendanceModal').classList.add('on')}
window.openAttendance=openAttendance;
function openMyPage(){let m=summary();$('myPageContent').innerHTML=`<div class="adminCards"><div><b>${m.totalSessions}</b><span>세션</span></div><div><b>${m.streak}일</b><span>연속</span></div><div><b>${m.learned}</b><span>학습 카드</span></div><div><b>${m.firstAccuracy}%</b><span>정답률</span></div></div><div class="panel" style="margin:0"><b>현재 학습 설정</b><p style="color:#657287">난이도 ${selectedLevel} · ${state.settings.accent==='en-GB'?'영국식':'미국식'} 발음 · 음성 속도 ${state.settings.rate}배</p><button class="iconbtn" onclick="openSettings();closeModal('myPageModal')">설정 열기</button></div>`;$('myPageModal').classList.add('on');window.DACOCloud?.fillMyRank?.()}
window.openMyPage=openMyPage;
function exportProgress(){let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`yomian_english_progress_${today()}.json`;a.click();URL.revokeObjectURL(a.href)}
window.exportProgress=exportProgress;
function importProgressFile(file){let r=new FileReader();r.onload=()=>{try{applyExternalState(JSON.parse(r.result));saveState();toast('학습기록을 가져왔습니다.')}catch(_){alert('올바른 백업 파일이 아닙니다.')}};r.readAsText(file)}
function resetProgress(){if(!confirm('영어 학습기록을 모두 초기화할까요?'))return;state=defaultState();saveState();renderAll();toast('영어 학습기록을 초기화했습니다.')}
window.resetProgress=resetProgress;
function jsq(s){return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ')}

function init(){initLaunchIsolation();state=loadLocalForUser(window.DACO_CLOUD_USER_ID||'guest');renderAll();hydrateFromIDB();requestPersistentStorage();$('importFile')?.addEventListener('change',e=>{let f=e.target.files?.[0];if(f)importProgressFile(f);e.target.value=''});initSmartUpdate();window.addEventListener('pagehide',()=>{if(session)saveActiveSession()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'));setTimeout(maybeApplyUpdate,0)}})}
window.addEventListener('DOMContentLoaded',init);
})();
