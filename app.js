(() => {
'use strict';
const CONTENT=window.ANTHONY_ENGLISH_CONTENT||{categories:[],items:[],levels:['ALL','A1','A2','B1','B2','C1']};
const CAT=Object.fromEntries(CONTENT.categories.map(x=>[x.id,x]));
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let activeUser='guest', state=defaultState(), selectedLevel='ALL', session=null, lastCategory='vocab', voices=[];

function defaultState(){return{version:1,totalSessions:0,learnedIds:[],correct:0,attempts:0,streak:0,lastStudy:'',attendance:{},dailyDone:{},cards:{},settings:{accent:'en-US',rate:.85,voice:'auto'},_updatedAt:Date.now()}}
function normalizeState(s){let d=defaultState();s=s&&typeof s==='object'?s:{};let n={...d,...s};n.learnedIds=Array.isArray(n.learnedIds)?n.learnedIds:[];n.attendance=n.attendance||{};n.dailyDone=n.dailyDone||{};n.cards=n.cards||{};n.settings={...d.settings,...(n.settings||{})};return n}
function storageKey(uid=activeUser){return`anthony_en_state_v1_${uid||'guest'}`}
function saveState(sync=true){state._updatedAt=Date.now();try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(_){ }if(sync)window.DACOCloud?.scheduleSync?.();renderHomeStats()}
function loadLocalForUser(uid){activeUser=uid||'guest';try{state=normalizeState(JSON.parse(localStorage.getItem(storageKey())||'null'))}catch(_){state=defaultState()}renderAll();return state}
function applyExternalState(s){state=normalizeState(s);try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(_){ }renderAll()}
function getState(){return JSON.parse(JSON.stringify(state))}
function hasMeaningfulState(s){return !!(s&&(Number(s.totalSessions||0)>0||(s.learnedIds||[]).length||Object.keys(s.cards||{}).length))}
function setGuestMode(){state=loadLocalForUser('guest');renderAll()}
function summary(s=state){s=normalizeState(s);let attendanceDays=Object.keys(s.attendance||{}).filter(k=>s.attendance[k]).length;let firstAccuracy=s.attempts?Math.round((s.correct/s.attempts)*100):0;let score=(s.learnedIds?.length||0)*10+Number(s.correct||0)*3+Number(s.totalSessions||0)*20+attendanceDays*5;return{totalSessions:s.totalSessions||0,streak:s.streak||0,learned:s.learnedIds?.length||0,lastStudy:s.lastStudy||'',attendanceDays,firstAccuracy,score}}
function getDefaultState(){return defaultState()}
window.DACOApp={getState,applyExternalState,loadLocalForUser,hasMeaningfulState,summary,getDefaultState,setGuestMode};

function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));$(id)?.classList.add('on');window.scrollTo({top:0,behavior:'smooth'})}
function goHome(){session=null;document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'));try{speechSynthesis?.cancel?.()}catch(_){ }showView('homeView');renderAll()}
window.goHome=goHome;
function closeModal(id){$(id)?.classList.remove('on')}
window.closeModal=closeModal;
function toast(t){let e=$('toast');if(!e)return;e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1800)}
window.toast=toast;

function updateStreak(){let t=today(),last=state.lastStudy;if(last===t)return;let d=new Date(t+'T12:00:00'),p=new Date(d);p.setDate(p.getDate()-1);let y=p.toLocaleDateString('en-CA');state.streak=(last===y)?Number(state.streak||0)+1:1;state.lastStudy=t;state.attendance[t]=true}
function markStudied(item,correct){updateStreak();if(!state.learnedIds.includes(item.id))state.learnedIds.push(item.id);state.attempts++;if(correct)state.correct++;let c=state.cards[item.id]||{seen:0,wrong:0,due:''};c.seen++;if(correct){c.wrong=Math.max(0,Number(c.wrong||0)-1);let days=c.seen>=4?14:c.seen>=2?7:3;let d=new Date();d.setDate(d.getDate()+days);c.due=d.toLocaleDateString('en-CA')}else{c.wrong=Number(c.wrong||0)+1;c.due=today()}state.cards[item.id]=c;saveState()}
function markCategoryDone(cat){state.dailyDone[today()]??={};state.dailyDone[today()][cat]=true;saveState()}
function isDone(cat){return !!state.dailyDone?.[today()]?.[cat]}

function renderLevelTabs(){let box=$('levelTabs');if(!box)return;box.innerHTML=CONTENT.levels.map(l=>`<button class="${selectedLevel===l?'on':''}" onclick="setLevel('${l}')">${l==='ALL'?'전체':l}</button>`).join('')}
function setLevel(l){selectedLevel=l;renderLevelTabs();renderCategories()}
window.setLevel=setLevel;
function filteredItems(cat){return CONTENT.items.filter(x=>x.category===cat&&(selectedLevel==='ALL'||x.level===selectedLevel))}
function renderCategories(){const card=c=>{let n=filteredItems(c.id).length,done=isDone(c.id);return`<button class="categoryCard" onclick="startCategory('${c.id}')"><div class="categoryIcon">${c.icon}</div><h4>${esc(c.title)}</h4><p>${esc(c.desc)}</p><div class="categoryMeta"><span class="${done?'done':'todo'}">${done?'✓ 오늘 학습 완료':'오늘 학습하기'}</span><span class="miniPill">${n}개</span></div></button>`};let core=$('coreCategoryGrid'),biz=$('businessCategoryGrid');if(core)core.innerHTML=CONTENT.categories.filter(c=>c.group!=='business').map(card).join('');if(biz)biz.innerHTML=CONTENT.categories.filter(c=>c.group==='business').map(card).join('')}
function renderHomeStats(){let m=summary();if($('statSessions'))$('statSessions').textContent=m.totalSessions;if($('statLearned'))$('statLearned').textContent=m.learned;if($('statStreak'))$('statStreak').textContent=m.streak+'일';if($('statAccuracy'))$('statAccuracy').textContent=m.firstAccuracy+'%';let due=CONTENT.items.filter(x=>state.cards?.[x.id]?.due&&state.cards[x.id].due<=today()).length;if($('statDue'))$('statDue').textContent=due;let day=state.dailyDone?.[today()]||{},done=CONTENT.categories.filter(c=>day[c.id]).length,daily=!!day._daily,studied=m.lastStudy===today();if($('todayText'))$('todayText').textContent=daily?`오늘의 10분 학습 완료 · 카테고리 ${done}개 완료 · ${m.streak}일 연속 학습 중`:done?`${CONTENT.categories.length}개 카테고리 중 ${done}개 완료 · ${m.streak}일 연속 학습 중`:studied?'오늘 학습 기록이 있습니다. 이어서 조금 더 학습해 보세요.':'아직 오늘 학습 전입니다. 10분 세션부터 시작해 보세요.'}
function renderAll(){renderLevelTabs();renderCategories();renderHomeStats();refreshVoices();applySettingUI()}

function sessionItems(cat,count=10){let pool=filteredItems(cat);return shuffle(pool).slice(0,Math.min(count,pool.length))}
function startDaily(){let bizCats=CONTENT.categories.filter(c=>c.group==='business').map(c=>c.id),bizPick=bizCats.length?shuffle(bizCats)[0]:'business';let preferred=['vocab','conversation','listening','speaking','grammar','sentence',bizPick];let queue=[];for(let c of preferred){let pool=filteredItems(c);if(pool.length)queue.push(shuffle(pool)[0]);if(queue.length>=10)break}while(queue.length<10){let p=shuffle(CONTENT.items.filter(x=>selectedLevel==='ALL'||x.level===selectedLevel));let x=p.find(y=>!queue.some(q=>q.id===y.id));if(!x)break;queue.push(x)}startSession(queue,'daily')}
window.startDaily=startDaily;
function startCategory(cat){lastCategory=cat;startSession(sessionItems(cat,10),cat)}
window.startCategory=startCategory;
function openReview(){let due=CONTENT.items.filter(x=>{let c=state.cards?.[x.id];return c&&(Number(c.wrong||0)>0||(c.due&&c.due<=today()))});if(!due.length){toast('복습 대기 항목이 없어 최근 학습 항목으로 시작합니다.');due=CONTENT.items.filter(x=>state.learnedIds.includes(x.id)).slice(-20)}if(!due.length){toast('먼저 오늘의 영어를 시작해 주세요.');return}startSession(shuffle(due).slice(0,10),'review')}
window.openReview=openReview;
function startSession(items,type){if(!items.length){toast('선택한 난이도의 학습 항목이 없습니다.');return}session={items,index:0,type,correct:0,answered:0,revealed:false,choiceDone:false,built:[],speechScore:null};showView('studyView');renderStudy()}
function exitStudy(){if(session&&session.answered>0&&confirm('현재 학습을 종료할까요? 진행한 기록은 저장됩니다.')){finishSession(false)}else if(!session||session.answered===0)goHome()}
window.exitStudy=exitStudy;
function current(){return session?.items?.[session.index]}
function renderStudy(){let item=current();if(!item)return finishSession(true);let cat=CAT[item.category]||{icon:'📘',title:item.category};$('studyCount').textContent=`${session.index+1}/${session.items.length}`;$('studyProgress').style.width=`${((session.index+1)/session.items.length)*100}%`;let mode=item.category==='sentence'?'sentence':item.category==='listening'?'listening':item.category==='speaking'?'speaking':'quiz';$('studyCard').innerHTML=mode==='sentence'?renderSentence(item,cat):mode==='listening'?renderListening(item,cat):mode==='speaking'?renderSpeaking(item,cat):renderQuiz(item,cat)}
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
function nextCard(){session.index++;session.revealed=false;session.choiceDone=false;session.built=[];session.speechScore=null;session.transcript='';session._wordPool=null;if(session.index>=session.items.length)finishSession(true);else renderStudy()}
window.nextCard=nextCard;
function finishSession(completed){state.totalSessions++;updateStreak();if(completed&&session?.type==='daily'){state.dailyDone[today()]??={};state.dailyDone[today()]._daily=true}else if(completed&&session?.type&&CAT[session.type])markCategoryDone(session.type);saveState();let s=session||{items:[],answered:0,correct:0,type:'daily'};lastCategory=CAT[s.type]?s.type:lastCategory;$('sumCount').textContent=s.items.length;$('sumCorrect').textContent=s.correct;$('sumScore').textContent=(s.answered?Math.round(s.correct/s.answered*100):0)+'%';$('sumWrong').textContent=Math.max(0,s.answered-s.correct);$('summaryTitle').textContent=completed?'오늘 공부 끝!':'학습 기록 저장 완료';$('summaryText').textContent=completed?'오늘 완료한 카테고리는 홈에서 체크 표시됩니다. 복습 또는 추가학습으로 다시 들어갈 수 있습니다.':'진행한 항목은 학습기록에 반영했습니다.';showView('summaryView');window.DACOCloud?.syncNow?.(false)}
function repeatLastCategory(){startCategory(lastCategory)}
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
window.setAccent=setAccent;window.setRate=setRate;window.setVoice=setVoice;
function applySettingUI(){document.querySelectorAll('#accentSeg button').forEach(b=>b.classList.toggle('on',b.dataset.accent===state.settings.accent));document.querySelectorAll('#rateSeg button').forEach(b=>b.classList.toggle('on',Number(b.dataset.rate)===Number(state.settings.rate)));if($('voiceSelect'))$('voiceSelect').value=state.settings.voice||'auto'}
function refreshVoices(){if(!('speechSynthesis'in window))return;voices=speechSynthesis.getVoices()||[];let sel=$('voiceSelect');if(!sel)return;let lang=(state.settings.accent||'en-US').toLowerCase().slice(0,2),opts=voices.filter(v=>v.lang.toLowerCase().startsWith(lang)).slice(0,12);sel.innerHTML='<option value="auto">자동</option>'+opts.map(v=>`<option value="${esc(v.name)}">${esc(v.name)} · ${esc(v.lang)}</option>`).join('');sel.value=state.settings.voice||'auto'}
if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=refreshVoices;
function speak(text){if(!('speechSynthesis'in window)){toast('이 브라우저는 음성 재생을 지원하지 않습니다.');return}speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(String(text||''));u.lang=state.settings.accent||'en-US';u.rate=Number(state.settings.rate||.85);let desired=state.settings.voice;let v=(desired&&desired!=='auto')?voices.find(x=>x.name===desired):voices.find(x=>x.lang===u.lang)||voices.find(x=>x.lang.toLowerCase().startsWith(u.lang.slice(0,2).toLowerCase()));if(v)u.voice=v;speechSynthesis.speak(u)}
window.speak=speak;

function openAttendance(){let days=Object.keys(state.attendance).filter(k=>state.attendance[k]).sort().reverse();$('attendanceContent').innerHTML=`<div class="adminCards"><div><b>${state.streak||0}일</b><span>연속 학습</span></div><div><b>${days.length}일</b><span>총 출석</span></div><div><b>${state.totalSessions||0}</b><span>학습 세션</span></div><div><b>${state.learnedIds.length}</b><span>학습 카드</span></div></div><div class="panel" style="margin:0"><b>최근 출석일</b><div style="margin-top:10px;line-height:1.9;color:#657287">${days.slice(0,20).map(d=>'✅ '+d).join('<br>')||'아직 출석 기록이 없습니다.'}</div></div>`;$('attendanceModal').classList.add('on')}
window.openAttendance=openAttendance;
function openMyPage(){let m=summary();$('myPageContent').innerHTML=`<div class="adminCards"><div><b>${m.totalSessions}</b><span>세션</span></div><div><b>${m.streak}일</b><span>연속</span></div><div><b>${m.learned}</b><span>학습 카드</span></div><div><b>${m.firstAccuracy}%</b><span>정답률</span></div></div><div class="panel" style="margin:0"><b>현재 학습 설정</b><p style="color:#657287">난이도 ${selectedLevel} · ${state.settings.accent==='en-GB'?'영국식':'미국식'} 발음 · 음성 속도 ${state.settings.rate}배</p><button class="iconbtn" onclick="openSettings();closeModal('myPageModal')">설정 열기</button></div>`;$('myPageModal').classList.add('on');window.DACOCloud?.fillMyRank?.()}
window.openMyPage=openMyPage;
function exportProgress(){let blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`anthony_english_progress_${today()}.json`;a.click();URL.revokeObjectURL(a.href)}
window.exportProgress=exportProgress;
function importProgressFile(file){let r=new FileReader();r.onload=()=>{try{applyExternalState(JSON.parse(r.result));saveState();toast('학습기록을 가져왔습니다.')}catch(_){alert('올바른 백업 파일이 아닙니다.')}};r.readAsText(file)}
function resetProgress(){if(!confirm('영어 학습기록을 모두 초기화할까요?'))return;state=defaultState();saveState();renderAll();toast('영어 학습기록을 초기화했습니다.')}
window.resetProgress=resetProgress;
function jsq(s){return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ')}

function init(){state=loadLocalForUser(window.DACO_CLOUD_USER_ID||'guest');renderAll();$('importFile')?.addEventListener('change',e=>{let f=e.target.files?.[0];if(f)importProgressFile(f);e.target.value=''});if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').then(r=>r.update().catch(()=>{})).catch(()=>{});document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal.on').forEach(m=>m.classList.remove('on'))})}
window.addEventListener('DOMContentLoaded',init);
})();
