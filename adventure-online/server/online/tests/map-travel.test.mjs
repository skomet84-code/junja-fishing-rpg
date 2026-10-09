import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {profile} from '../../../image-prototype/catalog.js';
function setup(level){const w=new World({now:()=>100,random:()=>.9}),p=w.add('test-'+level,'tester',profile({level,job:'rogue',zone:'surface',x:768,y:355}),'map-teleport');return {w,p};}
test('map allows any unlocked destination, including non-neighboring areas',()=>{
 const {w,p}=setup(750);
 w.action(p,{type:'mapTravel',zone:'sanctum'});assert.equal(p.state.zone,'sanctum');assert.deepEqual([p.state.x,p.state.y],[768,790]);
 w.action(p,{type:'mapTravel',zone:'grove'});assert.equal(p.state.zone,'grove');
 w.action(p,{type:'mapTravel',zone:'surface'});assert.equal(p.state.zone,'surface');assert.deepEqual([p.state.x,p.state.y],[768,355]);
});
test('locked or unknown regions are rejected on server even if client is bypassed',()=>{
 const {w,p}=setup(20);
 for(const zone of ['cave','sanctum','__missing__',null,{},'constructor']){w.action(p,{type:'mapTravel',zone});assert.equal(p.state.zone,'surface');}
 w.action(p,{type:'mapTravel',zone:'grove'});assert.equal(p.state.zone,'grove');
});
test('ordinary world portal access remains adjacent only',()=>{
 const {w,p}=setup(750);
 w.action(p,{type:'travel',zone:'sanctum'});assert.equal(p.state.zone,'surface');
 w.action(p,{type:'travel',zone:'grove'});assert.equal(p.state.zone,'grove');
});
