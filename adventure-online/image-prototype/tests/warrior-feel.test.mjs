import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);const app=readFileSync(new URL('app.js',root),'utf8'),css=readFileSync(new URL('style.css',root),'utf8'),html=readFileSync(new URL('index.html',root),'utf8');
test('warrior uses actual directional twelve-frame animation with readable attack phase',()=>{
 assert.match(app,/motionSprite\(art,Math\.min\(11,Math\.floor\(sequence\)\),'attack'/);
 assert.match(app,/el\.dataset\.warriorPhase=p<\.24\?'windup'/);
 assert.match(app,/el\.dataset\.motion=mode;if\(el\.dataset\.job==='warrior'\)el\.dataset\.warriorPhase=mode/);
});
test('all seven warrior skills receive individual confirmed-cast visual effects',()=>{
 for(let i=0;i<7;i++)assert.ok(app.includes("case 'warrior:"+i+"': warriorTechnique("+i+",target,origin);break;"),'Missing warrior skill '+i);
 assert.match(app,/function warriorTechnique\(skill,target,origin=view\)/);
 assert.match(css,/\.warrior-technique\.heavy/);
 assert.match(css,/\.warrior-technique\.guard/);
});
test('warrior hit confirmation only comes from authoritative HP delta',()=>{
 assert.match(app,/if\(wasKnown&&wasAlive&&e\.hp<previousHp/);
 assert.match(app,/if\(state\.job==='warrior'&&target\.el\)/);
 assert.match(app,/function damageNumber\(target,delta\)/);
});
test('hero sprite and mobile skill controls remain present',()=>{
 assert.ok(html.includes('id="heroArt"'));
 assert.ok(html.includes('id="autoBtn"'));
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
});
