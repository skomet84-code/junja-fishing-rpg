import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../ios-viewport-lock.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../ios-viewport-lock.js',import.meta.url),'utf8');
test('iOS fixed viewport is loaded after mobile theme and new scripts are cache busted',()=>{
 assert.match(html,/name="viewport" content="[^"]*width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover/);
 assert.ok(html.indexOf('ios-viewport-lock.css')>html.indexOf('ios-field-stability.css'));
 assert.match(html,/ios-viewport-lock\.js\?v=20261010-fit1/);
});
test('UI remains locked into device viewport; inputs do not auto zoom when focused',()=>{
 assert.match(css,/#game\{[\s\S]*?position:fixed!important;inset:0!important/);
 assert.match(css,/#skillbar\{[\s\S]*?max-width:calc\(100% - 12px\)!important/);
 assert.match(css,/input:not\(\[type="checkbox"\]\),textarea,select\{\s*font-size:16px!important/);
});
test('zoom guard blocks two fingers, but does not intercept single pointer map movement',()=>{
 assert.match(js,/event\.touches\?\.length>1/);
 assert.match(js,/gesturestart/);
 assert.doesNotMatch(js,/touchstart/);
 assert.doesNotMatch(js,/pointermove/);
});
