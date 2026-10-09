export const LEVEL_CAP=750,CHANNEL_CAP=48,WORLD_CAP=192;
export const PROMOTIONS=[{level:100,name:'1차 전직',bosses:1},{level:200,name:'2차 전직',bosses:5},{level:300,name:'3차 전직',bosses:15},{level:400,name:'4차 전직',bosses:30},{level:500,name:'5차 전직',bosses:45,story:'rift'},{level:650,name:'6차 전직',bosses:70,story:'eclipse'}];
export const PROMOTION_MATERIALS={
 3:{key:'voidSeal',name:'공허의 인장',need:100,zone:'void',source:'공허 성채 정예 · 공허성의 파괴자 · 공허제 아르카논'},
 4:{key:'originMark',name:'태초의 성흔',need:100,zone:'origin',source:'태초의 신전 정예 · 태초신전 수문신 · 태초신 카이로스'},
 5:{key:'riftCore',name:'균열의 핵',need:120,zone:'rift',source:'하늘 균열 정예 · 균열 수문장 · 균열 군주'},
 6:{key:'eclipseSigil',name:'월식의 문장',need:150,zone:'eclipse',source:'월식 요새 정예 · 월식 집행자 · 월식황제'}
};
export const MATERIALS={wood:'나무',stone:'돌',ore:'철광석',crystal:'던전 수정',stardust:'별빛 파편'};
export const QUICK_CHATS=['안녕하세요!','같이 사냥해요!','보스 잡으러 가요!','잠깐만요!','도와주세요!','고마워요!','축하해요!','ㅋㅋㅋㅋ','좋아요!','마을에서 만나요!'];
export const EXTRA_ITEMS={
 primordialblade:{name:'태초 · 창세의 검',slot:'weapon',rarity:'primordial',atk:7400,def:390,hp:4800,speed:.29,tier:11,level:700,bound:true},
 primordialarmor:{name:'태초 · 기원의 갑주',slot:'armor',rarity:'primordial',atk:1380,def:3300,hp:47000,tier:11,level:700,bound:true},
 primordialcape:{name:'태초 · 무한의 망토',slot:'cape',rarity:'primordial',atk:2780,def:1390,hp:21000,tier:11,level:700,bound:true},
 primordialcrown:{name:'태초 · 운명의 관',slot:'head',rarity:'primordial',atk:1630,def:1170,hp:12800,tier:11,level:700,bound:true},
 primordialboots:{name:'태초 · 시공초월의 장화',slot:'boots',rarity:'primordial',atk:980,def:940,hp:17100,speed:.27,tier:11,level:700,bound:true},
 primordialring:{name:'태초 · 영겁의 반지',slot:'ring',rarity:'primordial',atk:2420,def:420,hp:10100,speed:.28,tier:11,level:700,bound:true},
 primordialear:{name:'태초 · 신들의 귀걸이',slot:'ear',rarity:'primordial',atk:1890,def:1030,hp:14000,tier:11,level:700,bound:true},
 ironblade:{name:'단조 철검',slot:'weapon',rarity:'uncommon',atk:24,speed:.025,tier:1,level:15,shop:true,price:25000},
 ironarmor:{name:'단조 철갑',slot:'armor',rarity:'uncommon',def:12,hp:100,tier:1,level:15,shop:true,price:30000},
 crystalblade:{name:'수정빛 무기',slot:'weapon',rarity:'rare',atk:95,speed:.05,tier:2,level:50,shop:true,price:180000},
 crystalarmor:{name:'수정 수호갑',slot:'armor',rarity:'rare',def:45,hp:420,tier:2,level:50,shop:true,price:220000},
 crystalcrown:{name:'수정의 관',slot:'head',rarity:'rare',atk:8,def:22,hp:180,tier:2,level:50,shop:true,price:150000},
 crystalcape:{name:'수정별 망토',slot:'cape',rarity:'rare',atk:18,def:15,hp:240,tier:2,level:50,shop:true,price:170000},
 crystalboots:{name:'수정길 장화',slot:'boots',rarity:'rare',def:20,hp:260,speed:.05,tier:2,level:50,shop:true,price:145000},
 crystalring:{name:'수정심장 반지',slot:'ring',rarity:'rare',atk:20,def:8,hp:140,speed:.055,tier:2,level:50,shop:true,price:160000},
 crystalear:{name:'수정눈물 귀걸이',slot:'ear',rarity:'rare',atk:12,def:14,hp:180,tier:2,level:50,shop:true,price:150000},
 ruinblade:{name:'적월 파멸검',slot:'weapon',rarity:'rare',atk:150,speed:.065,tier:2,level:80,shop:true,price:480000},
 ruinarmor:{name:'적월 수호갑',slot:'armor',rarity:'rare',def:70,hp:700,tier:2,level:80,shop:true,price:600000},
 ruincrown:{name:'적월 전투관',slot:'head',rarity:'rare',atk:18,def:32,hp:300,tier:2,level:80,shop:true,price:390000},
 ruincape:{name:'적월의 망토',slot:'cape',rarity:'rare',atk:32,def:24,hp:360,tier:2,level:80,shop:true,price:440000},
 ruinboots:{name:'적월 추적장화',slot:'boots',rarity:'rare',atk:6,def:30,hp:420,speed:.07,tier:2,level:80,shop:true,price:360000},
 ruinring:{name:'적월 군주의 반지',slot:'ring',rarity:'rare',atk:34,def:12,hp:220,speed:.075,tier:2,level:80,shop:true,price:420000},
 ruinear:{name:'적월의 귀걸이',slot:'ear',rarity:'rare',atk:22,def:20,hp:260,tier:2,level:80,shop:true,price:400000},
 astralblade:{name:'전설 · 천명의 서광',slot:'weapon',rarity:'legendary',atk:240,speed:.08,tier:3,level:99},
 astralarmor:{name:'전설 · 천룡의 갑주',slot:'armor',rarity:'legendary',def:100,hp:1200,tier:3,level:99},
 astralcape:{name:'전설 · 별하늘 망토',slot:'cape',rarity:'legendary',atk:85,def:40,hp:650,tier:3,level:99},
 astralcrown:{name:'전설 · 천룡의 관',slot:'head',rarity:'legendary',atk:35,def:48,hp:520,tier:3,level:99},
 astralboots:{name:'전설 · 성운의 장화',slot:'boots',rarity:'legendary',def:52,hp:720,speed:.06,tier:3,level:99},
 astralring:{name:'전설 · 별왕의 반지',slot:'ring',rarity:'legendary',atk:72,def:18,hp:360,speed:.065,tier:3,level:99},
 astralear:{name:'전설 · 천성의 귀걸이',slot:'ear',rarity:'legendary',atk:42,def:36,hp:460,tier:3,level:99},
 shadowblade:{name:'전설 · 심연군왕의 월식검',slot:'weapon',rarity:'legendary',atk:380,def:25,hp:250,speed:.09,tier:3,level:140},
 shadowarmor:{name:'전설 · 심연군왕의 흑갑',slot:'armor',rarity:'legendary',atk:35,def:160,hp:1900,tier:3,level:140},
 shadowcape:{name:'전설 · 월식 군왕망토',slot:'cape',rarity:'legendary',atk:125,def:70,hp:1000,tier:3,level:140},
 shadowcrown:{name:'전설 · 심연의 왕관',slot:'head',rarity:'legendary',atk:60,def:75,hp:800,tier:3,level:140},
 shadowboots:{name:'전설 · 암영 질주장화',slot:'boots',rarity:'legendary',atk:25,def:80,hp:950,speed:.075,tier:3,level:140},
 shadowring:{name:'전설 · 군왕의 흑성반지',slot:'ring',rarity:'legendary',atk:110,def:30,hp:600,speed:.08,tier:3,level:140},
 shadowear:{name:'전설 · 월식의 귀걸이',slot:'ear',rarity:'legendary',atk:70,def:55,hp:700,tier:3,level:140},
 dragonblade:{name:'전설 · 천룡황제의 신검',slot:'weapon',rarity:'legendary',atk:520,def:45,hp:500,speed:.11,tier:3,level:180},
 dragonarmor:{name:'전설 · 천룡황제의 성갑',slot:'armor',rarity:'legendary',atk:60,def:220,hp:3000,tier:3,level:180},
 dragoncape:{name:'전설 · 천룡성운 망토',slot:'cape',rarity:'legendary',atk:180,def:100,hp:1500,tier:3,level:180},
 dragoncrown:{name:'전설 · 천룡황제의 관',slot:'head',rarity:'legendary',atk:95,def:100,hp:1100,tier:3,level:180},
 dragonboots:{name:'전설 · 천룡 비상장화',slot:'boots',rarity:'legendary',atk:45,def:105,hp:1300,speed:.09,tier:3,level:180},
 dragonring:{name:'전설 · 천룡심장 반지',slot:'ring',rarity:'legendary',atk:160,def:45,hp:850,speed:.10,tier:3,level:180},
 dragonear:{name:'전설 · 천룡의 귀걸이',slot:'ear',rarity:'legendary',atk:100,def:80,hp:950,tier:3,level:180},
 mythicblade:{name:'신화 · 천제의 심판',slot:'weapon',rarity:'mythic',atk:620,def:35,hp:500,speed:.12,tier:4,level:200},
 mythicarmor:{name:'신화 · 창세의 성갑',slot:'armor',rarity:'mythic',atk:70,def:260,hp:3400,tier:4,level:200},
 mythiccape:{name:'신화 · 무한성운 망토',slot:'cape',rarity:'mythic',atk:210,def:110,hp:1800,tier:4,level:200},
 mythiccrown:{name:'신화 · 천제의 왕관',slot:'head',rarity:'mythic',atk:115,def:105,hp:1100,tier:4,level:200},
 mythicboots:{name:'신화 · 시공의 장화',slot:'boots',rarity:'mythic',atk:55,def:95,hp:1300,speed:.09,tier:4,level:200},
 mythicring:{name:'신화 · 영원의 반지',slot:'ring',rarity:'mythic',atk:190,def:55,hp:900,speed:.10,tier:4,level:200},
 mythicear:{name:'신화 · 태초의 귀걸이',slot:'ear',rarity:'mythic',atk:120,def:95,hp:1200,tier:4,level:200},
 voidblade:{name:'신화 · 공허제의 멸절검',slot:'weapon',rarity:'mythic',atk:900,def:90,hp:950,speed:.145,tier:5,level:260},
 voidarmor:{name:'신화 · 공허제의 무한갑',slot:'armor',rarity:'mythic',atk:120,def:380,hp:5200,tier:5,level:260},
 voidcape:{name:'신화 · 차원붕괴 망토',slot:'cape',rarity:'mythic',atk:320,def:180,hp:2800,tier:5,level:260},
 voidcrown:{name:'신화 · 공허제의 왕관',slot:'head',rarity:'mythic',atk:180,def:160,hp:1800,tier:5,level:260},
 voidboots:{name:'신화 · 차원도약 장화',slot:'boots',rarity:'mythic',atk:90,def:160,hp:2100,speed:.12,tier:5,level:260},
 voidring:{name:'신화 · 공허심장 반지',slot:'ring',rarity:'mythic',atk:300,def:90,hp:1500,speed:.13,tier:5,level:260},
 voidear:{name:'신화 · 공허별 귀걸이',slot:'ear',rarity:'mythic',atk:190,def:150,hp:1900,tier:5,level:260},
 primeblade:{name:'신화 · 태초신의 종언검',slot:'weapon',rarity:'mythic',atk:1350,def:160,hp:1600,speed:.18,tier:6,level:320},
 primearmor:{name:'신화 · 태초신의 창세갑',slot:'armor',rarity:'mythic',atk:220,def:560,hp:8000,tier:6,level:320},
 primecape:{name:'신화 · 우주개벽 망토',slot:'cape',rarity:'mythic',atk:500,def:280,hp:4300,tier:6,level:320},
 primecrown:{name:'신화 · 태초신의 관',slot:'head',rarity:'mythic',atk:280,def:250,hp:2800,tier:6,level:320},
 primeboots:{name:'신화 · 시공초월 장화',slot:'boots',rarity:'mythic',atk:150,def:240,hp:3200,speed:.15,tier:6,level:320},
 primering:{name:'신화 · 태초의 절대반지',slot:'ring',rarity:'mythic',atk:450,def:140,hp:2400,speed:.16,tier:6,level:320},
 primeear:{name:'신화 · 창세의 귀걸이',slot:'ear',rarity:'mythic',atk:300,def:220,hp:3000,tier:6,level:320},
 raidblade:{name:'신화 · 신격의 종언검',slot:'weapon',rarity:'mythic',atk:2200,def:220,hp:2200,speed:.21,tier:7,level:400,raid:true},
 raidarmor:{name:'신화 · 신격의 불멸갑',slot:'armor',rarity:'mythic',atk:320,def:900,hp:13000,tier:7,level:400,raid:true},
 raidcape:{name:'신화 · 신격의 성운망토',slot:'cape',rarity:'mythic',atk:720,def:420,hp:6500,tier:7,level:400,raid:true},
 raidcrown:{name:'신화 · 신격의 왕관',slot:'head',rarity:'mythic',atk:420,def:390,hp:4200,tier:7,level:400,raid:true},
 raidboots:{name:'신화 · 신격의 차원장화',slot:'boots',rarity:'mythic',atk:220,def:360,hp:4800,speed:.18,tier:7,level:400,raid:true},
 raidring:{name:'신화 · 신격심장 반지',slot:'ring',rarity:'mythic',atk:680,def:210,hp:3600,speed:.19,tier:7,level:400,raid:true},
 raidear:{name:'신화 · 신격의 귀걸이',slot:'ear',rarity:'mythic',atk:440,def:330,hp:4300,tier:7,level:400,raid:true},
 riftblade:{name:'초월 · 균열의 파천검',slot:'weapon',rarity:'mythic',atk:2800,def:130,hp:1650,tier:8,level:500,speed:0.22},
 riftarmor:{name:'초월 · 균열의 불멸갑',slot:'armor',rarity:'mythic',atk:476,def:1080,hp:16500,tier:8,level:500},
 riftcape:{name:'초월 · 균열의 차원망토',slot:'cape',rarity:'mythic',atk:1036,def:432,hp:7095,tier:8,level:500},
 riftcrown:{name:'초월 · 균열의 지배관',slot:'head',rarity:'mythic',atk:616,def:400,hp:4125,tier:8,level:500},
 riftboots:{name:'초월 · 균열의 영혼장화',slot:'boots',rarity:'mythic',atk:364,def:313,hp:5445,tier:8,level:500,speed:0.2},
 riftring:{name:'초월 · 균열의 심장반지',slot:'ring',rarity:'mythic',atk:952,def:162,hp:3630,tier:8,level:500,speed:0.22},
 riftear:{name:'초월 · 균열의 천명의 귀걸이',slot:'ear',rarity:'mythic',atk:700,def:324,hp:4620,tier:8,level:500},
 eclipseblade:{name:'초월 · 월식의 파천검',slot:'weapon',rarity:'mythic',atk:3950,def:198,hp:2350,tier:9,level:600,speed:0.245},
 eclipsearmor:{name:'초월 · 월식의 불멸갑',slot:'armor',rarity:'mythic',atk:672,def:1650,hp:23500,tier:9,level:600},
 eclipsecape:{name:'초월 · 월식의 차원망토',slot:'cape',rarity:'mythic',atk:1462,def:660,hp:10105,tier:9,level:600},
 eclipsecrown:{name:'초월 · 월식의 지배관',slot:'head',rarity:'mythic',atk:869,def:611,hp:5875,tier:9,level:600},
 eclipseboots:{name:'초월 · 월식의 영혼장화',slot:'boots',rarity:'mythic',atk:514,def:478,hp:7755,tier:9,level:600,speed:0.225},
 eclipsering:{name:'초월 · 월식의 심장반지',slot:'ring',rarity:'mythic',atk:1343,def:248,hp:5170,tier:9,level:600,speed:0.245},
 eclipseear:{name:'초월 · 월식의 천명의 귀걸이',slot:'ear',rarity:'mythic',atk:988,def:495,hp:6580,tier:9,level:600},
 eternalblade:{name:'초월 · 영겁의 파천검',slot:'weapon',rarity:'mythic',atk:5500,def:286,hp:3500,tier:10,level:700,speed:0.27},
 eternalarmor:{name:'초월 · 영겁의 불멸갑',slot:'armor',rarity:'mythic',atk:935,def:2380,hp:35000,tier:10,level:700},
 eternalcape:{name:'초월 · 영겁의 차원망토',slot:'cape',rarity:'mythic',atk:2035,def:952,hp:15050,tier:10,level:700},
 eternalcrown:{name:'초월 · 영겁의 지배관',slot:'head',rarity:'mythic',atk:1210,def:881,hp:8750,tier:10,level:700},
 eternalboots:{name:'초월 · 영겁의 영혼장화',slot:'boots',rarity:'mythic',atk:715,def:690,hp:11550,tier:10,level:700,speed:0.25},
 eternalring:{name:'초월 · 영겁의 심장반지',slot:'ring',rarity:'mythic',atk:1870,def:357,hp:7700,tier:10,level:700,speed:0.27},
 eternalear:{name:'초월 · 영겁의 천명의 귀걸이',slot:'ear',rarity:'mythic',atk:1375,def:714,hp:9800,tier:10,level:700}
};

/* Shared live weapon families: legacy sword IDs remain unchanged for existing characters. */
export const WEAPON_FAMILIES=Object.freeze({
 ...Object.fromEntries(Object.entries(EXTRA_ITEMS).filter(([id,item])=>id.endsWith('blade')&&item.slot==='weapon')),
 kingblade:{name:'왕꼬리의 서광',slot:'weapon',rarity:'rare',atk:18,speed:.04,tier:2,shop:true,price:55000},
});
const WEAPON_STYLE={rogue:'쌍단검',mage:'마도법장',healer:'신령보주'};
export function classWeapon(base,job){
 return Object.hasOwn(WEAPON_FAMILIES,base)&&Object.hasOwn(WEAPON_STYLE,job)?base+'_'+job:base;
}
export const CLASS_WEAPON_ITEMS=Object.fromEntries(Object.entries(WEAPON_FAMILIES).flatMap(([baseId,base])=>
 Object.keys(WEAPON_STYLE).map(job=>{
  const clean=base.name.replace(/(철검|파천검|멸절검|종언검|신검|검|무기|서광)$/u,'').trim();
  const item={...base,name:clean+' '+WEAPON_STYLE[job],job};
  if(job==='rogue'){item.atk=Math.round((item.atk||0)*.94);item.speed=(item.speed||0)+.045;}
  if(job==='mage'){item.atk=Math.round((item.atk||0)*1.03);item.mp=Math.max(12,Math.round((item.atk||0)*.48));}
  if(job==='healer'){item.atk=Math.round((item.atk||0)*.84);item.def=(item.def||0)+Math.max(2,Math.round((item.atk||0)*.08));item.hp=(item.hp||0)+Math.round((item.atk||0)*.9);item.mp=Math.max(12,Math.round((item.atk||0)*.40));}
  return [classWeapon(baseId,job),item];
 })
));
export const BOOSTS=Object.freeze({
 growthBoost:{name:'성장의 축복',field:'growth',price:80000,duration:1800,xpMultiplier:1.2,description:'30분 경험치 +20%'},
 battleBoost:{name:'전투 각성',field:'battle',price:120000,duration:1200,attackMultiplier:1.12,speedMultiplier:1.05,description:'20분 공격력 +12% · 속도 +5%'},
});

export const RECIPES={
 primordialblade:{name:'태초 · 창세의 검',materials:{ore:2000,crystal:1500,stardust:300},gold:90000000,level:700,item:'primordialblade',seals:60},
 primordialarmor:{name:'태초 · 기원의 갑주',materials:{ore:2500,crystal:1500,stardust:300},gold:90000000,level:700,item:'primordialarmor',seals:60},
 primordialcape:{name:'태초 · 무한의 망토',materials:{wood:2500,crystal:1500,stardust:300},gold:90000000,level:700,item:'primordialcape',seals:60},
 primordialcrown:{name:'태초 · 운명의 관',materials:{stone:2000,crystal:1500,stardust:300},gold:90000000,level:700,item:'primordialcrown',seals:60},
 primordialboots:{name:'태초 · 시공초월의 장화',materials:{ore:1500,crystal:1500,stardust:300},gold:90000000,level:700,item:'primordialboots',seals:60},
 primordialring:{name:'태초 · 영겁의 반지',materials:{crystal:1700,stardust:300},gold:90000000,level:700,item:'primordialring',seals:60},
 primordialear:{name:'태초 · 신들의 귀걸이',materials:{crystal:1700,stardust:300},gold:90000000,level:700,item:'primordialear',seals:60},
 potion:{name:'회복 물약 × 3',materials:{wood:3,stone:1},gold:15,level:1,potions:3},
 ironblade:{name:'단조 철검',materials:{wood:8,ore:12},gold:200,level:15,item:'ironblade'},
 ironarmor:{name:'단조 철갑',materials:{stone:12,ore:15},gold:250,level:15,item:'ironarmor'},
 crystalblade:{name:'수정빛 무기',materials:{ore:25,crystal:8},gold:1500,level:50,item:'crystalblade'},
 crystalarmor:{name:'수정 수호갑',materials:{stone:30,ore:20,crystal:10},gold:1800,level:50,item:'crystalarmor'},
 astralcape:{name:'전설 · 별하늘 망토',materials:{crystal:40,stardust:12},gold:20000,level:199,item:'astralcape'},
 riftblade:{name:'초월 · 균열의 파천검',materials:{ore:400,crystal:180,stardust:70},gold:5000000,level:500,item:'riftblade'},
 eclipseblade:{name:'초월 · 월식의 파천검',materials:{ore:1000,crystal:500,stardust:200},gold:15000000,level:600,item:'eclipseblade'},
 eternalblade:{name:'초월 · 영겁의 파천검',materials:{ore:2000,crystal:1200,stardust:480},gold:40000000,level:700,item:'eternalblade'},
};
for(const [id,recipe] of Object.entries(RECIPES)){
 if(!recipe.item||!Object.hasOwn(WEAPON_FAMILIES,recipe.item))continue;
 recipe.job='warrior';
 for(const job of Object.keys(WEAPON_STYLE)){
  const weaponId=classWeapon(recipe.item,job);
  RECIPES[weaponId]={...recipe,item:weaponId,job,name:CLASS_WEAPON_ITEMS[weaponId].name};
 }
}
export const ZONES={
 partyTrial:{name:'봉인된 천룡의 심장 · 파티 던전',level:100,theme:'abyss'},
 surface:{name:'준자마을 · 초원숲',level:1,theme:'forest'},
 grove:{name:'깊은 다람쥐숲',level:5,theme:'deepforest'},
 cave:{name:'수정 동굴',level:28,theme:'cave'},
 ruins:{name:'붉은 폐허',level:55,theme:'ruins'},
 abyss:{name:'그림자 심연',level:95,theme:'abyss'},
 celestial:{name:'천룡의 유적',level:190,theme:'celestial'},
 void:{name:'공허 성채',level:300,theme:'abyss'},
 origin:{name:'태초의 신전',level:400,theme:'celestial'},
 rift:{name:'하늘의 균열',level:460,theme:'abyss'},
 eclipse:{name:'월식의 요새',level:560,theme:'ruins'},
 sanctum:{name:'영겁의 성역',level:650,theme:'celestial'}
};
export const TRAVEL_PORTALS={
 surface:[{to:'grove',x:768,y:1870,label:'깊은 다람쥐숲'}],
 grove:[{to:'surface',x:768,y:705,label:'준자마을'},{to:'cave',x:768,y:1870,label:'수정 동굴'}],
 cave:[{to:'grove',x:768,y:705,label:'깊은 다람쥐숲'},{to:'ruins',x:768,y:1870,label:'붉은 폐허'}],
 ruins:[{to:'cave',x:768,y:705,label:'수정 동굴'},{to:'abyss',x:768,y:1870,label:'그림자 심연'}],
 abyss:[{to:'ruins',x:768,y:705,label:'붉은 폐허'},{to:'celestial',x:768,y:1870,label:'천룡의 유적'}],
 celestial:[{to:'abyss',x:768,y:705,label:'그림자 심연'},{to:'void',x:768,y:1870,label:'공허 성채'}],
 void:[{to:'celestial',x:768,y:705,label:'천룡의 유적'},{to:'origin',x:768,y:1870,label:'태초의 신전'}],
 origin:[{to:'void',x:768,y:705,label:'공허 성채'},{to:'rift',x:768,y:1870,label:'하늘의 균열'}],
 rift:[{to:'origin',x:768,y:705,label:'태초의 신전'},{to:'eclipse',x:768,y:1870,label:'월식의 요새'}],
 eclipse:[{to:'rift',x:768,y:705,label:'하늘의 균열'},{to:'sanctum',x:768,y:1870,label:'영겁의 성역'}],
 sanctum:[{to:'eclipse',x:768,y:705,label:'월식의 요새'}]
};
export const NAMED=[
 {id:'stoneking',name:'바위 군주',hours:[8,18],zone:'grove',level:35,hp:18000,damage:75,x:1085,y:1710},
 {id:'shadowking',name:'그림자 군왕',hours:[12,20],zone:'abyss',level:120,hp:130000,damage:280,x:1080,y:1760},
 {id:'dragon',name:'천룡 · 일일 레이드',hours:[22],zone:'celestial',level:240,hp:2500000,damage:1150,x:1060,y:1720,raid:true,minParty:2,dropTier:'high'},
 {id:'voidlord',name:'공허제 · 아르카논',hours:[21],zone:'void',level:380,hp:8000000,damage:2200,x:1060,y:1720,raid:true,minParty:2,dropTier:'raid'},
 {id:'originGod',name:'태초신 · 카이로스',hours:[23],zone:'origin',level:500,hp:18000000,damage:3600,x:1060,y:1720,raid:true,minParty:2,dropTier:'raid'},
 {id:'riftLord',name:'균열 군주 · 벨리온',hours:[20],zone:'rift',level:555,hp:28000000,damage:4900,x:1060,y:1720,raid:true,minParty:2,dropTier:'ascension'},
 {id:'eclipseLord',name:'월식황제 · 녹티스',hours:[21],zone:'eclipse',level:660,hp:48000000,damage:7000,x:1060,y:1720,raid:true,minParty:2,dropTier:'ascension'},
 {id:'eternalLord',name:'영겁신 · 에테르',hours:[22],zone:'sanctum',level:750,hp:75000000,damage:10200,x:1060,y:1720,raid:true,minParty:2,dropTier:'ascension'},
];
export const ASCENSION_CHAPTERS={
 rift:{name:'7장 · 찢어진 하늘',zone:'rift',level:480,rank:4,kills:18,elites:3,boss:'균열 수문장',rewardGold:5000000,rewardMaterial:30,material:'riftCore',story:'태초신의 죽음과 함께 열린 하늘의 균열. 균열 군주 벨리온이 봉인된 차원을 침범한다.'},
 eclipse:{name:'8장 · 월식의 맹세',zone:'eclipse',level:590,rank:5,kills:24,elites:4,boss:'월식 집행자',rewardGold:12000000,rewardMaterial:40,material:'eclipseSigil',story:'균열 너머에서 달을 삼킨 월식황제 녹티스가 깨어났다. 사라진 천룡의 유산을 되찾아야 한다.'}
};

/** Quest-panel text and teleport waypoint for the next 5th/6th ascension.
 * Pure so the menu and world navigator cannot disagree about the objective. */
export function ascensionGuide(player,chapterId){
 const next=PROMOTIONS[Math.max(0,Math.floor(Number(player.rank)||0))];
 const id=chapterId||(next?.story)||null;
 const chapter=id&&Object.hasOwn(ASCENSION_CHAPTERS,id)?ASCENSION_CHAPTERS[id]:null;
 if(!chapter)return null;
 const quest=player.ascensionStories?.[id]||{stage:0,claimed:false};
 const stage=quest.claimed?5:Math.max(0,Math.min(4,Number(quest.stage)||0)),number=id==='eclipse'?6:5;
 const head=number+'차 전직 · '+chapter.name;
 if(stage===5)return {id,chapter,stage,zone:'surface',x:580,y:355,action:'promote',title:head,text:'서사 완료! Lv.'+PROMOTIONS[number-1].level+' 이상 · 보스 '+PROMOTIONS[number-1].bosses+'회 충족 후 준자마을 촌장 앞에서 '+number+'차 전직',button:'촌장에게 이동'};
 if(stage===0)return {id,chapter,stage,zone:id,x:768,y:830,action:'start',title:head,text:chapter.name+' 시작 · '+ZONES[id].name+'에서 시련 시작 버튼을 눌러 일반 몬스터부터 토벌',button:'시련 장소로 이동 · 시작'};
 if(stage===1)return {id,chapter,stage,zone:id,x:680,y:915,action:'hunt',title:head,text:'일반 몬스터 처치 '+Math.min(chapter.kills,Number(quest.kills)||0)+'/'+chapter.kills+' · 지도 앞쪽 사냥터에서 일반 몬스터를 처치',button:'일반 몬스터 사냥터로'};
 if(stage===2)return {id,chapter,stage,zone:id,x:1080,y:1350,action:'elite',title:head,text:'정예 몬스터 처치 '+Math.min(chapter.elites,Number(quest.elites)||0)+'/'+chapter.elites+' · 뒤쪽 정예 구역으로 이동해 정예 몬스터를 처치',button:'정예 사냥터로'};
 if(stage===3)return {id,chapter,stage,zone:id,x:760,y:1745,action:'boss',title:head,text:chapter.boss+' 토벌 · 지도 아래 보스 지역에서 '+chapter.boss+'을 처치 (다시 나타날 때까지 기다려야 할 수 있음)',button:'지역 보스에게 이동'};
 return {id,chapter,stage,zone:id,x:768,y:830,action:'claim',title:head,text:'지역 보스 처치 완료! 시련 완료 보상을 수령해야 '+number+'차 전직 조건에 반영됩니다.',button:'서사 보상 수령'};
}

export const DAILY_TASKS={hunt:{name:'숲의 토벌',goal:20,gold:600,xp:600},gather:{name:'재료 수집',goal:12,gold:400,xp:400},dungeon:{name:'던전 토벌',goal:5,gold:1200,xp:1600}};
export function koreaDay(seconds){return new Date((seconds+9*3600)*1000).toISOString().slice(0,10);}
export function bossWindow(b,seconds){const shifted=seconds+9*3600,day=Math.floor(shifted/86400),hour=(shifted-day*86400)/3600;const active=b.hours.find(h=>hour>=h&&hour<h+1);const next=b.hours.find(h=>h>hour);return {active:active!==undefined,key:day+':'+(active??''),end:active===undefined?0:(day*86400+active*3600-9*3600+3600),next:(day*86400+(next??b.hours[0]+24)*3600-9*3600)};}
export const MMO_XP=level=>{const base=level<50?60+(level-1)*40:Math.round(2000+Math.pow(level-49,1.35)*100),mult=level>=700?12:level>=650?10:level>=600?8:level>=500?7:level>=450?6.5:level>=400?5:level>=350?3.8:level>=300?3:1;return Math.round(base*mult);};
export const MMO_HP=level=>100+(level-1)*14;
