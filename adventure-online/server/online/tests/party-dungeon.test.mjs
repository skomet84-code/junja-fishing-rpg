import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {profile} from '../../../image-prototype/catalog.js';
const spawn=(level=750,now=100)=>{let clock=now;const w=new World({now:()=>clock,random:()=>.99}),a=w.add('a','A',profile({level,job:'warrior',zone:'surface'}),'main'),b=w.add('b','B',profile({level,job:'healer',zone:'surface'}),'main');w.parties.set('p',{id:'p',leader:a.id,members:[a.id,b.id]});return {w,a,b,setNow:t=>clock=t};};
test('private dungeon cannot be entered through ordinary map fast travel',()=>{
 const {w,p:unused}=(()=>{const {w,a}=spawn(750);return {w,p:a};})();
 w.action(p,{type:'mapTravel',zone:'partyTrial'});assert.equal(p.state.zone,'surface');
 w.action(p,{type:'travel',zone:'partyTrial'});assert.equal(p.state.zone,'surface');
});
test('two-person party enters its own daily dungeon and reaches all three stages',()=>{
 const {w,a,b}=spawn();w.action(a,{type:'partyDungeonStart'});
 assert.equal(a.state.zone,'partyTrial');assert.equal(b.state.zone,'partyTrial');assert.equal(a.channel,b.channel);
 const channel=a.channel;assert.notEqual(channel,'main');assert.equal(w.snapshot(a).partyDungeon.stage,1);
 assert.equal(w.channel(channel,'partyTrial').length,4);
 for(const mob of [...w.channel(channel,'partyTrial')])w.kill(mob,channel);
 assert.equal(w.snapshot(a).partyDungeon.stage,2);assert.equal(w.channel(channel,'partyTrial').length,3);
 for(const mob of [...w.channel(channel,'partyTrial')])w.kill(mob,channel);
 assert.equal(w.snapshot(a).partyDungeon.stage,3);assert.equal(w.channel(channel,'partyTrial').length,1);
 const gold=a.state.gold;for(const mob of [...w.channel(channel,'partyTrial')])w.kill(mob,channel);
 assert.equal(a.state.zone,'surface');assert.equal(b.state.zone,'surface');assert.equal(a.channel,'main');
 assert.ok(a.state.gold>gold);assert.equal(a.state.partyDungeonClears,1);assert.equal(b.state.partyDungeonClears,1);
 assert.equal(w.partyDungeons.size,0);assert.equal(w.snapshot(a).partyDungeon,null);
 w.action(a,{type:'partyDungeonStart'});assert.equal(a.state.zone,'surface','no second entry on same KST day');
});
test('daily entry survives profile rehydration and resets on the following KST day',()=>{
 const {w,a,b,setNow}=spawn();w.action(a,{type:'partyDungeonStart'});
 const day=a.state.partyDungeonDay;assert.equal(day,b.state.partyDungeonDay);
 assert.equal(profile(a.state).partyDungeonDay,day);assert.equal(profile(a.state).zone,'surface','disconnect cannot log into an instance');
 w.action(a,{type:'partyDungeonExit'});assert.equal(a.state.zone,'surface');
 w.action(a,{type:'partyDungeonStart'});assert.equal(a.state.zone,'surface');
 setNow(100+86400);w.action(a,{type:'partyDungeonStart'});assert.equal(a.state.zone,'partyTrial');
});
test('entry requires a real two-player party and minimum level',()=>{
 const {w,a,b}=spawn(99);w.action(a,{type:'partyDungeonStart'});assert.equal(a.state.zone,'surface');
 a.state.level=100;b.state.level=100;w.action(a,{type:'partyDungeonStart'});assert.equal(a.state.zone,'partyTrial');
});
test('separate parties in the same public channel never share dungeon monsters',()=>{
 const f=spawn(),{w,a,b}=f,c=w.add('c','C',profile({level:750,zone:'surface'}),'main'),d=w.add('d','D',profile({level:750,zone:'surface'}),'main');
 w.parties.set('q',{id:'q',leader:c.id,members:[c.id,d.id]});
 w.action(a,{type:'partyDungeonStart'});w.action(c,{type:'partyDungeonStart'});
 assert.notEqual(a.channel,c.channel);assert.equal(w.snapshot(a).players.length,2);assert.equal(w.snapshot(c).players.length,2);
 w.kill(w.channel(a.channel,'partyTrial')[0],a.channel);
 assert.equal(w.channel(c.channel,'partyTrial').filter(e=>e.alive).length,4);
});
test('instance times out, returns all players, does not refund used daily entry',()=>{
 const f=spawn(),{w,a,b}=f;w.action(a,{type:'partyDungeonStart'});f.setNow(100+901);w.tick(.1);
 assert.equal(a.state.zone,'surface');assert.equal(b.state.zone,'surface');
 assert.equal(w.partyDungeons.size,0);assert.equal(a.state.partyDungeonClears,0);
 w.action(a,{type:'partyDungeonStart'});assert.equal(a.state.zone,'surface');
});
