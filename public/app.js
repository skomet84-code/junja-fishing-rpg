'use strict';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = id => document.getElementById(id);
const fmt = n => Number(n||0).toLocaleString('ko-KR');
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const rarityMap={common:'일반',uncommon:'고급',rare:'희귀',epic:'영웅',legendary:'전설',mythical:'신화'};
const zoneIcons={pond:'🌿',river:'🏞️',harbor:'🌙',deepsea:'🌊'};
const baitIcons={worm:'🪱',shrimp:'🦐',lure:'✨'};

let state=null;
let selectedZone='pond';
let selectedBait='worm';
let mySpot=2;
let onlineUsers=[];
let eventSource=null;
let chatHistory=[];
let soundOn=true;
let audioCtx=null;
let worldAnim=0;
let fishingPhase='idle';
let encounter=null;
let hookTimer=null;
let fight=null;
let fightRAF=null;
let worldTime=0;
let feedRows=[];
let deferredInstallPrompt=null;
let currentMobileView='fish';

async function api(url,opts={}){
  const res=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok){const err=new Error(data.error||`HTTP ${res.status}`);err.status=res.status;throw err}
  return data;
}
function toast(msg){const t=el('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),2400)}
function sfx(type){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
    const tones={click:[260,.04,'sine',.025],cast:[420,.09,'triangle',.035],bite:[780,.16,'square',.05],reel:[150,.035,'sawtooth',.012],catch:[660,.12,'triangle',.05],level:[880,.18,'sine',.06],error:[120,.1,'square',.025]};
    const [f,d,w,gain]=tones[type]||tones.click;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=w;o.frequency.value=f;g.gain.value=gain;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+d);o.stop(audioCtx.currentTime+d);
  }catch{}
}

function haptic(pattern=35){
  try{if(navigator.vibrate)navigator.vibrate(pattern)}catch{}
}
function isMobileUI(){return window.matchMedia('(max-width:760px)').matches}
function setMobileView(view='fish'){
  currentMobileView=view;
  document.body.dataset.mobileView=view;
  $$('.mobile-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.mobileView===view));
  if(['bag','shop','dex','rank'].includes(view)){
    const tab=$(`.mg-tab[data-tab="${view}"]`);
    if(tab){
      $$('.mg-tab').forEach(x=>x.classList.remove('active'));
      $$('.tab-pane').forEach(x=>x.classList.remove('active'));
      tab.classList.add('active');
      el(`tab-${view}`).classList.add('active');
      if(view==='rank')renderRank();
    }
  }
  if(view==='fish')requestAnimationFrame(()=>{resizeWorld();renderPlayers()});
  if(isMobileUI())window.scrollTo({top:0,behavior:'instant'});
}
function updateMobileStatus(){
  if(!state)return;
  const z=state.zones.find(x=>x.id===selectedZone);
  const icon=zoneIcons[selectedZone]||'🎣';
  const here=onlineUsers.filter(x=>x.zone===selectedZone).length || 1;
  if(el('mobileZoneLabel'))el('mobileZoneLabel').textContent=`${icon} ${z?.name||''}`;
  if(el('mobileOnlineLabel'))el('mobileOnlineLabel').textContent=`● ${here}명`;
}
function showInstallHelp(message){
  if(!el('installHelp'))return;
  el('installHelpText').textContent=message;
  el('installHelp').classList.remove('hidden');
}
function setupPWA(){
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}),{once:true});
  }
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferredInstallPrompt=e;
    el('installBtn')?.classList.add('ready');
  });
  window.addEventListener('appinstalled',()=>{
    deferredInstallPrompt=null;el('installBtn')?.classList.remove('ready');toast('홈 화면에 설치되었습니다!');
  });
  el('installBtn')?.addEventListener('click',async()=>{
    haptic(25);
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(()=>null);
      deferredInstallPrompt=null;el('installBtn')?.classList.remove('ready');
      return;
    }
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
    showInstallHelp(ios?'Safari 아래의 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택하세요.':'브라우저 메뉴(⋮ 또는 공유 메뉴)에서 “앱 설치” 또는 “홈 화면에 추가”를 선택하세요.');
  });
  el('installHelpClose')?.addEventListener('click',()=>el('installHelp').classList.add('hidden'));
  el('shareBtn')?.addEventListener('click',async()=>{
    haptic(25);const data={title:'준자의 낚시왕 RPG',text:'같이 낚시하자 🎣 링크 열고 계정 만들면 바로 접속 가능!',url:location.href};
    try{
      if(navigator.share)await navigator.share(data);
      else{await navigator.clipboard.writeText(location.href);toast('게임 링크를 복사했습니다. 카톡에 붙여넣으세요!')}
    }catch(e){if(e?.name!=='AbortError')toast('공유 메뉴를 열지 못했습니다.')}
  });
  $$('.mobile-nav-btn').forEach(b=>b.addEventListener('click',()=>{sfx('click');haptic(18);setMobileView(b.dataset.mobileView)}));
  document.body.dataset.mobileView='fish';
}

function switchAuth(mode){
  $$('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.auth===mode));
  el('loginForm').classList.toggle('active',mode==='login');el('registerForm').classList.toggle('active',mode==='register');el('authMsg').textContent='';
}
$$('.auth-tab').forEach(b=>b.onclick=()=>switchAuth(b.dataset.auth));

el('loginForm').onsubmit=async e=>{
  e.preventDefault();el('authMsg').textContent='';const fd=new FormData(e.currentTarget);
  try{const r=await api('/api/login',{method:'POST',body:JSON.stringify(Object.fromEntries(fd))});sfx('click');launch(r.state)}catch(err){el('authMsg').textContent=err.message;sfx('error')}
};
el('registerForm').onsubmit=async e=>{
  e.preventDefault();el('authMsg').textContent='';const fd=new FormData(e.currentTarget);
  try{const r=await api('/api/register',{method:'POST',body:JSON.stringify(Object.fromEntries(fd))});sfx('catch');launch(r.state);toast('캐릭터 생성 완료! 지렁이 25개와 새우 미끼 3개를 지급했습니다.')}catch(err){el('authMsg').textContent=err.message;sfx('error')}
};
el('logoutBtn').onclick=async()=>{try{await api('/api/logout',{method:'POST',body:'{}'})}catch{};if(eventSource)eventSource.close();location.reload()};
el('soundBtn').onclick=()=>{soundOn=!soundOn;el('soundBtn').textContent=soundOn?'🔊':'🔇';if(soundOn)sfx('click')};

async function boot(){
  try{const s=await api('/api/me');launch(s)}catch(err){if(err.status!==401)el('authMsg').textContent='서버 연결을 확인하세요.'}
}
function launch(s){
  state=s;selectedZone=s.user.currentZone||'pond';
  el('authScreen').classList.add('hidden');el('game').classList.remove('hidden');
  renderAll();connectEvents();setMobileView('fish');resizeWorld();if(!worldAnim)worldLoop();
  if(isMobileUI())el('chatBody').classList.add('closed');
  updateMobileStatus();
  setTimeout(()=>postPresence(selectedZone,mySpot),200);
}
async function refreshState(){state=await api('/api/me');selectedZone=state.user.currentZone;renderAll()}

function titleFor(level){if(level<5)return '초보 조사';if(level<10)return '강태공 후보';if(level<18)return '프로 앵글러';if(level<25)return '대물 사냥꾼';return '전설의 낚시왕'}
function renderAll(){renderHUD();renderCharacter();renderZones();renderBaits();renderBag();renderShop();renderDex();renderWorldLabels();}
function renderHUD(){
  const u=state.user;el('levelText').textContent=u.level;el('nickText').textContent=u.nickname;el('goldText').textContent=fmt(u.gold);el('xpText').textContent=`${fmt(u.xp)} / ${fmt(u.xpNeed)} XP`;el('xpFill').style.width=`${clamp(u.xp/u.xpNeed*100,0,100)}%`;
}
function renderCharacter(){
  const u=state.user,rod=state.rods.find(x=>x.id===u.equippedRod)||state.rods[0];
  el('charNick').textContent=u.nickname;el('charTitle').textContent=titleFor(u.level);el('charZone').textContent=state.zones.find(z=>z.id===selectedZone)?.name||'';
  el('powerStat').textContent=Math.round(100*rod.power+u.level*1.8);el('luckStat').textContent=`${Math.round(rod.luck*100+u.level*.15)}%`;el('catchStat').textContent=fmt(state.stats.total_catches);
  el('rodName').textContent=rod.name;el('rodDesc').textContent=`낚시력 ×${rod.power.toFixed(2)} · 행운 +${Math.round(rod.luck*100)}%`;
}
function renderZones(){
  el('zoneList').innerHTML=state.zones.map(z=>{
    const locked=state.user.level<z.level;
    return `<button class="zone-btn ${selectedZone===z.id?'active':''} ${locked?'locked':''}" data-zone="${z.id}" ${locked?'disabled':''}><span class="zone-icon">${zoneIcons[z.id]}</span><span><b>${esc(z.name)}</b><small>${esc(z.desc)}</small></span><span class="zone-level">${locked?'🔒 ':''}LV.${z.level}</span></button>`
  }).join('');
  $$('.zone-btn:not(.locked)').forEach(b=>b.onclick=()=>changeZone(b.dataset.zone));
}
async function changeZone(zone){
  if(fishingPhase!=='idle'){toast('낚시 중에는 이동할 수 없습니다.');return}
  try{await postPresence(zone,mySpot);selectedZone=zone;state.user.currentZone=zone;renderZones();renderCharacter();renderWorldLabels();renderPlayers();renderChat();sfx('click');toast(`${state.zones.find(z=>z.id===zone).name}로 이동했습니다.`);if(isMobileUI())setMobileView('fish')}catch(e){toast(e.message)}
}
async function postPresence(zone,spot){return api('/api/presence',{method:'POST',body:JSON.stringify({zone,spot})})}
function renderWorldLabels(){
  const z=state.zones.find(z=>z.id===selectedZone);if(!z)return;el('zoneName').textContent=z.name;el('zoneDesc').textContent=z.desc;el('world').className=`world ${z.theme}`;el('charZone').textContent=z.name;
  const n=onlineUsers.filter(x=>x.zone===selectedZone).length;el('zoneOnline').textContent=`${n}명 낚시 중`;updateMobileStatus();
}
function renderBaits(){
  el('baitSelector').innerHTML=state.baits.map(b=>`<button class="bait-pill ${selectedBait===b.id?'active':''}" data-bait="${b.id}"><b>${baitIcons[b.id]} ${esc(b.name)}</b><span>${state.bait[b.id]||0}개</span></button>`).join('');
  $$('.bait-pill').forEach(b=>b.onclick=()=>{selectedBait=b.dataset.bait;renderBaits();sfx('click')});
}
function renderBag(){
  el('bagCount').textContent=`${state.catches.length}마리`;
  el('catchList').innerHTML=state.catches.length?state.catches.map(c=>`<div class="fish-item"><div class="fish-thumb">🐟</div><div class="fish-meta"><b>${esc(c.fish_name)}</b><span class="rarity ${c.rarity}">${rarityMap[c.rarity]} · ${Number(c.weight_kg).toFixed(2)}kg · ${Number(c.length_cm).toFixed(1)}cm</span><span>판매가 ${fmt(c.value)} G</span></div><button class="sell-one" data-sell="${c.id}">판매</button></div>`).join(''):`<div class="empty-state">아직 가방이 비어 있습니다.<br>낚싯줄을 던져 첫 물고기를 잡아보세요.</div>`;
  $$('[data-sell]').forEach(b=>b.onclick=()=>sellOne(Number(b.dataset.sell)));
  el('sellAllBtn').disabled=!state.catches.length;
}
async function sellOne(id){try{const r=await api('/api/sell',{method:'POST',body:JSON.stringify({catchId:id})});sfx('click');toast(`${fmt(r.value)} G에 판매했습니다.`);await refreshState()}catch(e){toast(e.message)}}
el('sellAllBtn').onclick=async()=>{if(!state.catches.length)return;try{const r=await api('/api/sell-all',{method:'POST',body:'{}'});sfx('catch');toast(`${r.count}마리 전부 판매! +${fmt(r.value)} G`);await refreshState()}catch(e){toast(e.message)}};
function renderShop(){
  const rods=state.rods.map(r=>{
    const owned=state.ownedGear.includes(r.id),equipped=state.user.equippedRod===r.id,locked=state.user.level<r.level;
    let label=equipped?'장착 중':owned?'장착하기':locked?`Lv.${r.level} 필요`:`${fmt(r.cost)} G 구매`;
    return `<div class="shop-item"><div class="shop-top"><b>🎣 ${esc(r.name)}</b><span>LV.${r.level}</span></div><p>${esc(r.desc)}</p><div class="shop-stats"><span>POWER ×${r.power.toFixed(2)}</span><span>LUCK +${Math.round(r.luck*100)}%</span></div><button class="shop-buy ${equipped?'owned':''}" data-rod="${r.id}" data-owned="${owned?1:0}" ${equipped||locked?'disabled':''}>${label}</button></div>`
  }).join('');
  const baits=state.baits.map(b=>`<div class="shop-item"><div class="shop-top"><b>${baitIcons[b.id]} ${esc(b.name)} ×${b.pack}</b><span>${fmt(b.cost)} G</span></div><p>${esc(b.desc)}</p><button class="shop-buy" data-buybait="${b.id}">구매 · 보유 ${state.bait[b.id]||0}개</button></div>`).join('');
  el('shopList').innerHTML=`<div class="shop-section">FISHING RODS</div>${rods}<div class="shop-section">BAITS</div>${baits}`;
  $$('[data-rod]').forEach(b=>b.onclick=()=>b.dataset.owned==='1'?equipRod(b.dataset.rod):buyItem(b.dataset.rod));
  $$('[data-buybait]').forEach(b=>b.onclick=()=>buyItem(b.dataset.buybait));
}
async function buyItem(itemId){try{const r=await api('/api/shop/buy',{method:'POST',body:JSON.stringify({itemId})});sfx('catch');toast(r.message);await refreshState()}catch(e){sfx('error');toast(e.message)}}
async function equipRod(itemId){try{await api('/api/equip',{method:'POST',body:JSON.stringify({itemId})});sfx('click');toast('낚싯대를 교체했습니다.');await refreshState()}catch(e){toast(e.message)}}
function renderDex(){
  el('dexCount').textContent=`${state.dex.length}종 발견`;
  el('dexList').innerHTML=state.dex.length?state.dex.map(d=>`<div class="dex-item"><div class="dex-icon">🐟</div><div><b>${esc(d.fish_name)}</b><span class="rarity ${d.rarity}">${rarityMap[d.rarity]} · 최대 ${Number(d.max_weight).toFixed(2)}kg</span></div><div class="dex-count">×${d.count}</div></div>`).join(''):`<div class="empty-state">도감이 비어 있습니다.<br>새로운 어종을 낚으면 자동 등록됩니다.</div>`;
}
async function renderRank(){
  el('rankList').innerHTML='<div class="empty-state">랭킹 불러오는 중…</div>';
  try{const r=await api('/api/leaderboard');el('rankList').innerHTML=r.rows.length?r.rows.map((x,i)=>`<div class="rank-item"><div class="rank-no">${i+1}</div><div class="rank-main"><b>${esc(x.nickname)} · LV.${x.level}</b><span>총 ${fmt(x.total_catches)}마리 · 전설급 ${fmt(x.legendary_catches)}</span></div><div class="rank-big">최대어<br><b>${Number(x.biggest_weight).toFixed(2)}kg</b></div></div>`).join(''):'<div class="empty-state">아직 랭킹 데이터가 없습니다.</div>'}catch(e){el('rankList').innerHTML=`<div class="empty-state">${esc(e.message)}</div>`}
}
el('refreshRankBtn').onclick=renderRank;
$$('.mg-tab').forEach(b=>b.onclick=()=>{$$('.mg-tab').forEach(x=>x.classList.remove('active'));$$('.tab-pane').forEach(x=>x.classList.remove('active'));b.classList.add('active');el(`tab-${b.dataset.tab}`).classList.add('active');if(isMobileUI()){currentMobileView=b.dataset.tab;document.body.dataset.mobileView=b.dataset.tab;$$('.mobile-nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.mobileView===b.dataset.tab))}if(b.dataset.tab==='rank')renderRank();sfx('click');haptic(15)});

function connectEvents(){
  if(eventSource)eventSource.close();
  eventSource=new EventSource('/api/events');
  eventSource.addEventListener('hello',e=>{const d=JSON.parse(e.data);el('onlineText').textContent=`${d.online}명 접속`;chatHistory=d.chat||[];renderChat();updateMobileStatus()});
  eventSource.addEventListener('presence',e=>{const d=JSON.parse(e.data);onlineUsers=d.users||[];el('onlineText').textContent=`${d.online}명 접속`;renderPlayers();renderWorldLabels();updateMobileStatus()});
  eventSource.addEventListener('chat',e=>{const d=JSON.parse(e.data);chatHistory.push(d);chatHistory=chatHistory.slice(-60);if(d.zone===selectedZone){appendChat(d);if(el('chatBody').classList.contains('closed'))el('chatUnread').classList.add('show')}});
  eventSource.addEventListener('catch',e=>{const d=JSON.parse(e.data);if(d.zone!==selectedZone)return;addFeed(d);if(d.nickname!==state.user.nickname && ['legendary','mythical'].includes(d.rarity))toast(`📣 ${d.nickname}님이 ${d.rarityName} ${d.fishName}을 낚았습니다!`)});
  eventSource.onerror=()=>{el('onlineText').textContent='재연결 중…';if(el('mobileOnlineLabel'))el('mobileOnlineLabel').textContent='● 재연결 중'};
}
const spotPos=[{x:8,y:69},{x:23,y:73},{x:38,y:68},{x:56,y:72},{x:73,y:68},{x:88,y:73}];
function renderPlayers(){
  const users=onlineUsers.filter(u=>u.zone===selectedZone);
  if(!users.some(u=>u.id===state.user.id))users.push({id:state.user.id,nickname:state.user.nickname,level:state.user.level,zone:selectedZone,spot:mySpot});
  el('playersLayer').innerHTML=users.map(u=>{const p=spotPos[u.id===state.user.id?mySpot:clamp(Number(u.spot||0),0,5)];return `<div class="player ${u.id===state.user.id?'me':''} ${fishingPhase!=='idle'&&u.id===state.user.id?'fishing':''}" style="left:calc(${p.x}% - 41px);top:${p.y}%"><span class="pname">${u.id===state.user.id?'★ ':''}${esc(u.nickname)} · Lv.${u.level}</span><span class="cap"></span><span class="mini-rod"></span><div class="person"></div></div>`}).join('');
}
el('moveSpotBtn').onclick=async()=>{if(fishingPhase!=='idle')return toast('낚시 중에는 자리를 옮길 수 없습니다.');mySpot=(mySpot+1)%6;renderPlayers();try{await postPresence(selectedZone,mySpot);sfx('click')}catch(e){toast(e.message)}};
function renderChat(){el('chatMessages').innerHTML='';chatHistory.filter(m=>m.zone===selectedZone).slice(-30).forEach(appendChat)}
function appendChat(m){
  const d=document.createElement('div');d.className=`chat-row ${m.nickname===state.user.nickname?'me':''}`;
  const b=document.createElement('b');b.textContent=`${m.nickname} Lv.${m.level}`;d.appendChild(b);d.appendChild(document.createTextNode(m.message));el('chatMessages').appendChild(d);el('chatMessages').scrollTop=el('chatMessages').scrollHeight;
}
el('chatToggle').onclick=()=>{el('chatBody').classList.toggle('closed');el('chatUnread').classList.remove('show')};
el('chatForm').onsubmit=async e=>{e.preventDefault();const input=el('chatInput'),message=input.value.trim();if(!message)return;input.value='';try{await api('/api/chat',{method:'POST',body:JSON.stringify({message})})}catch(err){toast(err.message)}};
function addFeed(d){
  feedRows.unshift(d);feedRows=feedRows.slice(0,8);
  el('eventFeed').innerHTML=feedRows.map(x=>`<div class="feed-row"><b>${esc(x.nickname)}</b>님이 <span class="rarity ${x.rarity}">${x.rarityName} ${esc(x.fishName)}</span> ${Number(x.weightKg).toFixed(2)}kg을 낚았다${x.trophy?' 🏆':''}</div>`).join('');
}

// Fishing loop
el('castBtn').onclick=startCast;
el('hookBtn').onclick=hookFish;
async function startCast(){
  if(fishingPhase!=='idle')return;
  if((state.bait[selectedBait]||0)<=0){toast('선택한 미끼가 없습니다. 상점에서 구매하세요.');return}
  fishingPhase='casting';renderPlayers();el('castBtn').disabled=true;el('castStatus').textContent='낚싯줄을 던지는 중…';sfx('cast');
  await new Promise(r=>setTimeout(r,620));
  try{
    const r=await api('/api/fish/start',{method:'POST',body:JSON.stringify({zone:selectedZone,bait:selectedBait})});
    encounter=r;state.bait[selectedBait]=r.baitLeft;renderBaits();fishingPhase='waiting';el('castStatus').textContent='찌를 바라보며 입질을 기다리는 중…';
    setTimeout(()=>{if(fishingPhase==='waiting')showBite()},r.biteDelay);
  }catch(e){fishingPhase='idle';el('castBtn').disabled=false;el('castStatus').textContent='물가가 잔잔하다…';renderPlayers();toast(e.message);sfx('error')}
}
function showBite(){
  fishingPhase='bite';if(isMobileUI())setMobileView('fish');haptic([90,45,140,45,180]);sfx('bite');el('biteBadge').classList.remove('show');void el('biteBadge').offsetWidth;el('biteBadge').classList.add('show');el('hookBtn').classList.add('show');el('castStatus').textContent=`입질이다! ${encounter.hint}`;
  hookTimer=setTimeout(()=>{if(fishingPhase==='bite'){el('hookBtn').classList.remove('show');el('biteBadge').classList.remove('show');fishingPhase='idle';el('castBtn').disabled=false;el('castStatus').textContent='챔질 타이밍을 놓쳤다…';renderPlayers();haptic([40,40,40]);sfx('error');setTimeout(()=>{if(fishingPhase==='idle')el('castStatus').textContent='물가가 다시 잔잔해졌다…'},1500)}},1650);
}
function hookFish(){
  if(fishingPhase!=='bite')return;haptic(80);clearTimeout(hookTimer);el('hookBtn').classList.remove('show');el('biteBadge').classList.remove('show');fishingPhase='fighting';sfx('cast');startFight();
}
function startFight(){
  const diff=encounter.difficulty;
  fight={tension:.38,landing:0,holding:false,started:performance.now(),last:performance.now(),safeTime:0,totalTime:0,dangerTime:0,warnings:0,surgeSeed:Math.random()*20,ended:false};
  el('fightHint').textContent=encounter.hint;document.body.classList.add('fight-active');el('fightModal').classList.remove('hidden');el('fightMessage').textContent='물고기의 움직임을 읽어!';
  fightRAF=requestAnimationFrame(fightLoop);
}
function fightLoop(t){
  if(!fight||fight.ended)return;
  const dt=Math.min(.04,(t-fight.last)/1000);fight.last=t;fight.totalTime+=dt;
  const elapsed=(t-fight.started)/1000,diff=encounter.difficulty;
  const surgeBase=Math.max(0,Math.sin(elapsed*(2.1+diff*1.6)+fight.surgeSeed));
  const surge=(surgeBase>.78?(surgeBase-.78)*.36*diff:0);
  if(fight.holding)fight.tension+=(0.29+diff*.095)*dt;else fight.tension-=(0.25-diff*.035)*dt;
  fight.tension+=surge*dt;fight.tension+=Math.sin(elapsed*5.4+fight.surgeSeed)*.018*diff*dt;
  fight.tension=clamp(fight.tension,.04,1);
  const safe=fight.tension>=.28&&fight.tension<=.80;
  if(safe)fight.safeTime+=dt;
  if(fight.holding&&safe)fight.landing+=(100/encounter.fightSeconds)*dt*(.86+fight.tension*.26);
  else if(fight.holding&&fight.tension<.28)fight.landing+=(100/encounter.fightSeconds)*dt*.23;
  else if(!fight.holding&&fight.tension<.13)fight.landing-=3.8*dt*(.8+diff);
  fight.landing=clamp(fight.landing,0,100);
  if(fight.tension>.90){fight.dangerTime+=dt;if(fight.warnings<3&&fight.dangerTime>.18*(fight.warnings+1)){haptic(28);fight.warnings++}el('fightMessage').textContent='⚠ 줄이 끊어질 것 같다! 릴을 놓아!'}else{fight.dangerTime=Math.max(0,fight.dangerTime-dt*.7);if(surgeBase>.86)el('fightMessage').textContent='물고기가 강하게 치고 나간다!';else if(fight.holding&&safe)el('fightMessage').textContent='좋아! 장력이 안정적이다.';else if(fight.tension<.23)el('fightMessage').textContent='줄이 느슨해진다. 릴을 감아!'}
  if(fight.dangerTime>.72||fight.tension>=.995){failFight('💥 낚싯줄이 끊어졌다!');return}
  const limit=encounter.fightSeconds+11;
  if(elapsed>limit){failFight('물고기가 힘을 빼고 도망쳤다…');return}
  el('tensionPct').textContent=`${Math.round(fight.tension*100)}%`;el('tensionFill').style.width=`${fight.tension*100}%`;el('landingPct').textContent=`${Math.floor(fight.landing)}%`;el('landingFill').style.width=`${fight.landing}%`;el('fightTimer').textContent=`${Math.max(0,limit-elapsed).toFixed(1)}s`;
  const bend=60+fight.tension*90;el('fightLine').setAttribute('d',`M60 20 Q ${250+bend} ${55+bend*.45} 500 ${155+bend*.22}`);
  if(fight.holding&&Math.random()<.12)sfx('reel');
  if(fight.landing>=100){landFish();return}
  fightRAF=requestAnimationFrame(fightLoop);
}
function setReel(on){if(!fight||fight.ended)return;fight.holding=on;el('reelBtn').classList.toggle('pressed',on)}
el('reelBtn').addEventListener('pointerdown',e=>{e.preventDefault();setReel(true)});['pointerup','pointercancel','pointerleave'].forEach(ev=>el('reelBtn').addEventListener(ev,()=>setReel(false)));
window.addEventListener('keydown',e=>{if(e.code==='Space'&&fishingPhase==='fighting'){e.preventDefault();setReel(true)}});window.addEventListener('keyup',e=>{if(e.code==='Space'&&fishingPhase==='fighting'){e.preventDefault();setReel(false)}});
async function landFish(){
  if(!fight||fight.ended)return;fight.ended=true;cancelAnimationFrame(fightRAF);setReel(false);el('fightMessage').textContent='랜딩 성공! 물고기를 끌어올리는 중…';
  const ratio=fight.safeTime/Math.max(.1,fight.totalTime);const skill=clamp(.75+ratio*.24-fight.dangerTime*.04,0,.995);const durationMs=Math.round(performance.now()-fight.started);
  await new Promise(r=>setTimeout(r,650));
  try{document.body.classList.remove('fight-active');const r=await api('/api/fish/resolve',{method:'POST',body:JSON.stringify({encounterId:encounter.encounterId,skill,durationMs})});el('fightModal').classList.add('hidden');if(r.success){showCatch(r)}else{finishFishing();toast(r.message);sfx('error')}}catch(e){el('fightModal').classList.add('hidden');finishFishing();toast(e.message);sfx('error')}
}
function failFight(msg){
  if(!fight||fight.ended)return;fight.ended=true;cancelAnimationFrame(fightRAF);setReel(false);el('fightMessage').textContent=msg;sfx('error');setTimeout(()=>{document.body.classList.remove('fight-active');el('fightModal').classList.add('hidden');finishFishing();toast(msg)},900)
}
function finishFishing(){fishingPhase='idle';encounter=null;fight=null;el('castBtn').disabled=false;el('castStatus').textContent='다음 입질을 기다릴 준비가 됐다.';renderPlayers()}
function showCatch(r){
  const f=r.fish;el('catchRarity').textContent=f.rarityName;el('catchRarity').className=`catch-rarity rarity ${f.rarity}`;el('catchFishName').textContent=f.fishName;el('catchLength').textContent=`${Number(f.lengthCm).toFixed(1)} cm`;el('catchWeight').textContent=`${Number(f.weightKg).toFixed(2)} kg`;el('catchValue').textContent=`${fmt(f.value)} G`;el('catchTrophy').classList.toggle('hidden',!f.trophy);el('levelUpBox').classList.toggle('hidden',!r.levelUps?.length);if(r.levelUps?.length)el('newLevel').textContent=r.progress.level;
  const colors={common:'#9baeb5',uncommon:'#65dc95',rare:'#5bb7ff',epic:'#ba79ff',legendary:'#ffd45f',mythical:'#ff5f7d'};el('rarityGlow').style.background=colors[f.rarity]+'55';
  el('catchModal').classList.remove('hidden');haptic([60,45,90]);sfx('catch');if(r.levelUps?.length)setTimeout(()=>sfx('level'),280);
  state.user=r.user;state.catches.unshift(r.catch);state.stats.total_catches++;const dex=state.dex.find(d=>d.fish_key===f.fishKey);if(dex){dex.count++;dex.max_weight=Math.max(dex.max_weight,f.weightKg);dex.max_length=Math.max(dex.max_length,f.lengthCm)}else state.dex.unshift({fish_key:f.fishKey,fish_name:f.fishName,rarity:f.rarity,count:1,max_weight:f.weightKg,max_length:f.lengthCm});renderHUD();renderCharacter();renderBag();renderDex();renderZones();
}
function closeCatch(){el('catchModal').classList.add('hidden');finishFishing()}
el('closeCatch').onclick=closeCatch;el('catchConfirm').onclick=closeCatch;

// World rendering
const canvas=el('worldCanvas'),ctx=canvas.getContext('2d');
function resizeWorld(){const r=el('world').getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);canvas._w=r.width;canvas._h=r.height}
window.addEventListener('resize',resizeWorld);
function worldLoop(t=0){worldAnim=requestAnimationFrame(worldLoop);const dt=Math.min(.04,(t-worldTime)/1000||0);worldTime=t;drawWorld(t/1000,dt)}
function grad(y1,y2,c1,c2){const g=ctx.createLinearGradient(0,y1,0,y2);g.addColorStop(0,c1);g.addColorStop(1,c2);return g}
function drawWorld(time){
  const w=canvas._w||canvas.clientWidth,h=canvas._h||canvas.clientHeight;if(!w||!h)return;ctx.clearRect(0,0,w,h);const z=selectedZone;
  let sky=['#5aa9c9','#d8e8cc'],water=['#297e91','#0f5368'],night=false;
  if(z==='river'){sky=['#79b0bd','#d1ded0'];water=['#4b8b91','#235e68']}
  if(z==='harbor'){sky=['#101d3b','#43537b'];water=['#183d5b','#071e35'];night=true}
  if(z==='deepsea'){sky=['#071427','#16304b'];water=['#092a43','#020e20'];night=true}
  ctx.fillStyle=grad(0,h*.52,sky[0],sky[1]);ctx.fillRect(0,0,w,h*.52);
  if(night){ctx.fillStyle='#f6e8b8';ctx.beginPath();ctx.arc(w*.78,h*.15,24,0,Math.PI*2);ctx.fill();ctx.fillStyle=sky[0];ctx.beginPath();ctx.arc(w*.79,h*.14,24,0,Math.PI*2);ctx.fill();for(let i=0;i<35;i++){const x=(i*83%997)/997*w,y=(i*47%211)/211*h*.36;ctx.globalAlpha=.35+(i%4)*.12;ctx.fillStyle='#fff';ctx.fillRect(x,y,1.5,1.5)}ctx.globalAlpha=1}else{ctx.fillStyle='#ffe98a';ctx.beginPath();ctx.arc(w*.78,h*.16,26,0,Math.PI*2);ctx.fill()}
  // distant landscape
  ctx.fillStyle=z==='harbor'||z==='deepsea'?'#112a38':'#4d795d';ctx.beginPath();ctx.moveTo(0,h*.50);for(let x=0;x<=w;x+=w/7){const y=h*(.35+.10*Math.abs(Math.sin(x*.011+1.2)));ctx.lineTo(x,y)}ctx.lineTo(w,h*.55);ctx.lineTo(0,h*.55);ctx.fill();
  if(z==='harbor'){ctx.fillStyle='#182b35';for(let x=20;x<w;x+=70){const bh=30+(x%110);ctx.fillRect(x,h*.45-bh*.25,45,bh*.25);ctx.fillStyle='#ffd87366';for(let yy=h*.45-bh*.2;yy<h*.45;yy+=12)ctx.fillRect(x+8,yy,3,3);ctx.fillStyle='#182b35'}}
  if(z==='deepsea'){ctx.strokeStyle='#314b5b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(w*.12,h*.1);ctx.lineTo(w*.2,h*.25);ctx.lineTo(w*.28,h*.1);ctx.stroke();ctx.fillStyle='#263e4d';ctx.fillRect(w*.18,h*.22,90,22)}
  const wy=h*.48;ctx.fillStyle=grad(wy,h,water[0],water[1]);ctx.fillRect(0,wy,w,h-wy);
  // water bands
  for(let i=0;i<16;i++){const y=wy+14+i*18;ctx.strokeStyle=`rgba(190,245,244,${.035+(i%3)*.012})`;ctx.lineWidth=1.3;ctx.beginPath();for(let x=-30;x<w+30;x+=30){const yy=y+Math.sin(time*1.6+i+x*.035)*2.4;ctx.lineTo(x,yy)}ctx.stroke()}
  // dock
  const p=spotPos[mySpot];const px=w*p.x/100,py=h*p.y/100;ctx.fillStyle='#6b4d30';ctx.fillRect(Math.max(0,px-58),py+34,118,14);ctx.fillStyle='#8d6841';for(let x=px-56;x<px+58;x+=18)ctx.fillRect(x,py+34,14,14);
  // own fishing line / bobber
  if(['casting','waiting','bite'].includes(fishingPhase)){
    const bx=clamp(px+(p.x<50?130:-130),70,w-70),by=wy+(h-wy)*.35+Math.sin(time*3)*2;
    ctx.strokeStyle='#f2efe2cc';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+35,py+5);ctx.quadraticCurveTo((px+bx)/2,wy-10,bx,by);ctx.stroke();
    ctx.fillStyle=fishingPhase==='bite'?'#ffe45f':'#f05d5d';ctx.beginPath();ctx.arc(bx,by,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(bx-1,by-8,2,5);
    if(fishingPhase==='bite'){ctx.strokeStyle='#fff6';for(let r=10;r<36;r+=10){ctx.beginPath();ctx.ellipse(bx,by+4,r,r*.3,0,0,Math.PI*2);ctx.stroke()}}
  }
}

// misc
const tips=['장력이 너무 높으면 줄이 끊어진다.','희귀 미끼일수록 대물 입질 확률이 올라간다.','레벨 5부터 은빛 강 상류가 열린다.','잡은 물고기를 팔아 더 좋은 낚싯대를 맞춰라.','전설급 어획은 같은 낚시터 모두에게 알려진다.','릴을 무조건 누르지 말고 물고기의 치고 나감을 읽어라.'];
setInterval(()=>{if(state)el('tipText').textContent=tips[Math.floor(Math.random()*tips.length)]},7000);

setupPWA();
window.addEventListener('resize',()=>{if(isMobileUI())setMobileView(currentMobileView);else document.body.dataset.mobileView='fish'});
boot();
