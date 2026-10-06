import {fresh,normalize,maxHp,needXp} from './core.js';
export const BUILD='20261006-online-2';
export const JOBS={
 warrior:{name:'전사',title:'검호',role:'근접 · 방어',art:'hero',color:'#efbd68',attack:3,def:4,range:115,skills:[['회전베기',2,5,2,'area'],['철벽',4,12,0,'guard'],['강타',8,8,3.4,'hit'],['검기폭풍',10,15,3,'area']]},
 rogue:{name:'도적',title:'그림자',role:'기습 · 연속공격',art:'rogue',color:'#e791a4',attack:5,def:1,range:120,skills:[['쌍검난무',2,5,2.4,'hit'],['흡혈검',4,9,1.7,'drain'],['그림자 일격',8,8,4,'hit'],['월영참',10,15,3.3,'area']]},
 mage:{name:'주술사',title:'현자',role:'원거리 · 광역',art:'mage',color:'#b6a1fb',attack:4,def:0,range:330,skills:[['화염구',2,5,2.2,'hit'],['서리장',4,9,1.5,'slow'],['뇌전폭풍',8,10,2.8,'area'],['천둥심판',10,15,3.5,'area']]},
 healer:{name:'도사',title:'선인',role:'회복 · 지원',art:'healer',color:'#9de1af',attack:1,def:2,range:290,skills:[['성광탄',2,5,2,'hit'],['생명의 숨결',4,9,0,'heal'],['수호결계',8,12,0,'partyGuard'],['연화회복',10,15,0,'partyHeal']]},
};
export const SLOTS={head:'투구',weapon:'무기',armor:'갑옷',cape:'망토',boots:'신발',ring:'반지',ear:'귀걸이'};
export const ITEMS={
 training:{name:'수련 무기',slot:'weapon',rarity:'normal',atk:0,tier:0},
 glowing:{name:'빛나는 무기',slot:'weapon',rarity:'uncommon',atk:8,tier:1},
 leather:{name:'숲지기 갑옷',slot:'armor',rarity:'normal',def:3,hp:15,tier:1},
 hood:{name:'숲지기 투구',slot:'head',rarity:'normal',def:2,tier:1},
 boots:{name:'숲지기 장화',slot:'boots',rarity:'normal',def:1,hp:8,tier:1},
 cape:{name:'초록 망토',slot:'cape',rarity:'uncommon',def:2,hp:18,tier:1},
 kingblade:{name:'왕꼬리의 서광',slot:'weapon',rarity:'rare',atk:18,tier:2},
 kingarmor:{name:'왕꼬리 비늘갑옷',slot:'armor',rarity:'rare',def:8,hp:40,tier:2},
 kingcrown:{name:'왕꼬리 왕관',slot:'head',rarity:'rare',def:4,hp:20,tier:2},
 kingcape:{name:'달빛 망토',slot:'cape',rarity:'rare',atk:4,hp:30,tier:2},
 kingring:{name:'숲의 반지',slot:'ring',rarity:'rare',atk:3,hp:15,tier:2},
 kingear:{name:'이슬 귀걸이',slot:'ear',rarity:'rare',def:2,hp:20,tier:2},
};
export const RARE_POOL=['kingblade','kingarmor','kingcrown','kingcape','kingring','kingear'];
export const UNCOMMON_POOL=['leather','hood','boots','cape'];
export function profile(raw={},job='warrior'){
 const s=normalize(raw);s.version=3;s.job=JOBS[raw.job]?raw.job:job;s.rank=raw.rank===1?1:0;
 s.bossKills=Math.max(0,Math.floor(Number(raw.bossKills)||0));s.bag=Array.isArray(raw.bag)?raw.bag.filter(id=>ITEMS[id]).slice(0,80):['training'];
 if(!s.bag.includes('training'))s.bag.unshift('training');if(s.weapon&&!s.bag.includes('glowing'))s.bag.push('glowing');
 s.equipment={weapon:s.weapon?'glowing':'training'};for(const [slot,id] of Object.entries(raw.equipment||{}))if(SLOTS[slot]&&ITEMS[id]?.slot===slot&&s.bag.includes(id))s.equipment[slot]=id;
 s.hp=Math.min(Math.max(1,Number(raw.hp)||maxHp(s.level)),stats(s).hp);return s;
}
export function stats(s){const job=JOBS[s.job]||JOBS.warrior;let atk=10+s.level*3+job.attack+s.rank*4,def=job.def,hp=maxHp(s.level);for(const id of Object.values(s.equipment||{})){const item=ITEMS[id];if(item){atk+=item.atk||0;def+=item.def||0;hp+=item.hp||0;}}return {atk,def,hp,range:job.range};}
export function jobName(s){return s.rank?JOBS[s.job].title:JOBS[s.job].name;}
export function gainXp(s,xp){s.exp+=xp;const before=s.level;while(s.exp>=needXp(s.level)&&s.level<50){s.exp-=needXp(s.level);s.level++;}if(s.level>before)s.hp=stats(s).hp;return s.level>before;}
export function rollLoot(boss,random=Math.random){const r=random();if(boss){if(r<.10)return RARE_POOL[Math.min(5,Math.floor(random()*6))];if(r<.40)return UNCOMMON_POOL[Math.min(3,Math.floor(random()*4))];}else if(r<.03)return UNCOMMON_POOL[Math.min(3,Math.floor(random()*4))];return null;}
export function equip(s,id){if(!ITEMS[id]||!s.bag.includes(id))return false;s.equipment[ITEMS[id].slot]=id;s.hp=Math.min(s.hp,stats(s).hp);return true;}
export function claim(s){if(s.quest==='ready'){s.gold+=200;s.potions+=3;gainXp(s,80);s.quest='complete';return true;}if(s.quest==='bossReady'){s.gold+=500;gainXp(s,180);s.weapon=1;if(!s.bag.includes('glowing'))s.bag.push('glowing');s.equipment.weapon='glowing';s.quest='done';return true;}return false;}
