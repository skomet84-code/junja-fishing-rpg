import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
test('runtime-injected endgame CSS never overrides responsive mobile skill grid',()=>{
 assert.doesNotMatch(app,/endgameStyle\.textContent="\.skillbar/);
 assert.doesNotMatch(app,/repeat\(7,54px\)/);
 assert.doesNotMatch(app,/repeat\(7,46px\)/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
});
