const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const easeOut=t=>1-Math.pow(1-clamp(t),3);
const easeInOut=t=>{t=clamp(t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};

export function createMotionState(){
  return {vx:0,vy:0,speed:0,gait:0,moving:false};
}

export function stepMotion(m,dx,dy,dt,maxSpeed=250){
  dt=Math.max(0,Math.min(.05,Number(dt)||0));
  const len=Math.hypot(dx,dy);
  const nx=len>.001?dx/len:0,ny=len>.001?dy/len:0;
  const targetX=nx*maxSpeed,targetY=ny*maxSpeed;
  const rate=len>.001?13:19;
  const blend=1-Math.exp(-rate*dt);
  m.vx+=(targetX-m.vx)*blend;
  m.vy+=(targetY-m.vy)*blend;
  if(len<.001&&Math.hypot(m.vx,m.vy)<2){m.vx=0;m.vy=0;}
  m.speed=Math.hypot(m.vx,m.vy);
  m.moving=m.speed>7;
  if(m.moving){
    const cadence=1.4+1.5*clamp(m.speed/maxSpeed);
    m.gait=(m.gait+dt*cadence)%1;
  }
  return m;
}

export function gaitPose(m,maxSpeed=250){
  if(!m.moving)return {frameA:0,frameB:0,mix:0,bob:0,lean:0,stretch:1};
  const phase=m.gait;
  const raw=(1-Math.cos(TAU*phase))/2;
  const mix=raw<=.32?0:raw>=.68?1:easeInOut((raw-.32)/.36);
  const speed=clamp(m.speed/maxSpeed);
  return {
    frameA:1,
    frameB:2,
    mix,
    bob:-Math.abs(Math.sin(TAU*phase))*2.8*speed,
    lean:clamp(m.vx/maxSpeed,-1,1)*2.6,
    stretch:1+Math.cos(TAU*phase)*.012*speed,
  };
}

export function attackPose(progress,job='warrior'){
  const p=clamp(progress);
  if(job==='mage'){
    const wind=p<.28?p/.28:1;
    const cast=p<.28?0:easeOut((p-.28)/.42);
    const recover=p<.70?0:easeInOut((p-.70)/.30);
    return {
      bodyX:4*cast*(1-recover), bodyY:-3*Math.sin(Math.PI*p),
      bodyRot:-2*wind+3*cast-3*recover,
      weaponAngle:-24-48*wind+82*cast-34*recover,
      trail:Math.max(0,Math.sin(Math.PI*clamp((p-.18)/.66))),
      trailRot:-25+80*cast,
    };
  }
  if(job==='healer'){
    const cast=easeInOut(p<.6?p/.6:1);
    const recover=p<.6?0:easeOut((p-.6)/.4);
    return {
      bodyX:2*cast*(1-recover),bodyY:-5*Math.sin(Math.PI*p),
      bodyRot:1.5*Math.sin(Math.PI*p),
      weaponAngle:-18-34*cast+34*recover,
      trail:.55*Math.sin(Math.PI*p),
      trailRot:-10+35*cast,
    };
  }
  if(job==='rogue'){
    const first=easeOut(clamp(p/.42));
    const second=easeOut(clamp((p-.46)/.40));
    const recovery=easeOut(clamp((p-.86)/.14));
    const angle=-72+152*first-142*second+62*recovery;
    return {
      bodyX:10*Math.sin(Math.PI*p),bodyY:-2*Math.sin(Math.PI*p),
      bodyRot:-5+11*first-10*second+4*recovery,
      weaponAngle:angle,
      trail:Math.max(0,Math.sin(Math.PI*clamp(p/.48)),Math.sin(Math.PI*clamp((p-.46)/.44))),
      trailRot:angle+18,
    };
  }
  const wind=clamp(p/.22);
  const swing=easeOut(clamp((p-.22)/.50));
  const recover=easeInOut(clamp((p-.72)/.28));
  const angle=-24-78*wind+184*swing-82*recover;
  return {
    bodyX:12*Math.sin(Math.PI*p),bodyY:-2*Math.sin(Math.PI*p),
    bodyRot:-5*wind+12*swing-7*recover,
    weaponAngle:angle,
    trail:Math.sin(Math.PI*clamp((p-.16)/.70)),
    trailRot:angle+12,
  };
}

export function attackProgress(now,start,duration){
  if(!Number.isFinite(start)||!Number.isFinite(duration)||duration<=0||now<start||now>=start+duration)return -1;
  return clamp((now-start)/duration);
}
