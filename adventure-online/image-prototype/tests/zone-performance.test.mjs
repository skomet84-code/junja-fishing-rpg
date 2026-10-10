import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
test('boss attack-range warning only replaces markup when pattern text changes',()=>{
 assert.match(app,/if\(el\._text!==text\)\{el\.innerHTML=/);
 assert.match(app,/if\(el\.className!==cls\)/);
});
test('hunting-ground mobs do not rewrite constant DOM attributes each network tick',()=>{
 assert.match(app,/if\(entry\.el\.dataset\.variant!==variant\)/);
 assert.match(app,/if\(entry\.el\.dataset\.zone!==state\.zone\)/);
 assert.match(app,/if\(entry\.lastHpPercent!==hpPercent\)/);
});
test('high-cost monster filter and field animations suppressed on mobile only',()=>{
 assert.match(css,/#world:not\(\[data-zone="surface"\]\) \.enemy\.illustrated-monster>\.sprite/);
 assert.match(css,/filter:none!important/);
 assert.match(css,/@media \(hover:none\) and \(pointer:coarse\)/);
});
