import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=readFileSync(path.join(dir,'app.js'),'utf8'),ui=readFileSync(path.join(dir,'index.html'),'utf8'),style=readFileSync(path.join(dir,'style.css'),'utf8');
test('damage UI is sourced from server HP delta, not locally guessed damage',()=>{assert.match(app,/e\.hp<entry\.hp/);assert.match(app,/damageNumber\(\{\.\.\.e,el:entry\.el\},entry\.hp-e\.hp\)/);});
test('auto hunt does not fake walking while player is stationary',()=>{assert.match(app,/Math\.hypot\(serverVelocity\.x,serverVelocity\.y\)>32/);assert.doesNotMatch(app,/len\|\|auto\|\|state\.navMoving\?'walk'/);});
test('mobile utility button keeps old feature buttons reachable',()=>{for(const id of ['utilityNav','utilityToggle','bagBtn','rankingBtn','adventureBtn','socialBtn','helpBtn'])assert.ok(ui.includes('id="'+id+'"'));assert.match(app,/utility\.classList\.toggle\('expanded'\)/);assert.match(style,/\.utility\.expanded/);});
test('hurt cue is only triggered by actual player HP loss',()=>{assert.match(app,/next\.hp<old\.hp/);assert.match(app,/heroDamage\(old\.hp-next\.hp\)/);});
