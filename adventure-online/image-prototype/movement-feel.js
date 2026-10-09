// Display-only motion smoothing. The server still owns collision, movement and combat.
export const WALK_SPEED=250;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function predictServerPosition(state,velocity,ageSeconds,moving){
 const age=moving?clamp(Number(ageSeconds)||0,0,.12):0;
 const vx=Number(velocity?.x)||0,vy=Number(velocity?.y)||0;
 const length=Math.hypot(vx,vy),ratio=length>WALK_SPEED?WALK_SPEED/length:1;
 return{x:state.x+vx*ratio*age,y:state.y+vy*ratio*age};
}
// While steering locally, preserve immediate input and only reconcile severe divergence.
// Tap navigation and auto hunt ease toward extrapolated snapshots without hard stepping.
export function reconcileVisualPosition(view,target,dt,localSteering=false){
 const seconds=clamp(Number(dt)||0,0,.05);
 const x=target.x-view.x,y=target.y-view.y,d=Math.hypot(x,y);
 if(!Number.isFinite(d)||!seconds)return{x:view.x,y:view.y};
 if(d>320)return{x:target.x,y:target.y}; // genuine warp/respawn; caller handles zone changes
 if(localSteering){
  const tolerance=75;
  if(d<=tolerance)return{x:view.x,y:view.y};
  const factor=(1-Math.exp(-7*seconds))*(d-tolerance)/d;
  return{x:view.x+x*factor,y:view.y+y*factor};
 }
 const factor=1-Math.exp(-13*seconds);
 return{x:view.x+x*factor,y:view.y+y*factor};
}
// Walking uses real world-distance rather than an unrelated frame-based timer.
// No steps are generated if blocked by an obstacle or stopped in combat.
export function advanceFootsteps(previous,current,dt,walkTime,speed=0){
 const seconds=clamp(Number(dt)||0,0,.05),distance=Math.hypot(current.x-previous.x,current.y-previous.y);
 const valid=seconds>0&&distance<=WALK_SPEED*seconds+12;
 const actual=valid?Math.min(WALK_SPEED,distance/Math.max(.001,seconds)):0;
 const blended=speed+(actual-speed)*(1-Math.exp(-22*seconds));
 return{time:walkTime+(valid?Math.min(distance,WALK_SPEED*seconds)/WALK_SPEED:0),speed:blended,walking:blended>30&&valid};
}
