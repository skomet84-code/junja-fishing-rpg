import test from 'node:test';
import assert from 'node:assert/strict';
import {NODES} from '../systems.mjs';
import {MATERIALS,ZONES} from '../../../image-prototype/mmo-data.js';

test('new harvesting nodes add choices without replacing existing node ids',()=>{
 const surface=NODES.filter(x=>x.zone==='surface'),grove=NODES.filter(x=>x.zone==='grove');
 assert.ok(surface.length>=8,'surface should contain eight accessible nodes');
 assert.ok(grove.length>=8,'deep forest should contain eight accessible nodes');
 assert.ok(NODES.filter(x=>x.zone==='cave').length>=4,'cave has several crystal nodes');
 assert.equal(new Set(NODES.map(x=>x.id)).size,NODES.length,'each resource node must have unique id');
 for(const n of NODES){
  assert.ok(MATERIALS[n.material],'resource material must be craftable');
  assert.ok(ZONES[n.zone],'resource zone must exist');
  assert.ok(n.x>=0&&n.x<1536&&n.y>=0&&n.y<2300,'resources within world boundaries');
  assert.ok(n.cooldown>0,'resource replenishment remains bounded');
 }
});
