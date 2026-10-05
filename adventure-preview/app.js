const game=document.querySelector('#game');
const world=document.querySelector('#world');
const avatar=document.querySelector('#avatar');
const levelText=document.querySelector('#levelText');
const expText=document.querySelector('#expText');
const expBar=document.querySelector('#expBar');
const enemyHpBar=document.querySelector('#enemyHpBar');
const enemyLevel=document.querySelector('#enemyLevel');
const enemyState=document.querySelector('#enemyState');
const killText=document.querySelector('#killText');
const lootText=document.querySelector('#lootText');
const villagePanel=document.querySelector('#villagePanel');
const forestPanel=document.querySelector('#forestPanel');
const attackBtn=document.querySelector('#attackBtn');
const goVillage=document.querySelector('#goVillage');
const forestTab=document.querySelector('#forestTab');
const damage=document.querySelector('#damage');
const toast=document.querySelector('#toast');

let scene='village';
let state={level:1,exp:0,kills:0,gold:0,enemyHp:30};
try{state={...state,...JSON.parse(localStorage.getItem('junja-adventure-image-v01')||'{}')}}catch{}
const save=()=>localStorage.setItem('junja-adventure-image-v01',JSON.stringify(state));
const need=()=>60+(state.level-1)*35;
const maxEnemy=()=>30+(state.level-1)*6;
if(!Number.isFinite(state.enemyHp)||state.enemyHp<=0) state.enemyHp=maxEnemy();

function ui(){
  levelText.textContent='Lv.'+state.level;
  expText.textContent='EXP '+state.exp+' / '+need();
  expBar.style.width=Math.min(100,state.exp/need()*100)+'%';
  enemyLevel.textContent=Math.max(1,state.level);
  enemyHpBar.style.width=Math.max(0,state.enemyHp/maxEnemy()*100)+'%';
  killText.textContent='처치 '+state.kills+'마리';
}
function showToast(t){
  toast.textContent=t;toast.classList.add('show');
  clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1100);
}
function setScene(next){
  scene=next;
  const forest=next==='forest';
  world.classList.toggle('forest',forest);
  world.classList.toggle('village',!forest);
  villagePanel.classList.toggle('hidden',forest);
  forestPanel.classList.toggle('hidden',!forest);
  attackBtn.disabled=!forest;
  goVillage.classList.toggle('active',!forest);
  forestTab.classList.toggle('active',forest);
}
function hit(){
  if(scene!=='forest')return;
  const power=8+state.level*2+Math.floor(Math.random()*6);
  state.enemyHp-=power;
  damage.textContent='-'+power;
  damage.classList.remove('pop');void damage.offsetWidth;damage.classList.add('pop');
  if(state.enemyHp<=0){
    state.kills+=1;
    state.exp+=12+state.level*2;
    state.gold+=25+state.level*5;
    const loot=Math.random()<.32;
    lootText.textContent=loot?'낡은 꼬리털 1개 획득 · 경험치 상승':'경험치 +'+(12+state.level*2)+' · '+(25+state.level*5)+' Gold';
    while(state.exp>=need()){
      state.exp-=need();state.level+=1;
      showToast('LEVEL UP! Lv.'+state.level);
    }
    state.enemyHp=maxEnemy();
    enemyState.textContent=state.kills>=10?'다람쥐 숲 수련 완료':'새 다람쥐 등장';
    if(state.kills===10) showToast('퀘스트 완료! 다람쥐 10마리');
  }else enemyState.textContent='HP '+Math.max(0,state.enemyHp)+' / '+maxEnemy();
  save();ui();
}
async function loadArt(){
  try{
    const names=['bg0.txt','bg1.txt','bg2.txt','bg3.txt','bg4.txt','bg5.txt'];
    const parts=await Promise.all(names.map(n=>fetch('./'+n).then(r=>{if(!r.ok)throw new Error(n);return r.text()})));
    const art='data:image/jpeg;base64,'+parts.join('');
    world.style.backgroundImage='url("'+art+'")';
    avatar.style.backgroundImage='url("'+art+'")';
    await new Promise((res,rej)=>{const im=new Image();im.onload=res;im.onerror=rej;im.src=art});
    game.classList.add('ready');
  }catch(e){
    document.querySelector('#loading').innerHTML='<b>이미지 로드 실패</b><span>새로고침해 주세요.</span>';
  }
}
document.querySelector('#goForest').addEventListener('click',()=>setScene('forest'));
forestTab.addEventListener('click',()=>setScene('forest'));
goVillage.addEventListener('click',()=>setScene('village'));
attackBtn.addEventListener('click',hit);
document.querySelector('#resetBtn').addEventListener('click',()=>{state={level:1,exp:0,kills:0,gold:0,enemyHp:30};save();ui();showToast('성장 기록 초기화')});
ui();setScene('village');loadArt();