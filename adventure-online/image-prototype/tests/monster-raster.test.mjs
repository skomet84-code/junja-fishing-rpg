import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('new monster art uses shared PNG rasterized once per family before entering live game',()=>{
 assert.match(app,/const monsterRasterArt=new Map\(\)/);
 assert.match(app,/MONSTER_FAMILIES=\['mushroom','boar','wolf','treant'\]/);
 assert.match(app,/canvas\.toBlob\(blob=>\{/);
 assert.match(app,/monsterRasterArt\.set\(family,URL\.createObjectURL\(blob\)\)/);
 assert.match(app,/\.\.\.\(monsterArtMode==='raster'\?MONSTER_FAMILIES\.map\(rasterizeMonsterArt\):\[\]\)/);
 assert.match(app,/entry\.art\.style\.backgroundImage=artwork\?monsterBackground\(artwork\)/);
});
test('A/B switch can isolate October 10 new SVG monster regression without touching game data',()=>{
 assert.match(app,/monsterArtSetting==='legacy'\?'legacy'/);
 assert.match(app,/monsterArtSetting==='svg'\?'svg'/);
 assert.match(app,/monsterArtMode==='legacy'\?null:monsterIllustration\(e\.name\)/);
 assert.match(app,/\.svg\?v=20261010-monster1/);
});
test('updated JS entrypoint busts stale Kakao iPhone webview cache',()=>{
 assert.match(html,/app\.js\?v=20261010-monster-raster1/);
});
