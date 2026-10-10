import test from 'node:test';
import assert from 'node:assert/strict';
import {WALK_SPEED,predictServerPosition,reconcileVisualPosition,advanceFootsteps,estimateNetworkVelocity} from '../movement-feel.js';

test('server extrapolation uses a bounded time horizon and never grants extra movement speed',()=>{
 const state={x:100,y:200};
 assert.deepEqual(predictServerPosition(state,{x:500,y:0},.9,true),{x:100+WALK_SPEED*.12,y:200});
 assert.deepEqual(predictServerPosition(state,{x:200,y:50},1,false),state);
 assert.deepEqual(predictServerPosition(state,{x:0,y:0},.1,true),state);
});

test('local steering does not fight server updates within network-latency tolerance',()=>{
 const current={x:350,y:400};
 const behind={x:300,y:400};
 assert.deepEqual(reconcileVisualPosition(current,behind,1/60,true),current);
 const correcting=reconcileVisualPosition(current,{x:240,y:400},1/60,true);
 assert.ok(correcting.x<350&&correcting.x>340,'only the over-tolerance portion is corrected');
});

test('tap-to-walk follows sparse 10 Hz authoritative snapshots with intermediate animation frames',()=>{
 let visual={x:0,y:0},clock=0,velocity={x:WALK_SPEED,y:0},observed=[];
 for(let i=0;i<120;i++){
  const now=(i+1)/60;
  const serverTick=Math.floor(now*10)/10;
  const target=predictServerPosition({x:WALK_SPEED*serverTick,y:0},velocity,now-serverTick,true);
  visual=reconcileVisualPosition(visual,target,1/60,false);
  observed.push(visual.x);
  const gait=advanceFootsteps({x:observed.at(-2)??0,y:0},visual,1/60,clock);
  clock=gait.time;
 }
 assert.ok(visual.x>455&&visual.x<505,'rendered actor follows 2 seconds of authoritative motion without large delay');
 assert.ok(observed.slice(1).every((v,i)=>v>=observed[i]-1e-6),'actor never hops backwards as snapshots arrive');
 assert.ok(clock>1.5,'walk frames advance based on distance traveled');
});

test('character cannot animate walking while blocked at a wall or while idle',()=>{
 let gait=advanceFootsteps({x:50,y:80},{x:50,y:80},1/60,0,0);
 for(let i=0;i<50;i++)gait=advanceFootsteps({x:50,y:80},{x:50,y:80},1/60,gait.time,gait.speed);
 assert.equal(gait.walking,false);
 assert.equal(gait.time,0);
 const jumped=advanceFootsteps({x:0,y:0},{x:600,y:0},1/60,0,150);
 assert.equal(jumped.time,0,'teleports must not produce hundreds of artificial footsteps');
});

test('visual reconciliation immediately snaps only genuine large respawns or zone warps',()=>{
 assert.deepEqual(reconcileVisualPosition({x:0,y:0},{x:400,y:900},1/60,false),{x:400,y:900});
 const x=reconcileVisualPosition({x:0,y:0},{x:200,y:0},1/60,false);
 assert.ok(x.x>0&&x.x<200,'normal reconciliation is eased, not snapped');
});

test('network packet arrival jitter cannot change estimated walking speed when server tick stays fixed',()=>{
 let previous={x:0,y:0},v={x:0,y:0},results=[];
 for(let i=1;i<=12;i++){
  const authoritative={x:i*25,y:0};
  const wildlyVariableArrivalInterval=i%3===0?.31:i%3===1?.02:.07;
  // Arrival interval is purposefully different from authoritative 100ms.
  assert.ok(wildlyVariableArrivalInterval>0);
  v=estimateNetworkVelocity(previous,authoritative,.1,v,300);
  results.push(v.x);
  previous=authoritative;
 }
 assert.ok(Math.abs(results[11]-250)<.05,'steady 250 px/s movement emerges despite arrival jitter');
 assert.ok(results.slice(2).every(x=>x>240&&x<=250),'movement speed is bounded and never spikes');
});
test('distant zone warp does not get interpreted as high-speed walking',()=>{
 assert.deepEqual(estimateNetworkVelocity({x:0,y:0},{x:450,y:780},.1,{x:200,y:0},300),{x:0,y:0});
});
test('subpixel client quantization does not joggle standing hero',()=>{
 const origin={x:500.2,y:320.4};
 assert.deepEqual(reconcileVisualPosition(origin,{x:500.4,y:320.5},1/60),origin);
});
