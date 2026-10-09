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
// True only when the entire walking segment stays on legal ground.
export function clearPath(a,b,step=CELL/3){
 if(!a||!b||!walkable(a.x,a.y)||!walkable(b.x,b.y))return false;
 const length=distance(a,b),segments=Math.max(1,Math.ceil(length/step));
 for(let i=1;i<segments;i++){const k=i/segments;if(!walkable(a.x+(b.x-a.x)*k,a.y+(b.y-a.y)*k))return false;}
 return true;
}
export function pathfind(start,end){
 if(!start||!end||!Number.isFinite(start.x)||!Number.isFinite(start.y)||!Number.isFinite(end.x)||!Number.isFinite(end.y))return [];
 const from=project(start.x,start.y),dest=project(end.x,end.y);
 if(distance(from,dest)<8)return [dest];
 if(clearPath(from,dest))return [dest];
 const cols=W/CELL,rows=H/CELL,key=(x,y)=>y*cols+x;
 const gridPoint=(x,y)=>({x:x*CELL+CELL/2,y:y*CELL+CELL/2});
 const nearest=p=>{
  let best=null,dist=Infinity;
  const cx=Math.floor(p.x/CELL),cy=Math.floor(p.y/CELL);
  for(let radius=0;radius<=5;radius++){
   for(let y=Math.max(0,cy-radius);y<=Math.min(rows-1,cy+radius);y++)
    for(let x=Math.max(0,cx-radius);x<=Math.min(cols-1,cx+radius);x++){
     if(Math.max(Math.abs(x-cx),Math.abs(y-cy))!==radius)continue;
     const pos=gridPoint(x,y),d=distance(pos,p);
     if(walkable(pos.x,pos.y)&&d<dist){best={x,y};dist=d;}
    }
   if(best)return best;
  }
  return best;
 };
 const origin=nearest(from),goal=nearest(dest);if(!origin||!goal)return [];
 const queue=[origin],visited=new Set([key(origin.x,origin.y)]),parent=new Map(),directions=[[1,0],[-1,0],[0,1],[0,-1]];
 let found=false;
 for(let i=0;i<queue.length;i++){
  const n=queue[i],id=key(n.x,n.y);
  if(n.x===goal.x&&n.y===goal.y){found=true;break;}
  for(const [dx,dy] of directions){
   const x=n.x+dx,y=n.y+dy,k=key(x,y),pos=gridPoint(x,y);
   if(x<0||y<0||x>=cols||y>=rows||visited.has(k)||!walkable(pos.x,pos.y))continue;
   visited.add(k);parent.set(k,id);queue.push({x,y});
  }
 }
 if(!found)return [];
 const raw=[];let cursor=key(goal.x,goal.y),first=key(origin.x,origin.y);
 while(cursor!==first){
  raw.push(gridPoint(cursor%cols,Math.floor(cursor/cols)));
  cursor=parent.get(cursor);if(cursor===undefined)return [];
 }
 raw.reverse();raw.push(dest);
 const route=[],current={...from};
 for(let i=0;i<raw.length;){
  let furthest=i;
  for(let k=raw.length-1;k>=i;k--)if(clearPath(current,raw[k])){furthest=k;break;}
  const target=raw[furthest];
  if(!clearPath(current,target))return [];
  if(distance(current,target)>5)route.push(target);
  current.x=target.x;current.y=target.y;i=furthest+1;
 }
 return route.length?route:[dest];
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
