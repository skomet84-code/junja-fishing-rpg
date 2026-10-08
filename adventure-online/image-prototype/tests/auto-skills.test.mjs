import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('mobile skill input preserves auto hunt and asks server to queue',()=>{
 assert.match(app,/keepAuto:true/);
 assert.doesNotMatch(app,/if\(skill>=0&&auto\)\{auto=false/);
 assert.match(app,/const queued=auto\?\(state\.autoSkillQueue/);
 assert.match(app,/const on=!auto;auto=on;state\.auto=on/);
});
test('tapping a monster preserves automatic hunt and changes only target priority',()=>{
 assert.match(app,/if\(auto\)\{command\(\{type:'autoTarget',target:e\.id\}\)/);
});
