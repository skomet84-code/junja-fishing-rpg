import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {ITEMS,CREATION_PRIMORDIAL_POOL,PRIMORDIAL_POOL,profile,stats,setBonuses} from '../../../image-prototype/catalog.js';
import {RECIPES,LEVEL_CAP,classWeapon} from '../../../image-prototype/mmo-data.js';
test('Lv.1500 primordial top rank remains separate from Lv.700 primordial and Lv.1500 mythic',()=>{
 assert.equal(LEVEL_CAP,1500);assert.equal(PRIMORDIAL_POOL.length,7);assert.equal(ITEMS.primordialblade.level,700);
 assert.equal(CREATION_PRIMORDIAL_POOL.length,7);assert.equal(ITEMS.creationblade.rarity,'mythic');
 for(const id of CREATION_PRIMORDIAL_POOL){const it=ITEMS[id],old=ITEMS[id.replace('primordialcreation','creation')],r=RECIPES[id];
  assert.ok(it&&old&&r);assert.equal(it.level,1500);assert.equal(it.rarity,'primordial');assert.equal(it.bound,true);assert.equal(it.tier,18);
  assert.ok(it.atk>=old.atk&&it.def>=old.def&&it.hp>=old.hp);assert.equal(r.rank,12);assert.equal(r.seals,90);assert.equal(r.promotionMaterials.creationCore,180);
 }
});
test('warrior, rogue, mage and healer get distinct Lv.1500 primordial weapons',()=>{
 for(const job of ['warrior','rogue','mage','healer']){const id=classWeapon('primordialcreationblade',job);
  assert.equal(ITEMS[id].level,1500);assert.equal(ITEMS[id].rarity,'primordial');assert.equal(RECIPES[id].job,job);
 }
});
test('crafting blocks lower ranks, creation cores and insufficient seals; consumes exact costs',()=>{
 const w=new World({now:()=>Date.parse('2026-10-10T12:00:00+09:00')/1000,random:()=>.99});
 const p=w.add('final','final',profile({level:1500,rank:11,gold:300000000,primordialSeals:90,x:1000,y:330,materials:{ore:5000,crystal:3200,stardust:1400},promotionMaterials:{creationCore:180}}),'creation-test');
 const id='primordialcreationblade';w.action(p,{type:'craft',recipe:id});assert.ok(!p.state.bag.includes(id),'rank');
 p.state.rank=12;p.state.promotionMaterials.creationCore=179;w.action(p,{type:'craft',recipe:id});assert.ok(!p.state.bag.includes(id),'creation cores');
 p.state.promotionMaterials.creationCore=180;p.state.primordialSeals=89;w.action(p,{type:'craft',recipe:id});assert.ok(!p.state.bag.includes(id),'90 seals');
 p.state.primordialSeals=90;w.action(p,{type:'craft',recipe:id});assert.ok(p.state.bag.includes(id));
 assert.equal(p.state.primordialSeals,0);assert.equal(p.state.promotionMaterials.creationCore,0);
 const prior=stats(p.state).atk;w.action(p,{type:'equip',item:id});assert.ok(stats(p.state).atk>prior);
});
test('full bag primordial armor pending receipt survives profile reload',()=>{
 const id='primordialcreationarmor';assert.deepEqual(profile({primordialPending:[id]}).primordialPending,[id]);
});
test('three-piece final set bonus activates with three equipped items',()=>{
 const p=profile({level:1500,rank:12,bag:['training',...CREATION_PRIMORDIAL_POOL],equipment:{weapon:'primordialcreationblade',armor:'primordialcreationarmor',cape:'primordialcreationcape'}});
 const b=setBonuses(p).find(x=>x.key==='primordialcreation');assert.ok(b);assert.equal(b.count,3);assert.equal(b.active.length,1);
});