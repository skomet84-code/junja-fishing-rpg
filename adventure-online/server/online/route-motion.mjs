// Deterministic server-authoritative travel across short waypoint segments.
// Never jump/snap to the next point, pause a tick at a corner, or bypass walls.
export function advanceRoute(position, waypoints, budget, canWalk){
  let x=Number(position?.x), y=Number(position?.y);
  let remaining=Number(budget);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Array.isArray(waypoints)||
     !Number.isFinite(remaining)||remaining<=0||typeof canWalk!=='function')return {x,y,moved:0};
  const startX=x,startY=y;
  for(let i=0;i<64&&remaining>1e-4&&waypoints.length;i++){
    const goal=waypoints[0], gx=Number(goal?.x), gy=Number(goal?.y);
    if(!Number.isFinite(gx)||!Number.isFinite(gy)){waypoints.shift();continue;}
    const dx=gx-x,dy=gy-y,d=Math.hypot(dx,dy);
    if(d<=.15){waypoints.shift();continue;}
    const stride=Math.min(d,remaining),ox=x,oy=y;
    const nx=x+dx/d*stride,ny=y+dy/d*stride;
    if(canWalk(nx,y))x=nx;
    if(canWalk(x,ny))y=ny;
    const moved=Math.hypot(x-ox,y-oy);
    if(moved<1e-4)break;
    remaining=Math.max(0,remaining-moved);
    // Consume the *entire* tick budget through corners instead of pausing 100ms
    // after every waypoint; never teleport to a blocked coordinate.
    if(Math.hypot(gx-x,gy-y)<=.15){waypoints.shift();continue;}
    break;
  }
  return {x,y,moved:Math.hypot(x-startX,y-startY)};
}
