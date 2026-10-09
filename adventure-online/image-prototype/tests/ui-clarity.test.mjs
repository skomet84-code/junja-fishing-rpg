import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {monsterIllustration} from '../monster-art.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const css=readFileSync(path.join(root,'ui-clarity.css'),'utf8');
const html=readFileSync(path.join(root,'index.html'),'utf8');
const app=readFileSync(path.join(root,'app.js'),'utf8');

test('gameplay notifications and gather buttons have clear contrast',()=>{
 assert.match(css,/#game \.resource/);
 assert.match(css,/color:#fffbe6!important/);
 assert.match(css,/#game #toast:not\(\.combat-toast\)/);
 assert.match(html,/ui-clarity\.css/);
});
test('smaller character and nine interactive skills retain five columns',()=>{
 assert.match(css,/#hero\.entity\.hero\{width:98px!important;height:114px!important\}/);
 assert.match(css,/height:45px!important/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.doesNotMatch(css,/display:none!important.*#skillbar/);
});
test('monster labels map consistently to distinct illustrated families',()=>{
 assert.equal(monsterIllustration('날뛰는 멧돼지'),'boar');
 assert.equal(monsterIllustration('독버섯 그림자'),'mushroom');
 assert.equal(monsterIllustration('정예 · 암영 늑대'),'wolf');
 assert.equal(monsterIllustration('고목의 수호수'),'treant');
 assert.equal(monsterIllustration('들다람쥐'),null);
 assert.equal(monsterIllustration('수정 비룡'),null);
 assert.match(app,/monsterIllustration\(e\.name\)/);
 assert.match(app,/if\(!e\.illustrated\)/);
});
