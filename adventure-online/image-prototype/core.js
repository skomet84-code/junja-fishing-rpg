export const W=1536,H=2048,CELL=24;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const needXp=level=>60+(level-1)*40;
export const maxHp=level=>100+(level-1)*12;
const WALK_AREAS=[
 [440,220,1090,490],
 [680,440,880,650],
 [260,610,1270,1010],
 [615,970,925,1190],
 [300,1150,1235,1515],
 [610,1475,930,1670],
 [250,1630,1280,1940]
];
export function walkable(x,y){
 return WALK_AREAS.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b);
}
export function project(x,y){
 return WALK_AREAS.map(([l,t,r,b])=>({x:clamp(x,l,r),y:clamp(y,t,b)})).sort((a,b)=>distance(a,{x,y})-distance(b,{x,y}))[0];
}
export function pathfind(start,end){
 end=project(end.x,end.y); start=project(start.x,start.y);
 const cols=W/CELL, key=(x,y)=>y*cols+x;
 const cell=p=>({x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL)});
 const nearest=p=>{const c=cell(p);if(walkable(c.x*CELL+CELL/2,c.y*CELL+CELL/2))return c;return [[0,1],[0,-1],[1,0],[-1,0]].map(([dx,dy])=>({x:c.x+dx,y:c.y+dy})).find(n=>walkable(n.x*CELL+CELL/2,n.y*CELL+CELL/2))||c;};
 const s=nearest(start),e=nearest(end); const open=[s],seen=new Set([key(s.x,s.y)]),parent=new Map();
 let found=null;
 for(let i=0;i<open.length;i++){
  const n=open[i];if(n.x===e.x&&n.y===e.y){found=n;break;}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const p={x:n.x+dx,y:n.y+dy},k=key(p.x,p.y);
   if(seen.has(k)||!walkable(p.x*CELL+CELL/2,p.y*CELL+CELL/2))continue;
   seen.add(k);parent.set(k,n);open.push(p);
  }
 }
 if(!found)return [];
 const result=[end];let n=found;
 while(n.x!==s.x||n.y!==s.y){result.push({x:n.x*CELL+CELL/2,y:n.y*CELL+CELL/2});n=parent.get(key(n.x,n.y));}
 return result.reverse();
}
export const QUEST_STATES=[
 'available','active','ready','complete','bossActive','bossReady',
 'groveIntro','groveHunt','groveBoss',
 'caveIntro','caveHunt','caveBoss',
 'ruinsIntro','ruinsHunt','ruinsBoss',
 'abyssIntro','abyssHunt','abyssElite','abyssBoss',
 'celestialIntro','celestialHunt','celestialBoss','storyDone'
];
export function fresh(){return {version:2,level:1,exp:0,kills:0,gold:0,tails:0,potions:5,hp:100,x:768,y:355,quest:'available',questKills:0,questBoss:0,weapon:0};}
export function normalize(raw={}){
 const s=fresh();for(const k of ['level','exp','kills','gold','tails','potions','questKills','questBoss','weapon'])if(Number.isFinite(raw[k]))s[k]=Math.max(0,Math.floor(raw[k]));
 s.level=clamp(s.level,1,50);s.weapon=clamp(s.weapon,0,1);const migrated=raw.quest==='done'?'groveIntro':raw.quest;s.quest=QUEST_STATES.includes(migrated)?migrated:'available';
 const pos=project(Number.isFinite(raw.x)?raw.x:768,Number.isFinite(raw.y)?raw.y:355);Object.assign(s,pos);
 s.hp=clamp(Number.isFinite(raw.hp)?raw.hp:maxHp(s.level),1,maxHp(s.level));
 while(s.exp>=needXp(s.level)&&s.level<50){s.exp-=needXp(s.level);s.level++;}return s;
}
export function rewardKill(s,boss=false){
 const xp=boss?120:20,gold=boss?150:25;s.kills++;s.exp+=xp;s.gold+=gold;s.tails+=boss?3:1;
 if(s.quest==='active'){s.questKills++;if(s.questKills>=10)s.quest='ready';}
 if(s.quest==='bossActive'&&boss){s.questBoss++;s.quest='bossReady';}
 let leveled=false;while(s.exp>=needXp(s.level)&&s.level<50){s.exp-=needXp(s.level);s.level++;leveled=true;}if(leveled)s.hp=maxHp(s.level);
 return {xp,gold,leveled};
}
export function claimQuest(s){
 if(s.quest==='ready'){s.gold+=200;s.exp+=80;s.potions+=3;s.quest='complete';}
 else if(s.quest==='bossReady'){s.gold+=500;s.exp+=180;s.weapon=1;s.quest='groveIntro';s.questKills=0;s.questBoss=0;}
 else return false;
 while(s.exp>=needXp(s.level)&&s.level<50){s.exp-=needXp(s.level);s.level++;s.hp=maxHp(s.level);}return true;
}
