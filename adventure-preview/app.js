const game=document.querySelector('#game');
const viewport=document.querySelector('#viewport');
const world=document.querySelector('#world');
const hero=document.querySelector('#hero');
const heroImg=document.querySelector('#heroImg');
const enemiesLayer=document.querySelector('#enemies');
const marker=document.querySelector('#targetMarker');
const levelText=document.querySelector('#levelText');
const expText=document.querySelector('#expText');
const expBar=document.querySelector('#expBar');
const killText=document.querySelector('#killText');
const mission=document.querySelector('#mission');
const attackBtn=document.querySelector('#attackBtn');
const attackHint=document.querySelector('#attackHint');
const enemyInfo=document.querySelector('#enemyInfo');
const enemyName=document.querySelector('#enemyName');
const enemyDistance=document.querySelector('#enemyDistance');
const enemyHpBar=document.querySelector('#enemyHpBar');
const toast=document.querySelector('#toast');
const avatar=document.querySelector('#avatar');

const WORLD_W=1440,WORLD_H=960;
const BG_W=960,BG_H=640;
const PLAYER_SPEED=205;
const ATTACK_RANGE=122;

let bgImage=null,heroAsset='',squirrelAsset='';
let state={level:1,exp:0,kills:0,gold:0,x:690,y:355};
try{state={...state,...JSON.parse(localStorage.getItem('junja-adventure-move-v1')||'{}')}}catch{}
state.x=Number.isFinite(state.x)?state.x:690; state.y=Number.isFinite(state.y)?state.y:355;
let target={x:state.x,y:state.y};
let cam={x:0,y:0};
let last=performance.now();
let selected=null;
let attacking=false;
const enemies=[];

const needExp=()=>60+(state.level-1)*40;
const enemyMaxHp=()=>30+(state.level-1)*7;
const save=()=>localStorage.setItem('junja-adventure-move-v1',JSON.stringify(state));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

function projectWalkable(x,y){
  y=clamp(y,245,885);
  if(y<585) x=clamp(x,555,1010);
  else x=clamp(x,520,1235);
  return {x,y};
}
function showToast(t){
  toast.textContent=t;toast.classList.add('show');
  clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1100);
}
function updateHud(){
  levelText.textContent='Lv.'+state.level;
  expText.textContent='EXP '+state.exp+' / '+needExp();
  expBar.style.width=Math.min(100,state.exp/needExp()*100)+'%';
  killText.textContent='다람쥐 '+state.kills;
  const forest=state.y>=585;
  mission.innerHTML=forest
    ? '<b>다람쥐 숲</b><span>다람쥐를 터치해 접근한 뒤 공격하세요. 처치하면 경험치를 얻습니다.</span>'
    : '<b>화면을 터치해서 이동</b><span>아래쪽 다람쥐 숲으로 직접 걸어가 보세요.</span>';
}
function setHeroPos(){
  hero.style.left=state.x+'px';hero.style.top=state.y+'px';
}
function updateCamera(force=false){
  const vw=viewport.clientWidth,vh=viewport.clientHeight;
  const tx=clamp(state.x-vw*.50,0,Math.max(0,WORLD_W-vw));
  const ty=clamp(state.y-vh*.52,0,Math.max(0,WORLD_H-vh));
  if(force){cam.x=tx;cam.y=ty}else{cam.x+=(tx-cam.x)*.12;cam.y+=(ty-cam.y)*.12}
  world.style.transform='translate3d('+(-cam.x)+'px,'+(-cam.y)+'px,0)';
}
function screenToWorld(clientX,clientY){
  const r=viewport.getBoundingClientRect();
  return projectWalkable(clientX-r.left+cam.x,clientY-r.top+cam.y);
}
function moveTarget(x,y,show=true){
  target=projectWalkable(x,y);
  if(show){
    marker.style.left=target.x+'px';marker.style.top=target.y+'px';
    marker.classList.remove('show');void marker.offsetWidth;marker.classList.add('show');
  }
}
function backgroundKeySprite(img,sx,sy,sw,sh,mode){
  const c=document.createElement('canvas');c.width=sw;c.height=sh;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
  const data=ctx.getImageData(0,0,sw,sh),p=data.data;
  const sample=[];
  const push=(x,y)=>{const i=(y*sw+x)*4;sample.push([p[i],p[i+1],p[i+2]])};
  for(let x=0;x<sw;x+=4){push(x,0);push(x,sh-1)}
  for(let y=0;y<sh;y+=4){push(0,y);push(sw-1,y)}
  const avg=sample.reduce((a,v)=>[a[0]+v[0],a[1]+v[1],a[2]+v[2]],[0,0,0]).map(v=>v/sample.length);
  for(let i=0;i<p.length;i+=4){
    const r=p[i],g=p[i+1],b=p[i+2];
    const d=Math.hypot(r-avg[0],g-avg[1],b-avg[2]);
    let bg=d<(mode==='grass'?68:58);
    if(mode==='grass' && g>r*.92 && g>b*1.13) bg=true;
    if(mode==='stone' && r>105 && g>82 && b<125 && Math.abs(r-g)<75) bg=true;
    if(bg) p[i+3]=0;
    else if(d<(mode==='grass'?90:78)) p[i+3]=Math.min(255,Math.max(60,(d-45)*7));
  }
  ctx.putImageData(data,0,0);
  return c.toDataURL('image/png');
}
function makeEnemy(i,x,y){
  const e={id:i,x,y,hp:enemyMaxHp(),maxHp:enemyMaxHp(),alive:true,tx:x,ty:y,nextRoam:performance.now()+600+Math.random()*900};
  const el=document.createElement('div');el.className='enemy roaming';
  el.innerHTML='<div class="ename">다람쥐 Lv.'+state.level+'</div><div class="ehp"><i></i></div><img draggable="false" alt="다람쥐">';
  el.querySelector('img').src=squirrelAsset;e.el=el;e.hpEl=el.querySelector('.ehp i');e.nameEl=el.querySelector('.ename');
  el.addEventListener('pointerdown',ev=>{
    ev.preventDefault();ev.stopPropagation();selectEnemy(e);
    const ang=Math.atan2(e.y-state.y,e.x-state.x);
    moveTarget(e.x-Math.cos(ang)*92,e.y-Math.sin(ang)*92,false);
  });
  enemiesLayer.appendChild(el);enemies.push(e);placeEnemy(e);return e;
}
function placeEnemy(e){
  e.el.style.left=e.x+'px';e.el.style.top=e.y+'px';
  e.el.classList.toggle('flip',e.tx<e.x);
}
function randomEnemyPoint(){
  return {x:690+Math.random()*485,y:650+Math.random()*205};
}
function selectEnemy(e){
  if(selected&&selected.el)selected.el.classList.remove('selected');
  selected=e&&e.alive?e:null;
  if(selected)selected.el.classList.add('selected');
  refreshEnemyUi();
}
function nearestEnemy(){
  let best=null,bestD=Infinity;
  for(const e of enemies)if(e.alive){const d=Math.hypot(e.x-state.x,e.y-state.y);if(d<bestD){best=e;bestD=d}}
  return {e:best,d:bestD};
}
function refreshEnemyUi(){
  if(!selected||!selected.alive){enemyInfo.classList.add('hidden');attackBtn.disabled=true;attackHint.textContent='가까이 이동';return}
  const d=Math.round(Math.hypot(selected.x-state.x,selected.y-state.y));
  enemyInfo.classList.remove('hidden');
  enemyName.textContent='다람쥐 Lv.'+state.level;
  enemyDistance.textContent=d+'m';
  enemyHpBar.style.width=(selected.hp/selected.maxHp*100)+'%';
  attackBtn.disabled=d>ATTACK_RANGE||attacking;
  attackHint.textContent=d<=ATTACK_RANGE?'사냥 가능':'가까이 이동';
}
function respawn(e){
  const p=randomEnemyPoint();e.x=p.x;e.y=p.y;e.tx=e.x;e.ty=e.y;e.hp=enemyMaxHp();e.maxHp=e.hp;e.alive=true;
  e.nameEl.textContent='다람쥐 Lv.'+state.level;e.hpEl.style.width='100%';e.el.classList.remove('dead','hit');placeEnemy(e);
}
function attack(){
  if(!selected||!selected.alive||attacking)return;
  const d=Math.hypot(selected.x-state.x,selected.y-state.y);if(d>ATTACK_RANGE)return;
  attacking=true;hero.classList.add('attacking');attackBtn.disabled=true;
  const dmg=9+state.level*2+Math.floor(Math.random()*7);
  selected.hp-=dmg;selected.hpEl.style.width=Math.max(0,selected.hp/selected.maxHp*100)+'%';
  selected.el.classList.remove('hit');void selected.el.offsetWidth;selected.el.classList.add('hit');
  setTimeout(()=>selected?.el?.classList.remove('hit'),220);
  if(selected.hp<=0){
    const dead=selected;dead.alive=false;dead.el.classList.add('dead');
    state.kills++;state.exp+=18+state.level*2;state.gold+=20+state.level*5;
    while(state.exp>=needExp()){state.exp-=needExp();state.level++;showToast('LEVEL UP!  Lv.'+state.level)}
    save();updateHud();showToast('다람쥐 처치  EXP +'+(18+state.level*2));
    selectEnemy(null);setTimeout(()=>respawn(dead),1200);
  }else refreshEnemyUi();
  setTimeout(()=>{attacking=false;hero.classList.remove('attacking');refreshEnemyUi()},260);
}
function stepEnemies(now,dt){
  if(state.y<555)return;
  for(const e of enemies){
    if(!e.alive)continue;
    if(now>e.nextRoam){
      const p=randomEnemyPoint();e.tx=p.x;e.ty=p.y;e.nextRoam=now+1400+Math.random()*1800;
    }
    const dx=e.tx-e.x,dy=e.ty-e.y,len=Math.hypot(dx,dy);
    if(len>3){const s=34*dt;e.x+=dx/len*Math.min(s,len);e.y+=dy/len*Math.min(s,len);placeEnemy(e)}
  }
}
function loop(now){
  const dt=Math.min(.035,(now-last)/1000);last=now;
  if(!attacking){
    const dx=target.x-state.x,dy=target.y-state.y,len=Math.hypot(dx,dy);
    if(len>3){
      const step=Math.min(len,PLAYER_SPEED*dt);
      state.x+=dx/len*step;state.y+=dy/len*step;
      hero.classList.add('moving');hero.classList.toggle('flip',dx<0);
      setHeroPos();
    }else hero.classList.remove('moving');
  }
  stepEnemies(now,dt);updateCamera();refreshEnemyUi();
  requestAnimationFrame(loop);
}
viewport.addEventListener('pointerdown',e=>{
  if(e.target.closest('.enemy'))return;
  const p=screenToWorld(e.clientX,e.clientY);moveTarget(p.x,p.y,true);
  if(selected&&Math.hypot(selected.x-p.x,selected.y-p.y)>150)selectEnemy(null);
});
attackBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();attack()});
document.querySelector('#resetBtn').addEventListener('click',()=>{
  state={level:1,exp:0,kills:0,gold:0,x:690,y:355};target={x:state.x,y:state.y};save();updateHud();setHeroPos();selectEnemy(null);showToast('성장 기록 초기화');
});
window.addEventListener('resize',()=>updateCamera(true));

async function loadArt(){
  try{
    const names=['bg0.txt','bg1.txt','bg2.txt','bg3.txt','bg4.txt','bg5.txt'];
    const parts=await Promise.all(names.map(n=>fetch('./'+n).then(r=>{if(!r.ok)throw new Error(n);return r.text()})));
    const art='data:image/jpeg;base64,'+parts.join('');
    bgImage=new Image();
    await new Promise((res,rej)=>{bgImage.onload=res;bgImage.onerror=rej;bgImage.src=art});
    world.style.backgroundImage='url("'+art+'")';
    heroAsset=backgroundKeySprite(bgImage,435,205,80,84,'stone');
    squirrelAsset=backgroundKeySprite(bgImage,713,414,75,66,'grass');
    heroImg.src=heroAsset;avatar.style.backgroundImage='url("'+heroAsset+'")';
    setHeroPos();updateHud();updateCamera(true);
    const starts=[[755,690],[910,670],[1090,705],[815,820],[1035,835]];
    starts.forEach((p,i)=>makeEnemy(i,p[0],p[1]));
    game.classList.add('ready');
    requestAnimationFrame(loop);
    setTimeout(()=>showToast('빈 곳을 터치하면 준자가 이동합니다'),450);
  }catch(err){
    document.querySelector('#loading').innerHTML='<b>월드 로드 실패</b><span>새로고침해 주세요.</span>';
  }
}
loadArt();