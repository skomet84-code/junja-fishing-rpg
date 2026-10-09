import {randomUUID} from 'node:crypto';
import {distance} from '../../image-prototype/core.js';
import {ITEMS,profile,stats,gainXp,RARE_POOL,LEGENDARY_POOL,MYTHIC_POOL,RIFT_POOL,ECLIPSE_POOL,ETERNAL_POOL,promotionSkillLearned,basicAttackDelay,skillCastDelay,skillMpCost} from '../../image-prototype/catalog.js';
import {MATERIALS,RECIPES,ZONES,TRAVEL_PORTALS,DAILY_TASKS,PROMOTIONS,koreaDay,NAMED,bossWindow} from '../../image-prototype/mmo-data.js';
export const NODES=[
 {id:'wood1',material:'wood',x:390,y:780,zone:'surface',cooldown:60},{id:'wood2',material:'wood',x:1110,y:925,zone:'surface',cooldown:60},{id:'stone1',material:'stone',x:410,y:1320,zone:'surface',cooldown:90},{id:'ore1',material:'ore',x:1120,y:1740,zone:'surface',cooldown:120},
 {id:'woodG1',material:'wood',x:390,y:840,zone:'grove',cooldown:55},{id:'woodG2',material:'wood',x:1120,y:1270,zone:'grove',cooldown:55},{id:'stoneG',material:'stone',x:420,y:1740,zone:'grove',cooldown:80},{id:'oreG',material:'ore',x:1080,y:1870,zone:'grove',cooldown:110},
 ...['cave','ruins','abyss','celestial'].flatMap((zone,i)=>[
  {id:'crystal'+i+'a',material:'crystal',x:405,y:860,zone,cooldown:600},
  {id:'crystal'+i+'b',material:'crystal',x:1110,y:1370,zone,cooldown:600},
  {id:'crystal'+i+'c',material:'crystal',x:520,y:1810,zone,cooldown:600}
 ])
];
export function daily(p,now){if(p.state.daily?.day!==koreaDay(now))p.state.daily={day:koreaDay(now),hunt:0,gather:0,dungeon:0,claimed:[]};return p.state.daily;}
export function progress(w,p,key,n=1){const d=daily(p,w.now());d[key]=Math.min(DAILY_TASKS[key].goal,d[key]+n);}
function clearMotion(p){p.navPath=[];p.input={x:0,y:0};p.auto=false;p.autoTarget=null;p.combatTarget=null;p.combatSkill=-1;p.attackTarget=null;p.attackSkill=-1;p.attackUntil=0;}
function same(a,b){return a&&b&&a.channel===b.channel&&a.state.zone===b.state.zone;}
function close(a,b){return same(a,b)&&distance(a.state,b.state)<=220;}
export function initSystems(w){w.trades=new Map();w.duels=new Map();w.nextSocial=new Map();w.parties=new Map();w.partyInvites=new Map();w.partyDungeons=new Map();}
export function socialId(w,p){return [...w.trades.values()].find(t=>t.players.includes(p.id))||[...w.duels.values()].find(t=>t.players.includes(p.id));}
export function partyOf(w,p){return p?[...w.parties.values()].find(t=>t.members.includes(p.id))||null:null;}
export function partyMembers(w,p,{sameZone=false}={}){const party=partyOf(w,p);if(!party)return [p].filter(Boolean);return party.members.map(id=>w.players.get(id)).filter(Boolean).filter(q=>!sameZone||(q.channel===p.channel&&q.state.zone===p.state.zone));}
function leaveParty(w,p,notice=true){const party=partyOf(w,p);if(!party)return;party.members=party.members.filter(id=>id!==p.id);if(notice)w.event(p,'파티에서 나왔습니다.');if(party.members.length<2){for(const id of party.members){const q=w.players.get(id);if(q)w.event(q,'파티가 해산되었습니다.');}w.parties.delete(party.id);return;}if(party.leader===p.id){party.leader=party.members[0];const q=w.players.get(party.leader);if(q)w.event(q,'파티장이 되었습니다.');}for(const id of party.members){const q=w.players.get(id);if(q&&notice)w.event(q,p.name+'님이 파티에서 나갔습니다.');}}
function partyInvite(w,p,data){const q=w.players.get(data.player),party=partyOf(w,p);if(!q||q===p||!same(p,q)||distance(p.state,q.state)>500){w.event(p,'같은 지역의 가까운 유저를 선택하세요.');return;}if(party&&party.leader!==p.id){w.event(p,'파티장만 초대할 수 있습니다.');return;}if(party&&party.members.length>=4){w.event(p,'파티는 최대 4명입니다.');return;}if(partyOf(w,q)){w.event(p,'상대가 이미 파티에 있습니다.');return;}const id=randomUUID(),inv={id,from:p.id,to:q.id,partyId:party?.id||null,expires:w.now()+60};w.partyInvites.set(id,inv);w.event(p,q.name+'님에게 파티 초대를 보냈습니다.');w.event(q,p.name+'님이 파티에 초대했습니다.');}
export function removeSocial(w,p){for(const map of [w.trades,w.duels])for(const [id,t] of map)if(t.players.includes(p.id)){map.delete(id);for(const pid of t.players){const q=w.players.get(pid);if(q)w.event(q,'거래 또는 대련이 취소되었습니다.');}}}
function invite(w,p,data,duel){const q=w.players.get(data.player);if(!q||q===p||!close(p,q)){w.event(p,'같은 지역의 가까운 유저를 선택하세요.');return;}if(socialId(w,p)||socialId(w,q)||p.exchangeBusy||q.exchangeBusy){w.event(p,'진행 중인 거래·대련을 먼저 끝내세요.');return;}if((w.nextSocial.get(p.id)||0)>w.now()){w.event(p,'초대는 10초마다 보낼 수 있습니다.');return;}if(duel&&(p.state.y>590||q.state.y>590)){w.event(p,'PVP 대련은 안전한 마을에서 시작하세요.');return;}const id=randomUUID(),t={id,players:[p.id,q.id],from:p.id,accepted:false,expires:w.now()+60,offers:{[p.id]:{gold:0,items:[],materials:{}},[q.id]:{gold:0,items:[],materials:{}}},confirmed:[]};(duel?w.duels:w.trades).set(id,t);w.nextSocial.set(p.id,w.now()+10);clearMotion(p);clearMotion(q);w.event(q,p.name+(duel?'님이 PVP 대련을 신청했습니다.':'님이 거래를 신청했습니다.'));}
function validOffer(p,o){if(!Number.isSafeInteger(o.gold)||o.gold<0||o.gold>p.state.gold||!Array.isArray(o.items)||o.items.length>8)return false;const counts={};for(const id of o.items){if(!Object.hasOwn(ITEMS,id)||id==='training'||id==='glowing')return false;counts[id]=(counts[id]||0)+1;if(counts[id]>p.state.bag.filter(x=>x===id).length-(Object.values(p.state.equipment).includes(id)?1:0))return false;}for(const [k,n] of Object.entries(o.materials||{}))if(!Object.hasOwn(MATERIALS,k)||!Number.isSafeInteger(n)||n<0||n>p.state.materials[k])return false;return true;}
async function settle(w,t){const [a,b]=t.players.map(id=>w.players.get(id));if(!t.accepted||!close(a,b)||a.exchangeBusy||b.exchangeBusy||!validOffer(a,t.offers[a.id])||!validOffer(b,t.offers[b.id])){w.trades.delete(t.id);if(a)w.event(a,'보유품·거리 변화로 거래가 취소되었습니다.');if(b)w.event(b,'보유품·거리 변화로 거래가 취소되었습니다.');return;}const aa=structuredClone(a.state),bb=structuredClone(b.state);for(const [p,q] of [[aa,bb],[bb,aa]]){const i=p===aa?a.id:b.id,o=t.offers[i];p.gold-=o.gold;q.gold+=o.gold;for(const item of o.items){p.bag.splice(p.bag.indexOf(item),1);q.bag.push(item);}for(const [key,n] of Object.entries(o.materials)){p.materials[key]-=n;q.materials[key]+=n;}}if(aa.bag.length>80||bb.bag.length>80||aa.gold>Number.MAX_SAFE_INTEGER||bb.gold>Number.MAX_SAFE_INTEGER||Object.values(aa.materials).some(n=>n>100000)||Object.values(bb.materials).some(n=>n>100000)){w.trades.delete(t.id);w.event(a,'가방 또는 보유 한도를 초과해 거래가 취소되었습니다.');w.event(b,'가방 또는 보유 한도를 초과해 거래가 취소되었습니다.');return;}a.exchangeBusy=b.exchangeBusy=true;clearMotion(a);clearMotion(b);t.settling=true;try{await w.onExchange(a,aa,b,bb);a.state=aa;b.state=bb;w.dirty(a);w.dirty(b);w.event(a,'거래 완료 · 양쪽 아이템과 골드가 함께 저장되었습니다.');w.event(b,'거래 완료 · 양쪽 아이템과 골드가 함께 저장되었습니다.');}catch{w.event(a,'저장 실패 · 거래를 취소하고 보유품을 유지했습니다.');w.event(b,'저장 실패 · 거래를 취소하고 보유품을 유지했습니다.');}finally{a.exchangeBusy=b.exchangeBusy=false;w.trades.delete(t.id);}}

/* Daily, party-isolated three-stage instance. Entry is consumed once per KST day
   and persisted before combat. Ordinary zones/raids are not modified. */
const DUNGEON_ZONE='partyTrial',DUNGEON_MIN_LEVEL=100,DUNGEON_SECONDS=900;
function dungeonMonsters(run,stage){
 const hp=Math.round((run.level*200+run.level*run.level*3)*(1+run.members.length*.16));
 const designs=stage===1?[
  ['굴속 가시멧돼지',3,690,935],['숲의 마녀버섯',1,840,950],
  ['철갑 돌뿔수',0,535,1025],['푸른 날개요괴',2,1005,1025]
 ]:stage===2?[
  ['정예 · 붉은 뿔 투사',3,520,1320],['정예 · 흑령 주술사',1,780,1390],
  ['정예 · 천룡 파수꾼',2,1035,1320]
 ]:[['★ 봉인된 천룡왕',2,768,1770]];
 return designs.map(([name,skin,x,y],i)=>{
  const max=Math.max(1,Math.round(hp*(stage===1?.065:stage===2?.20:1)));
  return {id:stage*100+i,x,y,homeX:x,homeY:y,zone:DUNGEON_ZONE,level:Math.max(100,run.level),name,skin,atlas:true,variant:(stage+i)%4,regionStyle:stage===3?'boss':'dungeon',dungeonStage:stage,
   hp:max,max,damage:Math.round(run.level*(stage===3?3.0:stage===2?1.6:1.1)),elite:stage===2,boss:stage===3,
   alive:true,next:0,tellAt:0,respawn:Infinity,slow:0,stun:0,tags:new Map()};
 });
}
function closePartyDungeon(w,run,won=false,reason=''){
 if(!w.partyDungeons.has(run.channel))return;
 const day=koreaDay(w.now());
 for(const id of run.members){
  const p=w.players.get(id);if(!p)continue;
  if(won&&p.state.zone===DUNGEON_ZONE&&p.channel===run.channel){
   const s=p.state,base=run.level,gold=base*700,xp=base*250;
   s.gold+=gold;s.materials.crystal=Math.min(100000,(s.materials.crystal||0)+8+Math.floor(base/100));
   s.materials.stardust=Math.min(100000,(s.materials.stardust||0)+1+Math.floor(base/200));
   gainXp(s,xp);s.partyDungeonClears=Math.min(9999,(s.partyDungeonClears||0)+1);
   progress(w,p,'dungeon');
   const pool=base>=650?ETERNAL_POOL:base>=550?ECLIPSE_POOL:base>=450?RIFT_POOL:base>=300?MYTHIC_POOL:base>=180?LEGENDARY_POOL:RARE_POOL;
   const pick=pool?.filter(item=>ITEMS[item]&&(ITEMS[item].level||1)<=base+50)||[];
   if(pick.length&&s.bag.length<80&&w.random()<.30){const item=pick[Math.floor(w.random()*pick.length)];s.bag.push(item);w.event(p,'★ 파티던전 희귀 보너스 · '+ITEMS[item].name,'rare');}
   w.event(p,'★ 봉인 던전 정복! 골드 '+gold.toLocaleString()+' · EXP '+xp+' · 수정/별빛 파편 지급','mythic');
  }
  if(p.state.zone===DUNGEON_ZONE&&p.channel===run.channel){
   p.channel=run.originChannel;p.state.zone='surface';p.state.x=768;p.state.y=355;
   clearMotion(p);w.dirty(p);
   p.urgentSave=w.onUrgent(p);
  }
  if(!won)w.event(p,reason||'파티 던전이 종료되었습니다.','rare');
 }
 w.partyDungeons.delete(run.channel);w.channels.delete(run.channel+'|'+DUNGEON_ZONE);
}
export function onPartyDungeonKill(w,e,channel){
 const run=w.partyDungeons.get(channel);if(!run||e.dungeonStage!==run.stage)return;
 const mobs=w.channels.get(channel+'|'+DUNGEON_ZONE)||[];
 if(mobs.some(m=>m.alive))return;
 if(run.stage===3){closePartyDungeon(w,run,true);return;}
 run.stage++;
 w.channels.set(channel+'|'+DUNGEON_ZONE,dungeonMonsters(run,run.stage));
 for(const id of run.members){const p=w.players.get(id);if(p)w.event(p,run.stage===2?'2단계 · 정예 수호병이 등장합니다!':'최종 단계 · 봉인된 천룡왕이 깨어났습니다!','rare');}
}
function enterPartyDungeon(w,p){
 const party=partyOf(w,p),day=koreaDay(w.now());
 if(!party||party.leader!==p.id){w.event(p,'파티장만 던전 입장을 시작할 수 있습니다.');return;}
 const members=party.members.map(id=>w.players.get(id));
 if(members.length<2||members.length>4||members.some(q=>!q||q.state.zone!=='surface'||q.channel!==p.channel||q.exchangeBusy||socialId(w,q))){
  w.event(p,'같은 채널 준자마을에 모인 2~4명이 함께 입장해야 합니다. 거래·대련 중에는 입장할 수 없습니다.');return;
 }
 if(members.some(q=>q.state.level<DUNGEON_MIN_LEVEL)){w.event(p,'모든 파티원이 Lv.100 이상이어야 합니다.');return;}
 if(members.some(q=>q.state.partyDungeonDay===day)){w.event(p,'파티원 중 오늘의 던전 입장권을 이미 사용한 유저가 있습니다.');return;}
 if([...w.partyDungeons.values()].some(r=>r.partyId===party.id)){w.event(p,'파티 던전이 이미 진행 중입니다.');return;}
 const channel='party-trial-'+party.id,run={partyId:party.id,channel,originChannel:p.channel,members:members.map(q=>q.id),level:Math.max(100,Math.min(...members.map(q=>q.state.level))),stage:1,started:w.now(),deadline:w.now()+DUNGEON_SECONDS};
 w.partyDungeons.set(channel,run);w.channels.set(channel+'|'+DUNGEON_ZONE,dungeonMonsters(run,1));
 for(const [i,q] of members.entries()){
  q.state.partyDungeonDay=day;q.channel=channel;q.state.zone=DUNGEON_ZONE;q.state.x=650+(i%2)*220;q.state.y=755+(i>=2?70:0);
  clearMotion(q);w.dirty(q);q.urgentSave=w.onUrgent(q);
  w.event(q,'★ 파티 던전 입장 · 오늘 1회 소모 · 15분 내 3단계 클리어!','rare');
 }
}

export function mmoAction(w,p,data){const s=p.state,now=w.now(),kind=data.type;if(p.exchangeBusy)return true;
 if(kind==='partyDungeonStart'){enterPartyDungeon(w,p);return true;}
 if(kind==='partyDungeonExit'){const r=w.partyDungeons.get(p.channel);if(r&&r.members.includes(p.id))closePartyDungeon(w,r,false,'파티원이 퇴장하여 던전 도전이 종료됐습니다.');return true;}
 if(kind==='travel'||kind==='mapTravel'){
  if(s.zone===DUNGEON_ZONE){w.event(p,'파티 던전에서는 던전 퇴장 버튼을 이용하세요.');return true;}
  if(socialId(w,p)){w.event(p,'거래·대련을 종료한 뒤 이동하세요.');return true;}
  const dest=typeof data.zone==='string'?data.zone:'',z=Object.hasOwn(ZONES,dest)?ZONES[dest]:null;
  const portal=(TRAVEL_PORTALS[s.zone]||[]).find(x=>x.to===dest);
  if(dest===DUNGEON_ZONE||!z||(kind==='travel'&&!portal)){w.event(p,'이동할 수 없는 지역입니다.');return true;}
  if(s.level<z.level){w.event(p,'입장 레벨이 부족합니다. · Lv.'+z.level);return true;}
  if(dest===s.zone){w.event(p,'이미 해당 지역에 있습니다.');return true;}
  clearMotion(p);s.zone=dest;s.x=768;
  s.y=kind==='mapTravel'?(dest==='surface'?355:790):(portal.y>1500?790:1760);
  w.channel(p.channel,s.zone);w.dirty(p);w.event(p,z.name+(kind==='mapTravel'?' 맵 즉시 이동':' 입장'));return true;
 }
 if(kind==='gather'){if(socialId(w,p))return true;const node=NODES.find(n=>n.id===data.node&&n.zone===s.zone);if(!node||distance(s,node)>110){w.event(p,'채집 지점 가까이 이동하세요.');return true;}if((s.gatherTimes[node.id]||0)>now){w.event(p,'이 자원은 아직 회복 중입니다.');return true;}s.gatherTimes[node.id]=now+node.cooldown;const amount=node.material==='crystal'?1:2+Math.floor(w.random()*2);s.materials[node.material]=Math.min(100000,s.materials[node.material]+amount);if(node.material==='crystal'&&w.random()<.15)s.materials.stardust=Math.min(100000,s.materials.stardust+1);progress(w,p,'gather');gainXp(s,20+Math.floor(s.level*2));clearMotion(p);w.dirty(p);w.event(p,MATERIALS[node.material]+' '+amount+'개 채집');return true;}
 if(kind==='craft'){if(socialId(w,p))return true;if(s.zone!=='surface'||distance(s,{x:1000,y:330})>145){w.event(p,'마을 상인 가까이에서 제작하세요.');return true;}const r=Object.hasOwn(RECIPES,data.recipe)?RECIPES[data.recipe]:null;if(!r||s.level<r.level||s.gold<r.gold||Object.entries(r.materials).some(([k,n])=>s.materials[k]<n)){w.event(p,'레벨·재료·골드를 확인하세요.');return true;}if(r.item&&s.bag.length>=80){w.event(p,'가방이 가득 찼습니다.');return true;}for(const [k,n] of Object.entries(r.materials))s.materials[k]-=n;s.gold-=r.gold;if(r.item)s.bag.push(r.item);if(r.potions)s.potions+=r.potions;w.dirty(p);w.event(p,r.name+' 제작 완료');return true;}
 if(kind==='dailyClaim'){if(s.zone!=='surface'||distance(s,{x:580,y:330})>145){w.event(p,'촌장 가까이에서 보상을 받으세요.');return true;}const d=daily(p,now),r=Object.hasOwn(DAILY_TASKS,data.task)?DAILY_TASKS[data.task]:null;if(!r||d.claimed.includes(data.task)||d[data.task]<r.goal)return true;d.claimed.push(data.task);s.gold+=r.gold;gainXp(s,r.xp+Math.floor(s.level*10));w.dirty(p);w.event(p,r.name+' 일일 보상 획득');return true;}
 if(kind==='partyInvite'){partyInvite(w,p,data);return true;}
 if(kind==='partyAccept'){const inv=w.partyInvites.get(data.id);if(!inv||inv.to!==p.id||inv.expires<now)return true;const leader=w.players.get(inv.from);if(!leader||partyOf(w,p)){w.partyInvites.delete(inv.id);return true;}let party=inv.partyId?w.parties.get(inv.partyId):partyOf(w,leader);if(!party){party={id:randomUUID(),leader:leader.id,members:[leader.id]};w.parties.set(party.id,party);}if(party.leader!==leader.id||party.members.length>=4){w.event(p,'파티에 참가할 수 없습니다.');w.partyInvites.delete(inv.id);return true;}party.members.push(p.id);w.partyInvites.delete(inv.id);for(const id of party.members){const q=w.players.get(id);if(q)w.event(q,p.name+'님이 파티에 참가했습니다.');}return true;}
 if(kind==='partyDecline'){const inv=w.partyInvites.get(data.id);if(inv?.to===p.id)w.partyInvites.delete(inv.id);return true;}
 if(kind==='partyLeave'){leaveParty(w,p);return true;}
 if(kind==='partyKick'){const party=partyOf(w,p);if(!party||party.leader!==p.id||data.player===p.id)return true;const q=w.players.get(data.player);if(q&&party.members.includes(q.id)){party.members=party.members.filter(id=>id!==q.id);w.event(q,'파티에서 제외되었습니다.');for(const id of party.members){const m=w.players.get(id);if(m)w.event(m,q.name+'님이 파티에서 제외되었습니다.');}if(party.members.length<2)w.parties.delete(party.id);}return true;}
 if(kind==='tradeInvite'||kind==='duelInvite'){invite(w,p,data,kind==='duelInvite');return true;}
 if(kind==='tradeCancel'||kind==='duelCancel'){const t=(kind==='tradeCancel'?w.trades:w.duels).get(data.id);if(t?.players.includes(p.id)&&!t.settling)removeSocial(w,p);return true;}
 if(kind==='tradeAccept'){const t=w.trades.get(data.id);if(t&&t.from!==p.id&&t.players.includes(p.id)&&close(...t.players.map(id=>w.players.get(id)))){t.accepted=true;t.expires=now+180;}return true;}
 if(kind==='tradeOffer'){const t=w.trades.get(data.id);if(!t?.accepted||!t.players.includes(p.id)||t.settling)return true;const o={gold:Number(data.gold),items:data.items,materials:data.materials||{}};if(!validOffer(p,o)){w.event(p,'장착·귀속 아이템과 보유량을 확인하세요.');return true;}t.offers[p.id]=structuredClone(o);t.confirmed=[];t.expires=now+180;return true;}
 if(kind==='tradeConfirm'){const t=w.trades.get(data.id);if(!t?.accepted||!t.players.includes(p.id)||t.settling)return true;if(!t.confirmed.includes(p.id))t.confirmed.push(p.id);if(t.confirmed.length===2)return settle(w,t);return true;}
 if(kind==='duelAccept'){const t=w.duels.get(data.id);if(!t||t.from===p.id||!t.players.includes(p.id))return true;const ps=t.players.map(id=>w.players.get(id));if(!close(...ps)||ps.some(q=>q.state.y>590))return true;t.accepted=true;t.start=now+3;t.expires=now+123;t.health=Object.fromEntries(ps.map(q=>[q.id,1000]));t.next={};t.cooldowns={};for(const q of ps)clearMotion(q);return true;}
 if(kind==='duelAttack'){const t=[...w.duels.values()].find(t=>t.accepted&&t.players.includes(p.id));if(!t||now<t.start||now<(t.next[p.id]||0))return true;const other=w.players.get(t.players.find(id=>id!==p.id));if(!close(p,other))return true;const skill=Number(data.skill),j=w.jobs[s.job],ability=Number.isInteger(skill)&&skill>=0?j.skills[skill]:null;const cd=t.cooldowns[p.id]||Array(j.skills.length).fill(0),rankReq=Number(ability?.[5]?.rank)||0;if(skill>=0&&(!ability||s.level<ability[1]||s.rank<rankReq||!promotionSkillLearned(s,rankReq)||now<cd[skill]))return true;const mpCost=skillMpCost(s,ability);if(ability&&s.mp<mpCost){w.event(p,'마나가 부족합니다.');return true;}const range=Math.min(220,stats(s).range);if(distance(s,other.state)>range){w.event(p,'대련 상대에게 더 가까이 접근하세요.');return true;}t.next[p.id]=now+(ability?skillCastDelay(s,ability):basicAttackDelay(s));if(ability){s.mp=Math.max(0,s.mp-mpCost);w.dirty(p);cd[skill]=now+ability[2];t.cooldowns[p.id]=cd;}const mode=ability?.[4];if(mode==='heal'||mode==='partyHeal')t.health[p.id]=Math.min(1000,t.health[p.id]+(mode==='partyHeal'?240:160));else if(mode==='guard'||mode==='partyGuard'){t.guards??={};t.guards[p.id]=now+5;}else{const bonus=Math.min(.15,(s.rank*.03+Math.max(0,stats(s).atk-10-s.level*3-j.attack)/2500));const hit=Math.round(65*(ability?.[3]||1)*(1+bonus)*(t.guards?.[other.id]>now?.5:1));t.health[other.id]=Math.max(0,t.health[other.id]-hit);if(mode==='drain')t.health[p.id]=Math.min(1000,t.health[p.id]+Math.round(hit*.3));}p.attackSkill=Number.isInteger(skill)?skill:-1;p.attackTarget=other.id;const dx=other.state.x-s.x,dy=other.state.y-s.y,d=Math.hypot(dx,dy)||1;p.dirX=dx/d;p.dirY=dy/d;p.face=Math.abs(dx)>Math.abs(dy)?2:dy<0?1:0;p.flip=p.face===2&&dx<0;p.attackUntil=now+Math.min(.72,(ability?skillCastDelay(s,ability):basicAttackDelay(s))*.82);if(t.health[other.id]===0){s.pvpWins++;w.dirty(p);w.event(p,'PVP 대련 승리! 승수 +1 · 아이템 손실 없음');w.event(other,'대련 종료 · 성장과 장비는 유지됩니다.');w.duels.delete(t.id);}return true;}
 return false;
}
export function tickSystems(w){const now=w.now();for(const run of [...w.partyDungeons.values()]){const members=run.members.map(id=>w.players.get(id));if(now>run.deadline||members.some(q=>!q||q.channel!==run.channel||q.state.zone!==DUNGEON_ZONE)||!w.parties.get(run.partyId)||w.parties.get(run.partyId).members.length!==run.members.length)closePartyDungeon(w,run,false,now>run.deadline?'파티 던전 제한시간 15분이 종료됐습니다.':'파티 인원이 변경되어 던전이 종료됐습니다.');}for(const [id,inv] of w.partyInvites)if(now>inv.expires||!w.players.has(inv.from)||!w.players.has(inv.to))w.partyInvites.delete(id);for(const [id,party] of w.parties){party.members=party.members.filter(pid=>w.players.has(pid));if(party.members.length<2)w.parties.delete(id);else if(!party.members.includes(party.leader))party.leader=party.members[0];}for(const map of [w.trades,w.duels])for(const [id,t] of map){if(t.settling)continue;const [a,b]=t.players.map(id=>w.players.get(id));if(now>t.expires||!same(a,b)||(map===w.trades&&distance(a.state,b.state)>260)||(map===w.duels&&t.accepted&&(a.state.y>590||b.state.y>590||distance(a.state,b.state)>400))){map.delete(id);for(const p of [a,b])if(p)w.event(p,'거리·시간·접속 변화로 거래 또는 대련이 종료되었습니다.');}}
}
export function snapshotSystems(w,p){const t=[...w.trades.values()].find(t=>t.players.includes(p.id)),d=[...w.duels.values()].find(t=>t.players.includes(p.id)),party=partyOf(w,p),partyInvite=[...w.partyInvites.values()].find(x=>x.to===p.id),bossesInZone=w.channel(p.channel,p.state.zone).filter(e=>e.alive&&e.boss&&e.tags?.size),raidBoss=bossesInZone.sort((a,b)=>(b.named?1:0)-(a.named?1:0))[0]||null;let raidContribution=null;if(raidBoss){const total=[...raidBoss.tags.values()].reduce((n,t)=>n+Math.max(0,Number(t.damage)||0),0),ids=party?.members||[p.id];const rows=ids.map(id=>{const q=w.players.get(id),tag=raidBoss.tags.get(id);if(!q||!tag)return null;const damage=Math.max(0,Math.round(Number(tag.damage)||0));return {id,name:q.name,job:q.state.job,damage,support:!!tag.support,percent:total?Math.round(damage/total*100):0};}).filter(Boolean);if(rows.length)raidContribution={bossId:raidBoss.id,name:raidBoss.name,named:!!raidBoss.named,hp:raidBoss.hp,maxHp:raidBoss.max,rows};}const partyDungeon=w.partyDungeons.get(p.channel);return {partyDungeon:partyDungeon?{stage:partyDungeon.stage,totalStages:3,deadline:partyDungeon.deadline,level:partyDungeon.level,members:partyDungeon.members.length}:null,daily:structuredClone(daily(p,w.now())),nodes:NODES.filter(n=>n.zone===p.state.zone).map(n=>({...n,readyAt:p.state.gatherTimes[n.id]||0})),bosses:NAMED.map(b=>({...b,...bossWindow(b,w.now())})),trade:t?structuredClone(t):null,duel:d?structuredClone(d):null,party:party?{id:party.id,leader:party.leader,members:party.members.map(id=>{const q=w.players.get(id);if(!q)return null;const st=stats(q.state);return {id:q.id,name:q.name,job:q.state.job,rank:q.state.rank,level:q.state.level,hp:q.state.hp,maxHp:st.hp,zone:q.state.zone,channel:q.channel};}).filter(Boolean)}:null,partyInvite:partyInvite?{...partyInvite,fromName:w.players.get(partyInvite.from)?.name||'유저'}:null,raidContribution};}