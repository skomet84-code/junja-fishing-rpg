import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {profile} from '../../../image-prototype/catalog.js';
import {NAMED} from '../../../image-prototype/mmo-data.js';

const raids=NAMED.filter(b=>b.raid);
function setup(boss){
 const now=1000;
 const world=new World({now:()=>now,random:()=>0.5});
 const raw={job:'warrior',level:750,rank:6,zone:boss.zone,x:boss.x-25,y:boss.y};
 const one=world.add('player-a','파티장',profile(raw),'2인 파티 테스트');
 const two=world.add('player-b','파티원',profile({...raw,x:boss.x+25}),'2인 파티 테스트');
 const enemy=world.channel(one.channel,boss.zone).find(e=>e.named===boss.id);
 assert.ok(enemy,'named boss must exist: '+boss.id);
 enemy.alive=true;
 return {world,one,two,enemy};
}
function join({world,one,two}){
 world.action(one,{type:'partyInvite',player:two.id});
 const inv=[...world.partyInvites.values()].find(i=>i.to===two.id);
 assert.ok(inv,'party invite should be created for two users');
 world.action(two,{type:'partyAccept',id:inv.id});
 const party=[...world.parties.values()][0];
 assert.deepEqual(party.members,[one.id,two.id]);
 assert.equal(world.snapshot(one).party.members.length,2,'client receives a 2-person party');
}

test('all world raids permit a minimum of two real party members',()=>{
 assert.equal(raids.length,6,'expected all six named raids');
 for(const boss of raids)assert.equal(boss.minParty,2,boss.id+' must accept two players');
});
for(const boss of raids){
 test(boss.id+': solo is blocked, two nearby party members can damage the raid boss',()=>{
  const f=setup(boss),{world,one,two,enemy}=f;
  const initialHp=enemy.hp;
  world.attack(one,-1,enemy.id);
  assert.equal(enemy.hp,initialHp,'solo damage must be blocked');
  assert.ok(world.events.some(e=>e.text.includes('파티 2명')),'show two-player requirement');
  join(f);
  // A joined member must be in the field and within 720 units of the boss.
  two.state.x=boss.x+850;
  world.attack(one,-1,enemy.id);
  assert.equal(enemy.hp,initialHp,'party member too far away does not count');
  two.state.x=boss.x+25;
  world.attack(one,-1,enemy.id);
  assert.ok(enemy.hp<initialHp,'two nearby people can attack the raid');
  assert.ok(enemy.tags.has(one.id),'damage is attributed to the attacker');
 });
}
