import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../engine.mjs';
import {profile,availableTradeItems} from '../../../image-prototype/catalog.js';

const bag=['training','primordialcreationarmor','primordialcreationarmor','primordialcreationring','primordialcreationring','primordialcreationring','mythicblade','mythicblade','primordialblade'];
const equipment={weapon:'mythicblade',armor:'primordialcreationarmor',ring:'primordialcreationring'};
const expected=['primordialcreationarmor','primordialcreationring','primordialcreationring','mythicblade','primordialblade'];

test('trading lists all unequipped primordial and mythic copies while keeping one equipped copy per slot',()=>{
 const s=profile({level:1500,bag,equipment});
 assert.deepEqual(availableTradeItems(s),expected);
});

test('server accepts available copies but refuses equipped items and excessive duplicate quantities',()=>{
 const w=new World({now:()=>1e9,random:()=>.99});
 const a=w.add('trader-a','TraderA',profile({level:1500,bag,equipment,x:1000,y:350}),'trade-test');
 const b=w.add('trader-b','TraderB',profile({x:1000,y:350}),'trade-test');
 w.action(a,{type:'tradeInvite',player:b.id});
 const trade=[...w.trades.values()][0];assert.ok(trade);
 w.action(b,{type:'tradeAccept',id:trade.id});
 w.action(a,{type:'tradeOffer',id:trade.id,gold:0,items:['primordialcreationarmor','primordialcreationring','mythicblade','primordialblade'],materials:{}});
 assert.deepEqual(trade.offers[a.id].items,['primordialcreationarmor','primordialcreationring','mythicblade','primordialblade']);
 w.action(a,{type:'tradeOffer',id:trade.id,gold:0,items:['primordialcreationarmor','primordialcreationarmor'],materials:{}});
 assert.deepEqual(trade.offers[a.id].items,['primordialcreationarmor','primordialcreationring','mythicblade','primordialblade']);
 w.action(a,{type:'tradeOffer',id:trade.id,gold:0,items:['primordialcreationring','primordialcreationring','primordialcreationring'],materials:{}});
 assert.deepEqual(trade.offers[a.id].items,['primordialcreationarmor','primordialcreationring','mythicblade','primordialblade']);
});
