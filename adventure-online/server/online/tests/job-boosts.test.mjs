import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {ITEMS,profile,equip,stats,rollLoot} from '../../../image-prototype/catalog.js';
import {WEAPON_FAMILIES,CLASS_WEAPON_ITEMS,classWeapon,RECIPES,BOOSTS} from '../../../image-prototype/mmo-data.js';

test('all live weapon tiers gain three job identities without changing original sword records',()=>{
 assert.ok(Object.keys(WEAPON_FAMILIES).length>=15);
 for(const [base,old] of Object.entries(WEAPON_FAMILIES)){
  assert.equal(classWeapon(base,'warrior'),base);
  assert.equal(ITEMS[base].name,old.name);
  for(const job of ['rogue','mage','healer']){
   const id=classWeapon(base,job);
   assert.equal(ITEMS[id]?.job,job);
   assert.equal(ITEMS[id]?.slot,'weapon');
   assert.equal(ITEMS[id]?.rarity,old.rarity);
   assert.equal(ITEMS[id]?.level||1,old.level||1);
   const correct=profile({job,level:750,bag:['training',id]});
   assert.equal(equip(correct,id),true);
   const incorrect=profile({job:'warrior',level:750,bag:['training',id]});
   assert.equal(equip(incorrect,id),false);
  }
 }
 assert.equal(Object.keys(CLASS_WEAPON_ITEMS).length,Object.keys(WEAPON_FAMILIES).length*3);
});

test('class weapon crafting keeps original level, seal costs, and distinguishes profession',()=>{
 for(const original of ['ironblade','crystalblade','riftblade','eclipseblade','eternalblade','primordialblade']){
  const base=RECIPES[original];
  assert.equal(base.job,'warrior');
  for(const job of ['rogue','mage','healer']){
   const id=classWeapon(original,job),r=RECIPES[id];
   assert.equal(r.job,job);
   assert.equal(r.item,id);
   assert.deepEqual(r.materials,base.materials);
   assert.equal(r.gold,base.gold);
   assert.equal(r.seals||0,base.seals||0);
  }
 }
});

test('mage and healer weapons improve mana and health while retaining legacy gear',()=>{
 const mage=profile({job:'mage',level:750,bag:['training','mythicblade',classWeapon('mythicblade','mage')],equipment:{weapon:'mythicblade'},enhancements:{mythicblade:10}});
 assert.equal(mage.equipment.weapon,'mythicblade');
 assert.equal(mage.enhancements.mythicblade,10);
 const before=stats(mage).mp;
 assert.equal(equip(mage,classWeapon('mythicblade','mage')),true);
 assert.ok(stats(mage).mp>before);
 const healer=profile({job:'healer',level:750,bag:['training',classWeapon('mythicblade','healer')]});
 const hp=stats(healer).hp;
 assert.equal(equip(healer,classWeapon('mythicblade','healer')),true);
 assert.ok(stats(healer).hp>hp);
 assert.equal(rollLoot(true,()=>0,'rogue'),classWeapon('kingblade','rogue'));
});

test('live merchant purchase and 30-minute XP potion are validated on server',()=>{
 let now=Date.now()/1000;
 const w=new World({now:()=>now,random:()=>.99});
 const p=w.add('t','t',profile({job:'mage',level:100,gold:5000000,x:1000,y:330,materials:{ore:500,crystal:500,wood:500}}),'gear-boost-test');
 const start=p.state.gold;
 w.action(p,{type:'buy',item:classWeapon('ironblade','mage'),qty:1});
 assert.ok(p.state.bag.includes(classWeapon('ironblade','mage')));
 w.action(p,{type:'buy',item:classWeapon('ironblade','rogue'),qty:1});
 assert.equal(p.state.bag.includes(classWeapon('ironblade','rogue')),false);
 w.action(p,{type:'craft',recipe:classWeapon('crystalblade','mage')});
 assert.ok(p.state.bag.includes(classWeapon('crystalblade','mage')));
 const before=w.players.get(p.id).state.bag.length;
 w.action(p,{type:'craft',recipe:classWeapon('crystalblade','rogue')});
 assert.equal(p.state.bag.length,before);
 w.action(p,{type:'buy',item:'growthBoost',qty:1});
 assert.equal(p.state.boosts.growth,Math.floor(now+BOOSTS.growthBoost.duration));
 w.action(p,{type:'buy',item:'battleBoost',qty:1});
 assert.equal(p.state.boosts.battle,Math.floor(now+BOOSTS.battleBoost.duration));
 assert.equal(p.state.gold,start-ITEMS[classWeapon('ironblade','mage')].price-RECIPES[classWeapon('crystalblade','mage')].gold-BOOSTS.growthBoost.price-BOOSTS.battleBoost.price);
 const plain=stats({...p.state,boosts:{growth:0,battle:0}},now),active=stats(p.state,now);
 assert.ok(active.atk>plain.atk);
 assert.ok(active.speed>plain.speed);
 w.action(p,{type:'buy',item:'growthBoost',qty:99});
 assert.equal(p.state.boosts.growth,Math.floor(now+BOOSTS.growthBoost.duration));
 const saved=profile(p.state);
 assert.equal(saved.boosts.growth,p.state.boosts.growth);
 assert.equal(saved.boosts.battle,p.state.boosts.battle);
});
