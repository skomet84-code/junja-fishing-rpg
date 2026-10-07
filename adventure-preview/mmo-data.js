export const LEVEL_CAP=500,CHANNEL_CAP=48,WORLD_CAP=192;
export const PROMOTIONS=[{level:100,name:'1차 전직',bosses:1},{level:200,name:'2차 전직',bosses:5},{level:300,name:'3차 전직',bosses:15},{level:400,name:'4차 전직',bosses:30}];
export const PROMOTION_MATERIALS={
 3:{key:'voidSeal',name:'공허의 인장',need:100,zone:'void',source:'공허 성채 정예 · 공허성의 파괴자 · 공허제 아르카논'},
 4:{key:'originMark',name:'태초의 성흔',need:100,zone:'origin',source:'태초의 신전 정예 · 태초신전 수문신 · 태초신 카이로스'}
};
export const MATERIALS={wood:'나무',stone:'돌',ore:'철광석',crystal:'던전 수정',stardust:'별빛 파편'};
export const QUICK_CHATS=['안녕하세요!','같이 사냥해요!','보스 잡으러 가요!','잠깐만요!','도와주세요!','고마워요!','축하해요!','ㅋㅋㅋㅋ','좋아요!','마을에서 만나요!'];
export const EXTRA_ITEMS={
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
};
export const RECIPES={
 potion:{name:'회복 물약 × 3',materials:{wood:3,stone:1},gold:15,level:1,potions:3},
 ironblade:{name:'단조 철검',materials:{wood:8,ore:12},gold:200,level:15,item:'ironblade'},
 ironarmor:{name:'단조 철갑',materials:{stone:12,ore:15},gold:250,level:15,item:'ironarmor'},
 crystalblade:{name:'수정빛 무기',materials:{ore:25,crystal:8},gold:1500,level:50,item:'crystalblade'},
 crystalarmor:{name:'수정 수호갑',materials:{stone:30,ore:20,crystal:10},gold:1800,level:50,item:'crystalarmor'},
 astralcape:{name:'전설 · 별하늘 망토',materials:{crystal:40,stardust:12},gold:20000,level:199,item:'astralcape'},
};
export const ZONES={
 surface:{name:'준자마을 · 초원숲',level:1,theme:'forest'},
 grove:{name:'깊은 다람쥐숲',level:5,theme:'deepforest'},
 cave:{name:'수정 동굴',level:28,theme:'cave'},
 ruins:{name:'붉은 폐허',level:55,theme:'ruins'},
 abyss:{name:'그림자 심연',level:95,theme:'abyss'},
 celestial:{name:'천룡의 유적',level:190,theme:'celestial'},
 void:{name:'공허 성채',level:300,theme:'abyss'},
 origin:{name:'태초의 신전',level:400,theme:'celestial'}
};
export const TRAVEL_PORTALS={
 surface:[{to:'grove',x:768,y:1870,label:'깊은 다람쥐숲'}],
 grove:[{to:'surface',x:768,y:705,label:'준자마을'},{to:'cave',x:768,y:1870,label:'수정 동굴'}],
 cave:[{to:'grove',x:768,y:705,label:'깊은 다람쥐숲'},{to:'ruins',x:768,y:1870,label:'붉은 폐허'}],
 ruins:[{to:'cave',x:768,y:705,label:'수정 동굴'},{to:'abyss',x:768,y:1870,label:'그림자 심연'}],
 abyss:[{to:'ruins',x:768,y:705,label:'붉은 폐허'},{to:'celestial',x:768,y:1870,label:'천룡의 유적'}],
 celestial:[{to:'abyss',x:768,y:705,label:'그림자 심연'},{to:'void',x:768,y:1870,label:'공허 성채'}],
 void:[{to:'celestial',x:768,y:705,label:'천룡의 유적'},{to:'origin',x:768,y:1870,label:'태초의 신전'}],
 origin:[{to:'void',x:768,y:705,label:'공허 성채'}]
};
export const NAMED=[
 {id:'stoneking',name:'바위 군주',hours:[8,18],zone:'grove',level:35,hp:18000,damage:75,x:1085,y:1710},
 {id:'shadowking',name:'그림자 군왕',hours:[12,20],zone:'abyss',level:120,hp:130000,damage:280,x:1080,y:1760},
 {id:'dragon',name:'천룡 · 일일 레이드',hours:[22],zone:'celestial',level:240,hp:2500000,damage:1150,x:1060,y:1720,raid:true,minParty:3,dropTier:'high'},
 {id:'voidlord',name:'공허제 · 아르카논',hours:[21],zone:'void',level:360,hp:8000000,damage:2200,x:1060,y:1720,raid:true,minParty:3,dropTier:'raid'},
 {id:'originGod',name:'태초신 · 카이로스',hours:[23],zone:'origin',level:460,hp:18000000,damage:3600,x:1060,y:1720,raid:true,minParty:4,dropTier:'raid'},
];
export const DAILY_TASKS={hunt:{name:'숲의 토벌',goal:20,gold:600,xp:600},gather:{name:'재료 수집',goal:12,gold:400,xp:400},dungeon:{name:'던전 토벌',goal:5,gold:1200,xp:1600}};
export function koreaDay(seconds){return new Date((seconds+9*3600)*1000).toISOString().slice(0,10);}
export function bossWindow(b,seconds){const shifted=seconds+9*3600,day=Math.floor(shifted/86400),hour=(shifted-day*86400)/3600;const active=b.hours.find(h=>hour>=h&&hour<h+1);const next=b.hours.find(h=>h>hour);return {active:active!==undefined,key:day+':'+(active??''),end:active===undefined?0:(day*86400+active*3600-9*3600+3600),next:(day*86400+(next??b.hours[0]+24)*3600-9*3600)};}
export const MMO_XP=level=>{const base=level<50?60+(level-1)*40:Math.round(2000+Math.pow(level-49,1.35)*100),mult=level>=450?6.5:level>=400?5:level>=350?3.8:level>=300?3:1;return Math.round(base*mult);};
export const MMO_HP=level=>100+(level-1)*14;
