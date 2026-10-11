// Server authoritative route traversal. Waypoints are consumed with the same
// movement distance budget, so short path segments cannot add a 100ms pause or
// produce a 25px snap. Route entries are removed only once truly reached.
export function advanceRoute(position,waypoints,budget,canWalk){
 let x=Number(position?.x),y=Number(position?.y),remaining=Number(budget);
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Array.isArray(waypoints)||!Number.isFinite(remaining)||remaining<=0)return{x,y};
 for(let i=0;i<64&&waypoints.length&&remaining>1e-4;i++){
  const goal=waypoints[0],dx=Number(goal?.x)-x,dy=Number(goal?.y)-y,d=Math.hypot(dx,dy);
  if(!Number.isFinite(d)){waypoints.shift();continue;}
  if(d<=.15){waypoints.shift();continue;}
  const step=Math.min(d,remaining),prevX=x,prevY=y;
  const nextX=x+dx/d*step,nextY=y+dy/d*step;
  if(canWalk(nextX,y))x=nextX;
  if(canWalk(x,nextY))y=nextY;
  const moved=Math.hypot(x-prevX,y-prevY);
  if(moved<=1e-4)break; // blocked: stop rather than teleport or force waypoint pop
  remaining=Math.max(0,remaining-moved);
  if(Math.hypot(Number(goal.x)-x,Number(goal.y)-y)<=.15)waypoints.shift();
  else break; // still approaching current waypoint, next tick continues
 }
 return{x,y};
}
