import test from 'node:test';
import assert from 'node:assert/strict';
import {WALK_SPEED,predictServerPosition,reconcileVisualPosition,advanceFootsteps} from '../movement-feel.js';

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
