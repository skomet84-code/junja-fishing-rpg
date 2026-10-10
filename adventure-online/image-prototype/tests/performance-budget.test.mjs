import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8'),network=fs.readFileSync(new URL('../network.js',import.meta.url),'utf8');
test('performance mode is gated to mobile, combat field and two sustained slow windows',()=>{
 assert.match(app,/mobileFrames&&state\.zone!=='surface'/);
 assert.match(app,/perfSlowWindows>=2/);
 assert.match(app,/perfElapsed>=3000/);
 assert.match(app,/!document\.hidden/);
});
test('actual character graphics remain; only mobile procedural terrain is simplified',()=>{
 assert.match(css,/#game\.mobile-lite #world:not\(\[data-zone="surface"\]\) \.region-terrain/);
 assert.doesNotMatch(css,/#game\.mobile-lite[\s\S]*?\.entity\.hero\s*\{\s*display:none/);
});
test('network microtask painting no longer schedules every 100ms snapshot',()=>{
 assert.match(network,/lastPaintKey!==uiKey\|\|npcModal/);
 assert.match(network,/if\(b\.title!==label\)/);
});
test('optional one-touch performance diagnostics are available without cluttering normal users',()=>{
 assert.match(app,/searchParams\.get\('perf'\)==='1'/);
 assert.match(app,/performance:\(\)=>\(\{fps:perfFps/);
});
