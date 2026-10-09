import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {ITEMS,PRIMORDIAL_POOL,profile,stats} from '../../../image-prototype/catalog.js';
import {DAILY_TASKS,RECIPES,koreaDay} from '../../../image-prototype/mmo-data.js';

function setup(random=()=>.99){
 let now=Date.parse('2026-10-09T12:00:00+09:00')/1000;
 const w=new World({now:()=>now,random});
 return {w,advanceDay:()=>{now+=86400;w.tick(.1);},add:(id,raw={})=>w.add(id,id,profile(raw),'primordial-test')};
}

test('seven ultimate primordial items are soulbound and stronger than the current level 700 endgame gear',()=>{
 assert.equal(PRIMORDIAL_POOL.length,7);
 for(const id of PRIMORDIAL_POOL){
  const item=ITEMS[id],recipe=RECIPES[id];
  assert.equal(item.rarity,'primordial');assert.equal(item.tier,11);assert.equal(item.level,700);
  assert.equal(item.bound,true);assert.equal(recipe.seals,60);assert.equal(recipe.level,700);
 }
 assert.ok(ITEMS.primordialblade.atk>ITEMS.eternalblade.atk);
 assert.ok(ITEMS.primordialarmor.hp>ITEMS.eternalarmor.hp);
});

test('exactly one seal per Korean day; 59 days cannot craft, 60 days can; persistence preserves progress',()=>{
 const {w,add,advanceDay}=setup(),p=add('a',{level:750,gold:100000000,materials:{ore:2500,crystal:2000,stardust:500}});
 function finishDay(){
  p.state.zone='surface';p.state.x=580;p.state.y=350;
  p.state.daily={day:koreaDay(w.now()),hunt:20,gather:12,dungeon:5,claimed:[]};
  for(const id of Object.keys(DAILY_TASKS))w.action(p,{type:'dailyClaim',task:id});
 }
 finishDay();assert.equal(p.state.primordialSeals,1);
 p.state.daily.claimed=[];
 for(const id of Object.keys(DAILY_TASKS))w.action(p,{type:'dailyClaim',task:id});
 assert.equal(p.state.primordialSeals,1);
 for(let i=1;i<59;i++){advanceDay();finishDay();}
 assert.equal(p.state.primordialSeals,59);
 p.state.x=1000;
 w.action(p,{type:'craft',recipe:'primordialblade'});
 assert.ok(!p.state.bag.includes('primordialblade'));
 advanceDay();finishDay();
 assert.equal(profile(p.state).primordialSeals,60);
 p.state.x=1000;
 w.action(p,{type:'craft',recipe:'primordialblade'});
 assert.ok(p.state.bag.includes('primordialblade'));
 assert.equal(p.state.primordialSeals,0);
 assert.ok(p.state.materials.ore<=500);
 const before=stats(p.state).atk;
 w.action(p,{type:'equip',item:'primordialblade'});
 assert.ok(stats(p.state).atk>before);
});

test('low level player cannot gain seals',()=>{
 const {w,add}=setup(),p=add('a',{level:199,x:580,y:350,daily:{day:koreaDay(w.now()),hunt:20,gather:12,dungeon:5,claimed:[]}});
 for(const id of Object.keys(DAILY_TASKS))w.action(p,{type:'dailyClaim',task:id});
 assert.equal(p.state.primordialSeals,0);
});

test('dragon 0.0001 percent drop persists in inbox if inventory is full and blocks duplicate claims',()=>{
 let rolls=[.99,.99,.0000005,0];
 const {w,add}=setup(()=>rolls.shift()??.99);
 const p=add('a',{level:750,zone:'celestial',x:1050,y:1720,bag:['training',...Array(79).fill('leather')]});
 const e=w.channel(p.channel,'celestial').find(x=>x.named==='dragon');assert.ok(e);
 e.alive=true;e.window='primordial-test';e.tags.set(p.id,{at:w.now(),damage:1000});
 w.kill(e,p.channel);
 assert.equal(p.state.primordialPending[0],'primordialblade');
 assert.equal(profile(p.state).primordialPending[0],'primordialblade');
 p.state.bag.pop();w.action(p,{type:'primordialCollect'});
 assert.ok(p.state.bag.includes('primordialblade'));
 assert.equal(p.state.primordialPending.length,0);
 const after=p.state.bag.length;e.alive=true;e.tags.set(p.id,{at:w.now(),damage:1000});w.kill(e,p.channel);
 assert.equal(p.state.bag.length,after);
});

test('bound primordial gear cannot be traded or sold',()=>{
 const {w,add}=setup(),a=add('a',{level:750,bag:['training','primordialblade'],x:1000,y:350}),b=add('b',{x:1000,y:350});
 const gold=a.state.gold;
 w.action(a,{type:'sell',item:'primordialblade',qty:1});
 assert.ok(a.state.bag.includes('primordialblade'));assert.equal(a.state.gold,gold);
 w.action(a,{type:'tradeInvite',player:b.id});const t=[...w.trades.values()][0];assert.ok(t);
 w.action(b,{type:'tradeAccept',id:t.id});
 w.action(a,{type:'tradeOffer',id:t.id,gold:0,items:['primordialblade'],materials:{}});
 assert.deepEqual(t.offers[a.id].items,[]);
});

test('manual move cancels server navigation; tap navigation uses one authoritative server path',()=>{
 const {w,add}=setup(),p=add('a',{x:768,y:355});
 w.action(p,{type:'navigate',x:950,y:1350});assert.ok(p.navPath.length>0);
 w.action(p,{type:'move',x:1,y:0,manual:true});
 assert.equal(p.navPath.length,0);assert.equal(p.input.x,1);
});
