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
