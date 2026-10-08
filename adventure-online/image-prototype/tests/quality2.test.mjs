import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const at=new URL('../',import.meta.url),app=readFileSync(new URL('app.js',at),'utf8'),ui=readFileSync(new URL('index.html',at),'utf8'),css=readFileSync(new URL('style.css',at),'utf8');
test('the minimap remains user-accessible and opens without an always-hidden CSS rule',()=>{
 assert.ok(ui.includes('id="minimapToggle"'));
 assert.ok(ui.includes('aria-expanded="false"'));
 assert.doesNotMatch(ui,/#minimapWrap\s*\{\s*display:none!important\s*\}/);
 assert.match(app,/minimapWrap\.classList\.toggle\('open'\)/);
 assert.match(app,/if\(opened\)renderMinimap\(\)/);
 assert.match(css,/#minimapWrap:not\(\.open\)>:not\(#minimapToggle\)/);
});
test('all seven skills fit into a four-column mobile grid and remain interactive',()=>{
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/\.skillbar button\{width:100%!important/);
 assert.match(app,/b\.onclick=\(\)=>attack\(i\)/);
 assert.match(app,/b\.dataset\.slot=String\(i\+1\)/);
 assert.match(app,/b\.dataset\.kind=s\[4\]/);
});
test('all eight zones have palette-specific ambient visuals and minimap palettes for endgame',()=>{
 for(const zone of ['surface','grove','cave','ruins','abyss','celestial','void','origin'])assert.ok(css.includes('#world[data-zone="'+zone+'"]'),'Missing ambient for '+zone);
 assert.match(app,/void:\['#180d29','#9851cd'\]/);
 assert.match(app,/origin:\['#1c2c39','#efd99b'\]/);
});
test('level-up effects derive only from live state progress, not initial account loading',()=>{
 assert.match(app,/const sampleAt=performance\.now\(\)\/1000,old=state,next=data\.self,wasConnected=connected/);
 assert.match(app,/if\(wasConnected&&old\.level<state\.level/);
 assert.match(app,/function showLevelAchievement\(fromLevel,toLevel\)/);
 assert.match(css,/\.level-achievement\.major/);
});
test('character and equipment rendering code stays connected to hero and remote players',()=>{
 assert.match(app,/actorArt\(\$\('heroArt'\),state\)/);
 assert.match(app,/decorate\(\$\('hero'\),state\)/);
 assert.match(app,/actorArt\(peer\.art,p\)/);
 assert.match(app,/decorate\(peer\.el,p\)/);
});
