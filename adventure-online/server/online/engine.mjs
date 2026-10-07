import {randomUUID,randomInt} from 'node:crypto';
import {clamp,distance,walkable,pathfind} from '../../image-prototype/core.js';
import {profile,JOBS,ITEMS,stats,gainXp,rollLoot,equip,claim,LEGENDARY_POOL,MYTHIC_POOL,MAX_ENHANCE,enhanceChance,enhancementLevel,basicAttackDelay,skillCastDelay,skillMpCost} from '../../image-prototype/catalog.js';
import {CHANNEL_CAP,WORLD_CAP,NAMED,bossWindow,PROMOTIONS,ZONES,QUICK_CHATS} from '../../image-prototype/mmo-data.js';
import {initSystems,mmoAction,tickSystems,snapshotSystems,progress,removeSocial,socialId} from './systems.mjs';
const canAggro=(p,e)=>{if(e.tags?.has(p.id))return true;const gap=(e.level||1)-(p.state.level||1);if(e.named)return gap<=10;if(e.boss)return gap<=5;if(e.elite)return gap<=4;return gap<=6;};
const enemyDamage=e=>Math.max(2,Math.round(Number.isFinite(e.damage)?e.damage:e.boss?18+e.level*4.2:e.elite?8+e.level*3.2:4+e.level*2.2));
export class World{
 constructor({random=()=>randomInt(1000000)/1000000,now=()=>Date.now()/1000,onDirty=()=>{},onExchange=async()=>{},onUrgent=()=>{}}={}){this.random=random;this.now=now;this.onDirty=onDirty;this.onExchange=onExchange;this.onUrgent=onUrgent;this.jobs=JOBS;initSystems(this);this.players=new Map();this.channels=new Map();this.events=[];}
 channel(name,zone='surface'){
  const key=name+'|'+zone;if(!this.channels.has(key)){
   const atlasElites=[{name:'정예 · 석갑 파수꾼',skin:0},{name:'정예 · 그림자 추적자',skin:1},{name:'정예 · 비룡 수호자',skin:2},{name:'정예 · 마수 대장',skin:3}];
   const cfg={
    surface:{sectorLevels:[1,2,4],eliteLevels:[6,7,8,9],eliteSpots:[[1160,1325],[350,1450],[1160,1690],[360,1865]],types:[{name:'들다람쥐',skin:0,atlas:false},{name:'갈색 다람쥐',skin:0,atlas:false},{name:'붉은꼬리 다람쥐',skin:0,atlas:false}],eliteTypes:[{name:'정예 · 붉은발톱 다람쥐',skin:0,atlas:false}],boss:'왕꼬리 다람쥐',bossLevel:10,bossSkin:1,bossAtlas:false},
    grove:{sectorLevels:[5,7,10],eliteLevels:[12,14,16,18],types:[{name:'검은꼬리 다람쥐',skin:0,atlas:false},{name:'고목 골렘',skin:0},{name:'그림자 짐승',skin:1},{name:'숲 비룡',skin:2}],boss:'고목의 수호수',bossLevel:20,bossSkin:0},
    cave:{sectorLevels:[28,31,34],eliteLevels:[36,39,42,45],types:[{name:'수정 골렘',skin:0},{name:'동굴 그림자',skin:1},{name:'수정 비룡',skin:2},{name:'동굴 마수',skin:3}],boss:'수정 동굴주',bossLevel:48,bossSkin:0},
    ruins:{sectorLevels:[55,60,65],eliteLevels:[68,72,76,80],types:[{name:'저주받은 석상',skin:0},{name:'폐허 망령',skin:1},{name:'붉은 비룡',skin:2},{name:'폐허 마수',skin:3}],boss:'폐허의 집행자',bossLevel:85,bossSkin:1},
    abyss:{sectorLevels:[95,100,106],eliteLevels:[112,118,124,130],types:[{name:'심연 석마',skin:0},{name:'그림자 악귀',skin:1},{name:'공허룡',skin:2},{name:'심연 마수',skin:3}],boss:'심연 파수왕',bossLevel:138,bossSkin:1},
    celestial:{sectorLevels:[190,200,210],eliteLevels:[220,232,244,256],types:[{name:'천계 석장군',skin:0},{name:'별빛 정령',skin:1},{name:'청룡의 혼',skin:2},{name:'천룡 수호병',skin:3}],boss:'천룡 수문장',bossLevel:270,bossSkin:2}
   }[zone]||{sectorLevels:[1,2,3],eliteLevels:[5,6,7,8],types:[{name:'마수',skin:3}],boss:'수호자',bossLevel:10,bossSkin:3};
   const spots=[
    [360,690],[515,735],[675,690],[845,740],[1010,695],[1170,760],[430,900],[690,920],
    [360,1195],[520,1270],[690,1205],[855,1300],[1030,1215],[1180,1370],[470,1440],[785,1435],
    [340,1685],[510,1760],[675,1695],[835,1785],[1010,1705],[1180,1820],[505,1885],[940,1880]
   ];
   const mobs=spots.map(([x,y],id)=>{const sector=Math.floor(id/8),level=(cfg.sectorLevels[sector]??cfg.sectorLevels.at(-1))+Math.floor((id%8)/4),type=cfg.types[(id+sector)%cfg.types.length],hp=Math.round((72+level*10)*(1+sector*.12+(id%8)*.012));return {id,x,y,homeX:x,homeY:y,zone,level,name:type.name,skin:type.skin??3,atlas:type.atlas!==false,hp,max:hp,boss:false,alive:true,next:0,tellAt:0,respawn:0,slow:0,stun:0,tags:new Map()};});
   const eliteSpots=cfg.eliteSpots||[[1160,1180],[350,1430],[1160,1680],[360,1870]];for(const [j,[x,y]] of eliteSpots.entries()){const id=40+j,level=cfg.eliteLevels[j]??cfg.eliteLevels.at(-1),hp=Math.round(level*110),elite=(cfg.eliteTypes||atlasElites)[j%(cfg.eliteTypes||atlasElites).length];mobs.push({id,x,y,homeX:x,homeY:y,zone,level,name:elite.name,skin:elite.skin??3,atlas:elite.atlas!==false,hp,max:hp,elite:true,boss:false,alive:true,next:0,tellAt:0,respawn:0,slow:0,stun:0,tags:new Map()});}
   const bossLevel=cfg.bossLevel,bossHp=Math.max(zone==='surface'?900:1400,bossLevel*120);mobs.push({id:60,x:760,y:1815,homeX:760,homeY:1815,zone,level:bossLevel,name:cfg.boss,skin:cfg.bossSkin??3,atlas:cfg.bossAtlas!==false,hp:bossHp,max:bossHp,boss:true,alive:true,next:0,tellAt:0,respawn:0,slow:0,stun:0,tags:new Map()});
   for(const [i,b] of NAMED.entries())if(b.zone===zone)mobs.push({id:80+i,x:b.x,y:b.y,homeX:b.x,homeY:b.y,zone,level:b.level,name:b.name,skin:({stoneking:0,shadowking:1,dragon:2}[b.id]??3),atlas:true,hp:b.hp,max:b.hp,damage:b.damage,boss:true,named:b.id,alive:false,next:0,tellAt:0,respawn:0,slow:0,stun:0,tags:new Map(),window:''});
   this.channels.set(key,mobs);
  }return this.channels.get(key);
 }

 add(id,name,raw,channel='준자마을',slot=0){if(this.players.size>=WORLD_CAP&&!this.players.has(id))throw Error('현재 접속 인원이 가득 찼습니다.');if([...this.players.values()].filter(p=>p.channel===channel&&p.id!==id).length>=CHANNEL_CAP)throw Error('채널 정원은 48명입니다. 다른 채널을 선택하세요.');const p={id,name,state:profile(raw),channel,slot,input:{x:0,y:0},navPath:[],auto:false,autoTarget:null,combatTarget:null,combatSkill:-1,face:0,flip:false,dirX:0,dirY:1,attackSkill:-1,attackTarget:null,attackUntil:0,nextAttack:0,cooldowns:[0,0,0,0],guard:0,guardFactor:.4,lastInput:0,lastChat:0,nextHpPotion:0,nextMpPotion:0};if(distance(p.state,{x:768,y:355})<30){const others=[...this.players.values()].filter(q=>q.channel===channel);const points=[[0,0],[90,0],[-90,0],[0,65],[90,65],[-90,65],[180,0],[-180,0],[180,65],[-180,65]];const free=points.map(([dx,dy])=>({x:768+dx,y:355+dy})).find(pos=>others.every(q=>distance(q.state,pos)>65));if(free)Object.assign(p.state,free);}this.channel(channel,p.state.zone);this.players.set(id,p);return p;}
 dirty(p){this.onDirty(p);}
 event(p,text,kind='info'){this.events.push({id:randomUUID(),channel:p.channel,to:p.id,text,kind});if(this.events.length>100)this.events.shift();}
 action(p,data){const now=this.now(),s=p.state,kind=data.type;const mmo=mmoAction(this,p,data);if(mmo)return mmo;if(socialId(this,p)&&['potion','manaPotion','attack','home','auto'].includes(kind)){if(kind==='attack'&&[...this.duels.values()].some(t=>t.accepted&&t.players.includes(p.id)))return mmoAction(this,p,{type:'duelAttack',skill:data.skill??-1});if(kind==='home')removeSocial(this,p);else return;}
  if(kind==='navigate'){const x=Number(data.x),y=Number(data.y);if(!Number.isFinite(x)||!Number.isFinite(y))return;p.navPath=pathfind(s,{x,y});p.input={x:0,y:0};p.auto=false;p.autoTarget=null;p.combatTarget=null;p.combatSkill=-1;return;}
  if(kind==='move'){if(p.navPath.length&&!data.manual)return;if(data.manual){p.navPath=[];p.auto=false;p.autoTarget=null;p.combatTarget=null;p.combatSkill=-1;}const x=Number(data.x),y=Number(data.y);if(!Number.isFinite(x)||!Number.isFinite(y))return;p.input={x:clamp(x,-1,1),y:clamp(y,-1,1)};const d=Math.hypot(x,y);if(d>.01){p.dirX=x/d;p.dirY=y/d;}p.lastInput=now;return;}
  if(kind==='auto'){p.auto=!!data.on;p.autoTarget=null;p.combatTarget=null;p.combatSkill=-1;p.navPath=[];p.input={x:0,y:0};return;}
  if(kind==='engage'){const target=Number(data.target),skill=Number.isInteger(data.skill)?data.skill:-1,e=this.channel(p.channel,s.zone).find(e=>e.id===target&&e.alive);if(!e)return;p.auto=false;p.autoTarget=null;p.navPath=[];p.input={x:0,y:0};p.combatTarget=e.id;p.combatSkill=skill;return;}
  if(kind==='attack'){return this.attack(p,Number.isInteger(data.skill)?data.skill:-1,data.target);}
  if(kind==='home'){s.zone='surface';s.x=768;s.y=350;const st=stats(s);s.hp=st.hp;s.mp=st.mp;p.input={x:0,y:0};p.navPath=[];p.auto=false;p.autoTarget=null;p.combatTarget=null;p.combatSkill=-1;this.dirty(p);return;}
  if(kind==='potion'){const st=stats(s);if(s.potions>0&&s.hp<st.hp){s.potions--;s.hp=Math.min(st.hp,s.hp+st.hp*.5);p.nextHpPotion=now+1;this.dirty(p);}return;}
  if(kind==='manaPotion'){const st=stats(s);if(s.manaPotions>0&&s.mp<st.mp){s.manaPotions--;s.mp=Math.min(st.mp,s.mp+st.mp*.45);p.nextMpPotion=now+1;this.dirty(p);}return;}
  if(kind==='autoPotion'){const hp=[0,30,50,70].includes(Number(data.hp))?Number(data.hp):s.autoHpPct,mp=[0,30,50,70].includes(Number(data.mp))?Number(data.mp):s.autoMpPct;s.autoHpPct=hp;s.autoMpPct=mp;this.dirty(p);this.event(p,'자동 물약 · HP '+(hp?hp+'%':'OFF')+' / MP '+(mp?mp+'%':'OFF'));return;}
  if(kind==='equip'){if(equip(s,data.item))this.dirty(p);else this.event(p,'보유 아이템과 장착 레벨을 확인하세요.');return;}
  if(kind==='unequip'){if(data.slot!=='weapon'&&s.equipment[data.slot]){delete s.equipment[data.slot];s.hp=Math.min(s.hp,stats(s).hp);this.dirty(p);}return;}
  if(kind==='quest'){if(s.zone!=='surface')return;if(distance(s,{x:580,y:330})>145){this.event(p,'촌장 가까이에서 대화하세요.');return;}if(s.quest==='available'){s.quest='active';s.questKills=0;}else if(s.quest==='complete'){s.quest='bossActive';}else claim(s);this.dirty(p);return;}
  if(kind==='buy'){if(s.zone!=='surface')return;if(distance(s,{x:1000,y:330})>145)return;const costs={potion:30,manaPotion:45,heal:20,leather:120,hood:100,boots:80,cape:180,enhanceStone:3000,shiningStone:25000},stackable=new Set(['potion','manaPotion','enhanceStone','shiningStone']);const unit=Object.hasOwn(costs,data.item)?costs[data.item]:null,qty=stackable.has(data.item)?Math.max(1,Math.min(999,Math.floor(Number(data.qty)||1))):1,total=unit?unit*qty:0;if(!unit||s.gold<total){this.event(p,'골드가 부족합니다. · 필요 '+total.toLocaleString()+' G');return;}if(ITEMS[data.item]&&s.bag.length+qty>80){this.event(p,'가방 공간이 부족합니다.');return;}s.gold-=total;if(data.item==='potion')s.potions=Math.min(9999,s.potions+qty);else if(data.item==='manaPotion')s.manaPotions=Math.min(9999,s.manaPotions+qty);else if(data.item==='heal')s.hp=stats(s).hp;else if(data.item==='enhanceStone')s.enhanceStones=Math.min(9999,s.enhanceStones+qty);else if(data.item==='shiningStone')s.shiningStones=Math.min(9999,s.shiningStones+qty);else s.bag.push(data.item);this.dirty(p);this.event(p,(stackable.has(data.item)?qty+'개 구매':'구매 완료')+' · '+total.toLocaleString()+' G');return;}
  if(kind==='enhance'){const id=String(data.item||''),item=ITEMS[id],stone=data.stone==='shining'?'shining':'normal';if(!item||id==='training'||!s.bag.includes(id)){this.event(p,'강화할 장비를 확인하세요.');return;}const current=enhancementLevel(s,id);if(current>=MAX_ENHANCE){this.event(p,'이미 최고 강화 +'+MAX_ENHANCE+' 입니다.');return;}const field=stone==='shining'?'shiningStones':'enhanceStones';if((s[field]||0)<=0){this.event(p,stone==='shining'?'빛나는 강화석이 없습니다.':'강화석이 없습니다.');return;}s[field]--;const success=this.random()<enhanceChance(current),before=current;if(success)s.enhancements[id]=Math.min(MAX_ENHANCE,current+(stone==='shining'?2:1));else if(current>=6)s.enhancements[id]=current-1;else s.enhancements[id]=current;const after=enhancementLevel(s,id);s.hp=Math.min(s.hp,stats(s).hp);this.dirty(p);if(success)this.event(p,ITEMS[id].name+' 강화 성공! +'+before+' → +'+after,after>=10?'rare':'info');else this.event(p,ITEMS[id].name+' 강화 실패'+(before>=6?' · +'+before+' → +'+after:' · 등급 유지'));return;}
  if(kind==='promote'){if(s.zone!=='surface'||distance(s,{x:580,y:330})>145)return;const r=PROMOTIONS[s.rank];if(!r){this.event(p,'최종 전직을 마쳤습니다.');return;}if(s.level<r.level||s.bossKills<r.bosses){this.event(p,r.level+'레벨과 보스 '+r.bosses+'회 처치가 필요합니다.');return;}s.rank++;s.hp=stats(s).hp;this.dirty(p);this.event(p,JOBS[s.job].title+' '+s.rank+'차 전직 완료!');return;}
  if(kind==='job'){if(s.zone!=='surface')return;if(distance(s,{x:580,y:330})>145)return;if(s.level<10||!Object.hasOwn(JOBS,data.job)||s.job===data.job)return;if(s.gold<500){this.event(p,'직업 변경에는 500 G가 필요합니다.');return;}s.gold-=500;s.job=data.job;p.cooldowns=[now+5,now+5,now+5,now+5];const changed=stats(s);s.hp=Math.min(s.hp,changed.hp);s.mp=Math.min(s.mp,changed.mp);this.dirty(p);this.event(p,JOBS[s.job].name+' 직업으로 변경했습니다. 성장과 장비는 유지됩니다.');return;}
  if(kind==='chat'){if(now-p.lastChat<1)return;const quick=Number(data.quick);if(!Number.isInteger(quick)||quick<0||quick>=QUICK_CHATS.length)return;const phrase=QUICK_CHATS[quick];p.lastChat=now;this.events.push({id:randomUUID(),channel:p.channel,from:p.id,name:p.name,phrase,text:p.name+': '+phrase,kind:'chat'});if(this.events.length>100)this.events.shift();}
 }
 autoSkill(p,now){
  const s=p.state,job=JOBS[s.job],st=stats(s),usable=i=>{const skill=job.skills[i];return !!skill&&s.level>=skill[1]&&(i!==3||s.rank)&&now>=p.cooldowns[i]&&s.mp>=skillMpCost(s,skill);};
  if(s.hp<st.hp*.62){for(const i of [3,2,1,0])if(usable(i)&&['heal','partyHeal'].includes(job.skills[i][4]))return i;}
  if(s.hp<st.hp*.8&&p.guard<=now){for(const i of [3,2,1,0])if(usable(i)&&['guard','partyGuard'].includes(job.skills[i][4]))return i;}
  for(const i of [3,2,1,0])if(usable(i)&&!['heal','partyHeal','guard','partyGuard'].includes(job.skills[i][4]))return i;
  return -1;
 }
 attack(p,index=-1,targetId){
  const now=this.now(),s=p.state,job=JOBS[s.job],st=stats(s);if(now<p.nextAttack)return;
  const skill=index>=0?job.skills[index]:null,spec=skill?.[5]||{},mpCost=skillMpCost(s,skill);if(index>=0&&(!skill||s.level<skill[1]||(index===3&&!s.rank)||now<p.cooldowns[index]))return;if(skill&&s.mp<mpCost){if(!p.auto)this.event(p,'마나가 부족합니다.');return;}
  if(skill&&['heal','partyHeal','guard','partyGuard'].includes(skill[4])){
   const radius=spec.radius||300,friends=[...this.players.values()].filter(q=>q.channel===p.channel&&q.state.zone===s.zone&&distance(q.state,s)<radius);
   if(skill[4]==='guard'){p.guard=now+(spec.guard||7);p.guardFactor=spec.guardFactor??.4;}
   else if(skill[4]==='partyGuard'){for(const q of friends){q.guard=now+(spec.guard||7);q.guardFactor=spec.guardFactor??.5;this.dirty(q);}}
   else for(const q of friends){
    const amount=stats(q.state).hp*(spec.heal??(skill[4]==='partyHeal'?.6:.35)),healed=Math.min(amount,stats(q.state).hp-q.state.hp);
    if(healed>0){q.state.hp+=healed;this.dirty(q);}
    if(spec.guard){q.guard=now+spec.guard;q.guardFactor=spec.guardFactor??.65;}
    for(const e of this.channel(p.channel,p.state.zone))if(e.tags.has(q.id)&&e.alive&&distance(e,s)<450)e.tags.set(p.id,{damage:(e.tags.get(p.id)?.damage||0),support:true,at:now});
   }
   s.mp=Math.max(0,s.mp-mpCost);this.dirty(p);p.cooldowns[index]=now+skill[2];p.nextAttack=now+skillCastDelay(s,skill);p.attackSkill=index;p.attackTarget=null;p.attackUntil=now+Math.min(.72,skillCastDelay(s,skill)*.72);this.event(p,skill[0]+' 사용','skill');return;
  }
  const mobs=this.channel(p.channel,p.state.zone);let e=mobs.find(e=>e.id===targetId&&e.alive);if(!e)e=mobs.filter(e=>e.alive&&distance(s,e)<=st.range).sort((a,b)=>distance(s,a)-distance(s,b))[0];if(!e||distance(s,e)>st.range)return;
  let targets=[e];
  if(spec.chain){targets=mobs.filter(t=>t.alive&&distance(t,e)<(spec.chainRadius||240)).sort((a,b)=>distance(a,e)-distance(b,e)).slice(0,spec.chain);}
  else if(spec.radius){const center=spec.center==='self'?s:e;targets=mobs.filter(t=>t.alive&&distance(t,center)<spec.radius);}
  else if(spec.splash){targets=[e,...mobs.filter(t=>t!==e&&t.alive&&distance(t,e)<spec.splash)];}
  const base=st.atk*(skill?skill[3]:1);
  if(skill){s.mp=Math.max(0,s.mp-mpCost);this.dirty(p);}
  const actionDelay=skill?skillCastDelay(s,skill):basicAttackDelay(s);p.nextAttack=now+actionDelay;p.attackSkill=index;p.attackTarget=e.id;p.attackUntil=now+Math.min(.52,actionDelay*.82);p.input={x:0,y:0};p.navPath=[];if(skill)p.cooldowns[index]=now+skill[2];
  const adx=e.x-s.x,ady=e.y-s.y,alen=Math.hypot(adx,ady)||1;p.dirX=adx/alen;p.dirY=ady/alen;p.face=Math.abs(adx)>Math.abs(ady)?2:ady<0?1:0;p.flip=p.face===2&&adx<0;
  let totalDamage=0;
  targets.forEach((t,i)=>{
   let mult=1;if(spec.chain&&i>0)mult*=Math.pow(spec.falloff??.82,i);if(spec.splash&&t!==e)mult*=spec.splashFactor??.45;
   if(spec.execute&&t.hp/t.max<=spec.execute)mult*=spec.executeBonus??1.4;
   const power=Math.max(1,Math.round(base*mult));t.hp=Math.max(0,t.hp-power);totalDamage+=power;
   const tag=t.tags.get(p.id)||{damage:0};t.tags.set(p.id,{damage:tag.damage+power,at:now});
   const slowFor=spec.slow??(skill?.[4]==='slow'?5:0);if(slowFor)t.slow=Math.max(t.slow||0,now+slowFor);
   const stunFor=t.boss?(spec.bossStun??(spec.stun?spec.stun*.3:0)):(spec.stun||0);if(stunFor)t.stun=Math.max(t.stun||0,now+stunFor);
   if(spec.knockback&&!t.boss){const dx=t.x-s.x,dy=t.y-s.y,d=Math.hypot(dx,dy)||1,nx=t.x+dx/d*spec.knockback,ny=t.y+dy/d*spec.knockback;if(walkable(nx,ny)){t.x=nx;t.y=ny;}}
   if(t.hp===0)this.kill(t,p.channel);
  });
  if(skill?.[4]==='drain'||spec.leech){s.hp=Math.min(st.hp,s.hp+totalDamage*(spec.leech??.5));this.dirty(p);}
  if(spec.selfHeal){s.hp=Math.min(st.hp,s.hp+st.hp*spec.selfHeal);this.dirty(p);}
 }
 kill(e,channel){const now=this.now();e.alive=false;e.tellAt=0;e.respawn=now+(e.boss?300:e.elite?180:30);if(e.named)e.respawn=Infinity;for(const [id,tag] of e.tags){const p=this.players.get(id);if(!p||p.channel!==channel||p.state.zone!==e.zone||distance(p.state,e)>600||now-tag.at>45||(!tag.support&&tag.damage<(e.boss?25:1)))continue;const s=p.state;if(e.named){const key=e.named+':'+e.window;if(s.bossClaims.includes(key)){this.event(p,'이번 등장 보상은 이미 받았습니다.');continue;}s.bossClaims.push(key);s.bossClaims=s.bossClaims.slice(-12);}s.kills++;const factor=e.zone==='surface'?1:e.level;const xp=e.named?e.level*120:e.elite?e.level*35:e.boss?120*factor:20*factor;s.gold+=e.named?e.level*20:e.elite?e.level*8:e.boss?(e.zone==='surface'?150:150+e.level*8):(e.zone==='surface'?25:25+e.level*2);progress(this,p,'hunt');if(s.zone!=='surface'){progress(this,p,'dungeon');if(this.random()<.2){s.materials.crystal=Math.min(100000,s.materials.crystal+1);this.event(p,'던전 수정 획득');}}if(e.named&&this.random()<.25){s.materials.stardust=Math.min(100000,s.materials.stardust+1);this.event(p,'별빛 파편 획득');}s.tails+=e.boss?3:1;const leveled=gainXp(s,xp),localBoss=e.boss&&!e.named&&e.id===60;
   const advance=(next,text)=>{s.quest=next;s.questKills=0;s.questBoss=0;this.event(p,text,'quest');};
   if(s.quest==='active'&&e.zone==='surface'&&!e.boss){s.questKills++;if(s.questKills>=10)advance('ready','임무 달성 · 촌장에게 보고하세요.');}
   else if(s.quest==='bossActive'&&e.zone==='surface'&&localBoss){s.questBoss++;advance('bossReady','왕꼬리 처치 완료 · 촌장에게 돌아가세요.');}
   else if(s.quest==='groveHunt'&&e.zone==='grove'&&!e.boss){s.questKills++;if(s.questKills>=12)advance('groveBoss','깊은숲 정찰 완료 · 고목의 수호수를 처치하세요.');}
   else if(s.quest==='groveBoss'&&e.zone==='grove'&&localBoss)advance('caveIntro','깊은숲 해방 · 수정 동굴로 향하세요.');
   else if(s.quest==='caveHunt'&&e.zone==='cave'&&!e.boss){s.questKills++;if(s.questKills>=15)advance('caveBoss','수정 동굴 조사 완료 · 수정 동굴주를 처치하세요.');}
   else if(s.quest==='caveBoss'&&e.zone==='cave'&&localBoss)advance('ruinsIntro','동굴 봉인 해제 · 붉은 폐허로 향하세요.');
   else if(s.quest==='ruinsHunt'&&e.zone==='ruins'&&!e.boss){s.questKills++;if(s.questKills>=15)advance('ruinsBoss','폐허 정화 진행 · 폐허의 집행자를 처치하세요.');}
   else if(s.quest==='ruinsBoss'&&e.zone==='ruins'&&localBoss)advance('abyssIntro','폐허 정화 완료 · 그림자 심연으로 향하세요.');
   else if(s.quest==='abyssHunt'&&e.zone==='abyss'&&!e.boss){s.questKills++;if(s.questKills>=15)advance('abyssElite','심연의 기운 확인 · 정예 암흑 추적자 2마리를 처치하세요.');}
   else if(s.quest==='abyssElite'&&e.zone==='abyss'&&e.elite){s.questKills++;if(s.questKills>=2)advance('abyssBoss','심연 길목 확보 · 심연 파수왕을 처치하세요.');}
   else if(s.quest==='abyssBoss'&&e.zone==='abyss'&&localBoss)advance('celestialIntro','심연 돌파 · 천룡의 유적으로 향하세요.');
   else if(s.quest==='celestialHunt'&&e.zone==='celestial'&&!e.boss){s.questKills++;if(s.questKills>=20)advance('celestialBoss','천계 수호병 돌파 · 천룡 수문장을 처치하세요.');}
   else if(s.quest==='celestialBoss'&&e.zone==='celestial'&&localBoss){s.gold+=5000;gainXp(s,e.level*30);advance('storyDone','메인 스토리 1장 완료 · 천룡의 유적을 정복했습니다!');}
   if(e.boss)s.bossKills++;
   let item=null;if(e.named){const r=this.random(),mythicRate=e.named==='dragon'?.0003:.0001;if(r<mythicRate)item=MYTHIC_POOL[Math.min(MYTHIC_POOL.length-1,Math.floor(this.random()*MYTHIC_POOL.length))];else if(r<mythicRate+.01)item=LEGENDARY_POOL[Math.min(LEGENDARY_POOL.length-1,Math.floor(this.random()*LEGENDARY_POOL.length))];}else if(e.elite&&this.random()<.15)item=e.zone==='surface'?'ironblade':this.random()<.5?'crystalblade':'crystalarmor';else item=rollLoot(e.boss,this.random);if(item&&s.bag.length<80){s.bag.push(item);const rarity=ITEMS[item].rarity;this.event(p,ITEMS[item].name+' 획득!',rarity==='mythic'?'mythic':['rare','legendary'].includes(rarity)?'rare':'loot');if(rarity==='mythic'){this.events.push({id:randomUUID(),channel:p.channel,text:'★ '+p.name+'님이 '+ITEMS[item].name+' 획득! ★',kind:'mythic'});if(this.events.length>100)this.events.shift();}}else if(item){s.gold+=100;this.event(p,'가방이 가득 차 장비 대신 100 G를 받았습니다.');}
   this.event(p,e.name+' 공동 처치 · '+(leveled?'레벨 업!':'EXP +'+xp));this.dirty(p);if(e.named)p.urgentSave=this.onUrgent(p);
  }e.tags.clear();}
 tick(dt=.1){const now=this.now();tickSystems(this);for(const p of this.players.values()){if(p.exchangeBusy)continue;
  let {x:dx,y:dy}=p.input;const s=p.state,st=stats(s);s.mp=Math.min(st.mp,Math.max(0,Number(s.mp)||0)+st.mp*.004*dt);if(!socialId(this,p)&&s.autoHpPct&&s.potions>0&&now>=p.nextHpPotion&&s.hp/st.hp*100<=s.autoHpPct){s.potions--;s.hp=Math.min(st.hp,s.hp+st.hp*.5);p.nextHpPotion=now+1.25;this.dirty(p);}if(!socialId(this,p)&&s.autoMpPct&&s.manaPotions>0&&now>=p.nextMpPotion&&s.mp/st.mp*100<=s.autoMpPct){s.manaPotions--;s.mp=Math.min(st.mp,s.mp+st.mp*.45);p.nextMpPotion=now+1.25;this.dirty(p);}if(now-p.lastInput>.6)dx=dy=0;
  if(p.navPath.length&&!p.auto){const point=p.navPath[0],d=distance(s,point);if(d<=250*dt){s.x=point.x;s.y=point.y;p.navPath.shift();dx=dy=0;}else{dx=point.x-s.x;dy=point.y-s.y;}}
  if(p.combatTarget!=null&&!p.auto){const e=this.channel(p.channel,p.state.zone).find(e=>e.id===p.combatTarget&&e.alive);if(!e){p.combatTarget=null;p.combatSkill=-1;}else if(distance(s,e)<=st.range*.9){if(now>=p.nextAttack){const skill=p.combatSkill;p.combatSkill=-1;this.attack(p,skill,e.id);}dx=dy=0;}else if(distance(s,e)<1100){const point=pathfind(s,e)[0]||e;dx=point.x-s.x;dy=point.y-s.y;}else{p.combatTarget=null;p.combatSkill=-1;}}
  if(p.auto&&s.y>590){const mobs=this.channel(p.channel,p.state.zone),safe=e=>{const gap=e.level-s.level;if(e.named)return gap<=10;if(e.boss)return gap<=6;if(e.elite)return gap<=3;return gap<=5;},candidates=mobs.filter(e=>e.alive&&safe(e)),current=candidates.find(e=>e.id===p.autoTarget&&distance(e,s)<950),score=e=>distance(e,s)-(e.named?110:e.boss?80:e.elite?20:0),e=current||candidates.sort((a,b)=>score(a)-score(b))[0];p.autoTarget=e?.id??null;if(e){if(distance(s,e)<=st.range*.86){const skill=this.autoSkill(p,now);this.attack(p,skill,e.id);dx=dy=0;}else{const point=pathfind(s,e)[0]||e;dx=point.x-s.x;dy=point.y-s.y;}}}
  if(now>=p.attackUntil){const d=Math.hypot(dx,dy);if(d>.01){const nx=dx/d,ny=dy/d,x=s.x+nx*250*dt,y=s.y+ny*250*dt;if(walkable(x,s.y))s.x=x;if(walkable(s.x,y))s.y=y;p.dirX=nx;p.dirY=ny;p.face=Math.abs(dx)>Math.abs(dy)?2:dy<0?1:0;p.flip=p.face===2&&dx<0;}}
 }
 for(const [key,mobs] of this.channels){const [channel,zone]=key.split('|');const players=[...this.players.values()].filter(p=>p.channel===channel&&p.state.zone===zone&&!p.exchangeBusy);if(!players.length){continue;}for(const e of mobs){if(e.named){const config=NAMED.find(b=>b.id===e.named),window=bossWindow(config,now);if(!window.active){e.alive=false;e.tags.clear();e.tellAt=0;continue;}if(e.window!==window.key){e.window=window.key;e.alive=true;e.hp=e.max;e.x=e.homeX;e.y=e.homeY;e.tags.clear();}e.respawn=window.next;}if(!e.alive){if(!e.named&&now>=e.respawn){e.alive=true;e.hp=e.max;e.x=e.homeX;e.y=e.homeY;e.slow=0;e.stun=0;}continue;}if((e.stun||0)>now)continue;const p=players.filter(p=>p.state.y>590&&canAggro(p,e)&&distance(p.state,e)<(e.named?320:e.boss?250:e.elite?185:165)).sort((a,b)=>distance(a.state,e)-distance(b.state,e))[0];const d=p?distance(p.state,e):Infinity;
  if(e.tellAt){if(now>=e.tellAt){e.tellAt=0;e.next=now+(e.boss?2.8:2.1);for(const q of players){if(q.exchangeBusy||distance(q.state,e)>95||q.state.y<590)continue;const st=stats(q.state),hit=Math.max(2,enemyDamage(e)-st.def);q.state.hp=Math.max(0,q.state.hp-Math.round(hit*(q.guard>now?(q.guardFactor??.4):1)));if(q.state.hp===0){q.state.zone='surface';q.state.x=768;q.state.y=350;q.state.hp=st.hp;q.state.mp=st.mp;q.auto=false;q.autoTarget=null;q.combatTarget=null;q.combatSkill=-1;q.navPath=[];q.input={x:0,y:0};this.event(q,'촌장이 치료했습니다. 성장과 장비는 유지됩니다.');}this.dirty(q);}}}
  else if(p&&d<=75&&now>=e.next)e.tellAt=now+(e.boss?1.1:.75);
  else if(p&&d>70){const speed=(e.boss?55:70)*dt*(e.slow>now?.4:1);e.x+=(p.state.x-e.x)/d*speed;e.y+=(p.state.y-e.y)/d*speed;}
  else{const dx=e.homeX+Math.sin(now*.45+e.id)*35-e.x,dy=e.homeY+Math.cos(now*.35+e.id)*20-e.y,d=Math.hypot(dx,dy);if(d>3){const speed=Math.min(24*dt,d);e.x+=dx/d*speed;e.y+=dy/d*speed;}}
  e.x=clamp(e.x,265,1270);e.y=clamp(e.y,625,1930);
 }}
 }
 snapshot(p){const now=this.now();return {now,...snapshotSystems(this,p),self:{...structuredClone(p.state),id:p.id,name:p.name,slot:p.slot,channel:p.channel,auto:p.auto,autoTarget:p.autoTarget,combatTarget:p.combatTarget,navMoving:p.navPath.length>0,cooldowns:p.cooldowns,nextAttack:p.nextAttack,guard:p.guard,dirX:p.dirX,dirY:p.dirY,attackSkill:p.attackSkill,attacking:p.attackUntil>now},players:[...this.players.values()].filter(q=>q.channel===p.channel&&q.state.zone===p.state.zone).map(q=>({id:q.id,name:q.name,x:Math.round(q.state.x*10)/10,y:Math.round(q.state.y*10)/10,job:q.state.job,rank:q.state.rank,level:q.state.level,equipment:{...q.state.equipment},hp:q.state.hp,maxHp:stats(q.state).hp,face:q.face,flip:q.flip,dirX:q.dirX,dirY:q.dirY,attackSkill:q.attackSkill,attackTarget:q.attackTarget,attacking:q.attackUntil>now,moving:Math.hypot(q.input.x,q.input.y)>.01||q.auto||q.navPath.length>0})),enemies:this.channel(p.channel,p.state.zone).map(({tags,homeX,homeY,next,slow,stun,...e})=>({...e,x:Math.round(e.x*10)/10,y:Math.round(e.y*10)/10,slowed:slow>now,stunned:stun>now})),events:this.events.filter(e=>e.channel===p.channel&&(!e.to||e.to===p.id)).slice(-12)};}
}
