import {randomUUID,randomInt} from 'node:crypto';
import {clamp,distance,walkable,pathfind} from '../../image-prototype/core.js';
import {profile,JOBS,ITEMS,stats,gainXp,rollLoot,equip,claim} from '../../image-prototype/catalog.js';
import {CHANNEL_CAP,WORLD_CAP,NAMED,bossWindow,PROMOTIONS,ZONES} from '../../image-prototype/mmo-data.js';
import {initSystems,mmoAction,tickSystems,snapshotSystems,progress,removeSocial,socialId} from './systems.mjs';
export class World{
 constructor({random=()=>randomInt(1000000)/1000000,now=()=>Date.now()/1000,onDirty=()=>{},onExchange=async()=>{},onUrgent=()=>{}}={}){this.random=random;this.now=now;this.onDirty=onDirty;this.onExchange=onExchange;this.onUrgent=onUrgent;this.jobs=JOBS;initSystems(this);this.players=new Map();this.channels=new Map();this.events=[];}
 channel(name,zone='surface'){
  const key=name+'|'+zone;if(!this.channels.has(key)){
   const cfg={
    surface:{tier:1,names:['들다람쥐','갈색 다람쥐','들토끼'],elite:'정예 · 붉은발톱',boss:'왕꼬리 다람쥐'},
    grove:{tier:8,names:['검은꼬리','숲너구리','독버섯 요괴'],elite:'정예 · 가시송곳니',boss:'고목의 수호수'},
    cave:{tier:30,names:['수정 마수','동굴박쥐','수정골렘'],elite:'정예 · 수정 파수꾼',boss:'수정 동굴주'},
    ruins:{tier:60,names:['폐허 망령','붉은 갑주병','저주받은 석상'],elite:'정예 · 피의 기사',boss:'폐허의 집행자'},
    abyss:{tier:100,names:['심연 사냥꾼','그림자 악귀','공허의 눈'],elite:'정예 · 암흑 추적자',boss:'심연 파수왕'},
    celestial:{tier:200,names:['천룡 수호병','별빛 정령','청룡의 혼'],elite:'정예 · 천계 무장',boss:'천룡 수문장'}
   }[zone]||{tier:1,names:['마수'],elite:'정예 마수',boss:'수호자'};
   const spots=[
    [360,690],[515,735],[675,690],[845,740],[1010,695],[1170,760],[430,900],[690,920],
    [360,1195],[520,1270],[690,1205],[855,1300],[1030,1215],[1180,1370],[470,1440],[785,1435],
    [340,1685],[510,1760],[675,1695],[835,1785],[1010,1705],[1180,1820],[505,1885],[940,1880]
   ];
   const mobs=spots.map(([x,y],id)=>{const sector=Math.floor(id/8),level=cfg.tier+sector*3+Math.floor((id%8)/4),name=cfg.names[id%cfg.names.length],hp=Math.round((72+level*10)*(1+sector*.18+(id%8)*.018));return {id,x,y,homeX:x,homeY:y,zone,level,name,skin:(id+sector)%4,hp,max:hp,boss:false,alive:true,next:0,tellAt:0,respawn:0,slow:0,tags:new Map()};});
   for(const [j,[x,y]] of [[0,[1160,930]],[1,[350,1400]],[2,[1160,1480]],[3,[360,1870]]]){const id=40+j,level=cfg.tier+10+j*5,hp=level*165;mobs.push({id,x,y,homeX:x,homeY:y,zone,level,name:cfg.elite,skin:(j+2)%4,hp,max:hp,elite:true,boss:false,alive:true,next:0,tellAt:0,respawn:0,slow:0,tags:new Map()});}
   const bossLevel=cfg.tier+20,bossHp=Math.max(1100,bossLevel*195);mobs.push({id:60,x:760,y:1815,homeX:760,homeY:1815,zone,level:bossLevel,name:cfg.boss,skin:3,hp:bossHp,max:bossHp,boss:true,alive:true,next:0,tellAt:0,respawn:0,slow:0,tags:new Map()});
   for(const [i,b] of NAMED.entries())if(b.zone===zone)mobs.push({id:80+i,x:b.x,y:b.y,homeX:b.x,homeY:b.y,zone,level:b.level,name:b.name,hp:b.hp,max:b.hp,damage:b.damage,boss:true,named:b.id,alive:false,next:0,tellAt:0,respawn:0,slow:0,tags:new Map(),window:''});
   this.channels.set(key,mobs);
  }return this.channels.get(key);
 }

 add(id,name,raw,channel='준자마을',slot=0){if(this.players.size>=WORLD_CAP&&!this.players.has(id))throw Error('현재 접속 인원이 가득 찼습니다.');if([...this.players.values()].filter(p=>p.channel===channel&&p.id!==id).length>=CHANNEL_CAP)throw Error('채널 정원은 48명입니다. 다른 채널을 선택하세요.');const p={id,name,state:profile(raw),channel,slot,input:{x:0,y:0},navPath:[],auto:false,face:0,flip:false,dirX:0,dirY:1,attackSkill:-1,attackTarget:null,attackUntil:0,nextAttack:0,cooldowns:[0,0,0,0],guard:0,lastInput:0,lastChat:0};if(distance(p.state,{x:768,y:355})<30){const others=[...this.players.values()].filter(q=>q.channel===channel);const points=[[0,0],[90,0],[-90,0],[0,65],[90,65],[-90,65],[180,0],[-180,0],[180,65],[-180,65]];const free=points.map(([dx,dy])=>({x:768+dx,y:355+dy})).find(pos=>others.every(q=>distance(q.state,pos)>65));if(free)Object.assign(p.state,free);}this.channel(channel,p.state.zone);this.players.set(id,p);return p;}
 dirty(p){this.onDirty(p);}
 event(p,text,kind='info'){this.events.push({id:randomUUID(),channel:p.channel,to:p.id,text,kind});if(this.events.length>100)this.events.shift();}
 action(p,data){const now=this.now(),s=p.state,kind=data.type;const mmo=mmoAction(this,p,data);if(mmo)return mmo;if(socialId(this,p)&&['potion','attack','home','auto'].includes(kind)){if(kind==='attack'&&[...this.duels.values()].some(t=>t.accepted&&t.players.includes(p.id)))return mmoAction(this,p,{type:'duelAttack',skill:data.skill??-1});if(kind==='home')removeSocial(this,p);else return;}
  if(kind==='navigate'){const x=Number(data.x),y=Number(data.y);if(!Number.isFinite(x)||!Number.isFinite(y))return;p.navPath=pathfind(s,{x,y});p.input={x:0,y:0};p.auto=false;return;}
  if(kind==='move'){if(p.navPath.length&&!data.manual)return;if(data.manual)p.navPath=[];const x=Number(data.x),y=Number(data.y);if(!Number.isFinite(x)||!Number.isFinite(y))return;p.input={x:clamp(x,-1,1),y:clamp(y,-1,1)};const d=Math.hypot(x,y);if(d>.01){p.dirX=x/d;p.dirY=y/d;}p.lastInput=now;return;}
  if(kind==='auto'){p.auto=!!data.on;p.navPath=[];p.input={x:0,y:0};return;}
  if(kind==='attack'){return this.attack(p,Number.isInteger(data.skill)?data.skill:-1,data.target);}
  if(kind==='home'){s.zone='surface';s.x=768;s.y=350;s.hp=stats(s).hp;p.input={x:0,y:0};p.navPath=[];p.auto=false;this.dirty(p);return;}
  if(kind==='potion'){if(s.potions>0&&s.hp<stats(s).hp){s.potions--;s.hp=Math.min(stats(s).hp,s.hp+stats(s).hp*.5);this.dirty(p);}return;}
  if(kind==='equip'){if(equip(s,data.item))this.dirty(p);else this.event(p,'보유 아이템과 장착 레벨을 확인하세요.');return;}
  if(kind==='unequip'){if(data.slot!=='weapon'&&s.equipment[data.slot]){delete s.equipment[data.slot];s.hp=Math.min(s.hp,stats(s).hp);this.dirty(p);}return;}
  if(kind==='quest'){if(s.zone!=='surface')return;if(distance(s,{x:580,y:330})>145){this.event(p,'촌장 가까이에서 대화하세요.');return;}if(s.quest==='available'){s.quest='active';s.questKills=0;}else if(s.quest==='complete'){s.quest='bossActive';}else claim(s);this.dirty(p);return;}
  if(kind==='buy'){if(s.zone!=='surface')return;if(distance(s,{x:1000,y:330})>145)return;const costs={potion:30,heal:20,leather:120,hood:100,boots:80,cape:180};const cost=Object.hasOwn(costs,data.item)?costs[data.item]:null;if(!cost||s.gold<cost){this.event(p,'골드가 부족합니다.');return;}if(ITEMS[data.item]&&s.bag.length>=80){this.event(p,'가방이 가득 찼습니다.');return;}s.gold-=cost;if(data.item==='potion')s.potions++;else if(data.item==='heal')s.hp=stats(s).hp;else s.bag.push(data.item);this.dirty(p);return;}
  if(kind==='promote'){if(s.zone!=='surface'||distance(s,{x:580,y:330})>145)return;const r=PROMOTIONS[s.rank];if(!r){this.event(p,'최종 전직을 마쳤습니다.');return;}if(s.level<r.level||s.bossKills<r.bosses){this.event(p,r.level+'레벨과 보스 '+r.bosses+'회 처치가 필요합니다.');return;}s.rank++;s.hp=stats(s).hp;this.dirty(p);this.event(p,JOBS[s.job].title+' '+s.rank+'차 전직 완료!');return;}
  if(kind==='job'){if(s.zone!=='surface')return;if(distance(s,{x:580,y:330})>145)return;if(s.level<10||!Object.hasOwn(JOBS,data.job)||s.job===data.job)return;if(s.gold<500){this.event(p,'직업 변경에는 500 G가 필요합니다.');return;}s.gold-=500;s.job=data.job;p.cooldowns=[now+5,now+5,now+5,now+5];s.hp=Math.min(s.hp,stats(s).hp);this.dirty(p);this.event(p,JOBS[s.job].name+' 직업으로 변경했습니다. 성장과 장비는 유지됩니다.');return;}
  if(kind==='chat'){if(now-p.lastChat<1)return;const text=String(data.text||'').trim().slice(0,100);if(!text)return;p.lastChat=now;this.events.push({id:randomUUID(),channel:p.channel,text:p.name+': '+text,kind:'chat'});if(this.events.length>100)this.events.shift();}
 }
 attack(p,index=-1,targetId){const now=this.now(),s=p.state,job=JOBS[s.job],st=stats(s);if(now<p.nextAttack)return;const skill=index>=0?job.skills[index]:null;if(index>=0&&(!skill||s.level<skill[1]||(index===3&&!s.rank)||now<p.cooldowns[index]))return;
  if(skill&&['heal','partyHeal','guard','partyGuard'].includes(skill[4])){
   const friends=[...this.players.values()].filter(q=>q.channel===p.channel&&q.state.zone===s.zone&&distance(q.state,s)<300);
   if(skill[4]==='guard')p.guard=now+7;
   else if(skill[4]==='partyGuard'){for(const q of friends)q.guard=now+7;}
   else for(const q of friends){const amount=stats(q.state).hp*(skill[4]==='partyHeal'?.6:.35);const healed=Math.min(amount,stats(q.state).hp-q.state.hp);if(healed<=0)continue;q.state.hp+=healed;this.dirty(q);for(const e of this.channel(p.channel,p.state.zone))if(e.tags.has(q.id)&&e.alive&&distance(e,s)<450)e.tags.set(p.id,{damage:(e.tags.get(p.id)?.damage||0),support:true,at:now});}
   p.cooldowns[index]=now+skill[2];p.nextAttack=now+.4;p.attackSkill=index;p.attackTarget=null;p.attackUntil=now+.44;this.event(p,skill[0]+' 사용');return;
  }
  const mobs=this.channel(p.channel,p.state.zone);let e=mobs.find(e=>e.id===targetId&&e.alive);if(!e)e=mobs.filter(e=>e.alive&&distance(s,e)<=st.range).sort((a,b)=>distance(s,a)-distance(s,b))[0];if(!e||distance(s,e)>st.range)return;
  const range=skill&&['area','slow'].includes(skill[4])?180:0;const targets=range?mobs.filter(t=>t.alive&&distance(t,e)<range):[e];const power=Math.round(st.atk*(skill?skill[3]:1));
  p.nextAttack=now+(skill?.6:job===JOBS.rogue?.38:.48);p.attackSkill=index;p.attackTarget=e.id;p.attackUntil=now+.44;p.input={x:0,y:0};p.navPath=[];if(skill)p.cooldowns[index]=now+skill[2];const adx=e.x-s.x,ady=e.y-s.y,alen=Math.hypot(adx,ady)||1;p.dirX=adx/alen;p.dirY=ady/alen;p.face=Math.abs(adx)>Math.abs(ady)?2:ady<0?1:0;p.flip=p.face===2&&adx<0;
  for(const t of targets){t.hp=Math.max(0,t.hp-power);const tag=t.tags.get(p.id)||{damage:0};t.tags.set(p.id,{damage:tag.damage+power,at:now});if(skill?.[4]==='slow')t.slow=now+5;if(t.hp===0)this.kill(t,p.channel);}
  if(skill?.[4]==='drain'){s.hp=Math.min(st.hp,s.hp+power*.5);this.dirty(p);}
 }
 kill(e,channel){const now=this.now();e.alive=false;e.tellAt=0;e.respawn=now+(e.boss?300:e.elite?180:30);if(e.named)e.respawn=Infinity;for(const [id,tag] of e.tags){const p=this.players.get(id);if(!p||p.channel!==channel||p.state.zone!==e.zone||distance(p.state,e)>600||now-tag.at>45||(!tag.support&&tag.damage<(e.boss?25:1)))continue;const s=p.state;if(e.named){const key=e.named+':'+e.window;if(s.bossClaims.includes(key)){this.event(p,'이번 등장 보상은 이미 받았습니다.');continue;}s.bossClaims.push(key);s.bossClaims=s.bossClaims.slice(-12);}s.kills++;const factor=e.zone==='surface'?1:e.level;const xp=e.named?e.level*120:e.elite?e.level*35:e.boss?120*factor:20*factor;s.gold+=e.named?e.level*20:e.elite?e.level*8:e.boss?(e.zone==='surface'?150:150+e.level*8):(e.zone==='surface'?25:25+e.level*2);progress(this,p,'hunt');if(s.zone!=='surface'){progress(this,p,'dungeon');if(this.random()<.2){s.materials.crystal=Math.min(100000,s.materials.crystal+1);this.event(p,'던전 수정 획득');}}if(e.named&&this.random()<.25){s.materials.stardust=Math.min(100000,s.materials.stardust+1);this.event(p,'별빛 파편 획득');}s.tails+=e.boss?3:1;const leveled=gainXp(s,xp);if(s.quest==='active'){s.questKills++;if(s.questKills>=10)s.quest='ready';}if(e.boss){s.bossKills++;if(s.quest==='bossActive'&&e.zone==='surface'){s.questBoss++;s.quest='bossReady';}}
   const item=e.named&&this.random()<.01?['astralblade','astralarmor','astralcape'][Math.min(2,Math.floor(this.random()*3))]:e.elite&&this.random()<.15?(e.zone==='surface'?'ironblade':this.random()<.5?'crystalblade':'crystalarmor'):rollLoot(e.boss,this.random);if(item&&s.bag.length<80){s.bag.push(item);this.event(p,ITEMS[item].name+' 획득!',['rare','legendary'].includes(ITEMS[item].rarity)?'rare':'loot');}else if(item){s.gold+=100;this.event(p,'가방이 가득 차 장비 대신 100 G를 받았습니다.');}
   this.event(p,e.name+' 공동 처치 · '+(leveled?'레벨 업!':'EXP +'+xp));this.dirty(p);if(e.named)p.urgentSave=this.onUrgent(p);
  }e.tags.clear();}
 tick(dt=.1){const now=this.now();tickSystems(this);for(const p of this.players.values()){if(p.exchangeBusy)continue;
  let {x:dx,y:dy}=p.input;const s=p.state;if(now-p.lastInput>.6)dx=dy=0;
  if(p.navPath.length&&!p.auto){const point=p.navPath[0],d=distance(s,point);if(d<=250*dt){s.x=point.x;s.y=point.y;p.navPath.shift();dx=dy=0;}else{dx=point.x-s.x;dy=point.y-s.y;}}
  if(p.auto&&s.y>590){const e=this.channel(p.channel,p.state.zone).filter(e=>e.alive&&!e.boss).sort((a,b)=>distance(a,s)-distance(b,s))[0];if(e){if(distance(s,e)<=stats(s).range*.8){this.attack(p,-1,e.id);dx=dy=0;}else{const point=pathfind(s,e)[0]||e;dx=point.x-s.x;dy=point.y-s.y;}}}
  if(now>=p.attackUntil){const d=Math.hypot(dx,dy);if(d>.01){const nx=dx/d,ny=dy/d,x=s.x+nx*250*dt,y=s.y+ny*250*dt;if(walkable(x,s.y))s.x=x;if(walkable(s.x,y))s.y=y;p.dirX=nx;p.dirY=ny;p.face=Math.abs(dx)>Math.abs(dy)?2:dy<0?1:0;p.flip=p.face===2&&dx<0;}}
 }
 for(const [key,mobs] of this.channels){const [channel,zone]=key.split('|');const players=[...this.players.values()].filter(p=>p.channel===channel&&p.state.zone===zone&&!p.exchangeBusy);if(!players.length){continue;}for(const e of mobs){if(e.named){const config=NAMED.find(b=>b.id===e.named),window=bossWindow(config,now);if(!window.active){e.alive=false;e.tags.clear();e.tellAt=0;continue;}if(e.window!==window.key){e.window=window.key;e.alive=true;e.hp=e.max;e.x=e.homeX;e.y=e.homeY;e.tags.clear();}e.respawn=window.next;}if(!e.alive){if(!e.named&&now>=e.respawn){e.alive=true;e.hp=e.max;e.x=e.homeX;e.y=e.homeY;}continue;}const p=players.filter(p=>p.state.y>590&&distance(p.state,e)<(e.named?320:e.boss?260:e.elite?200:180)).sort((a,b)=>distance(a.state,e)-distance(b.state,e))[0];const d=p?distance(p.state,e):Infinity;
  if(e.tellAt){if(now>=e.tellAt){e.tellAt=0;e.next=now+(e.boss?2.8:2.1);for(const q of players){if(q.exchangeBusy||distance(q.state,e)>95||q.state.y<590)continue;const st=stats(q.state),hit=Math.max(2,(e.damage|| (e.elite?e.level*3:e.boss?26*e.level:9*e.level))-st.def);q.state.hp=Math.max(0,q.state.hp-Math.round(hit*(q.guard>now?.4:1)));if(q.state.hp===0){q.state.zone='surface';q.state.x=768;q.state.y=350;q.state.hp=st.hp;q.auto=false;q.navPath=[];q.input={x:0,y:0};this.event(q,'촌장이 치료했습니다. 성장과 장비는 유지됩니다.');}this.dirty(q);}}}
  else if(p&&d<=75&&now>=e.next)e.tellAt=now+(e.boss?1.1:.75);
  else if(p&&d>70){const speed=(e.boss?55:70)*dt*(e.slow>now?.4:1);e.x+=(p.state.x-e.x)/d*speed;e.y+=(p.state.y-e.y)/d*speed;}
  else{const dx=e.homeX+Math.sin(now*.45+e.id)*35-e.x,dy=e.homeY+Math.cos(now*.35+e.id)*20-e.y,d=Math.hypot(dx,dy);if(d>3){const speed=Math.min(24*dt,d);e.x+=dx/d*speed;e.y+=dy/d*speed;}}
  e.x=clamp(e.x,265,1270);e.y=clamp(e.y,625,1930);
 }}
 }
 snapshot(p){const now=this.now();return {now,...snapshotSystems(this,p),self:{...structuredClone(p.state),id:p.id,name:p.name,slot:p.slot,channel:p.channel,auto:p.auto,navMoving:p.navPath.length>0,cooldowns:p.cooldowns,nextAttack:p.nextAttack,guard:p.guard,dirX:p.dirX,dirY:p.dirY,attackSkill:p.attackSkill,attacking:p.attackUntil>now},players:[...this.players.values()].filter(q=>q.channel===p.channel&&q.state.zone===p.state.zone).map(q=>({id:q.id,name:q.name,x:Math.round(q.state.x*10)/10,y:Math.round(q.state.y*10)/10,job:q.state.job,rank:q.state.rank,level:q.state.level,equipment:{...q.state.equipment},hp:q.state.hp,maxHp:stats(q.state).hp,face:q.face,flip:q.flip,dirX:q.dirX,dirY:q.dirY,attackSkill:q.attackSkill,attackTarget:q.attackTarget,attacking:q.attackUntil>now,moving:Math.hypot(q.input.x,q.input.y)>.01||q.auto||q.navPath.length>0})),enemies:this.channel(p.channel,p.state.zone).map(({tags,homeX,homeY,next,slow,...e})=>({...e,x:Math.round(e.x*10)/10,y:Math.round(e.y*10)/10})),events:this.events.filter(e=>e.channel===p.channel&&(!e.to||e.to===p.id)).slice(-12)};}
}
