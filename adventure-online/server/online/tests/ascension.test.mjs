import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {profile,JOBS,ITEMS,stats,RIFT_POOL,ECLIPSE_POOL,ETERNAL_POOL,promotionSkillLearned} from '../../../image-prototype/catalog.js';
import {LEVEL_CAP,PROMOTIONS,PROMOTION_MATERIALS,ASCENSION_CHAPTERS,ZONES,TRAVEL_PORTALS,NAMED} from '../../../image-prototype/mmo-data.js';

test('high-level roster migration preserves level, rank, equipment and chapter progress',()=>{
 assert.equal(LEVEL_CAP,750);
 assert.equal(PROMOTIONS.length,6);
 for(const job of Object.values(JOBS)){assert.equal(job.rankTitles.length,7);assert.equal(job.skills.length,9);}
 const a=profile({job:'mage',level:715,rank:6,zone:'sanctum',bag:['training','eternalblade'],equipment:{weapon:'eternalblade'},ascensionStories:{rift:{stage:5,claimed:true},eclipse:{stage:5,claimed:true}},promotionMaterials:{riftCore:111,eclipseSigil:142},endgame:{mastery:77}});
 assert.equal(a.level,715);assert.equal(a.rank,6);assert.equal(a.zone,'sanctum');assert.equal(a.equipment.weapon,'eternalblade');
 assert.equal(a.ascensionStories.rift.claimed,true);
 assert.equal(a.ascensionStories.eclipse.claimed,true);
 assert.equal(a.promotionMaterials.riftCore,111);
 assert.equal(a.endgame.mastery,77);
 assert.equal(stats(a).atk>0,true);
 assert.equal(profile({level:400,rank:4,zone:'origin'}).rank,4,'pre-update characters stay intact');
});
test('connected maps, late-game raids and item IDs are valid',()=>{
 for(const id of ['rift','eclipse','sanctum'])assert.ok(ZONES[id]);
 for(const [from,list] of Object.entries(TRAVEL_PORTALS))for(const to of list){assert.ok(ZONES[to.to],from+'->'+to.to);assert.ok((TRAVEL_PORTALS[to.to]||[]).some(x=>x.to===from),'reverse portal '+from+'->'+to.to);}
 for(const pool of [RIFT_POOL,ECLIPSE_POOL,ETERNAL_POOL]){assert.equal(pool.length,7);for(const id of pool)assert.equal(ITEMS[id]?.rarity,'mythic');}
 for(const zone of ['rift','eclipse','sanctum'])assert.ok(NAMED.some(x=>x.zone===zone&&x.raid));
});
test('5th and 6th advancement needs a completed, rewarded chapter, and learned skills need materials',()=>{
 let now=1000;
 const w=new World({now:()=>now,random:()=>0.5}),p=w.add('unit','player',profile({job:'warrior',level:500,rank:4,bossKills:80,zone:'rift',x:768,y:805}),'test');
 const s=p.state;
 const kill=(zone,enemy)=>{s.zone=zone;s.x=enemy.x;s.y=enemy.y;enemy.tags.set(p.id,{damage:20000,at:now,support:false});w.kill(enemy,p.channel);};
 function finishChapter(zone){
  const cfg=ASCENSION_CHAPTERS[zone],mobs=w.channel(p.channel,zone);
  s.zone=zone;
  w.action(p,{type:'ascensionStory',chapter:zone});
  assert.equal(s.ascensionStories[zone].stage,1);
  for(const e of mobs.filter(x=>!x.boss&&!x.elite).slice(0,cfg.kills))kill(zone,e);
  assert.equal(s.ascensionStories[zone].stage,2);
  for(const e of mobs.filter(x=>x.elite).slice(0,cfg.elites))kill(zone,e);
  assert.equal(s.ascensionStories[zone].stage,3);
  kill(zone,mobs.find(x=>x.id===60));
  assert.equal(s.ascensionStories[zone].stage,4);
 }
 finishChapter('rift');
 s.zone='surface';s.x=580;s.y=330;w.action(p,{type:'promote'});assert.equal(s.rank,4,'unfinished claim blocks 5th advancement');
 s.zone='rift';w.action(p,{type:'ascensionStory',chapter:'rift'});assert.equal(s.ascensionStories.rift.claimed,true);
 assert.equal(s.promotionMaterials.riftCore>=ASCENSION_CHAPTERS.rift.rewardMaterial,true);
 s.zone='surface';s.x=580;s.y=330;w.action(p,{type:'promote'});assert.equal(s.rank,5);
 assert.equal(promotionSkillLearned(s,5),false,'5th skill not free');
 s.promotionMaterials.riftCore=PROMOTION_MATERIALS[5].need;w.action(p,{type:'learnPromotionSkill',rank:5});
 assert.equal(promotionSkillLearned(s,5),true);assert.equal(s.promotionMaterials.riftCore,0);
 s.level=650;s.hp=stats(s).hp;s.mp=stats(s).mp;
 finishChapter('eclipse');
 s.zone='eclipse';w.action(p,{type:'ascensionStory',chapter:'eclipse'});
 s.zone='surface';s.x=580;s.y=330;w.action(p,{type:'promote'});assert.equal(s.rank,6);
 assert.equal(promotionSkillLearned(s,6),false);
 s.promotionMaterials.eclipseSigil=PROMOTION_MATERIALS[6].need;w.action(p,{type:'learnPromotionSkill',rank:6});
 assert.equal(promotionSkillLearned(s,6),true);
 assert.equal(p.cooldowns.length,9);
});
test('new raid bosses grant region-appropriate mythical equipment to valid participants',()=>{
 let now=1000;const w=new World({now:()=>now,random:()=>0});
 const p=w.add('raid-player','raider',profile({job:'mage',level:750,rank:6,zone:'sanctum',x:1060,y:1720}),'raid-test');
 const e=w.channel(p.channel,'sanctum').find(x=>x.named==='eternalLord');
 assert.ok(e);e.alive=true;e.window='test-slot';e.tags.set(p.id,{damage:500,at:now,support:false});
 const before=p.state.bag.length;w.kill(e,p.channel);
 assert.equal(p.state.bag.length,before+1);
 assert.ok(ETERNAL_POOL.includes(p.state.bag.at(-1)));
 assert.ok(p.state.bossClaims.includes('eternalLord:test-slot'));
});
