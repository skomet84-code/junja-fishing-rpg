import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {profile,JOBS,stats,skillMpCost} from '../../../image-prototype/catalog.js';
function setup(operator=false){
 let clock=100;
 const w=new World({now:()=>clock,random:()=>.999});
 const s=profile({level:351,job:'rogue',rank:3,zone:'void',x:760,y:930});
 const p=w.add('p'+operator,'unit-user',s,'tests-'+operator);
 p.operator=operator;p.state.mp=stats(p.state).mp;
 const target=w.channel(p.channel,p.state.zone).find(e=>e.alive&&!e.boss&&!e.elite);
 assert.ok(target,'expected an ordinary mob');
 target.max=1e9;target.hp=1e9;p.state.x=target.x;p.state.y=target.y;
 return {w,p,target,advance:(sec=.1)=>{clock+=sec;w.tick(sec);},get clock(){return clock}};
}
for(const operator of [false,true]){
 test('automatic cast + independent authoritative cooldown, operator='+operator,()=>{
  const f=setup(operator),{w,p,target}=f;
  assert.equal(JOBS[p.state.job].skills.length,7);
  w.action(p,{type:'auto',on:true});assert.equal(p.auto,true);
  f.advance(.1);
  assert.ok(p.attackSkill>=0,'auto must use learned offensive skill, not only basic');
  assert.ok(p.cooldowns[p.attackSkill]>f.clock,'cast must register cooldown');
  const firstSkill=p.attackSkill,firstCooldown=p.cooldowns[firstSkill],damage=target.max-target.hp;
  assert.ok(damage>0,'auto skill did damage');
  f.advance(.1);
  assert.equal(p.cooldowns[firstSkill],firstCooldown,'cooldown does not restart immediately');
  const snapshot=w.snapshot(p);
  assert.ok(snapshot.self.cooldowns[firstSkill]>snapshot.now);
  assert.equal(snapshot.self.operator,operator);
 });
}
test('low mana should be visible as missing ability resources rather than silent failure',()=>{
 const f=setup(true),{w,p}=f;p.state.mp=0;w.action(p,{type:'auto',on:true});f.advance(.1);
 assert.equal(p.attackSkill,-1,'without mana auto uses basic (baseline)');
});

test('automatic MP recovery eventually resumes skills without administrator exceptions',()=>{
 const f=setup(true),{w,p}=f;p.state.mp=0;w.action(p,{type:'auto',on:true});
 let cast=false;
 for(let i=0;i<85;i++){f.advance(.1);if(p.attackSkill>=0&&p.cooldowns[p.attackSkill]>f.clock){cast=true;break;}}
 assert.ok(cast,'autohunt should cast after mana regeneration');
});

test('automatic hunting starts moving toward enemies even from dungeon entrance',()=>{
 let now=100;const w=new World({now:()=>now,random:()=>.999});
 const p=w.add('spawn-auto','spawn-auto',profile({job:'rogue',level:351,rank:3,zone:'void',x:768,y:350}),'입구테스트');
 const before={x:p.state.x,y:p.state.y};p.state.mp=stats(p.state).mp;
 w.action(p,{type:'auto',on:true});assert.equal(p.auto,true);
 for(let i=0;i<30;i++){now+=.1;w.tick(.1);}
 assert.ok(p.state.y>before.y+30||Math.abs(p.state.x-before.x)>30,'auto should leave entrance to chase a valid mob');
 assert.ok(p.autoTarget!=null,'auto target should be assigned at entrance');
});

for(const operator of [false,true]){
 test('pressing a skill while auto hunting queues its cast but keeps the hunting mode, operator='+operator,()=>{
  const f=setup(operator),{w,p,target}=f;
  w.action(p,{type:'auto',on:true});f.advance(.1);
  assert.ok(p.nextAttack>f.clock,'first automatic spell occupies this cast window');
  assert.equal(p.cooldowns[0],0);
  w.action(p,{type:'attack',skill:0,target:target.id,manual:true,keepAuto:true});
  assert.equal(p.auto,true,'skill input must not switch off automatic hunting');
  assert.deepEqual(p.autoSkillQueue,[0]);
  assert.deepEqual(w.snapshot(p).self.autoSkillQueue,[0],'pending manual skill must be visible to client');
  let cast=false;
  for(let i=0;i<35;i++){f.advance(.1);if(p.cooldowns[0]>f.clock){cast=true;break;}}
  assert.ok(cast,'manual priority spell must fire at next available server attack window');
  assert.deepEqual(p.autoSkillQueue,[],'queued skill disappears only after its actual cast');
  assert.equal(p.auto,true,'automatic hunting must continue after manual priority cast');
 });
}
test('auto skill reservation supports two different spells, ignores repeats, and clears when auto is disabled',()=>{
 const f=setup(true),{w,p,target}=f;
 w.action(p,{type:'auto',on:true});f.advance(.1);
 for(const i of [0,0,1,2])w.action(p,{type:'attack',skill:i,manual:true,keepAuto:true,target:target.id});
 assert.deepEqual(p.autoSkillQueue,[0,1],'queue limited to two unique skills');
 w.action(p,{type:'autoTarget',target:target.id});
 assert.equal(p.auto,true);assert.equal(p.autoTarget,target.id);
 w.action(p,{type:'auto',on:false});
 assert.equal(p.auto,false);assert.deepEqual(p.autoSkillQueue,[]);
});
test('skill can be reserved at low MP and fires after automatic MP recovery',()=>{
 const f=setup(false),{w,p,target}=f;
 p.state.mp=0;w.action(p,{type:'auto',on:true});
 w.action(p,{type:'attack',skill:0,manual:true,keepAuto:true,target:target.id});
 assert.deepEqual(p.autoSkillQueue,[0]);
 let cast=false;
 for(let i=0;i<125;i++){f.advance(.1);if(p.cooldowns[0]>f.clock){cast=true;break;}}
 assert.ok(cast,'manual queue eventually casts after natural mana regeneration');
 assert.equal(p.auto,true);
});
