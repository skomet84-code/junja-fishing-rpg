import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(path.join(root,'app.js'),'utf8');
const css=readFileSync(path.join(root,'mobile-performance.css'),'utf8');
const html=readFileSync(path.join(root,'index.html'),'utf8');

test('routine hunt EXP alerts are small and short-lived, while rare rewards keep original text',()=>{
 assert.match(app,/routineKill\?'EXP \+'\+exp\[1\]:event\.text/);
 assert.match(app,/kind==='combat'\?1150:2400/);
 assert.match(css,/#game #toast\.combat-toast/);
 assert.match(css,/top:49%!important/);
 assert.match(css,/left:8px!important/);
 assert.doesNotMatch(css,/left:50%/);
});
test('mobile reduces expensive gameplay panel blur without disabling graphics for desktop',()=>{
 assert.match(css,/@media \(max-width:900px\)/);
 assert.match(css,/-webkit-backdrop-filter:none!important/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.match(css,/#world \.entity\.enemy:not\(\.boss\)/);
 assert.match(html,/mobile-performance\.css\?v=20261010-perf2/);
});
test('server snapshots do not recreate unchanged portal and party HTML every tick',()=>{
 assert.match(app,/if\(el\.dataset\.portalMarkup!==portalMarkup\)/);
 assert.match(app,/if\(partyHudEl\.dataset\.partyMarkup!==partyMarkup\)/);
 assert.match(app,/if\(el\.textContent!==resourceLabel\)/);
 assert.match(app,/if\(el\.dataset\.decorKey===cacheKey\)return/);
});
