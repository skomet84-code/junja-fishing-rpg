import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {advanceRoute} from '../route-motion.mjs';
import {profile} from '../../../image-prototype/catalog.js';
import {pathfind,clearPath,walkable,project,distance} from '../../../image-prototype/core.js';
import {ascensionGuide,PROMOTIONS} from '../../../image-prototype/mmo-data.js';

test('tap navigation uses walkable waypoints through narrow town-to-field corridors',()=>{
 const start={x:768,y:350},end={x:1080,y:1760};
 const route=pathfind(start,end);
 assert.ok(route.length>0,'route should exist');
 let at=start;
 for(const point of route){
  assert.ok(walkable(point.x,point.y),JSON.stringify(point));
  assert.ok(clearPath(at,point),JSON.stringify({at,point}));
  at=point;
 }
 assert.ok(distance(at,project(end.x,end.y))<8);
 assert.deepEqual(pathfind({x:768,y:360},{x:768,y:365}),[{x:768,y:365}]);
 assert.deepEqual(pathfind({x:NaN,y:1},end),[]);
});
test('tapped distant destination results in actual server movement, not a silent dead route',()=>{
 let time=500;const w=new World({now:()=>time,random:()=>.99});
 const p=w.add('navigator','navigator',profile({job:'warrior',level:750,zone:'surface',x:768,y:355}),'nav-room');
 w.action(p,{type:'navigate',x:1080,y:1760});
 assert.ok(p.navPath.length>0);
 let travelled=0,last={x:p.state.x,y:p.state.y};
 for(let i=0;i<100;i++){time+=.1;w.tick(.1);travelled+=distance(last,p.state);last={x:p.state.x,y:p.state.y};}
 assert.ok(travelled>500,'server should move across multiple waypoint segments');
 assert.ok(walkable(p.state.x,p.state.y));
});
test('auto-chase caches a route until target or movement substantially changes',()=>{
 let time=500;const w=new World({now:()=>time,random:()=>.99});
 const p=w.add('chaser','chaser',profile({job:'warrior',level:750,zone:'surface',x:768,y:790}),'chase-room');
 const e={id:999,x:1180,y:1700};
 const first=w.chase(p,e,time),route=p.chaseRoute;
 assert.ok(first.x||first.y);
 assert.ok(route.length>0);
 const stamp=p.chaseAt;
 time+=.1;w.chase(p,e,time);
 assert.equal(p.chaseAt,stamp,'path should not be recalculated every tick');
 assert.strictEqual(p.chaseRoute,route);
 e.x=800;e.y=1890;time+=.1;w.chase(p,e,time);
 assert.ok(p.chaseAt>stamp,'moving target must trigger replan');
});
test('sixth ascension quest guidance points to the correct region, enemies, boss and town elder',()=>{
 const base={rank:5,level:650,bossKills:70,zone:'surface',ascensionStories:{eclipse:{stage:0}}};
 const stage=step=>ascensionGuide({...base,ascensionStories:{eclipse:{stage:step,kills:7,elites:2}}});
 assert.equal(PROMOTIONS[5].story,'eclipse');
 assert.deepEqual([stage(0).zone,stage(0).action],['eclipse','start']);
 assert.match(stage(1).text,/7\/24/);
 assert.match(stage(2).text,/2\/4/);
 assert.match(stage(3).text,/월식 집행자/);
 assert.equal(stage(4).action,'claim');
 const claimed=ascensionGuide({...base,ascensionStories:{eclipse:{stage:5,claimed:true}}});
 assert.equal(claimed.zone,'surface');
 assert.equal(claimed.action,'promote');
 assert.match(claimed.text,/650/);
 assert.match(claimed.text,/70회/);
});

test('server route spends a full movement tick across short waypoints without warps',()=>{
 const waypoints=[{x:5,y:0},{x:9,y:0},{x:15,y:0},{x:40,y:0},{x:55,y:0}];
 let position={x:0,y:0};const xs=[];
 for(let i=0;i<3;i++){position=advanceRoute(position,waypoints,25,()=>true);xs.push(position.x);}
 assert.deepEqual(xs,[25,50,55],'waypoint boundaries must not consume entire ticks');
 assert.deepEqual(waypoints,[]);
});
test('server route respects collision and never swallows blocked waypoints',()=>{
 const waypoints=[{x:30,y:0}];
 const at=advanceRoute({x:0,y:0},waypoints,25,(x)=>x<=10);
 assert.deepEqual(at,{x:0,y:0});
 assert.equal(waypoints.length,1);
});
test('server route movement never exceeds the authoritative distance budget',()=>{
 const waypoints=[{x:6,y:8},{x:60,y:80}];
 const at=advanceRoute({x:0,y:0},waypoints,25,()=>true);
 assert.ok(Math.hypot(at.x,at.y)<=25.0001);
 assert.ok(Math.hypot(at.x,at.y)>=24.999);
});
