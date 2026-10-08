import test from 'node:test';import assert from 'node:assert/strict';import {World} from '../engine.mjs';import {profile} from '../../../image-prototype/catalog.js';
test('manual attacks remove implicit server auto-attack but preserve independent skill cooldowns',()=>{
 let t=100;const w=new World({now:()=>t,random:()=>.9});
 const p=w.add('combo-id','test',profile({job:'rogue',level:300,x:740,y:700}),'테스트방');
 p.state.mp=999999;const mob=w.channel(p.channel,p.state.zone).find(x=>x.alive&&!x.boss);
 assert.ok(mob);mob.max=100000000;mob.hp=100000000;p.state.x=mob.x;p.state.y=mob.y;
 p.combatTarget=mob.id;p.combatSkill=-1;w.action(p,{type:'attack',skill:0,target:mob.id,manual:true});
 assert.equal(p.combatTarget,null);assert.ok(p.cooldowns[0]>t);
 const hp=mob.hp;t=p.nextAttack+.11;w.tick(.1);assert.equal(mob.hp,hp);
 w.action(p,{type:'attack',skill:1,target:mob.id,manual:true});assert.ok(p.cooldowns[1]>t);
});
