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
 const seconds=clamp(Number(dt)||0,0,.2);
 const x=target.x-view.x,y=target.y-view.y,d=Math.hypot(x,y);
 if(!Number.isFinite(d)||!seconds||d<.35)return{x:view.x,y:view.y};
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
 const seconds=clamp(Number(dt)||0,0,.2),distance=Math.hypot(current.x-previous.x,current.y-previous.y);
 const valid=seconds>0&&distance<=WALK_SPEED*seconds+12;
 const actual=valid?Math.min(WALK_SPEED,distance/Math.max(.001,seconds)):0;
 const blended=speed+(actual-speed)*(1-Math.exp(-22*seconds));
 return{time:walkTime+(valid?Math.min(distance,WALK_SPEED*seconds)/WALK_SPEED:0),speed:blended,walking:blended>30&&valid};
}

// Estimate network velocity using the authoritative tick interval, not the
// interval at which mobile browsers happen to process incoming packets.
// The server retains sole authority for position/collision/teleports.
export function estimateNetworkVelocity(previous,next,serverDt,previousVelocity={x:0,y:0},limit=WALK_SPEED){
 const dt=Number(serverDt),oldX=Number(previousVelocity?.x)||0,oldY=Number(previousVelocity?.y)||0;
 if(!Number.isFinite(dt)||dt<.045||dt>.5)return{x:oldX*.6,y:oldY*.6};
 const dx=Number(next?.x)-Number(previous?.x),dy=Number(next?.y)-Number(previous?.y);
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return{x:0,y:0};
 const d=Math.hypot(dx,dy);
 // A warp/respawn should reset the motion predictor rather than turning
 // a teleport into a high-speed walk or a long visible rubber-band.
 if(d>Math.max(100,limit*dt*3))return{x:0,y:0};
 const vx=dx/dt,vy=dy/dt,speed=Math.hypot(vx,vy),max=Math.max(1,Number(limit)||WALK_SPEED);
 const ratio=speed>max?max/speed:1;
 return{x:oldX*.28+vx*ratio*.72,y:oldY*.28+vy*ratio*.72};
}

// A long iOS frame must not lose its movement budget. Keep each collision
// probe small so catch-up motion cannot cut across narrow path edges.
export function advanceLocalMovement(view,input,elapsed,canWalk,speed=WALK_SPEED){
 const seconds=clamp(Number(elapsed)||0,0,.2),dx=Number(input?.x)||0,dy=Number(input?.y)||0;
 const length=Math.hypot(dx,dy);if(!seconds||length<.001)return{x:view.x,y:view.y};
 const steps=Math.max(1,Math.ceil(seconds/.025)),distancePerStep=speed*seconds/steps;
 const stepX=dx/length*distancePerStep,stepY=dy/length*distancePerStep;
 let x=view.x,y=view.y;
 for(let i=0;i<steps;i++){
  const nx=x+stepX,ny=y+stepY;
  if(canWalk(nx,y))x=nx;
  if(canWalk(x,ny))y=ny;
 }
 return{x,y};
}


// Remote actors render between 10 Hz network snapshots. Teleports, respawns
// and large server corrections must snap, not glide visibly across the map.
export function smoothRemotePosition(current,target,elapsed,warpDistance=170,rate=19){
 const tx=Number(target?.x),ty=Number(target?.y),cx=Number(current?.x),cy=Number(current?.y);
 if(![tx,ty,cx,cy].every(Number.isFinite))return current;
 const d=Math.hypot(tx-cx,ty-cy),dt=clamp(Number(elapsed)||0,0,.2);
 if(d>warpDistance||d<.25)return{x:tx,y:ty};
 if(!dt)return{x:cx,y:cy};
 const blend=1-Math.exp(-rate*dt);
 return{x:cx+(tx-cx)*blend,y:cy+(ty-cy)*blend};
}


// Avoid POST /api/action duplicates while the character stands still.
// Moving input is refreshed well inside the server's 600 ms input timeout;
// changed joystick directions may be sent sooner, but never every frame.
export function shouldSendMovement(previous,next,at){
 const manual=!!next?.manual,oldManual=!!previous?.manual;
 if(!previous)return manual;
 if(manual!==oldManual)return true;
 if(!manual)return false;
 const age=Number(at)-Number(previous.at);
 if(!Number.isFinite(age)||age<0)return true;
 const x=Number(next?.x)||0,y=Number(next?.y)||0;
 const changed=Math.hypot(x-(Number(previous.x)||0),y-(Number(previous.y)||0))>.07;
 return age>=.24||(changed&&age>=.12);
}
