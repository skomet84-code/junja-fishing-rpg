export const LEVEL_CAP=399,CHANNEL_CAP=48,WORLD_CAP=192;
export const PROMOTIONS=[{level:99,name:'1차 전직',bosses:1},{level:199,name:'2차 전직',bosses:5},{level:299,name:'3차 전직',bosses:15}];
export const MATERIALS={wood:'나무',stone:'돌',ore:'철광석',crystal:'던전 수정',stardust:'별빛 파편'};
export const QUICK_CHATS=['안녕하세요!','같이 사냥해요!','보스 잡으러 가요!','잠깐만요!','도와주세요!','고마워요!','축하해요!','ㅋㅋㅋㅋ','좋아요!','마을에서 만나요!'];
export const EXTRA_ITEMS={
 ironblade:{name:'단조 철검',slot:'weapon',rarity:'uncommon',atk:24,tier:1,level:15},
 ironarmor:{name:'단조 철갑',slot:'armor',rarity:'uncommon',def:12,hp:100,tier:1,level:15},
 crystalblade:{name:'수정빛 무기',slot:'weapon',rarity:'rare',atk:95,tier:2,level:50},
 crystalarmor:{name:'수정 수호갑',slot:'armor',rarity:'rare',def:45,hp:420,tier:2,level:50},
 astralblade:{name:'전설 · 천명의 서광',slot:'weapon',rarity:'legendary',atk:240,tier:3,level:99},
 astralarmor:{name:'전설 · 천룡의 갑주',slot:'armor',rarity:'legendary',def:100,hp:1200,tier:3,level:99},
 astralcape:{name:'전설 · 별하늘 망토',slot:'cape',rarity:'legendary',atk:85,def:40,hp:650,tier:3,level:99},
 astralcrown:{name:'전설 · 천룡의 관',slot:'head',rarity:'legendary',atk:35,def:48,hp:520,tier:3,level:99},
 astralboots:{name:'전설 · 성운의 장화',slot:'boots',rarity:'legendary',def:52,hp:720,tier:3,level:99},
 astralring:{name:'전설 · 별왕의 반지',slot:'ring',rarity:'legendary',atk:72,def:18,hp:360,tier:3,level:99},
 astralear:{name:'전설 · 천성의 귀걸이',slot:'ear',rarity:'legendary',atk:42,def:36,hp:460,tier:3,level:99},
 mythicblade:{name:'신화 · 천제의 심판',slot:'weapon',rarity:'mythic',atk:620,def:35,hp:500,tier:4,level:200},
 mythicarmor:{name:'신화 · 창세의 성갑',slot:'armor',rarity:'mythic',atk:70,def:260,hp:3400,tier:4,level:200},
 mythiccape:{name:'신화 · 무한성운 망토',slot:'cape',rarity:'mythic',atk:210,def:110,hp:1800,tier:4,level:200},
 mythiccrown:{name:'신화 · 천제의 왕관',slot:'head',rarity:'mythic',atk:115,def:105,hp:1100,tier:4,level:200},
 mythicboots:{name:'신화 · 시공의 장화',slot:'boots',rarity:'mythic',atk:55,def:95,hp:1300,tier:4,level:200},
 mythicring:{name:'신화 · 영원의 반지',slot:'ring',rarity:'mythic',atk:190,def:55,hp:900,tier:4,level:200},
 mythicear:{name:'신화 · 태초의 귀걸이',slot:'ear',rarity:'mythic',atk:120,def:95,hp:1200,tier:4,level:200},
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
 cave:{name:'수정 동굴',level:30,theme:'cave'},
 ruins:{name:'붉은 폐허',level:60,theme:'ruins'},
 abyss:{name:'그림자 심연',level:100,theme:'abyss'},
 celestial:{name:'천룡의 유적',level:200,theme:'celestial'}
};
export const TRAVEL_PORTALS={
 surface:[{to:'grove',x:768,y:1870,label:'깊은 다람쥐숲'}],
 grove:[{to:'surface',x:768,y:705,label:'준자마을'},{to:'cave',x:768,y:1870,label:'수정 동굴'}],
 cave:[{to:'grove',x:768,y:705,label:'깊은 다람쥐숲'},{to:'ruins',x:768,y:1870,label:'붉은 폐허'}],
 ruins:[{to:'cave',x:768,y:705,label:'수정 동굴'},{to:'abyss',x:768,y:1870,label:'그림자 심연'}],
 abyss:[{to:'ruins',x:768,y:705,label:'붉은 폐허'},{to:'celestial',x:768,y:1870,label:'천룡의 유적'}],
 celestial:[{to:'abyss',x:768,y:705,label:'그림자 심연'}]
};
export const NAMED=[
 {id:'stoneking',name:'바위 군주',hours:[8,18],zone:'grove',level:35,hp:18000,damage:75,x:1085,y:1710},
 {id:'shadowking',name:'그림자 군왕',hours:[12,20],zone:'abyss',level:120,hp:130000,damage:280,x:1080,y:1760},
 {id:'dragon',name:'천룡 · 일일 최상급',hours:[22],zone:'celestial',level:220,hp:350000,damage:550,x:1060,y:1720},
];
export const DAILY_TASKS={hunt:{name:'숲의 토벌',goal:20,gold:600,xp:600},gather:{name:'재료 수집',goal:12,gold:400,xp:400},dungeon:{name:'던전 토벌',goal:5,gold:1200,xp:1600}};
export function koreaDay(seconds){return new Date((seconds+9*3600)*1000).toISOString().slice(0,10);}
export function bossWindow(b,seconds){const shifted=seconds+9*3600,day=Math.floor(shifted/86400),hour=(shifted-day*86400)/3600;const active=b.hours.find(h=>hour>=h&&hour<h+1);const next=b.hours.find(h=>h>hour);return {active:active!==undefined,key:day+':'+(active??''),end:active===undefined?0:(day*86400+active*3600-9*3600+3600),next:(day*86400+(next??b.hours[0]+24)*3600-9*3600)};}
export const MMO_XP=level=>level<50?60+(level-1)*40:Math.round(2000+Math.pow(level-49,1.35)*100);
export const MMO_HP=level=>100+(level-1)*14;
