import test from 'node:test';
import assert from 'node:assert/strict';
import {getSetIds,changeCharacter} from '../admin-panel.mjs';
import {ITEMS,profile} from '../../../image-prototype/catalog.js';

test('700-level primordial warrior set is seven valid, unbound pieces',()=>{
 const ids=getSetIds('primordial','warrior');
 assert.equal(ids.length,7);
 assert.equal(new Set(ids).size,7);
 for(const id of ids){assert.equal(ITEMS[id].rarity,'primordial');assert.equal(ITEMS[id].level,700);}
});

test('class-specific warrior and shadow sets use correct job weapons',()=>{
 const rogue=getSetIds('primordial','rogue');
 assert.equal(ITEMS[rogue[0]].job,'rogue');
 assert.equal(ITEMS[rogue[0]].slot,'weapon');
 assert.deepEqual(rogue.slice(1),getSetIds('primordial','warrior').slice(1));
});

test('give full level 700 set without replacing equipped items or level',()=>{
 const s=profile({job:'warrior',level:565,rank:5,bag:['training'],equipment:{weapon:'training'}});
 const before=structuredClone(s.equipment);
 const detail=changeCharacter(s,{type:'grant-set',set:'primordial'});
 assert.match(detail,/태초/);
 assert.equal(s.level,565);assert.equal(s.rank,5);
 assert.deepEqual(s.equipment,before);
 assert.equal(getSetIds('primordial','warrior').every(id=>s.bag.includes(id)),true);
});

test('when bag has 80 items, primordial set is delivered to claim inbox',()=>{
 const s=profile({job:'warrior',level:565,rank:5,bag:Array(80).fill('leather')});
 changeCharacter(s,{type:'grant-set',set:'primordial'});
 assert.equal(s.bag.length,80);
 assert.deepEqual(s.primordialPending,getSetIds('primordial','warrior'));
});

test('reject unsupported item ids, wrong class weapons, and overly large gifts',()=>{
 const s=profile({job:'warrior',level:10});
 assert.throws(()=>changeCharacter(s,{type:'grant-item',item:'not_real',qty:1}),/아이템/);
 const rogue=getSetIds('primordial','rogue')[0];
 assert.throws(()=>changeCharacter(s,{type:'grant-item',item:rogue,qty:1}),/직업/);
 assert.throws(()=>changeCharacter(s,{type:'grant-item',item:'leather',qty:21}),/정수/);
});

test('level and rank are bounded to current progression',()=>{
 const s=profile({job:'warrior',level:565,rank:5});
 assert.throws(()=>changeCharacter(s,{type:'set-rank',value:12}),/최소 레벨/);
 assert.throws(()=>changeCharacter(s,{type:'set-level',value:1501}),/정수/);
 assert.match(changeCharacter(s,{type:'set-rank',value:4}),/4차/);
 assert.match(changeCharacter(s,{type:'set-level',value:700}),/700/);
});
