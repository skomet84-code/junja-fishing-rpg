import {W,H,clamp,distance,walkable,pathfind} from './core.js?v=20261007-rankrig3';
import {JOBS,ITEMS,SLOTS,profile,stats,jobName,BUILD,needXp,MAX_ENHANCE,enhanceChance,enhancementLevel,skillCastDelay,skillMpCost} from './catalog.js?v=20261007-rankrig3';
import {mergeSnapshot} from './network.js';
import {MATERIALS,RECIPES,ZONES,TRAVEL_PORTALS,DAILY_TASKS,PROMOTIONS,CHANNEL_CAP,LEVEL_CAP,QUICK_CHATS} from './mmo-data.js?v=20261007-rankrig3';
import {API_URL} from './config.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const apiBase=location.hostname==='junja-adventure-preview.onrender.com'?API_URL:'';
let wireSnapshot=null;
let token='',connectionKey='',legacy=null,roster=[],selectedSlot=0,state=profile(),view={x:768,y:355},connected=false,paused=false,serverNow=0,receivedAt=0,last=0,clock=0,lastSend=0,moveSending=false,pendingMove=null,streamController=null,streamGeneration=0,lastSelfSampleAt=0,lastSelfX=768,lastSelfY=355,serverVelocity={x:0,y:0};
let path=[],selected=null,targetIntent=null,auto=false,cam={x:0,y:0},scale=1,face=0,flip=false,headingX=0,headingY=1,attackUntil=0,localActionLockUntil=0,attackSerial=0,lastServerAttackKey='',nearNpc=null,npcIntent=null,gesture=null,stick={x:0,y:0};
let systems={nodes:[],bosses:[],trade:null,duel:null,daily:null},gatherIntent=null,travelIntent=null,mmoPanel='',bossSector=false,minimapAt=0,audioCtx=null,audioBus=null,audioNodes=[],soundOn=false;const resourceEls=new Map(),portalEls=new Map(),bossIntroSeen=new Set();
const keys=new Set(),enemies=new Map(),peers=new Map(),seenEvents=new Set(),npcs=[{id:'elder',x:580,y:330},{id:'merchant',x:1000,y:330}];
const DECOR_SPOTS=[
 [305,720,.85],[1225,750,1.05],[355,930,.75],[1165,955,.9],
 [330,1205,.85],[1195,1245,1.0],[405,1435,.8],[1110,1460,.9],
 [300,1685,.9],[1220,1715,1.0],[390,1880,.78],[1125,1895,.92],
 [540,790,.55],[1010,885,.6],[510,1320,.58],[1025,1395,.62],[535,1770,.6],[1010,1815,.58]
];
const ZONE_DECOR_TYPES={
 surface:['tree','grass','rock','flower'],
 grove:['ancient-tree','root','mushroom','mist'],
 cave:['crystal','stalagmite','crystal-small','cave-pool'],
 ruins:['ruin-pillar','rubble','ruin-arch','ember'],
 abyss:['rift','obelisk','voidstone','abyss-mist'],
 celestial:['sky-pillar','altar','cloudstone','rune']
};
function syncZoneDecor(zone){
 const layer=$('zoneDecor');if(!layer||layer.dataset.zone===zone)return;layer.dataset.zone=zone;layer.replaceChildren();
 const types=ZONE_DECOR_TYPES[zone]||ZONE_DECOR_TYPES.surface;
 DECOR_SPOTS.forEach(([x,y,scale],i)=>{const el=document.createElement('i');el.className='zone-decor '+types[i%types.length];el.style.left=x+'px';el.style.top=y+'px';el.style.setProperty('--decor-scale',scale);el.style.zIndex=String(Math.round(y-80));layer.append(el);});
 const labels=[[768,655,'초입 사냥터','일반 몬스터'],[768,1165,'깊은 사냥터','정예 몬스터'],[768,1665,'보스 구역','지역 보스 · 포탈']];
 labels.forEach(([x,y,title,sub],i)=>{const el=document.createElement('div');el.className='hunt-sector sector-'+(i+1);el.style.left=x+'px';el.style.top=y+'px';el.innerHTML='<b>'+title+'</b><small>'+sub+'</small>';layer.append(el);});
}
function showZoneArrival(zone){
 const z=ZONES[zone];if(!z)return;const old=document.querySelector('.zone-arrival');if(old)old.remove();
 const el=document.createElement('div');el.className='zone-arrival';el.innerHTML='<small>AREA ENTERED</small><b>'+esc(z.name)+'</b><span>권장 Lv.'+z.level+'</span>';$('game').append(el);setTimeout(()=>el.classList.add('show'),20);setTimeout(()=>el.remove(),1900);
}
function startWarp(label='다음 지역'){
 const el=$('warpFx');if(!el)return;el.hidden=false;el.querySelector('b').textContent=label;el.classList.remove('show','exit');void el.offsetWidth;el.classList.add('show');
 clearTimeout(startWarp.timer);startWarp.timer=setTimeout(()=>el.classList.add('exit'),650);setTimeout(()=>{el.hidden=true;el.classList.remove('show','exit');},1100);
}
function showBossIntro(e){
 if(!e?.alive)return;const key=state.zone+':'+e.id;if(bossIntroSeen.has(key))return;bossIntroSeen.add(key);
 const el=$('bossWarning');el.hidden=false;el.className=e.named?'named':'boss';el.innerHTML='<small>'+(e.named?'WORLD BOSS':'AREA BOSS')+'</small><b>'+esc(e.name)+'</b><span>Lv.'+(e.level||'?')+' · 파티 사냥 권장</span>';void el.offsetWidth;el.classList.add('show');
 clearTimeout(showBossIntro.timer);showBossIntro.timer=setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.hidden=true,400);},2400);
}
function spawnLootFx(e){
 if(!e)return;const tier=e.named?'legendary':e.boss?'boss':e.elite?'elite':'common',el=document.createElement('div');el.className='loot-burst '+tier;el.style.left=e.x+'px';el.style.top=(e.y-22)+'px';
 el.innerHTML='<i></i><i></i><i></i><i></i><i></i><b>'+(e.named?'전설 보상':e.boss?'BOSS DROP':e.elite?'ELITE DROP':'')+'</b>';$('effects').append(el);setTimeout(()=>el.remove(),1200);
}
function renderMinimap(){
 const c=$('minimap');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height,sx=w/W,sy=h/H,z=ZONES[state.zone]||{};
 const palettes={surface:['#173a26','#6aa45d'],grove:['#0b2117','#315f37'],cave:['#10182a','#527fa9'],ruins:['#2c1816','#9a5638'],abyss:['#12091c','#6b3a8d'],celestial:['#202943','#d1bd78']},p=palettes[state.zone]||palettes.surface;
 ctx.clearRect(0,0,w,h);ctx.fillStyle=p[0];ctx.fillRect(0,0,w,h);
 ctx.fillStyle=p[1]+'55';ctx.fillRect(0,Math.round(610*sy),w,Math.round(400*sy));ctx.fillRect(0,Math.round(1150*sy),w,Math.round(365*sy));ctx.fillRect(0,Math.round(1630*sy),w,h-Math.round(1630*sy));
 ctx.strokeStyle='#ffffff22';ctx.lineWidth=1;for(const y of [610,1010,1150,1515,1630]){ctx.beginPath();ctx.moveTo(0,y*sy);ctx.lineTo(w,y*sy);ctx.stroke();}
 for(const ptl of TRAVEL_PORTALS[state.zone]||[]){ctx.fillStyle=state.level>=ZONES[ptl.to].level?'#ffe68b':'#6e7773';ctx.beginPath();ctx.arc(ptl.x*sx,ptl.y*sy,4,0,Math.PI*2);ctx.fill();}
 for(const e of enemies.values()){if(!e.alive)continue;ctx.fillStyle=e.named?'#ff80ff':e.boss?'#ffb24f':e.elite?'#ff765f':'#dbe4c8';ctx.fillRect(e.x*sx-1.5,e.y*sy-1.5,e.boss?4:3,e.boss?4:3);}
 for(const p2 of peers.values()){ctx.fillStyle='#73cfff';ctx.fillRect(p2.x*sx-1.5,p2.y*sy-1.5,3,3);}
 ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(view.x*sx,view.y*sy,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#1b1b1b';ctx.stroke();
 $('minimapLabel').textContent=(z.name||state.zone)+' · '+(view.y<1050?'초입':view.y<1600?'깊은 사냥터':'보스 구역');
}
function syncBossSector(){
 const next=view.y>=1580;if(next!==bossSector){bossSector=next;$('game').classList.toggle('boss-sector',next);if(next){const boss=[...enemies.values()].filter(e=>e.alive&&e.boss).sort((a,b)=>distance(view,a)-distance(view,b))[0];if(boss)showBossIntro(boss);}}
}
const REGION_AUDIO={
 surface:[196,246.94,293.66,'sine'],grove:[146.83,196,220,'triangle'],cave:[110,164.81,220,'sine'],
 ruins:[123.47,185,246.94,'triangle'],abyss:[82.41,123.47,164.81,'sine'],celestial:[220,293.66,369.99,'sine']
};
function stopRegionAudio(){for(const n of audioNodes){try{n.stop?.();n.disconnect?.();}catch{}}audioNodes=[];}
function setRegionAudio(zone){
 if(!soundOn||!audioCtx)return;stopRegionAudio();const cfg=REGION_AUDIO[zone]||REGION_AUDIO.surface;
 if(!audioBus){audioBus=audioCtx.createGain();audioBus.gain.value=.028;audioBus.connect(audioCtx.destination);}
 const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=zone==='celestial'?1400:zone==='cave'?620:900;filter.Q.value=.45;filter.connect(audioBus);audioNodes.push(filter);
 cfg.slice(0,3).forEach((freq,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=cfg[3];o.frequency.value=freq;g.gain.value=[.16,.10,.07][i];o.connect(g);g.connect(filter);o.start();audioNodes.push(o,g);});
 const lfo=audioCtx.createOscillator(),lg=audioCtx.createGain();lfo.type='sine';lfo.frequency.value=zone==='abyss'?.07:.11;lg.gain.value=.008;lfo.connect(lg);lg.connect(audioBus.gain);lfo.start();audioNodes.push(lfo,lg);
}
async function toggleSound(){
 if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
 if(audioCtx.state==='suspended')await audioCtx.resume();soundOn=!soundOn;
 $('soundBtn').setAttribute('aria-pressed',String(soundOn));$('soundBtn').querySelector('small').textContent=soundOn?'ON':'OFF';
 try{localStorage.setItem('junja-adventure-sound',soundOn?'1':'0');}catch{}
 if(soundOn)setRegionAudio(state.zone);else stopRegionAudio();
}
try{token=localStorage.getItem('junja-online-token')||'';const old=localStorage.getItem('junja-adventure-play-v2');if(old)legacy=JSON.parse(old);}catch{}
if(legacy)$('legacyRow').hidden=false;
const motionArt=new Set(),characterArt=['hero','rogue','mage','healer'];
function preload(src,required=true,onload=()=>{}){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{onload();resolve();};im.onerror=()=>required?reject(Error('캐릭터 이미지를 불러오지 못했어요. 다시 연결해 주세요.')):resolve();im.src=src;});}
const artReady=Promise.all([
 ...['hero','rogue','mage','healer','world','npcs','squirrel','monster-atlas'].map(name=>preload('./assets/'+name+'.png')),
 ...characterArt.map(name=>preload('./assets/'+name+'-motion.webp?v='+BUILD,false,()=>motionArt.add(name)))
]);artReady.catch(()=>{});
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function now(){return serverNow+(performance.now()-receivedAt)/1000;}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(route,data){let r;try{r=await fetch(apiBase+'/api/'+route,{method:data?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...(connectionKey?{'x-adventure-connection':connectionKey}:{})},body:data?JSON.stringify(data):undefined});}catch(cause){const e=Error('서버 연결이 지연되고 있습니다. 잠시 후 다시 시도하세요.');e.status=0;e.cause=cause;throw e;}let json={};try{json=await r.json();}catch{}if(!r.ok){const e=Error(json.error||'연결을 확인하세요.');e.status=r.status;throw e;}return json;}
let commandChain=Promise.resolve();function command(data){const task=commandChain.then(async()=>{if(!connected)return;try{await api('action',data);}catch(e){toast(e.message);}});commandChain=task.catch(()=>{});return task;}
async function queueMove(data){pendingMove=data;if(moveSending)return;moveSending=true;try{while(pendingMove&&connected){const next=pendingMove;pendingMove=null;try{await api('action',next);}catch(e){if(e.status===401||e.status===409)break;}}}finally{moveSending=false;}}
function placeEntity(el,x,y){el.style.left='0px';el.style.top='0px';el.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-100%)`;}
function stopMovement(){keys.clear();stick={x:0,y:0};path=[];targetIntent=null;gesture=null;pendingMove=null;$('joystick').hidden=true;if(connected)queueMove({type:'move',x:0,y:0,manual:true});}
function go(x,y){
 path=pathfind(view,{x,y});
 command({type:'navigate',x,y});
 $('marker').style.left=x+'px';$('marker').style.top=y+'px';$('marker').classList.remove('show');void $('marker').offsetWidth;$('marker').classList.add('show');
}
function camera(force=false,dt=.016){const vw=$('viewport').clientWidth/scale,vh=$('viewport').clientHeight/scale;const x=clamp(view.x-vw*.5,Math.min(0,(W-vw)/2),Math.max(0,W-vw)),y=clamp(view.y-vh*.53,Math.min(0,(H-vh)/2),Math.max(0,H-vh)),f=force?1:1-Math.exp(-12*dt);cam.x+=(x-cam.x)*f;cam.y+=(y-cam.y)*f;const px=-cam.x*scale,py=-cam.y*scale;$('world').style.transform=`translate3d(${px}px,${py}px,0) scale(${scale})`;}
function resize(){scale=innerWidth<600?.85:Math.min(1,innerWidth/1150);camera(true);}
function screenToWorld(x,y){const r=$('viewport').getBoundingClientRect();return {x:(x-r.left)/scale+cam.x,y:(y-r.top)/scale+cam.y};}
function sprite(el,col,row,rows=3,mirror=false){
 el.style.backgroundPosition=`${col*100/3}% ${row*100/(rows-1)}%`;
 el.style.setProperty('--flip',mirror?-1:1);
}
const smoothstep=t=>t*t*(3-2*t);
function headingPose(dx,dy,fallbackRow=0,fallbackMirror=false){
 const d=Math.hypot(dx,dy);if(d<.001)return {row:fallbackRow,mirror:fallbackMirror,nx:0,ny:fallbackRow===1?-1:1,skew:0,depth:1};
 const nx=dx/d,ny=dy/d,ax=Math.abs(nx),ay=Math.abs(ny);
 let row,mirror=false;if(ay>ax*1.22)row=ny<0?1:0;else{row=2;mirror=nx<0;}
 const diagonal=ax>.28&&ay>.28,skew=diagonal?(nx*(ny<0?-5.5:5.5)):0,depth=diagonal?.985:1;
 return {row,mirror,nx,ny,skew,depth};
}
function applyHeading(el,dx,dy,fallbackRow=0,fallbackMirror=false){
 const p=headingPose(dx,dy,fallbackRow,fallbackMirror);
 el.dataset.face=String(p.row);el.dataset.flip=p.mirror?'1':'0';el.dataset.diagonal=Math.abs(p.nx)>.28&&Math.abs(p.ny)>.28?'1':'0';
 el.style.setProperty('--dir-skew',p.skew+'deg');el.style.setProperty('--dir-depth',String(p.depth));el.style.setProperty('--flip',p.mirror?-1:1);
 return p;
}

function motionSprite(art,frame,state,row,mirror=false){
 const stateIndex=state==='walk'?1:state==='attack'?2:0,r=stateIndex*3+row,twin=art.parentElement?.querySelector('.sprite-b');
 art.style.backgroundSize='1200% 900%';art.style.backgroundPosition=`${frame*100/11}% ${r*100/8}%`;art.style.setProperty('--flip',mirror?-1:1);art.style.opacity='1';
 if(twin){twin.style.opacity='0';twin.style.backgroundSize='1200% 900%';}
}
function blendSprite(art,a,b,mix,row,rows=3,mirror=false){
 const twin=art.parentElement?.querySelector('.sprite-b');
 if(!twin){sprite(art,mix<.5?a:b,row,rows,mirror);return;}
 art.style.backgroundSize='400% 300%';twin.style.backgroundSize='400% 300%';
 const t=smoothstep(Math.max(0,Math.min(1,mix)));
 sprite(art,a,row,rows,mirror);sprite(twin,b,row,rows,mirror);
 art.style.opacity=String(1-t);twin.style.opacity=String(t);
}
const MOTION={
 idle:{keys:[0,0],speed:.7},
 walk:{keys:[1,0,2,0],speed:7.2},
};
function motion(el,art,mode,row,mirror,time,phase=0,dx=0,dy=0){
 const pose=applyHeading(el,dx,dy,row,mirror),cfg=MOTION[mode]||MOTION.idle,keys=cfg.keys;
 const pos=((time*cfg.speed+phase)%keys.length+keys.length)%keys.length,idx=Math.floor(pos),mix=pos-idx;
 if(el.dataset.motionSheet==='1'){const fps=mode==='walk'?18:mode==='attack'?16:7,frame=Math.floor((((time*fps)+(phase*3))%12+12)%12);motionSprite(art,frame,mode,pose.row,pose.mirror);}
 else blendSprite(art,keys[idx],keys[(idx+1)%keys.length],mix,pose.row,3,pose.mirror);
 el.dataset.motion=mode;
 const stride=mode==='walk'?Math.sin((pos/keys.length)*Math.PI*2):Math.sin(time*Math.PI*1.4+phase);
 const foot=Math.abs(Math.sin((pos/keys.length)*Math.PI*4));
 el.style.setProperty('--bob',mode==='walk'?(-1.1-foot*2.5)+'px':(-Math.max(0,stride)*.65)+'px');
 el.style.setProperty('--lean',mode==='walk'?(stride*1.35)+'deg':(stride*.25)+'deg');
 el.style.setProperty('--squash',mode==='walk'?(1-foot*.02):(1+stride*.005));
 el.style.setProperty('--weapon-angle',mode==='walk'?(stride*-5.5)+'deg':'0deg');
 el.style.setProperty('--attack-power','0');el.style.setProperty('--arm-angle','0deg');el.style.setProperty('--trail-angle','0deg');el.style.setProperty('--trail-scale','.76');el.style.setProperty('--lunge-x','0px');el.style.setProperty('--lunge-y','0px');el.style.setProperty('--coat-sway',(stride*5.5)+'deg');el.style.setProperty('--cape-lag',(stride*-3.2)+'deg');el.style.setProperty('--shoulder-lift',(foot*1.4)+'px');el.style.setProperty('--offhand-angle',(stride*7)+'deg');
}
function attackPose(el,art,row,mirror,started,duration=.44,job='warrior',skill=-1,variant=0,dx=0,dy=0){
 const pose=applyHeading(el,dx,dy,row,mirror),p=Math.max(0,Math.min(1,(clock-started)/duration));
 const cast=job==='mage'||job==='healer',rogue=job==='rogue',keys=cast?[0,1,3,1,0]:rogue?[0,1,3,2,3,0]:[0,1,3,3,2,0];
 const z=p*(keys.length-1),i=Math.min(keys.length-2,Math.floor(z)),mix=z-i;
 if(el.dataset.motionSheet==='1')motionSprite(art,Math.min(11,Math.floor(p*12)),'attack',pose.row,pose.mirror);
 else blendSprite(art,keys[i],keys[i+1],mix,pose.row,3,pose.mirror);
 let lean=0,bob=0,weapon=0,power=0,lunge=0;
 if(cast){
  const q=smoothstep(Math.min(1,p/.58)),release=smoothstep(Math.max(0,(p-.36)/.32));
  lean=-3+5*q;bob=-2.2*Math.sin(Math.min(1,p)*Math.PI);weapon=-18+34*q-18*release;power=Math.sin(Math.min(1,p/.82)*Math.PI);lunge=skill>=0?3*Math.sin(p*Math.PI):0;
 }else if(rogue){
  const wave=Math.sin(Math.min(1,p/.78)*Math.PI*2);
  lean=wave*7;bob=-2.2*Math.abs(wave);weapon=variant%2?48-145*smoothstep(p):-48+150*smoothstep(p);power=Math.min(1,Math.abs(wave)*1.3);lunge=8*Math.sin(Math.min(1,p/.7)*Math.PI);
 }else{
  if(p<.20){const q=smoothstep(p/.20);lean=-8*q;weapon=(variant%3===1?58:-68)*q;bob=1.2*q;power=q*.18;}
  else if(p<.60){const q=smoothstep((p-.20)/.40);const from=variant%3===1?58:-68,to=variant%3===1?-108:variant%3===2?42:112;lean=-8+21*q;weapon=from+(to-from)*q;bob=-3.2*Math.sin(q*Math.PI);power=.2+.8*Math.sin(q*Math.PI*.86);lunge=10*Math.sin(q*Math.PI);}
  else{const q=smoothstep((p-.60)/.40);lean=13*(1-q);weapon=(variant%3===1?-108:variant%3===2?42:112)*(1-q);bob=-1*(1-q);power=1-q;lunge=6*(1-q);}
 }
 el.dataset.motion='attack';el.dataset.attackVariant=String(variant%3);el.dataset.attackSkill=String(skill);
 const armFactor=job==='rogue'?.34:job==='mage'?.16:job==='healer'?.12:.28,trailFactor=job==='rogue'?.23:job==='mage'?.4:job==='healer'?.3:.18;
 el.style.setProperty('--bob',bob+'px');el.style.setProperty('--lean',lean+'deg');el.style.setProperty('--squash',p>.18&&p<.62?.958:1);el.style.setProperty('--weapon-angle',weapon+'deg');el.style.setProperty('--arm-angle',(weapon*armFactor)+'deg');el.style.setProperty('--trail-angle',(weapon*trailFactor)+'deg');el.style.setProperty('--trail-scale',String(.74+Math.max(0,power)*.28));el.style.setProperty('--attack-power',String(Math.max(0,power)));el.style.setProperty('--lunge-x',(lunge*pose.nx)+'px');el.style.setProperty('--lunge-y',(lunge*pose.ny*.38)+'px');el.style.setProperty('--coat-sway',(lean*.55-weapon*.045)+'deg');el.style.setProperty('--cape-lag',(lean*-.32-weapon*.025)+'deg');el.style.setProperty('--shoulder-lift',(Math.max(0,power)*-2.2)+'px');el.style.setProperty('--offhand-angle',(-weapon*.72)+'deg');
}
function actorArt(el,s){
 const art=JOBS[s.job].art,useMotion=motionArt.has(art),url=`url('./assets/${art}${useMotion?'-motion.webp':'.png'}?v=${BUILD}')`,parent=el.parentElement;
 if(parent)parent.dataset.motionSheet=useMotion?'1':'0';el.style.backgroundImage=url;
 const twin=parent?.querySelector('.sprite-b');if(twin){twin.style.backgroundImage=url;twin.style.opacity=useMotion?'0':twin.style.opacity;}
}
function decorate(el,s){const eq=s.equipment||{};el.dataset.job=s.job;el.dataset.rank=String(s.rank||0);for(const slot of ['armor','head','weapon','cape','boots'])el.dataset[slot]=ITEMS[eq[slot]]?.tier||0;el.classList.toggle('promoted',!!s.rank);}
function layers(el){
 const base=el.querySelector('.sprite');
 if(base&&!el.querySelector('.sprite-b')){base.classList.add('sprite-a');const twin=base.cloneNode(false);twin.removeAttribute('id');twin.classList.remove('sprite-a');twin.classList.add('sprite-b');twin.style.opacity='0';base.after(twin);}
 if(!el.querySelector('.gear-layers')){const div=document.createElement('div');div.className='gear-layers';div.innerHTML='<i class="gear-cape"></i><i class="gear-coat-back gear-coat-back-l"></i><i class="gear-coat-back gear-coat-back-r"></i><i class="gear-boots"></i><i class="gear-thigh gear-thigh-l"></i><i class="gear-thigh gear-thigh-r"></i><i class="gear-armor"></i><i class="gear-shoulder gear-shoulder-l"></i><i class="gear-shoulder gear-shoulder-r"></i><i class="gear-head"></i><i class="gear-belt"></i><i class="gear-coat-front gear-coat-front-l"></i><i class="gear-coat-front gear-coat-front-r"></i>';el.append(div);}
 if(!el.querySelector('.weapon-rig')){const rig=document.createElement('span');rig.className='weapon-rig';rig.innerHTML='<span class="weapon-core"><i class="gear-arm"></i><i class="gear-hand"></i><i class="gear-weapon"></i></span><span class="weapon-sub-core"><i class="gear-arm-sub"></i><i class="gear-hand-sub"></i><i class="gear-weapon-sub"></i></span>';el.append(rig);}
}
layers($('hero'));
function entity(type){const el=document.createElement('div');el.className='entity '+type;el.innerHTML='<div class="shadow"></div><div class="sprite"></div><b class="entity-name"></b><div class="life"><i></i></div><div class="tell" hidden></div>';return el;}
function speechBubble(playerId,text){const el=playerId===state.id?$('hero'):peers.get(playerId)?.el;if(!el)return;let bubble=el.querySelector('.speech-bubble');if(!bubble){bubble=document.createElement('div');bubble.className='speech-bubble';el.append(bubble);}bubble.textContent=text;bubble.classList.remove('show');void bubble.offsetWidth;bubble.classList.add('show');clearTimeout(bubble._timer);bubble._timer=setTimeout(()=>bubble.classList.remove('show'),2600);}
function updateSnapshot(data){
 data=mergeSnapshot(wireSnapshot,data);if(!data)return;wireSnapshot=data;
 if(data.disconnected){connected=false;streamController?.abort();toast(data.disconnected);showSelection();return;}
 if(!data.self)return;
 const sampleAt=performance.now()/1000,old=state,next=data.self;
 if(lastSelfSampleAt&&old.zone===next.zone){
  const dt=Math.max(.03,sampleAt-lastSelfSampleAt),vx=(next.x-lastSelfX)/dt,vy=(next.y-lastSelfY)/dt,mag=Math.hypot(vx,vy),cap=300,ratio=mag>cap?cap/mag:1;
  serverVelocity.x=serverVelocity.x*.45+vx*ratio*.55;serverVelocity.y=serverVelocity.y*.45+vy*ratio*.55;
 }else serverVelocity={x:0,y:0};
 lastSelfSampleAt=sampleAt;lastSelfX=next.x;lastSelfY=next.y;
 serverNow=data.now;receivedAt=performance.now();state=next;systems={nodes:data.nodes||[],bosses:data.bosses||[],trade:data.trade,duel:data.duel,daily:data.daily};
 syncMMO();if(old.zone!==state.zone){showZoneArrival(state.zone);serverVelocity={x:0,y:0};view={x:state.x,y:state.y};path=[];targetIntent=null;camera(true);if(soundOn)setRegionAudio(state.zone);}
 auto=state.auto;connected=true;
 if(old.zone===state.zone&&distance(view,state)>320){view={x:state.x,y:state.y};path=[];targetIntent=null;camera(true);}
 if(auto&&state.autoTarget!=null&&enemies.get(state.autoTarget)?.alive){selected=state.autoTarget;targetIntent=null;}else if(state.combatTarget!=null&&enemies.get(state.combatTarget)?.alive){selected=state.combatTarget;targetIntent=null;}
 const me=data.players.find(p=>p.id===state.id);
 if(me){face=me.face;flip=me.flip;if(Number.isFinite(me.dirX)&&Number.isFinite(me.dirY)){headingX=me.dirX;headingY=me.dirY;}if(me.attacking){const key=[me.attackSkill??-1,me.attackTarget??'',state.nextAttack||0].join(':');if(key!==lastServerAttackKey){lastServerAttackKey=key;const hero=$('hero'),skill=me.attackSkill??-1,target=fxTarget(me.attackTarget),duration=combatAnimDuration(skill);attackUntil=clock+duration;hero.dataset.attackStarted=String(clock);hero.dataset.attackDuration=String(duration);hero.dataset.attackSkill=String(skill);hero.dataset.attackVariant=String(attackSerial++%3);if(skill>=0)skillEffect(state.job,skill,target,view);else if(target)combatContact(state.job,-1,target,view);}}else lastServerAttackKey='';}
 if(old.job!==state.job||old.rank!==state.rank||$('skillbar').childElementCount!==4)makeSkills();actorArt($('heroArt'),state);decorate($('hero'),state);$('hero').querySelector('.entity-name').textContent=state.name+' · '+jobName(state);const portrait=document.querySelector('.portrait');portrait.style.backgroundImage=`url('./assets/${JOBS[state.job].art}.png')`;portrait.dataset.job=state.job;portrait.dataset.rank=String(state.rank||0);
 const mobIds=new Set();for(const e of data.enemies){
  mobIds.add(e.id);let entry=enemies.get(e.id),wasKnown=!!entry,wasAlive=entry?.alive,previousX=entry?.x,previousY=entry?.y,previousAt=entry?.sampleAt;
  if(!entry){const el=entity('enemy'+(e.boss?' boss':''));el.querySelector('b').textContent=e.name||'숲 다람쥐';el.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();select(e.id,true);});$('enemyLayer').append(el);entry={el,art:el.querySelector('.sprite'),vx:e.x,vy:e.y,netVx:0,netVy:0,sampleAt};enemies.set(e.id,entry);}
  if(wasKnown&&previousAt&&sampleAt>previousAt+.025){const dt=sampleAt-previousAt,rvx=(e.x-previousX)/dt,rvy=(e.y-previousY)/dt,mag=Math.hypot(rvx,rvy),ratio=mag>260?260/mag:1;entry.netVx=entry.netVx*.4+rvx*ratio*.6;entry.netVy=entry.netVy*.4+rvy*ratio*.6;}
  entry.sampleAt=sampleAt;Object.assign(entry,e);
  if(wasKnown&&wasAlive&&!e.alive){spawnLootFx(e);if(e.boss)bossIntroSeen.delete(state.zone+':'+e.id);}if(wasKnown&&wasAlive===false&&e.alive&&e.boss&&bossSector)showBossIntro(e);entry.mmo=!!e.atlas;entry.el.classList.toggle('mmo-monster',entry.mmo);entry.art.style.backgroundImage=entry.mmo?"url('./assets/monster-atlas.png')":'';entry.art.style.backgroundSize=entry.mmo?'400% 400%':'';entry.el.querySelector('b').textContent=(e.name||'숲 다람쥐')+' · Lv.'+(e.level||1);entry.el.classList.toggle('elite',!!e.elite);entry.el.classList.toggle('named',!!e.named);entry.el.classList.toggle('dead',!e.alive);entry.el.querySelector('.life i').style.width=e.hp/e.max*100+'%';entry.el.querySelector('.tell').hidden=!e.tellAt;entry.el.classList.toggle('selected',selected===e.id);
 }
 for(const [id,e] of enemies)if(!mobIds.has(id)){e.el.remove();enemies.delete(id);if(selected===id){selected=null;targetIntent=null;}}
 const peerIds=new Set();for(const p of data.players){
  if(p.id===state.id)continue;peerIds.add(p.id);let peer=peers.get(p.id),previousX=peer?.x,previousY=peer?.y,previousAt=peer?.sampleAt;
  if(!peer){const el=entity('peer hero');layers(el);$('world').append(el);peer={el,art:el.querySelector('.sprite'),vx:p.x,vy:p.y,netVx:0,netVy:0,sampleAt};peers.set(p.id,peer);}
  if(previousAt&&sampleAt>previousAt+.025){const dt=sampleAt-previousAt,rvx=(p.x-previousX)/dt,rvy=(p.y-previousY)/dt,mag=Math.hypot(rvx,rvy),ratio=mag>300?300/mag:1;peer.netVx=peer.netVx*.4+rvx*ratio*.6;peer.netVy=peer.netVy*.4+rvy*ratio*.6;}
  peer.sampleAt=sampleAt;Object.assign(peer,p);actorArt(peer.art,p);decorate(peer.el,p);peer.el.querySelector('b').textContent=p.name+' · '+jobName(p);peer.el.querySelector('.life i').style.width=p.hp/p.maxHp*100+'%';
 }
 for(const [id,p] of peers)if(!peerIds.has(id)){p.el.remove();peers.delete(id);}
 $('onlineCount').textContent=data.players.length+'명';$('saveStatus').textContent=data.saveStatus==='error'?'저장 재시도 중':data.saveStatus==='pending'?'서버 저장 대기':'계정에 저장됨';
 for(const event of data.events){if(seenEvents.has(event.id))continue;seenEvents.add(event.id);if(event.kind==='chat'){const row=document.createElement('p');row.textContent=event.text;$('chatLog').append(row);while($('chatLog').childElementCount>3)$('chatLog').firstChild.remove();speechBubble(event.from,event.phrase||event.text);}else{toast(event.text);$('toast').classList.toggle('rare-toast',event.kind==='rare');$('toast').classList.toggle('mythic-toast',event.kind==='mythic');}}
 if(seenEvents.size>500)[...seenEvents].slice(0,300).forEach(id=>seenEvents.delete(id));hud();
}
async function consumeStream(generation){
 streamController?.abort();const controller=new AbortController();streamController=controller;
 try{
  const r=await fetch(apiBase+'/api/events?protocol=2',{headers:{authorization:'Bearer '+token,'x-adventure-connection':connectionKey},signal:controller.signal});
  if(!r.ok){const e=Error('접속이 끊겼습니다.');e.status=r.status;throw e;}
  const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='';
  while(generation===streamGeneration){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let index;while((index=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,index);buffer=buffer.slice(index+2);if(event.startsWith('data: '))updateSnapshot(JSON.parse(event.slice(6)));}}
 }catch(e){if(controller.signal.aborted)return;}
 if(generation!==streamGeneration)return;await recoverPlay(generation);
}
async function recoverPlay(generation){
 const channel=state.channel||$('channelInput').value.trim()||'준자마을';connected=false;pendingMove=null;$('saveStatus').textContent='연결 복구 중';$('loading').hidden=false;$('authPanel').hidden=true;$('selectPanel').hidden=true;$('retryBtn').hidden=true;
 for(let attempt=1;attempt<=3&&generation===streamGeneration;attempt++){
  $('loadMessage').textContent='연결을 자동 복구하고 있어요… '+attempt+'/3';
  await sleep(350*attempt);
  try{
   const r=await api('join',{slot:selectedSlot,channel});if(generation!==streamGeneration)return;
   connectionKey=r.connectionKey;wireSnapshot=null;lastSelfSampleAt=0;updateSnapshot(r.snapshot);resize();makeSkills();$('loading').hidden=true;last=performance.now();toast('연결이 복구되었습니다.');return consumeStream(++streamGeneration);
  }catch(e){if(e.status===401){token='';try{localStorage.removeItem('junja-online-token');}catch{}break;}}
 }
 if(generation!==streamGeneration)return;$('loading').hidden=false;$('retryBtn').hidden=false;
 if(!token){$('authPanel').hidden=false;$('loadMessage').textContent='로그인 세션이 만료되었습니다.';$('authMessage').textContent='아이디와 비밀번호로 다시 로그인해 주세요.';}
 else{$('loadMessage').textContent='서버 연결이 지연되고 있어요. 계정 기록은 유지됩니다.';$('saveStatus').textContent='재접속 대기';}
}
async function showSelection(){
 streamGeneration++;streamController?.abort();connected=false;stopMovement();paused=false;$('modal').hidden=true;$('loading').hidden=false;$('authPanel').hidden=true;$('selectPanel').hidden=true;$('retryBtn').hidden=true;
 let me=null,error=null;for(let attempt=1;attempt<=3;attempt++){try{$('loadMessage').textContent=attempt===1?'캐릭터를 준비하고 있어요…':'계정 기록을 다시 불러오는 중…';me=await api('me');break;}catch(e){error=e;if(e.status===401)break;if(attempt<3)await sleep(400*attempt);}}
 if(!me){
  if(error?.status===401){token='';try{localStorage.removeItem('junja-online-token');}catch{}$('authPanel').hidden=false;$('authMessage').textContent='로그인 시간이 만료되었습니다. 다시 로그인해 주세요.';$('loadMessage').textContent='친구들과 함께하는 준자마을';}
  else{$('retryBtn').hidden=false;$('loadMessage').textContent='서버 연결이 잠시 지연되고 있어요. 저장된 로그인 정보는 지우지 않았습니다.';}
  return;
 }
 try{await artReady;$('loadMessage').textContent='친구들과 함께하는 준자마을';roster=me.roster;$('welcome').textContent=me.name+' · 캐릭터 선택';$('characterCards').replaceChildren();for(const s of roster){const job=JOBS[s.job],b=document.createElement('button');b.type='button';b.className='character-card';b.dataset.slot=s.slot;b.setAttribute('aria-pressed',String(s.slot===selectedSlot));b.innerHTML=`<span class="character-preview ${s.job} ${s.rank?'promoted-preview rank-'+s.rank:''}"><img src="./assets/${job.art}.png" alt="${s.rank?job.title:job.name}" decoding="sync"></span><b>${esc(s.rank?job.title:job.name)}</b><small>Lv.${s.level} · ${job.role}</small>`;b.onclick=()=>{selectedSlot=s.slot;document.querySelectorAll('.character-card').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.slot)===selectedSlot)));};$('characterCards').append(b);}await Promise.all([...$('characterCards').querySelectorAll('img')].map(im=>im.decode()));$('selectPanel').hidden=false;}
 catch(e){$('retryBtn').hidden=false;$('loadMessage').textContent=e.message;}
}
async function login(register=false){if(!$('authForm').reportValidity())return;const username=$('username').value.trim(),password=$('password').value;$('authMessage').textContent='접속 중…';$('loginBtn').disabled=$('registerBtn').disabled=true;
 try{const r=await api(register?'register':'login',{username,password,...(register&&legacy&&$('legacyCheck').checked?{legacy}:{})});token=r.token;try{localStorage.setItem('junja-online-token',token);}catch{}$('password').value='';await showSelection();}catch(e){$('authMessage').textContent=e.message;}finally{$('loginBtn').disabled=$('registerBtn').disabled=false;}
}
$('authForm').onsubmit=e=>{e.preventDefault();login();};$('registerBtn').onclick=()=>login(true);$('switchAccount').onclick=()=>{token='';try{localStorage.removeItem('junja-online-token');}catch{}$('authPanel').hidden=false;$('selectPanel').hidden=true;$('authMessage').textContent='';};
async function join(){$('joinBtn').disabled=true;$('loadMessage').textContent='준자마을에 접속 중…';try{await artReady;const r=await api('join',{slot:selectedSlot,channel:$('channelInput').value.trim()});connectionKey=r.connectionKey;wireSnapshot=null;lastSelfSampleAt=0;state=r.snapshot.self;view={x:state.x,y:state.y};selected=null;targetIntent=null;path=[];updateSnapshot(r.snapshot);resize();makeSkills();face=0;flip=false;headingX=0;headingY=1;placeEntity($('hero'),view.x,view.y);$('hero').style.zIndex=Math.round(view.y);sprite($('heroArt'),0,0);$('loading').hidden=true;last=performance.now();consumeStream(++streamGeneration);toast(state.channel+'에 접속했습니다. 친구에게 같은 채널을 알려 주세요.');}catch(e){$('loadMessage').textContent=e.message;}finally{$('joinBtn').disabled=false;}}
$('joinBtn').onclick=join;$('retryBtn').onclick=()=>token?showSelection():location.reload();
function nearestTarget(maxDistance=560){const safe=e=>e.level<=state.level+(e.boss?5:e.elite?3:6);return [...enemies.values()].filter(e=>e.alive&&distance(view,e)<=maxDistance&&safe(e)).sort((a,b)=>{const ad=distance(view,a)+(a.named?140:a.boss?90:a.elite?35:0),bd=distance(view,b)+(b.named?140:b.boss?90:b.elite?35:0);return ad-bd;})[0]||null;}
function select(id,engage=false){const e=enemies.get(id);if(!e?.alive)return;selected=id;npcIntent=null;path=[];targetIntent=null;if(auto){auto=false;command({type:'auto',on:false});}if(engage){command({type:'engage',target:e.id,skill:-1});toast(e.name+' 타겟 고정 · 자동 추적/공격');}hud();}
function combatAnimDuration(skill=-1,s=state){if(skill>=0){const ability=JOBS[s.job]?.skills?.[skill];return Math.max(.30,Math.min(.78,skillCastDelay(s,ability)*.72));}const speed=stats(s).speed||1;return Math.max(.30,.44/Math.min(1.45,speed));}
function startLocalAttack(skill=-1){
 const hero=$('hero'),ability=skill>=0?JOBS[state.job]?.skills?.[skill]:null,duration=combatAnimDuration(skill),lock=skill>=0?skillCastDelay(state,ability):duration;attackUntil=clock+duration;localActionLockUntil=Math.max(localActionLockUntil,now()+lock);hero.dataset.attackStarted=String(clock);hero.dataset.attackDuration=String(duration);hero.dataset.attackSkill=String(skill);hero.dataset.attackVariant=String(attackSerial++%3);
}
function attack(skill=-1){
 if(paused||!connected)return;
 const t=now(),serverReady=systems.duel?.accepted?(systems.duel.next?.[state.id]||systems.duel.start||0):(state.nextAttack||0),actionReady=Math.max(serverReady,localActionLockUntil);if(t<actionReady)return;
 const ability=skill>=0?JOBS[state.job].skills[skill]:null,mpCost=skillMpCost(state,ability);if(ability&&state.mp<mpCost){toast('마나가 부족합니다. · 필요 MP '+mpCost);return;}
 if(systems.duel?.accepted){const other=systems.duel.players.find(id=>id!==state.id),target=peers.get(other);command({type:'duelAttack',skill});startLocalAttack(skill);if(skill>=0)skillEffect(state.job,skill,target,view);else if(target)combatContact(state.job,-1,target,view);return;}
 if(ability&&['heal','partyHeal','guard','partyGuard'].includes(ability[4])){command({type:'attack',skill});startLocalAttack(skill);skillEffect(state.job,skill,null,view);return;}
 let e=enemies.get(selected);if(!e?.alive)e=nearestTarget(560);
 if(!e){toast('근처에 안전하게 타겟팅할 몬스터가 없습니다.');return;}selected=e.id;
 if(state.combatTarget!==e.id||distance(view,e)>stats(state).range*.96){targetIntent=null;path=[];command({type:'engage',target:e.id,skill});toast(e.name+' 타겟 고정 · 추적/공격');hud();return;}
 targetIntent=null;command({type:'attack',skill,target:e.id});startLocalAttack(skill);headingX=e.x-view.x;headingY=e.y-view.y;
 const pose=headingPose(headingX,headingY,face,flip);face=pose.row;flip=pose.mirror;path=[];
 if(skill>=0)skillEffect(state.job,skill,e,view);else combatContact(state.job,-1,e,view);hud();
}
function impact(target,job='warrior'){
 if(!target)return;const el=document.createElement('div');el.className='combat-impact '+job;el.style.left=target.x+'px';el.style.top=(target.y-34)+'px';$('effects').append(el);
 target.el?.classList.add('contact-hit');setTimeout(()=>target.el?.classList.remove('contact-hit'),130);setTimeout(()=>el.remove(),420);
}
function combatContact(job,skill,target,origin=view){
 if(!target)return;
 if(job==='mage'||job==='healer'){
  const el=document.createElement('div');el.className='combat-projectile '+job+(skill>=0?' skill':'');el.style.left=origin.x+'px';el.style.top=(origin.y-55)+'px';$('effects').append(el);
  const dx=target.x-origin.x,dy=(target.y-32)-(origin.y-55),anim=el.animate([{transform:'translate(-50%,-50%) scale(.7)',opacity:.7},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.15)`,opacity:1}],{duration:job==='mage'?250:290,easing:'cubic-bezier(.2,.75,.25,1)',fill:'forwards'});
  anim.onfinish=()=>{el.remove();impact(target,job);};return;
 }
 setTimeout(()=>impact(target,job),job==='rogue'?105:165);
}
function fxNode(cls,pos,duration=900,html=''){
 const el=document.createElement('div');el.className='skillfx '+cls;el.style.left=(pos?.x??view.x)+'px';el.style.top=(pos?.y??view.y)+'px';el.innerHTML=html;$('effects').append(el);setTimeout(()=>el.remove(),duration);return el;
}
function fxTarget(id){return enemies.get(id)||peers.get(id)||(id===state.id?{x:view.x,y:view.y,el:$('hero')}:null);}
function fxProjectile(cls,origin,target,duration=320){
 if(!target)return fxNode(cls,origin,650);
 const el=fxNode(cls+' projectile',origin,duration+260),dx=target.x-origin.x,dy=(target.y-38)-(origin.y-48);
 const anim=el.animate([{transform:'translate(-50%,-50%) scale(.45)',opacity:.75},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.15)`,opacity:1}],{duration,easing:'cubic-bezier(.17,.7,.25,1)',fill:'forwards'});
 anim.onfinish=()=>{el.classList.add('arrived');impact(target,cls.includes('rogue')?'rogue':cls.includes('healer')?'healer':cls.includes('mage')?'mage':'warrior');setTimeout(()=>el.remove(),220);};return el;
}
function fxLine(cls,origin,target,duration=650){
 if(!target)return fxNode(cls,origin,duration);
 const dx=target.x-origin.x,dy=target.y-origin.y,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI,el=fxNode(cls+' line',origin,duration);
 el.style.width=len+'px';el.style.transform=`translate(0,-50%) rotate(${ang}deg)`;return el;
}
function skillEffect(job,skill,target,origin=view){
 const key=job+':'+skill,o={x:origin.x,y:origin.y-20},t=target?{x:target.x,y:target.y-28}:o;
 switch(key){
  case 'warrior:0': fxNode('warrior spin',o,650,'<i></i><i></i>');if(target)setTimeout(()=>impact(target,'warrior'),190);break;
  case 'warrior:1': fxNode('warrior fortress',o,1000,'<i></i>');break;
  case 'warrior:2': fxNode('warrior smash',t,700,'<i></i><i></i><i></i>');if(target)setTimeout(()=>impact(target,'warrior'),120);break;
  case 'warrior:3': fxNode('warrior storm',o,1000,'<i></i><i></i><i></i><i></i>');if(target)setTimeout(()=>impact(target,'warrior'),260);break;
  case 'rogue:0': fxNode('rogue flurry',t,720,'<i></i><i></i><i></i><i></i>');if(target)setTimeout(()=>impact(target,'rogue'),110);break;
  case 'rogue:1': fxLine('rogue drain',t,o,850);fxNode('rogue blood',t,760,'<i></i>');if(target)setTimeout(()=>impact(target,'rogue'),120);break;
  case 'rogue:2': fxLine('rogue shadowdash',o,t,520);fxNode('rogue shadowhit',t,580,'<i></i><i></i>');if(target)setTimeout(()=>impact(target,'rogue'),90);break;
  case 'rogue:3': fxNode('rogue moon',t,900,'<i></i>');if(target)setTimeout(()=>impact(target,'rogue'),210);break;
  case 'mage:0': fxProjectile('mage fireball',o,target,330);break;
  case 'mage:1': fxNode('mage frost',t,950,'<i></i><i></i><i></i><i></i><i></i>');if(target)setTimeout(()=>impact(target,'mage'),230);break;
  case 'mage:2': fxNode('mage thunderstorm',t,1100,'<i></i><i></i><i></i><i></i>');if(target)setTimeout(()=>impact(target,'mage'),300);break;
  case 'mage:3': fxNode('mage judgment',t,1250,'<i></i><i></i><i></i>');if(target)setTimeout(()=>impact(target,'mage'),360);break;
  case 'healer:0': fxProjectile('healer holybolt',o,target,370);break;
  case 'healer:1': fxNode('healer breath',o,1050,'<i></i><i></i><i></i><i></i><i></i>');break;
  case 'healer:2': fxNode('healer barrier',o,1250,'<i></i><i></i>');break;
  case 'healer:3': fxNode('healer lotus',o,1350,'<i></i><i></i><i></i><i></i><i></i><i></i>');break;
  default: fxNode(job+' generic',target||o,650);
 }
}
const QUEST_VIEWS={
 available:s=>['작은 다람쥐의 위협','촌장에게 첫 임무를 받아 주세요.','촌장 찾아가기'],
 active:s=>['작은 다람쥐의 위협',`공동 처치 ${Math.min(10,s.questKills||0)} / 10 · 200 G, 물약 3개`,'숲으로 이동'],
 ready:s=>['임무 완료','촌장에게 보상을 받아 주세요.','촌장에게 보고'],
 complete:s=>['왕꼬리의 흔적','보스 임무를 수락해 주세요.','촌장 찾아가기'],
 bossActive:s=>['숲의 수호자 왕꼬리','함께 왕꼬리 처치 · 희귀 장비 10%','보스 찾아가기'],
 bossReady:s=>['보스 임무 완료','빛나는 무기 보상을 받아 주세요.','촌장에게 보고'],
 done:s=>['준자마을의 수호자','Lv.99 → 1차 전직 · 정예·던전·일일 임무 도전','숲으로 이동'],
 groveIntro:s=>['2장 · 깊은숲의 이상징후','촌장에게 깊은숲 조사 임무를 받으세요.','다음 임무 수락'],
 groveHunt:s=>['깊은 다람쥐숲 정찰',`깊은숲 몬스터 처치 ${Math.min(12,s.questKills||0)} / 12`,'사냥 계속하기'],
 groveBoss:s=>['고목의 수호수','깊은숲 보스 고목의 수호수를 처치하세요.','보스 찾아가기'],
 caveIntro:s=>['3장 · 수정 동굴의 균열','촌장에게 수정 동굴 조사 임무를 받으세요.','다음 임무 수락'],
 caveHunt:s=>['수정 동굴 조사',`동굴 몬스터 처치 ${Math.min(15,s.questKills||0)} / 15`,'사냥 계속하기'],
 caveBoss:s=>['수정 동굴주','동굴 최심부의 수정 동굴주를 처치하세요.','보스 찾아가기'],
 ruinsIntro:s=>['4장 · 붉은 폐허','촌장에게 폐허 정화 임무를 받으세요.','다음 임무 수락'],
 ruinsHunt:s=>['붉은 폐허 정화',`폐허 몬스터 처치 ${Math.min(15,s.questKills||0)} / 15`,'사냥 계속하기'],
 ruinsBoss:s=>['폐허의 집행자','보스 구역의 폐허의 집행자를 처치하세요.','보스 찾아가기'],
 abyssIntro:s=>['5장 · 그림자 심연','촌장에게 심연 조사 임무를 받으세요.','다음 임무 수락'],
 abyssHunt:s=>['심연의 기운',`심연 몬스터 처치 ${Math.min(15,s.questKills||0)} / 15`,'사냥 계속하기'],
 abyssElite:s=>['암흑 추적자',`정예 암흑 추적자 처치 ${Math.min(2,s.questKills||0)} / 2`,'정예 찾아가기'],
 abyssBoss:s=>['심연 파수왕','심연의 보스 심연 파수왕을 처치하세요.','보스 찾아가기'],
 celestialIntro:s=>['6장 · 천룡의 유적','촌장에게 마지막 원정 임무를 받으세요.','다음 임무 수락'],
 celestialHunt:s=>['천룡 유적 돌파',`천계 몬스터 처치 ${Math.min(20,s.questKills||0)} / 20`,'사냥 계속하기'],
 celestialBoss:s=>['천룡 수문장','최종 보스 천룡 수문장을 처치하세요.','최종 보스 찾아가기'],
 storyDone:s=>['메인 스토리 1장 완료','천룡의 유적을 정복했습니다. 정예·네임드·일일 임무에 도전하세요.','완료']
};
function questView(s){const key=s.storyQuest||s.quest,view=QUEST_VIEWS[key]||QUEST_VIEWS[s.quest]||QUEST_VIEWS.available;return view(s);}
function makeSkills(){$('skillbar').replaceChildren();JOBS[state.job].skills.forEach((s,i)=>{const b=document.createElement('button'),mp=skillMpCost(state,s);b.id='skill'+i;b.innerHTML=`<b>${s[0]}</b><small>MP ${mp}</small>`;b.onclick=()=>attack(i);$('skillbar').append(b);});}
function hud(){const st=stats(state),t=now();$('playerName').textContent=state.name||'준자';$('level').textContent='Lv.'+state.level+' '+jobName(state);$('hpText').textContent=Math.ceil(state.hp)+' / '+st.hp;$('hpBar').style.width=state.hp/st.hp*100+'%';$('mpText').textContent='MP '+Math.ceil(state.mp)+' / '+st.mp+' · 물약 '+(state.manaPotions||0);$('mpBar').style.width=Math.min(100,state.mp/st.mp*100)+'%';$('expBar').style.width=Math.min(100,state.exp/needXp(state.level)*100)+'%';$('expText').textContent='EXP '+state.exp+' / '+needXp(state.level);$('gold').textContent=state.gold.toLocaleString()+' G';$('zone').textContent=(state.zone==='surface'?(view.y>590?'준자마을 · 초원숲':'준자마을'):ZONES[state.zone].name)+' · '+(state.channel||'');$('potionLabel').textContent=state.potions+'개';$('potionBtn').disabled=!connected||state.potions<=0;
 const q=questView(state),questKey=state.storyQuest||state.quest;$('quest').dataset.quest=questKey;$('questTitle').textContent=q[0];$('questText').textContent=q[1];$('questAction').textContent=q[2];const e=enemies.get(selected);$('targetPanel').hidden=!e?.alive;if(e?.alive){$('targetName').textContent=e.name||'숲 다람쥐';$('targetRange').textContent=Math.round(distance(view,e)/24)+'m';$('targetHp').style.width=e.hp/e.max*100+'%';}
 const serverReady=systems.duel?.accepted?Math.max(systems.duel.start,systems.duel.next?.[state.id]||0):(state.nextAttack||0),actionReady=Math.max(serverReady,localActionLockUntil),actionLock=Math.max(0,actionReady-t);$('attackBtn').disabled=paused||!connected||actionLock>0;$('attackLabel').textContent=actionLock>0?'공격 대기 '+actionLock.toFixed(1)+'초':systems.duel?.accepted?'대련 공격':e?.alive?distance(state,e)>st.range?'접근 후 공격':'공격 가능':'대상 선택';$('autoBtn').setAttribute('aria-pressed',String(auto));$('autoBtn').querySelector('small').textContent=auto?'ON':'OFF';$('contextBtn').hidden=!nearNpc;JOBS[state.job].skills.forEach((s,i)=>{const b=$('skill'+i);if(!b)return;const locked=state.level<s[1]||(i===3&&!state.rank),cd=Math.max(0,(systems.duel?.accepted?(systems.duel.cooldowns[state.id]?.[i]||0):(state.cooldowns?.[i]||0))-t),mp=skillMpCost(state,s),lowMana=state.mp<mp;b.disabled=paused||!connected||locked||cd>0||lowMana||actionLock>0;b.querySelector('small').textContent=locked?(i===3?'승급 필요':'Lv.'+s[1]):cd>0?'쿨 '+cd.toFixed(cd<10?1:0)+'초 / '+s[2]+'초':actionLock>0?'시전 '+actionLock.toFixed(1)+'초':lowMana?'마나 부족 · MP '+mp:'쿨 '+s[2]+'초 · MP '+mp;});
}
function modal(title,body,actions=[]){mmoPanel='';paused=true;stopMovement();$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalActions').replaceChildren();for(const [label,fn] of actions){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{closeModal();fn();};$('modalActions').append(b);}$('modal').hidden=false;$('modalClose').focus();}
function closeModal(){mmoPanel='';paused=false;$('modal').hidden=true;$('viewport').focus({preventScroll:true});}
function seekNpc(id){selected=null;command({type:'auto',on:false});const n=npcs.find(n=>n.id===id);go(n.x,n.y+60);npcIntent=id;}
function talk(id){if(id==='merchant'){merchantWindow();return;}const lines={available:'다람쥐 10마리를 물리쳐 주겠니? 친구와 함께 공격해도 처치가 인정된단다.',active:'다람쥐 '+state.questKills+' / 10. 친구와 힘을 합쳐 보렴.',ready:'고맙다! 200 G, 경험치 80과 물약 3개를 받아라.',complete:'왕꼬리를 물리쳐라. 참여자마다 희귀 장비를 얻을 기회가 있단다.',bossActive:'왕꼬리에 25 이상의 피해를 주거나 회복으로 지원하면 보상을 받을 수 있단다.',bossReady:'빛나는 무기, 500 G, 경험치 180을 받아라.',done:'99레벨부터 전직에 도전하렴. 정예·던전과 일일 임무로 성장할 수 있단다.'};const actions=[];if(['available','complete','ready','bossReady'].includes(state.quest))actions.push([['ready','bossReady'].includes(state.quest)?'보상 받기':state.quest==='available'?'임무 수락':'보스 임무 수락',()=>command({type:'quest'})]);actions.push(['승급·직업 보기',jobWindow],['일일 임무',dailyWindow],['채집·제작·던전',adventureWindow]);modal('준자마을 촌장','<p>'+lines[state.quest]+'</p>',actions);}
function merchantWindow(){
 const costs={potion:30,manaPotion:45,enhanceStone:3000,shiningStone:25000},gear={leather:120,hood:100,boots:80,cape:180};
 modal('약초 · 장비 상인',`<p>체력/마나 물약·장비와 강화 재료를 판매합니다.</p><p><b>수량 구매</b>는 아래 수량을 입력한 뒤 물약/강화석을 누르면 한 번에 구매됩니다. 최대 999개.</p><label class="buy-qty">구매 수량<input id="buyQty" type="number" min="1" max="999" step="1" value="10"></label><p>보유 <b>${state.gold.toLocaleString()} G</b> · HP 물약 ${state.potions}개 · MP 물약 ${state.manaPotions||0}개 · 강화석 ${state.enhanceStones}개 · 빛나는 강화석 ${state.shiningStones}개</p><div class="shop-grid">${Object.entries(costs).map(([id,cost])=>`<button data-buy-stack="${id}"><b>${id==='potion'?'체력 물약':id==='manaPotion'?'마나 물약':id==='enhanceStone'?'강화석':'빛나는 강화석'}</b><small>${cost.toLocaleString()} G / 1개</small></button>`).join('')}</div><p>장비는 종류별 1개씩 구매합니다.</p><div class="shop-grid">${Object.entries(gear).map(([id,cost])=>`<button data-buy-one="${id}"><b>${esc(ITEMS[id].name)}</b><small>${cost.toLocaleString()} G</small></button>`).join('')}</div><p><b>체력 물약</b> 최대 HP 50% 회복 · <b>마나 물약</b> 최대 MP 45% 회복</p>`,[['치료 · 20 G',()=>command({type:'buy',item:'heal'})],['제작 공방',craftWindow],['장비 강화',enhanceWindow]]);
 const qty=()=>Math.max(1,Math.min(999,Math.floor(Number($('buyQty')?.value)||1)));
 document.querySelectorAll('[data-buy-stack]').forEach(b=>b.onclick=async()=>{const n=qty(),id=b.dataset.buyStack;await command({type:'buy',item:id,qty:n});setTimeout(merchantWindow,180);});
 document.querySelectorAll('[data-buy-one]').forEach(b=>b.onclick=async()=>{await command({type:'buy',item:b.dataset.buyOne,qty:1});setTimeout(merchantWindow,180);});
}
function jobWindow(){const job=JOBS[state.job],desc={hit:'강력한 단일 공격',area:'대상 주변 광역 공격',drain:'공격과 함께 체력 회복',slow:'광역 피해 · 5초 둔화',heal:'가까운 아군 체력 35% 회복',partyHeal:'가까운 아군 체력 60% 회복',guard:'7초 동안 받는 피해 60% 감소',partyGuard:'가까운 아군에게 7초 보호'};const actions=[['촌장 찾아가기',()=>seekNpc('elder')]];if(state.rank<3)actions.push([(state.rank+1)+'차 전직',()=>command({type:'promote'})]);for(const [id,j] of Object.entries(JOBS))if(id!==state.job)actions.push([j.name+'로 변경 · 500 G',()=>command({type:'job',job:id})]);modal('직업 · 승급',`<p>현재 <strong>${jobName(state)}</strong> · Lv.${state.level}</p><p>전직: 99·199·299레벨, 보스 1·5·15회 (${state.bossKills}회). 촌장 가까이에서 전직하면 공격·방어가 증가합니다. 최대 399레벨. 기존 승급 기록은 유지됩니다.</p><p>직업 변경: 10레벨 + 500 G. 성장·장비를 유지합니다.</p>${job.skills.map((s,i)=>`<p><b>${s[0]}</b> · ${i===3?'승급 후':'Lv.'+s[1]} · 쿨 ${s[2]}초 · 시전 ${skillCastDelay(state,s).toFixed(2)}초 · MP ${skillMpCost(state,s)}<br>${desc[s[4]]}</p>`).join('')}`,actions);}
function bagWindow(){const st=stats(state),itemText=id=>ITEMS[id]?esc(ITEMS[id].name)+(enhancementLevel(state,id)?' +'+enhancementLevel(state,id):''):'미장착',slots=Object.entries(SLOTS).map(([slot,name])=>`<button class="equip-slot slot-${slot}" data-unequip="${slot}"><small>${name}</small><b class="${ITEMS[state.equipment[slot]]?.rarity||''}">${itemText(state.equipment[slot])}</b></button>`).join('');modal('장비 · 가방',`<div class="paperdoll"><div id="dollActor" class="doll-actor entity hero"><div class="sprite" style="background-image:url('./assets/${JOBS[state.job].art}.png')"></div></div>${slots}</div><div class="combat-stats"><span>공격 <b>${st.atk}</b></span><span>방어 <b>${st.def}</b></span><span>체력 <b>${st.hp}</b></span><span>공속 <b>${Math.round(st.speed*100)}%</b></span></div><p>강화 1단계마다 장비 기본 능력치가 약 7% 증가합니다.</p><div class="bag-items">${[...new Set(state.bag)].map(id=>{const item=ITEMS[id],eq=state.equipment[item.slot]===id,lvl=enhancementLevel(state,id);return `<button data-equip="${id}" class="item-card ${item.rarity}"><b>${itemText(id)}</b><small>${SLOTS[item.slot]} · ${item.atk?'공격 +'+item.atk+' ':''}${item.def?'방어 +'+item.def+' ':''}${item.hp?'체력 +'+item.hp+' ':''}${item.speed?'공속 +'+Math.round(item.speed*100)+'% ':''}· Lv.${item.level||1}</small><span>${eq?'장착 중':'장착'} · ${state.bag.filter(i=>i===id).length}개${lvl?' · 강화 +'+lvl:''}</span></button>`;}).join('')}</div><p>${Object.entries(MATERIALS).map(([k,n])=>n+' '+state.materials[k]).join(' · ')}</p><p>체력 물약 ${state.potions}개 · 마나 물약 ${state.manaPotions||0}개 · 자동 HP ${state.autoHpPct||0}% · 자동 MP ${state.autoMpPct||0}%</p><p>강화석 ${state.enhanceStones}개 · 빛나는 강화석 ${state.shiningStones}개 · ${state.gold.toLocaleString()} G</p><p>네임드 전설 약 1% · 신화는 0.01%, 천룡은 0.03%의 초희귀 확률입니다.</p>`,[['체력 물약 사용',()=>command({type:'potion'})],['마나 물약 사용',()=>command({type:'manaPotion'})],['자동 물약 설정',potionSettingsWindow],['장비 강화',enhanceWindow]]);layers($('dollActor'));decorate($('dollActor'),state);document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=async()=>{await command({type:'equip',item:b.dataset.equip});setTimeout(bagWindow,180);});document.querySelectorAll('[data-unequip]').forEach(b=>b.onclick=()=>{if(b.dataset.unequip==='weapon'){toast('다른 무기로 교체하세요.');return;}command({type:'unequip',slot:b.dataset.unequip});closeModal();});}
function potionSettingsWindow(){
 const hp=state.autoHpPct||0,mp=state.autoMpPct||0,choices=[0,30,50,70];
 modal('자동 물약 설정',`<p>체력이 설정값 이하가 되면 체력 물약을, 마나가 설정값 이하가 되면 마나 물약을 자동 사용합니다.</p><p>현재 · HP <b>${hp?hp+'%':'OFF'}</b> · MP <b>${mp?mp+'%':'OFF'}</b></p><p>보유 · 체력 물약 <b>${state.potions}</b>개 · 마나 물약 <b>${state.manaPotions||0}</b>개</p><div class="auto-potion-grid"><b>HP 자동 사용</b>${choices.map(v=>`<button data-auto-hp="${v}" ${hp===v?'aria-pressed="true"':''}>${v?v+'%':'OFF'}</button>`).join('')}<b>MP 자동 사용</b>${choices.map(v=>`<button data-auto-mp="${v}" ${mp===v?'aria-pressed="true"':''}>${v?v+'%':'OFF'}</button>`).join('')}</div>`,[['가방으로',bagWindow]]);
 document.querySelectorAll('[data-auto-hp]').forEach(b=>b.onclick=async()=>{await command({type:'autoPotion',hp:Number(b.dataset.autoHp),mp:state.autoMpPct||0});setTimeout(potionSettingsWindow,180);});
 document.querySelectorAll('[data-auto-mp]').forEach(b=>b.onclick=async()=>{await command({type:'autoPotion',hp:state.autoHpPct||0,mp:Number(b.dataset.autoMp)});setTimeout(potionSettingsWindow,180);});
}
function enhanceWindow(){const ids=[...new Set(state.bag)].filter(id=>id!=='training'&&ITEMS[id]);const rows=ids.map(id=>{const item=ITEMS[id],lvl=enhancementLevel(state,id),chance=Math.round(enhanceChance(lvl)*100),max=lvl>=MAX_ENHANCE;return `<div class="enhance-row ${item.rarity}"><div><b>${esc(item.name)} ${lvl?'+ '+lvl:''}</b><small>${SLOTS[item.slot]} · 성공 ${max?'MAX':chance+'%'}${lvl>=6?' · 실패 시 -1':''}</small></div><div><button data-forge="${id}" data-stone="normal" ${max||state.enhanceStones<=0?'disabled':''}>강화석 +1</button><button data-forge="${id}" data-stone="shining" ${max||state.shiningStones<=0?'disabled':''}>빛나는 +2</button></div></div>`;}).join('');modal('장비 강화',`<p>강화석 <b>${state.enhanceStones}</b>개 · 빛나는 강화석 <b>${state.shiningStones}</b>개</p><p>최대 +${MAX_ENHANCE}. +6부터 실패하면 현재 강화가 1단계 하락합니다. 빛나는 강화석은 성공 시 2단계 상승합니다.</p><div class="enhance-list">${rows||'<p>강화할 장비가 없습니다.</p>'}</div>`,[['가방으로',bagWindow]]);document.querySelectorAll('[data-forge]').forEach(b=>b.onclick=async()=>{b.disabled=true;await command({type:'enhance',item:b.dataset.forge,stone:b.dataset.stone});setTimeout(enhanceWindow,260);});}
function onlineWindow(){modal('함께 모험하기',`<p>현재 채널 <b>${esc(state.channel)}</b> · ${peers.size+1}명</p><p>친구에게 주소와 채널 이름을 알려 주세요. 같은 채널에서 이동·몬스터·보스 체력을 공유합니다.</p><p>접속: ${[state.name,...[...peers.values()].map(p=>p.name)].map(esc).join(', ')}</p><p>채널마다 최대 48명. 현재 같은 지역의 접속자입니다. 캐릭터 4종은 각각 기록이 저장됩니다.</p>`,[['초대 링크 복사',async()=>{const url=new URL(location.href);url.searchParams.set('channel',state.channel);try{await navigator.clipboard.writeText(url.href);toast('초대 링크를 복사했습니다.');}catch{modal('초대 링크','<p>'+esc(url.href)+'</p>');}}],['캐릭터·채널 변경',showSelection],['로그아웃',async()=>{await api('logout',{}).catch(()=>{});streamGeneration++;streamController?.abort();connected=false;token='';try{localStorage.removeItem('junja-online-token');}catch{}$('loading').hidden=false;$('selectPanel').hidden=true;$('authPanel').hidden=false;stopMovement();}]]);}
function chatWindow(){modal('대화 풍선 선택',`<p>직접 입력 없이 아래 문구만 보낼 수 있습니다.</p><div class="quick-chat-grid">${QUICK_CHATS.map((text,i)=>`<button data-quick="${i}">${esc(text)}</button>`).join('')}</div>`);document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>{const quick=Number(b.dataset.quick);closeModal();command({type:'chat',quick});});}
$('viewport').addEventListener('pointerdown',ev=>{if(paused||!connected||ev.target.closest('button,.enemy,.resource'))return;selected=null;command({type:'auto',on:false});npcIntent=null;const p=screenToWorld(ev.clientX,ev.clientY);go(p.x,p.y);gesture={id:ev.pointerId,x:ev.clientX,y:ev.clientY,drag:false};$('viewport').setPointerCapture(ev.pointerId);});
$('viewport').addEventListener('pointermove',ev=>{if(!gesture||ev.pointerId!==gesture.id)return;const dx=ev.clientX-gesture.x,dy=ev.clientY-gesture.y;if(Math.hypot(dx,dy)>9)gesture.drag=true;if(gesture.drag){path=[];stick={x:dx,y:dy};$('joystick').hidden=false;$('joystick').style.left=gesture.x+'px';$('joystick').style.top=gesture.y+'px';const d=Math.hypot(dx,dy),r=Math.min(27,d);$('joystick').querySelector('i').style.transform=d?`translate(${dx/d*r}px,${dy/d*r}px)`:'none';}});
function release(){gesture=null;stick={x:0,y:0};$('joystick').hidden=true;}for(const event of ['pointerup','pointercancel','lostpointercapture'])$('viewport').addEventListener(event,release);
window.addEventListener('keydown',ev=>{if(ev.target.closest('input,textarea'))return;if(paused){if(ev.key==='Escape')closeModal();return;}const key=ev.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(key)){ev.preventDefault();keys.add(key);path=[];npcIntent=null;if(auto)command({type:'auto',on:false});if(key===' ')attack();}if(['1','2','3','4'].includes(key))attack(Number(key)-1);if(key==='e'&&nearNpc)talk(nearNpc.id);if(key==='q')attack(0);});window.addEventListener('keyup',ev=>keys.delete(ev.key.toLowerCase()));window.addEventListener('blur',stopMovement);document.addEventListener('visibilitychange',()=>{stopMovement();last=performance.now();});window.addEventListener('resize',resize);
for(const n of npcs)$(n.id).onclick=()=>distance(view,n)<115?talk(n.id):seekNpc(n.id);$('contextBtn').onclick=()=>nearNpc&&talk(nearNpc.id);$('attackBtn').onclick=()=>attack();$('potionBtn').onclick=()=>command({type:'potion'});$('autoBtn').onclick=()=>{path=[];npcIntent=null;command({type:'auto',on:!auto});toast(!auto?'자동 사냥 ON · 숲에서 작동':'자동 사냥 OFF');};$('homeBtn').onclick=()=>{stopMovement();selected=null;command({type:'home'});};$('questToggle').onclick=()=>{$('quest').classList.toggle('collapsed');$('questToggle').textContent=$('quest').classList.contains('collapsed')?'+':'−';};$('questAction').onclick=()=>{if(['available','ready','complete','bossReady'].includes(state.quest))seekNpc('elder');else if(state.quest==='bossActive'){const e=[...enemies.values()].find(e=>e.boss);if(e?.alive)select(e.id);else toast('왕꼬리 재출현까지 '+Math.max(0,Math.ceil((e?.respawn||0)-now()))+'초');}else go(768,720);};$('bagBtn').onclick=bagWindow;$('jobBtn').onclick=jobWindow;$('onlineBtn').onclick=onlineWindow;$('chatBtn').onclick=chatWindow;$('soundBtn').onclick=toggleSound;$('helpBtn').onclick=()=>modal('모험 안내','<p><b>몬스터를 터치하면 자동으로 추적해 사거리에 들어온 뒤 공격합니다.</b> 공격·스킬 버튼도 대상이 없으면 가까운 몬스터를 자동으로 찾습니다. 빈 곳 터치로 이동하고, 화면 드래그로 방향 이동합니다. PC: WASD / 방향키, Space 공격, Q 첫 스킬, 1~4 스킬, E 대화.</p><p><b>다른 지역 이동:</b> 지도·이동에서 연결된 지역을 누르면 즉시 순간이동합니다. 필드 포탈을 직접 눌러도 바로 이동합니다.</p><p><b>전투:</b> 몬스터 터치는 타겟을 고정해 현재 위치를 추적·공격합니다. 스킬은 위력에 따라 서로 다른 쿨타임과 마나를 사용합니다.</p><p><b>자동 물약:</b> 장비·가방 → 자동 물약 설정에서 HP/MP 각각 OFF·30%·50%·70%를 선택할 수 있습니다.</p><p>촌장 임무 → 다람쥐 10마리 → 왕꼬리 → 정예·던전 → Lv.99 첫 전직. 직업에 따라 공격 범위·스킬이 달라집니다.</p><p>가방에서 장비를 장착하고 강화소에서 강화하세요. +6부터 실패 시 단계가 내려가며, 빛나는 강화석은 성공 시 +2입니다.</p><p>전설 위에 신화 등급이 있으며 신화 장비는 시간제 네임드에서 극히 낮은 확률로만 드롭됩니다.</p><p>성장은 계정에 저장됩니다. 같은 아이디의 동시 접속은 마지막 접속만 유지됩니다.</p>');$('modalClose').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal();};
let hudAt=0;
function frame(time){
 const dt=Math.min(.04,(time-last)/1000||.016);last=time;clock+=dt;
 if(connected){
  let dx=0,dy=0,manualMove=false;
  if(!paused&&!document.hidden){
   dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
   if(!dx&&!dy&&Math.hypot(stick.x,stick.y)>5){dx=stick.x;dy=stick.y;}manualMove=!!(dx||dy);
   if(!dx&&!dy&&path.length){if(distance(view,path[0])<16)path.shift();if(path.length){dx=path[0].x-view.x;dy=path[0].y-view.y;}}
  }
  const len=Math.hypot(dx,dy);if(len){dx/=len;dy/=len;}
  if(!auto&&clock>=attackUntil&&len){
   const x=view.x+dx*250*dt,y=view.y+dy*250*dt;if(walkable(x,view.y))view.x=x;if(walkable(view.x,y))view.y=y;headingX=dx;headingY=dy;const pose=headingPose(dx,dy,face,flip);face=pose.row;flip=pose.mirror;
  }
  const sampleAge=Math.min(.13,Math.max(0,(performance.now()-receivedAt)/1000)),predicted={x:state.x+serverVelocity.x*sampleAge,y:state.y+serverVelocity.y*sampleAge},drift=distance(view,predicted);
  if(!len||auto){
   const f=1-Math.exp(-16*dt);view.x+=(predicted.x-view.x)*f;view.y+=(predicted.y-view.y)*f;
  }else if(drift>18){
   const strength=drift>150?14:drift>65?6:1.6,f=1-Math.exp(-strength*dt);view.x+=(predicted.x-view.x)*f;view.y+=(predicted.y-view.y)*f;
  }
  if(clock-lastSend>=.06&&(manualMove||(!path.length&&!auto))){lastSend=clock;queueMove({type:'move',x:dx,y:dy,manual:manualMove});}
  const attacking=clock<attackUntil,hero=$('hero'),heroArt=$('heroArt');
  if(attacking){const duration=Number(hero.dataset.attackDuration)||.44,started=Number(hero.dataset.attackStarted)||attackUntil-duration;attackPose(hero,heroArt,face,flip,started,duration,state.job,Number(hero.dataset.attackSkill??-1),Number(hero.dataset.attackVariant||0),headingX,headingY);}
  else motion(hero,heroArt,len||auto||state.navMoving?'walk':'idle',face,flip,clock,0,headingX,headingY);
  placeEntity(hero,view.x,view.y);hero.style.zIndex=Math.round(view.y);hero.classList.toggle('attacking',attacking);hero.classList.toggle('guarded',(state.guard||0)>now());
  const perfNow=performance.now()/1000,vw=$('viewport').clientWidth/scale,vh=$('viewport').clientHeight/scale,pad=innerWidth<700?180:260,left=cam.x-pad,right=cam.x+vw+pad,top=cam.y-pad,bottom=cam.y+vh+pad;
  for(const e of enemies.values()){
   const age=Math.min(.12,Math.max(0,perfNow-(e.sampleAt||perfNow))),tx=e.x+(e.netVx||0)*age,ty=e.y+(e.netVy||0)*age,onScreen=tx>=left&&tx<=right&&ty>=top&&ty<=bottom;
   if(!onScreen){e.vx=tx;e.vy=ty;if(e.renderVisible!==false){e.el.style.visibility='hidden';e.renderVisible=false;}continue;}
   if(e.renderVisible===false){e.el.style.visibility='';e.renderVisible=true;}
   const f=1-Math.exp(-19*dt);e.vx+=(tx-e.vx)*f;e.vy+=(ty-e.vy)*f;placeEntity(e.el,e.vx,e.vy);e.el.style.zIndex=Math.round(e.vy);
   const col=e.tellAt?3:1+Math.floor(clock*8)%2,row=e.mmo?({stoneking:0,shadowking:1,dragon:2}[e.named]??e.skin??3):(e.boss?1:0),rows=e.mmo?4:2,key=col+'|'+row+'|'+rows;
   if(e.renderSpriteKey!==key){sprite(e.art,col,row,rows);e.renderSpriteKey=key;}
  }
  for(const p of peers.values()){
   const age=Math.min(.12,Math.max(0,perfNow-(p.sampleAt||perfNow))),tx=p.x+(p.netVx||0)*age,ty=p.y+(p.netVy||0)*age,onScreen=tx>=left&&tx<=right&&ty>=top&&ty<=bottom;
   if(!onScreen){p.vx=tx;p.vy=ty;if(p.renderVisible!==false){p.el.style.visibility='hidden';p.renderVisible=false;}continue;}
   if(p.renderVisible===false){p.el.style.visibility='';p.renderVisible=true;}
   const f=1-Math.exp(-17*dt);p.vx+=(tx-p.vx)*f;p.vy+=(ty-p.vy)*f;placeEntity(p.el,p.vx,p.vy);p.el.style.zIndex=Math.round(p.vy);p.el.classList.toggle('attacking',!!p.attacking);
   if(p.attacking){if(!p.localAttackStarted||clock-p.localAttackStarted>.55){p.localAttackStarted=clock;const target=fxTarget(p.attackTarget),origin={x:p.vx,y:p.vy};if((p.attackSkill??-1)>=0)skillEffect(p.job,p.attackSkill,target,origin);else if(target)combatContact(p.job,-1,target,origin);}attackPose(p.el,p.art,p.face,p.flip,p.localAttackStarted,.44,p.job,p.attackSkill??-1,(Number(String(p.id).slice(-2).replace(/\D/g,''))||0)%3,p.dirX??0,p.dirY??0);}
   else{p.localAttackStarted=0;motion(p.el,p.art,p.moving?'walk':'idle',p.face,p.flip,clock,(Number(String(p.id).slice(-2).replace(/\D/g,''))||0)*.13,p.dirX??0,p.dirY??0);}
  }
  if(targetIntent){targetIntent=null;}
  nearNpc=state.zone==='surface'?npcs.find(n=>distance(view,n)<115)||null:null;
  if(gatherIntent){const n=systems.nodes.find(n=>n.id===gatherIntent);if(n&&distance(state,n)<95){gatherIntent=null;command({type:'gather',node:n.id});}}
  if(npcIntent&&nearNpc?.id===npcIntent&&!path.length){const id=npcIntent;npcIntent=null;talk(id);}
  for(const el of portalEls.values()){const p=el.portal,d=p?distance(view,p):9999;el.classList.toggle('near',d<190);el.classList.toggle('very-near',d<105);}
  if(travelIntent)travelIntent=null;
  syncBossSector();camera(false,dt);if(clock-hudAt>.1){hud();if(clock-minimapAt>.18){renderMinimap();minimapAt=clock;}hudAt=clock;}
 }
 requestAnimationFrame(frame);
}
const invite=new URL(location.href).searchParams.get('channel');if(invite&&/^[A-Za-z0-9가-힣_-]{2,16}$/.test(invite))$('channelInput').value=invite;
try{soundOn=localStorage.getItem('junja-adventure-sound')==='1';}catch{}$('soundBtn').setAttribute('aria-pressed',String(soundOn));$('soundBtn').querySelector('small').textContent=soundOn?'ON':'OFF';document.addEventListener('pointerdown',async()=>{if(soundOn&&!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')await audioCtx.resume();setRegionAudio(state.zone);}},{once:true});
if(innerWidth<600){$('quest').classList.add('collapsed');$('questToggle').textContent='+';}resize();makeSkills();requestAnimationFrame(frame);if(token)showSelection();
window.__adventure={build:BUILD,snapshot:()=>({...state,systems:structuredClone(systems),connected,paused,auto,selected,peers:[...peers.values()].map(({id,name,x,y,job,equipment})=>({id,name,x,y,job,equipment})),enemies:[...enemies.values()].map(({id,x,y,hp,alive,boss})=>({id,x,y,hp,alive,boss}))})};
function syncMMO(){
 const dungeon=state.zone!=='surface';$('world').dataset.zone=state.zone;syncZoneDecor(state.zone);$('elder').hidden=$('merchant').hidden=dungeon;
 $('portal').textContent=ZONES[state.zone]?.name||state.zone;
 const activePortals=new Set();
 for(const p of TRAVEL_PORTALS[state.zone]||[]){
  activePortals.add(p.to);let el=portalEls.get(p.to);
  if(!el){el=document.createElement('button');el.className='world-portal';el.onclick=e=>{e.stopPropagation();const p=el.portal,z=ZONES[p.to];if(state.level<z.level){toast('입장 레벨 Lv.'+z.level+' 필요');return;}travelIntent=null;path=[];startWarp(p.label);command({type:'travel',zone:p.to});toast(p.label+' 순간이동');};$('world').append(el);portalEls.set(p.to,el);}
  el.portal=p;el.style.left=p.x+'px';el.style.top=p.y+'px';el.dataset.to=p.to;el.dataset.direction=p.y>1200?'forward':'back';el.classList.toggle('locked',state.level<ZONES[p.to].level);el.innerHTML='<i></i><b>'+esc(p.label)+'</b><small>'+(p.y>1200?'다음 지역':'이전 지역')+' · 순간이동 · Lv.'+ZONES[p.to].level+'</small>';el.disabled=false;
 }
 for(const [id,el] of portalEls)if(!activePortals.has(id)){el.remove();portalEls.delete(id);}
 const ids=new Set();for(const n of systems.nodes){ids.add(n.id);let el=resourceEls.get(n.id);if(!el){el=document.createElement('button');el.className='resource';el.dataset.node=n.id;el.onclick=e=>{e.stopPropagation();const n=el.node;if(n.readyAt>now()){toast('재생까지 '+Math.ceil(n.readyAt-now())+'초');return;}if(distance(state,n)>100){gatherIntent=n.id;go(n.x,n.y);toast(MATERIALS[n.material]+' 채집 지점으로 이동');}else command({type:'gather',node:n.id});};$('resourceLayer').append(el);resourceEls.set(n.id,el);}el.node=n;el.style.left=n.x+'px';el.style.top=n.y+'px';el.style.zIndex=Math.round(n.y);el.classList.toggle('depleted',n.readyAt>now());el.textContent=({wood:'🌳',stone:'🪨',ore:'⛏',crystal:'💎'})[n.material]+' '+MATERIALS[n.material]+(n.readyAt>now()?' · '+Math.ceil(n.readyAt-now())+'초':' · 채집');}for(const [id,el] of resourceEls)if(!ids.has(id)){el.remove();resourceEls.delete(id);}const active=systems.trade||systems.duel;$('socialAlert').hidden=!active;$('socialAlert').textContent=active?(systems.trade?'거래 요청·진행 확인':'PVP 대련 확인'):'';const d=systems.duel;$('duelHud').hidden=!d?.accepted;if(d?.accepted){const other=d.players.find(id=>id!==state.id);$('duelHud').textContent=(now()<d.start?'대련 시작 '+Math.ceil(d.start-now())+'초':'대련 중')+' · 나 '+d.health[state.id]+' / 상대 '+d.health[other];}if(mmoPanel==='trade')renderTradeSummary();if(mmoPanel==='duel')renderDuelSummary();}
function adventureWindow(){
 const mats=Object.entries(MATERIALS).map(([k,n])=>n+' '+state.materials[k]).join(' · '),portals=TRAVEL_PORTALS[state.zone]||[];
 const route=Object.entries(ZONES).map(([id,z])=>'<p class="route-row '+(id===state.zone?'current':'')+'"><b>'+esc(z.name)+'</b> · 권장 Lv.'+z.level+(id===state.zone?' · <strong>현재 지역</strong>':'')+'</p>').join('');
 const travelActions=portals.map(p=>{const z=ZONES[p.to],locked=state.level<z.level,direction=p.y>1200?'다음 지역':'이전 지역';return [(locked?'🔒 ':'⚡ ')+p.label+' · '+direction+(locked?' · Lv.'+z.level+' 필요':' · 즉시 이동'),()=>{if(locked){toast('Lv.'+z.level+'부터 '+p.label+' 이동 가능');return;}travelIntent=null;path=[];startWarp(p.label);command({type:'travel',zone:p.to});toast(p.label+' 순간이동');}];});
 modal('지도 · 지역 이동',`<p><b>${ZONES[state.zone]?.name||state.zone}</b>에서 이동할 지역을 바로 선택하세요.</p><p>지역 버튼 또는 필드 포탈을 누르면 <b>걸어가지 않고 즉시 순간이동</b>합니다.</p><p>Lv.${state.level} / ${LEVEL_CAP} · ${jobName(state)}</p><p>${mats}</p><div class="world-route">${route}</div>`,[...travelActions,['일일 임무',dailyWindow],['제작',craftWindow],['네임드 등장 시간',bossWindowUI]]);
}
function dailyWindow(){const d=systems.daily||{hunt:0,gather:0,dungeon:0,claimed:[]};modal('일일 임무 · '+(d.day||''),'<p>한국 시간 자정에 갱신됩니다. 임무는 자동 집계하고 촌장 가까이에서 보상받습니다.</p>'+Object.entries(DAILY_TASKS).map(([id,r])=>`<p><b>${r.name}</b> ${d[id]} / ${r.goal} · ${d.claimed.includes(id)?'수령 완료':r.gold+' G, EXP '+(r.xp+state.level*10)}</p>`).join(''),[['촌장 찾아가기',()=>seekNpc('elder')],...Object.entries(DAILY_TASKS).filter(([id,r])=>d[id]>=r.goal&&!d.claimed.includes(id)).map(([id,r])=>[r.name+' 보상 받기',()=>command({type:'dailyClaim',task:id})])]);}
function craftWindow(){modal('제작 공방',`<p>상인 가까이에서 제작합니다. 보유 ${state.gold.toLocaleString()} G</p><p>${Object.entries(MATERIALS).map(([k,n])=>n+' '+state.materials[k]).join(' · ')}</p>`+Object.entries(RECIPES).map(([id,r])=>`<div class="recipe"><b>${esc(r.name)} · Lv.${r.level}</b><p>${Object.entries(r.materials).map(([k,n])=>MATERIALS[k]+' '+state.materials[k]+'/'+n).join(' · ')} · ${r.gold.toLocaleString()} G</p><button data-craft="${id}" ${state.level<r.level||state.gold<r.gold||Object.entries(r.materials).some(([k,n])=>state.materials[k]<n)?'disabled':''}>${esc(r.name)} 제작</button></div>`).join(''),[['상인 찾아가기',()=>seekNpc('merchant')]]);document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=async()=>{await command({type:'craft',recipe:b.dataset.craft});closeModal();});}
function bossWindowUI(){modal('네임드 · 한국 시간',`<p>각 등장 회차는 1시간 동안 열립니다. 처치되면 다음 회차까지 기다립니다. 서버가 쉬고 있어도 해당 시간에 접속하면 등장합니다.</p>${systems.bosses.map(b=>`<div class="recipe"><b>${esc(b.name)} · Lv.${b.level}</b><p>${ZONES[b.zone].name} · ${b.hours.map(h=>String(h).padStart(2,'0')+':00').join(' / ')} · 하루 ${b.hours.length}회</p><p>${b.active?'등장 시간 진행 중':'다음 등장 '+new Date(b.next*1000).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 전설 장비 1%</p></div>`).join('')}<p>유효한 공격·회복 참여자에게 개인별 보상. 같은 회차 보상은 채널 변경·재접속으로 중복 수령할 수 없습니다. 전설 장비는 Lv.99부터 착용합니다.</p>`,[['모험 메뉴',adventureWindow]]);}
async function rankingWindow(){
 modal('랭킹 현황판','<p>전체 랭킹을 불러오는 중입니다…</p>');
 try{
  const data=await api('ranking'),rows=data.ranking||[];
  if($('modal').hidden||$('modalTitle').textContent!=='랭킹 현황판')return;
  $('modalBody').innerHTML=`<p>계정별 가장 성장한 캐릭터 기준 · 내 순위 <b>${data.selfRank||'-'}위</b> / ${data.total||0}명</p><div class="ranking-board">${rows.map(r=>`<div class="rank-row ${r.online?'online':''}"><strong>${r.position}</strong><span><b>${esc(r.name)}</b><small>${r.online?'● 접속중 · ':''}${esc(jobName({job:r.job,rank:r.rank}))} · Lv.${r.level}</small></span><em>전투력 ${Number(r.power||0).toLocaleString()}</em><small>보스 ${r.bossKills||0} · 처치 ${r.kills||0} · PVP ${r.pvpWins||0}</small></div>`).join('')||'<p>아직 랭킹 기록이 없습니다.</p>'}</div><p class="ranking-note">동레벨은 승급 → 경험치 → 보스 처치 → 일반 처치 → PVP 순으로 정렬됩니다.</p>`;
 }catch(e){if(!$('modal').hidden)$('modalBody').innerHTML='<p>'+esc(e.message)+'</p>';}
}
function socialWindow(){modal('유저 · PVP · 아이템 거래',`<p>가까운 유저에게 초대하세요. PVP는 상대가 수락한 뒤 3초 후 시작합니다. 마을에서 대련하며 별도 체력 1000을 사용하고 경험치·골드·장비를 잃지 않습니다.</p><p>거래는 같은 지역 220거리 안에서 진행합니다. 장착 중인 장비와 수련·퀘스트 무기는 거래할 수 없습니다.</p><div class="player-list">${[...peers.values()].map(p=>`<div><b>${esc(p.name)} · Lv.${p.level}</b><button data-duel="${esc(p.id)}">PVP 신청</button><button data-trade="${esc(p.id)}">거래 신청</button></div>`).join('')||'같은 지역에 다른 유저가 없습니다.'}</div><p>내 대련 승리 ${state.pvpWins||0}회 · 레벨·장비에 따른 PVP 보너스는 최대 15%로 제한합니다.</p>`,[[systems.trade?'진행 중인 거래':'거래 확인',tradeWindow],[systems.duel?'진행 중인 대련':'대련 확인',duelWindow]]);document.querySelectorAll('[data-duel],[data-trade]').forEach(b=>b.onclick=()=>{command({type:b.dataset.duel?'duelInvite':'tradeInvite',player:b.dataset.duel||b.dataset.trade});closeModal();});}
function offerText(o){return `${(o?.gold||0).toLocaleString()} G · ${(o?.items||[]).map(id=>esc(ITEMS[id].name)).join(', ')||'장비 없음'} · ${Object.entries(o?.materials||{}).filter(([,n])=>n>0).map(([k,n])=>MATERIALS[k]+' '+n).join(', ')||'재료 없음'}`;}
function renderTradeSummary(){const el=$('tradeSummary'),t=systems.trade;if(!el)return;if(!t){el.innerHTML='<p>거래가 종료되었습니다.</p>';return;}const other=t.players.find(id=>id!==state.id);el.innerHTML=`<p>내 제안: ${offerText(t.offers[state.id])}</p><p>상대 제안: ${offerText(t.offers[other])}</p><p>확인 ${t.confirmed.length}/2 · ${t.confirmed.includes(state.id)?'내 최종 확인 완료':'제안을 등록하고 최종 확인하세요.'}</p><p>제안이 바뀌면 양쪽 확인이 취소됩니다. 두 번째 확인 즉시 거래를 저장합니다.</p>`;}
function tradeWindow(){const t=systems.trade;if(!t){toast('진행 중인 거래가 없습니다.');return;}const received=t.from!==state.id&&!t.accepted;const reserved=new Set(Object.values(state.equipment));const items=state.bag.filter(id=>{if(id==='training'||id==='glowing')return false;if(reserved.has(id)){reserved.delete(id);return false;}return true;}).slice(0,80);modal('아이템 거래',`<div id="tradeSummary"></div>${t.accepted?`<form id="tradeForm"><label>보낼 골드<input id="tradeGold" type="number" min="0" max="${state.gold}" step="1" value="${t.offers[state.id].gold}"></label><p>보낼 장비 선택 · 최대 8개</p><div class="trade-items">${items.map((id,i)=>`<label><input type="checkbox" name="tradeItem" value="${id}">${esc(ITEMS[id].name)}</label>`).join('')||'<p>거래 가능한 장비가 없습니다.</p>'}</div>${Object.entries(MATERIALS).map(([k,n])=>`<label>${n} · 보유 ${state.materials[k]}<input data-material="${k}" type="number" min="0" max="${state.materials[k]}" step="1" value="${t.offers[state.id].materials[k]||0}"></label>`).join('')}<button type="submit">거래 제안 등록</button></form>`:'<p>'+ (received?'상대가 거래를 신청했습니다.':'상대의 수락을 기다립니다.')+'</p>'}`,[...(received?[['거래 수락',async()=>{await command({type:'tradeAccept',id:t.id});setTimeout(tradeWindow,250);}]]:[]),...(t.accepted?[['양쪽 제안 최종 확인',()=>command({type:'tradeConfirm',id:t.id})]]:[]),['거래 취소',()=>command({type:'tradeCancel',id:t.id})]]);mmoPanel='trade';renderTradeSummary();if($('tradeForm'))$('tradeForm').onsubmit=async e=>{e.preventDefault();const materials={};document.querySelectorAll('[data-material]').forEach(el=>materials[el.dataset.material]=Number(el.value));await command({type:'tradeOffer',id:t.id,gold:Number($('tradeGold').value),items:[...document.querySelectorAll('[name=tradeItem]:checked')].map(el=>el.value),materials});};}
function renderDuelSummary(){const el=$('duelSummary'),d=systems.duel;if(!el)return;el.textContent=!d?'대련이 종료되었습니다.':d.accepted?'나 '+d.health[state.id]+' · 상대 '+d.health[d.players.find(id=>id!==state.id)]+' · 창을 닫고 공격·스킬 버튼으로 대련하세요.':'상대의 수락을 기다리고 있습니다.';}
function duelWindow(){const d=systems.duel;if(!d){toast('진행 중인 대련이 없습니다.');return;}modal('PVP 대련','<p id="duelSummary"></p><p>별도 체력 1000 · 마을 안에서 전투 · 최대 2분. 상대와 멀어지거나 접속이 끊기면 취소됩니다.</p>',[...(d.from!==state.id&&!d.accepted?[['대련 수락',()=>command({type:'duelAccept',id:d.id})]]:[]),['대련 취소',()=>command({type:'duelCancel',id:d.id})]]);mmoPanel='duel';renderDuelSummary();}
$('adventureBtn').onclick=adventureWindow;$('rankingBtn').onclick=rankingWindow;$('socialBtn').onclick=socialWindow;$('socialAlert').onclick=()=>systems.trade?tradeWindow():duelWindow();
