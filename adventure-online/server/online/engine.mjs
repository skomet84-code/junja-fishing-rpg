import {randomUUID,randomInt} from 'node:crypto';
import {clamp,distance,walkable,pathfind} from '../../image-prototype/core.js';
import {profile,JOBS,ITEMS,stats,gainXp,rollLoot,equip,claim} from '../../image-prototype/catalog.js';
export class World{
 constructor({random=()=>randomInt(1000000)/1000000,now=()=>Date.now()/1000,onDirty=()=>{}}={}){this.random=random;this.now=now;this.onDirty=onDirty;this.players=new Map();this.channels=new Map();this.events=[];}
 channel(name){if(!this.channels.has(name)){const mobs=[[600,720],[880,710],[1030,805],[580,870],[820,890],[1080,895]].map(([x,y],id)=>({id,x,y,homeX:x,homeY:y,hp:id===5?700:60,max:id===5?700:60,boss:id===5,alive:true,next:0,tellAt:0,respawn:0,slow:0,tags:new Map()}));this.channels.set(name,mobs);}return this.channels.get(name);}
 add(id,name,raw,channel='준자마을',slot=0){if(this.players.size>=64&&!this.players.has(id))throw Error('현재 접속 인원이 가득 찼습니다.');if([...this.players.values()].filter(p=>p.channel===channel&&p.id!==id).length>=24)throw Error('채널 정원은 24명입니다. 다른 채널을 선택하세요.');const p={id,name,state:profile(raw),channel,slot,input:{x:0,y:0},auto:false,face:0,flip:false,attackUntil:0,nextAttack:0,cooldowns:[0,0,0,0],guard:0,lastInput:0,lastChat:0};if(distance(p.state,{x:768,y:355})<30){const others=[...this.players.values()].filter(q=>q.channel===channel);const points=[[0,0],[90,0],[-90,0],[0,65],[90,65],[-90,65],[180,0],[-180,0],[180,65],[-180,65]];const free=points.map(([dx,dy])=>({x:768+dx,y:355+dy})).find(pos=>others.every(q=>distance(q.state,pos)>65));if(free)Object.assign(p.state,free);}this.channel(channel);this.players.set(id,p);return p;}
 dirty(p){this.onDirty(p);}
 event(p,text,kind='info'){this.events.push({id:randomUUID(),channel:p.channel,to:p.id,text,kind});if(this.events.length>100)this.events.shift();}
 action(p,data){const now=this.now(),s=p.state,kind=data.type;
  if(kind==='move'){const x=Number(data.x),y=Number(data.y);if(!Number.isFinite(x)||!Number.isFinite(y))return;p.input={x:clamp(x,-1,1),y:clamp(y,-1,1)};p.lastInput=now;return;}
  if(kind==='auto'){p.auto=!!data.on;p.input={x:0,y:0};return;}
  if(kind==='attack'){return this.attack(p,Number.isInteger(data.skill)?data.skill:-1,data.target);}
  if(kind==='home'){s.x=768;s.y=350;s.hp=stats(s).hp;p.input={x:0,y:0};p.auto=false;this.dirty(p);return;}
  if(kind==='potion'){if(s.potions>0&&s.hp<stats(s).hp){s.potions--;s.hp=Math.min(stats(s).hp,s.hp+stats(s).hp*.5);this.dirty(p);}return;}
  if(kind==='equip'){if(equip(s,data.item))this.dirty(p);return;}
  if(kind==='unequip'){if(data.slot!=='weapon'&&s.equipment[data.slot]){delete s.equipment[data.slot];s.hp=Math.min(s.hp,stats(s).hp);this.dirty(p);}return;}
  if(kind==='quest'){if(distance(s,{x:580,y:330})>145){this.event(p,'촌장 가까이에서 대화하세요.');return;}if(s.quest==='available'){s.quest='active';s.questKills=0;}else if(s.quest==='complete'){s.quest='bossActive';}else claim(s);this.dirty(p);return;}
  if(kind==='buy'){if(distance(s,{x:1000,y:330})>145)return;const costs={potion:30,heal:20,leather:120,hood:100,boots:80,cape:180};const cost=costs[data.item];if(!cost||s.gold<cost){this.event(p,'골드가 부족합니다.');return;}if(ITEMS[data.item]&&s.bag.length>=80){this.event(p,'가방이 가득 찼습니다.');return;}s.gold-=cost;if(data.item==='potion')s.potions++;else if(data.item==='heal')s.hp=stats(s).hp;else s.bag.push(data.item);this.dirty(p);return;}
  if(kind==='promote'){if(distance(s,{x:580,y:330})>145)return;if(s.level<10||s.bossKills<1){this.event(p,'10레벨과 왕꼬리 1회 처치가 필요합니다.');return;}if(s.rank){this.event(p,'이미 승급했습니다.');return;}s.rank=1;this.dirty(p);this.event(p,JOBS[s.job].title+' 승급 완료! 네 번째 스킬이 열렸습니다.');return;}
  if(kind==='job'){if(distance(s,{x:580,y:330})>145)return;if(s.level<10||!JOBS[data.job]||s.job===data.job)return;if(s.gold<500){this.event(p,'직업 변경에는 500 G가 필요합니다.');return;}s.gold-=500;s.job=data.job;p.cooldowns=[now+5,now+5,now+5,now+5];s.hp=Math.min(s.hp,stats(s).hp);this.dirty(p);this.event(p,JOBS[s.job].name+' 직업으로 변경했습니다. 성장과 장비는 유지됩니다.');return;}
  if(kind==='chat'){if(now-p.lastChat<1)return;const text=String(data.text||'').trim().slice(0,100);if(!text)return;p.lastChat=now;this.events.push({id:randomUUID(),channel:p.channel,text:p.name+': '+text,kind:'chat'});if(this.events.length>100)this.events.shift();}
 }
 attack(p,index=-1,targetId){const now=this.now(),s=p.state,job=JOBS[s.job],st=stats(s);if(now<p.nextAttack)return;const skill=index>=0?job.skills[index]:null;if(index>=0&&(!skill||s.level<skill[1]||(index===3&&!s.rank)||now<p.cooldowns[index]))return;
  if(skill&&['heal','partyHeal','guard','partyGuard'].includes(skill[4])){
   const friends=[...this.players.values()].filter(q=>q.channel===p.channel&&distance(q.state,s)<300);
   if(skill[4]==='guard')p.guard=now+7;
   else if(skill[4]==='partyGuard'){for(const q of friends)q.guard=now+7;}
   else for(const q of friends){const amount=stats(q.state).hp*(skill[4]==='partyHeal'?.6:.35);const healed=Math.min(amount,stats(q.state).hp-q.state.hp);if(healed<=0)continue;q.state.hp+=healed;this.dirty(q);for(const e of this.channel(p.channel))if(e.tags.has(q.id)&&e.alive&&distance(e,s)<450)e.tags.set(p.id,{damage:(e.tags.get(p.id)?.damage||0),support:true,at:now});}
   p.cooldowns[index]=now+skill[2];p.nextAttack=now+.4;p.attackUntil=now+.35;this.event(p,skill[0]+' 사용');return;
  }
  const mobs=this.channel(p.channel);let e=mobs.find(e=>e.id===targetId&&e.alive);if(!e)e=mobs.filter(e=>e.alive&&distance(s,e)<=st.range).sort((a,b)=>distance(s,a)-distance(s,b))[0];if(!e||distance(s,e)>st.range)return;
  const range=skill&&['area','slow'].includes(skill[4])?180:0;const targets=range?mobs.filter(t=>t.alive&&distance(t,e)<range):[e];const power=Math.round(st.atk*(skill?skill[3]:1));
  p.nextAttack=now+(skill?.6:job===JOBS.rogue?.38:.48);p.attackUntil=now+.34;p.input={x:0,y:0};if(skill)p.cooldowns[index]=now+skill[2];p.face=Math.abs(e.x-s.x)>Math.abs(e.y-s.y)?2:e.y<s.y?1:0;p.flip=p.face===2&&e.x<s.x;
  for(const t of targets){t.hp=Math.max(0,t.hp-power);const tag=t.tags.get(p.id)||{damage:0};t.tags.set(p.id,{damage:tag.damage+power,at:now});if(skill?.[4]==='slow')t.slow=now+5;if(t.hp===0)this.kill(t,p.channel);}
  if(skill?.[4]==='drain'){s.hp=Math.min(st.hp,s.hp+power*.5);this.dirty(p);}
 }
 kill(e,channel){const now=this.now();e.alive=false;e.tellAt=0;e.respawn=now+(e.boss?30:8);for(const [id,tag] of e.tags){const p=this.players.get(id);if(!p||p.channel!==channel||distance(p.state,e)>600||now-tag.at>45||(!tag.support&&tag.damage<(e.boss?25:1)))continue;const s=p.state;s.kills++;s.gold+=e.boss?150:25;s.tails+=e.boss?3:1;const leveled=gainXp(s,e.boss?120:20);if(s.quest==='active'){s.questKills++;if(s.questKills>=10)s.quest='ready';}if(e.boss){s.bossKills++;if(s.quest==='bossActive'){s.questBoss++;s.quest='bossReady';}}
   const item=rollLoot(e.boss,this.random);if(item&&s.bag.length<80){s.bag.push(item);this.event(p,ITEMS[item].name+' 획득!',ITEMS[item].rarity==='rare'?'rare':'loot');}else if(item){s.gold+=100;this.event(p,'가방이 가득 차 장비 대신 100 G를 받았습니다.');}
   this.event(p,(e.boss?'왕꼬리':'다람쥐')+' 공동 처치 · '+(leveled?'레벨 업!':'EXP +'+(e.boss?120:20)));this.dirty(p);
  }e.tags.clear();}
 tick(dt=.1){const now=this.now();for(const p of this.players.values()){
  let {x:dx,y:dy}=p.input;const s=p.state;if(now-p.lastInput>.6)dx=dy=0;
  if(p.auto&&s.y>590){const e=this.channel(p.channel).filter(e=>e.alive&&!e.boss).sort((a,b)=>distance(a,s)-distance(b,s))[0];if(e){if(distance(s,e)<=stats(s).range*.8){this.attack(p,-1,e.id);dx=dy=0;}else{const point=pathfind(s,e)[0]||e;dx=point.x-s.x;dy=point.y-s.y;}}}
  if(now>=p.attackUntil){const d=Math.hypot(dx,dy);if(d>.01){const x=s.x+dx/d*250*dt,y=s.y+dy/d*250*dt;if(walkable(x,s.y))s.x=x;if(walkable(s.x,y))s.y=y;p.face=Math.abs(dx)>Math.abs(dy)?2:dy<0?1:0;p.flip=p.face===2&&dx<0;}}
 }
 for(const [channel,mobs] of this.channels){const players=[...this.players.values()].filter(p=>p.channel===channel);if(!players.length){this.channels.delete(channel);continue;}for(const e of mobs){if(!e.alive){if(now>=e.respawn){e.alive=true;e.hp=e.max;e.x=e.homeX;e.y=e.homeY;}continue;}const p=players.filter(p=>p.state.y>590&&distance(p.state,e)<(e.boss?260:180)).sort((a,b)=>distance(a.state,e)-distance(b.state,e))[0];const d=p?distance(p.state,e):Infinity;
  if(e.tellAt){if(now>=e.tellAt){e.tellAt=0;e.next=now+(e.boss?2.8:2.1);for(const q of players){if(distance(q.state,e)>95||q.state.y<590)continue;const st=stats(q.state),hit=Math.max(2,(e.boss?26:9)-st.def);q.state.hp=Math.max(0,q.state.hp-Math.round(hit*(q.guard>now?.4:1)));if(q.state.hp===0){q.state.x=768;q.state.y=350;q.state.hp=st.hp;q.auto=false;q.input={x:0,y:0};this.event(q,'촌장이 치료했습니다. 성장과 장비는 유지됩니다.');}this.dirty(q);}}}
  else if(p&&d<=75&&now>=e.next)e.tellAt=now+(e.boss?1.1:.75);
  else if(p&&d>70){const speed=(e.boss?55:70)*dt*(e.slow>now?.4:1);e.x+=(p.state.x-e.x)/d*speed;e.y+=(p.state.y-e.y)/d*speed;}
  else{const dx=e.homeX+Math.sin(now*.45+e.id)*35-e.x,dy=e.homeY+Math.cos(now*.35+e.id)*20-e.y,d=Math.hypot(dx,dy);if(d>3){const speed=Math.min(24*dt,d);e.x+=dx/d*speed;e.y+=dy/d*speed;}}
  e.x=clamp(e.x,345,1190);e.y=clamp(e.y,640,925);
 }}
 }
 snapshot(p){const now=this.now();return {now,self:{...p.state,id:p.id,name:p.name,slot:p.slot,channel:p.channel,auto:p.auto,cooldowns:p.cooldowns,nextAttack:p.nextAttack,guard:p.guard},players:[...this.players.values()].filter(q=>q.channel===p.channel).map(q=>({id:q.id,name:q.name,x:Math.round(q.state.x*10)/10,y:Math.round(q.state.y*10)/10,job:q.state.job,rank:q.state.rank,level:q.state.level,equipment:q.state.equipment,hp:q.state.hp,maxHp:stats(q.state).hp,face:q.face,flip:q.flip,attacking:q.attackUntil>now,moving:Math.hypot(q.input.x,q.input.y)>.01||q.auto})),enemies:this.channel(p.channel).map(({tags,homeX,homeY,next,slow,...e})=>({...e,x:Math.round(e.x*10)/10,y:Math.round(e.y*10)/10})),events:this.events.filter(e=>e.channel===p.channel&&(!e.to||e.to===p.id)).slice(-12)};}
}
