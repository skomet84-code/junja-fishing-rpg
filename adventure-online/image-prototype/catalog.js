import {normalize} from './core.js';
import {EXTRA_ITEMS,LEVEL_CAP,MMO_XP,MMO_HP} from './mmo-data.js';
export {MMO_XP as needXp} from './mmo-data.js';
export const BUILD='20261007-combatqol2';
export const JOBS={
 warrior:{name:'전사',title:'검호',role:'근접 · 방어',art:'hero',color:'#efbd68',attack:3,def:4,range:115,mana:70,speed:1,attackDelay:.56,skills:[['회전베기',2,4,1.9,'area',{mp:8,mpPct:.10,cast:.55,center:'self',radius:175,knockback:38}],['철벽',4,8,0,'guard',{mp:12,mpPct:.12,cast:.35,guard:8,guardFactor:.28}],['강타',8,7,3.4,'hit',{mp:14,mpPct:.15,cast:.8,stun:1.1,knockback:55}],['검기폭풍',10,14,2.8,'area',{mp:20,mpPct:.22,cast:1.15,center:'target',radius:245,hits:3,knockback:24}]]},
 rogue:{name:'도적',title:'그림자',role:'기습 · 연속공격',art:'rogue',color:'#e791a4',attack:5,def:1,range:120,mana:80,speed:1.12,attackDelay:.50,skills:[['쌍검난무',2,3,2.45,'hit',{mp:7,mpPct:.09,cast:.45,hits:4}],['흡혈검',4,7,1.8,'drain',{mp:11,mpPct:.13,cast:.55,leech:.6}],['그림자 일격',8,9,3.7,'hit',{mp:14,mpPct:.17,cast:.7,execute:.35,executeBonus:1.45,stun:.55}],['월영참',10,14,3.1,'area',{mp:19,mpPct:.22,cast:.95,center:'target',radius:190,slow:2.5}]]},
 mage:{name:'주술사',title:'현자',role:'원거리 · 광역',art:'mage',color:'#b6a1fb',attack:4,def:0,range:330,mana:120,speed:.94,attackDelay:.62,skills:[['화염구',2,3,2.2,'hit',{mp:9,mpPct:.10,cast:.65,splash:90,splashFactor:.45}],['서리장',4,6,1.45,'slow',{mp:13,mpPct:.13,cast:.85,center:'target',radius:205,slow:5}],['뇌전폭풍',8,10,2.7,'area',{mp:18,mpPct:.18,cast:1.1,chain:4,chainRadius:250,falloff:.82,stun:.35}],['천둥심판',10,16,3.5,'area',{mp:26,mpPct:.24,cast:1.45,center:'target',radius:270,stun:1.15,bossStun:.35}]]},
 healer:{name:'도사',title:'선인',role:'회복 · 지원',art:'healer',color:'#9de1af',attack:1,def:2,range:290,mana:130,speed:.92,attackDelay:.64,skills:[['성광탄',2,3,2.05,'hit',{mp:8,mpPct:.09,cast:.6,selfHeal:.1}],['생명의 숨결',4,8,0,'heal',{mp:14,mpPct:.15,cast:.8,heal:.38,radius:310}],['수호결계',8,10,0,'partyGuard',{mp:18,mpPct:.17,cast:.7,guard:7,guardFactor:.5,radius:330}],['연화회복',10,16,0,'partyHeal',{mp:28,mpPct:.25,cast:1.25,heal:.62,radius:360,guard:2,guardFactor:.65}]]},
};
export const SLOTS={head:'투구',weapon:'무기',armor:'갑옷',cape:'망토',boots:'신발',ring:'반지',ear:'귀걸이'};
export const ITEMS={
 ...EXTRA_ITEMS,
 training:{name:'수련 무기',slot:'weapon',rarity:'normal',atk:0,tier:0},
 glowing:{name:'빛나는 무기',slot:'weapon',rarity:'uncommon',atk:8,speed:.02,tier:1},
 leather:{name:'숲지기 갑옷',slot:'armor',rarity:'normal',def:3,hp:15,tier:1},
 hood:{name:'숲지기 투구',slot:'head',rarity:'normal',def:2,tier:1},
 boots:{name:'숲지기 장화',slot:'boots',rarity:'normal',def:1,hp:8,speed:.025,tier:1},
 cape:{name:'초록 망토',slot:'cape',rarity:'uncommon',def:2,hp:18,tier:1},
 kingblade:{name:'왕꼬리의 서광',slot:'weapon',rarity:'rare',atk:18,speed:.04,tier:2},
 kingarmor:{name:'왕꼬리 비늘갑옷',slot:'armor',rarity:'rare',def:8,hp:40,tier:2},
 kingcrown:{name:'왕꼬리 왕관',slot:'head',rarity:'rare',def:4,hp:20,tier:2},
 kingcape:{name:'달빛 망토',slot:'cape',rarity:'rare',atk:4,hp:30,tier:2},
 kingring:{name:'숲의 반지',slot:'ring',rarity:'rare',atk:3,hp:15,speed:.045,tier:2},
 kingear:{name:'이슬 귀걸이',slot:'ear',rarity:'rare',def:2,hp:20,tier:2},
};
export const RARE_POOL=['kingblade','kingarmor','kingcrown','kingcape','kingring','kingear'];
export const UNCOMMON_POOL=['leather','hood','boots','cape'];
export const LEGENDARY_POOL=['astralblade','astralarmor','astralcape','astralcrown','astralboots','astralring','astralear'];
export const MYTHIC_POOL=['mythicblade','mythicarmor','mythiccape','mythiccrown','mythicboots','mythicring','mythicear'];
export const MAX_ENHANCE=12;
export function enhanceChance(level){return [1,1,1,.95,.85,.72,.58,.42,.28,.16,.08,.04][Math.max(0,Math.min(MAX_ENHANCE-1,Math.floor(level)||0))]??0;}
export function enhancementLevel(s,id){return Math.max(0,Math.min(MAX_ENHANCE,Math.floor(Number(s.enhancements?.[id])||0)));}
export function profile(raw={},job='warrior'){
 const s=normalize(raw);s.version=4;s.level=Math.min(LEVEL_CAP,Math.max(1,Math.floor(Number(raw.level)||1)));s.exp=Math.min(1000000000,Math.max(0,Math.floor(Number(raw.exp)||0)));while(s.exp>=MMO_XP(s.level)&&s.level<LEVEL_CAP){s.exp-=MMO_XP(s.level);s.level++;}s.job=Object.hasOwn(JOBS,raw.job)?raw.job:job;s.rank=Math.min(3,Math.max(0,Math.floor(Number(raw.rank)||0)));
 s.zone=['surface','grove','cave','ruins','abyss','celestial'].includes(raw.zone)?raw.zone:'surface';s.materials={};for(const key of ['wood','stone','ore','crystal','stardust'])s.materials[key]=Math.min(100000,Math.max(0,Math.floor(Number(raw.materials?.[key])||0)));
 s.daily=raw.daily&&typeof raw.daily==='object'?{day:String(raw.daily.day||'').slice(0,10),hunt:Math.min(20,Math.max(0,Number(raw.daily.hunt)||0)),gather:Math.min(12,Math.max(0,Number(raw.daily.gather)||0)),dungeon:Math.min(5,Math.max(0,Number(raw.daily.dungeon)||0)),claimed:Array.isArray(raw.daily.claimed)?raw.daily.claimed.filter(x=>['hunt','gather','dungeon'].includes(x)):[]}:null;
 s.bossClaims=Array.isArray(raw.bossClaims)?raw.bossClaims.filter(x=>typeof x==='string').slice(-12):[];s.gatherTimes=raw.gatherTimes&&typeof raw.gatherTimes==='object'?raw.gatherTimes:{};s.pvpWins=Math.max(0,Math.floor(Number(raw.pvpWins)||0));
 s.bossKills=Math.max(0,Math.floor(Number(raw.bossKills)||0));s.manaPotions=Math.min(9999,Math.max(0,Number.isFinite(Number(raw.manaPotions))?Math.floor(Number(raw.manaPotions)):3));s.autoHpPct=[0,30,50,70].includes(Number(raw.autoHpPct))?Number(raw.autoHpPct):0;s.autoMpPct=[0,30,50,70].includes(Number(raw.autoMpPct))?Number(raw.autoMpPct):0;s.bag=Array.isArray(raw.bag)?raw.bag.filter(id=>Object.hasOwn(ITEMS,id)).slice(0,80):['training'];s.enhanceStones=Math.min(9999,Math.max(0,Math.floor(Number(raw.enhanceStones)||0)));s.shiningStones=Math.min(9999,Math.max(0,Math.floor(Number(raw.shiningStones)||0)));s.enhancements={};for(const [id,n] of Object.entries(raw.enhancements||{}))if(Object.hasOwn(ITEMS,id))s.enhancements[id]=Math.max(0,Math.min(MAX_ENHANCE,Math.floor(Number(n)||0)));
 if(!s.bag.includes('training'))s.bag.unshift('training');if(s.weapon&&!s.bag.includes('glowing'))s.bag.push('glowing');
 s.equipment={weapon:s.weapon?'glowing':'training'};for(const [slot,id] of Object.entries(raw.equipment||{}))if(SLOTS[slot]&&ITEMS[id]?.slot===slot&&s.bag.includes(id))s.equipment[slot]=id;
 const st=stats(s),rawMp=Number(raw.mp);s.hp=Math.min(Math.max(1,Number(raw.hp)||MMO_HP(s.level)),st.hp);s.mp=Math.min(st.mp,Math.max(0,Number.isFinite(rawMp)?rawMp:st.mp));return s;
}
export function stats(s){const job=JOBS[s.job]||JOBS.warrior;let atk=10+s.level*3+job.attack+s.rank*30,def=job.def+Math.floor(s.level*.35)+s.rank*15,hp=MMO_HP(s.level),mp=job.mana+s.level*5+s.rank*25,speed=job.speed+Math.min(.2,Math.max(0,s.level-1)*.001)+s.rank*.04;for(const id of Object.values(s.equipment||{})){const item=ITEMS[id];if(item){const enhance=enhancementLevel(s,id),factor=1+enhance*.07;atk+=Math.round((item.atk||0)*factor);def+=Math.round((item.def||0)*factor);hp+=Math.round((item.hp||0)*factor);speed+=(item.speed||0)*(1+enhance*.04);}}speed=Math.round(speed*1000)/1000;return {atk,def,hp,mp,speed,range:job.range};}
export function basicAttackDelay(s){const job=JOBS[s.job]||JOBS.warrior;return Math.max(.30,job.attackDelay/stats(s).speed);}
export function skillCastDelay(s,skill){const base=Math.max(.25,Number(skill?.[5]?.cast)||.8);return Math.max(.28,base/stats(s).speed);}
export function skillMpCost(s,skill){if(!skill)return 0;const spec=skill[5]||{},st=stats(s),fixed=Math.max(0,Number(spec.mp)||0),pct=Math.max(0,Number(spec.mpPct)||0);return Math.max(fixed,Math.round(st.mp*pct));}
export function jobName(s){return s.rank?JOBS[s.job].title+' · '+s.rank+'차':JOBS[s.job].name;}
export function gainXp(s,xp){s.exp+=xp;const before=s.level;while(s.exp>=MMO_XP(s.level)&&s.level<LEVEL_CAP){s.exp-=MMO_XP(s.level);s.level++;}if(s.level>before){const st=stats(s);s.hp=st.hp;s.mp=st.mp;}return s.level>before;}
export function rollLoot(boss,random=Math.random){const r=random();if(boss){if(r<.10)return RARE_POOL[Math.min(5,Math.floor(random()*6))];if(r<.40)return UNCOMMON_POOL[Math.min(3,Math.floor(random()*4))];}else if(r<.03)return UNCOMMON_POOL[Math.min(3,Math.floor(random()*4))];return null;}
export function equip(s,id){if(!Object.hasOwn(ITEMS,id)||!s.bag.includes(id)||s.level<(ITEMS[id].level||1))return false;s.equipment[ITEMS[id].slot]=id;s.hp=Math.min(s.hp,stats(s).hp);return true;}
export function claim(s){if(s.quest==='ready'){s.gold+=200;s.potions+=3;gainXp(s,80);s.quest='complete';return true;}if(s.quest==='bossReady'){s.gold+=500;gainXp(s,180);s.weapon=1;if(!s.bag.includes('glowing'))s.bag.push('glowing');s.equipment.weapon='glowing';s.quest='groveIntro';s.questKills=0;s.questBoss=0;return true;}const next={groveIntro:'groveHunt',caveIntro:'caveHunt',ruinsIntro:'ruinsHunt',abyssIntro:'abyssHunt',celestialIntro:'celestialHunt'}[s.quest];if(next){s.quest=next;s.questKills=0;s.questBoss=0;return true;}return false;}
