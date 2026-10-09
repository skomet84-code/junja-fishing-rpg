import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {profile,JOBS,ITEMS,stats} from '../../../image-prototype/catalog.js';
import {LEVEL_CAP,PROMOTIONS,PROMOTION_MATERIALS,ASCENSION_CHAPTERS,ASCENSION_GEAR_POOLS,ZONES,TRAVEL_PORTALS,NAMED,MMO_XP,ascensionGuide} from '../../../image-prototype/mmo-data.js';

const newZones=['astral','zenith','chaos','eon','genesis','creation'];
test('12th ascension is final, with six navigable late-game regions',()=>{
 assert.equal(LEVEL_CAP,1500);
 assert.equal(PROMOTIONS.length,12);
 for(const [i,zone] of newZones.entries()){
  assert.ok(ZONES[zone]&&ASCENSION_CHAPTERS[zone]&&ASCENSION_GEAR_POOLS[zone]);
  assert.equal(ASCENSION_GEAR_POOLS[zone].length,7);
  assert.ok(NAMED.some(b=>b.zone===zone&&b.raid&&b.minParty===2));
  for(const id of ASCENSION_GEAR_POOLS[zone])assert.ok(ITEMS[id]);
  assert.equal(ASCENSION_CHAPTERS[zone].rank,i+6);
  assert.equal(PROMOTIONS[i+6].story,zone);
  for(const p of TRAVEL_PORTALS[zone])assert.ok(TRAVEL_PORTALS[p.to].some(x=>x.to===zone));
 }
 for(const job of Object.values(JOBS))assert.equal(job.rankTitles.length,13);
 assert.ok(MMO_XP(750)>0 && MMO_XP(1500)>MMO_XP(750));
 assert.ok(MMO_XP(750)/MMO_XP(749)<1.04,'do not introduce an EXP cliff at former level cap');
 const guide=ascensionGuide(profile({rank:6,level:750}));
 assert.equal(guide.zone,'astral');
 assert.match(guide.title,/7차 전직/);
 assert.equal(profile({level:750,rank:6,zone:'sanctum'}).level,750);
 assert.equal(profile({level:1500,rank:12}).rank,12);
 assert.equal(ascensionGuide(profile({level:1500,rank:12})),null);
});
test('7th promotion requires story, full materials and gold without mutating a failed promotion',()=>{
 const w=new World(),cfg=PROMOTION_MATERIALS[7];
 const p=w.add('e2e7','a',profile({level:750,rank:6,bossKills:400,gold:20000000,zone:'surface',x:580,y:330,ascensionStories:{astral:{stage:5,claimed:true}},promotionMaterials:{[cfg.key]:cfg.need-1}}),'e2e7');
 w.action(p,{type:'promote'});assert.equal(p.state.rank,6);
 assert.equal(p.state.gold,20000000);
 p.state.promotionMaterials[cfg.key]=cfg.need;
 w.action(p,{type:'promote'});assert.equal(p.state.rank,7);
 assert.equal(p.state.gold,0);
 assert.equal(p.state.promotionMaterials[cfg.key],0);
 assert.ok(stats(p.state).atk>0);
 const mobs=w.channel(p.channel,'astral');
 assert.ok(mobs.filter(m=>m.elite).every(m=>m.level<=754));
 assert.ok(mobs.some(m=>m.id===60&&m.level<=755));
});
test('final creator promotion requires primordial equipment and never advances to 13th',()=>{
 const w=new World(),cfg=PROMOTION_MATERIALS[12],gold=PROMOTIONS[11].gold;
 const p=w.add('e2e12','b',profile({job:'warrior',level:1500,rank:11,bossKills:999,gold,zone:'surface',x:580,y:330,ascensionStories:{creation:{stage:5,claimed:true}},promotionMaterials:{[cfg.key]:cfg.need}}),'e2e12');
 w.action(p,{type:'promote'});assert.equal(p.state.rank,11,'primordial equipment gate required');
 assert.equal(p.state.gold,gold);
 p.state.bag.push('primordialblade');
 p.state.equipment.weapon='primordialblade';
 w.action(p,{type:'promote'});assert.equal(p.state.rank,12);
 assert.equal(p.state.gold,0);
 assert.equal(p.state.promotionMaterials[cfg.key],0);
 w.action(p,{type:'promote'});assert.equal(p.state.rank,12);
});
