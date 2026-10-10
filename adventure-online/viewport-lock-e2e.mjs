import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';

const home=path.dirname(fileURLToPath(import.meta.url)),port=49300+Math.floor(Math.random()*600);
const base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(home,'server/online'),env:{...process.env,TEST_MEMORY:'1',PORT:String(port)},stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<70;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await sleep(140)}
 assert.ok(ready,'viewport test server failed');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [320,360,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#loading').evaluate(el=>el.hidden=true);
  await page.evaluate(()=>{
   const bar=document.querySelector('#skillbar');bar.replaceChildren();
   for(let i=0;i<9;i++){
    const button=document.createElement('button');button.innerHTML='<b>궁극 스킬 '+(i+1)+'</b><small>준비 · 쿨 14초</small>';bar.append(button);
   }
   document.querySelector('#playerName').textContent='갓준자';
   document.querySelector('#level').textContent='Lv.1500 검투사 · 1차 · 정복 0';
   document.querySelector('#gold').textContent='108,191,426 G';
  });
  const data=await page.evaluate(()=>{
   const r=e=>{const {left,right,top,bottom,width,height}=document.querySelector(e).getBoundingClientRect();return {left,right,top,bottom,width,height}};
   const inside=rect=>rect.left>=-1&&rect.right<=innerWidth+1;
   const skills=[...document.querySelectorAll('#skillbar button')].map(e=>{const {left,right}=e.getBoundingClientRect();return {left,right}});
   const gesture=new Event('gesturestart',{bubbles:true,cancelable:true});
   document.querySelector('#game').dispatchEvent(gesture);
   const singleTouch=new Event('touchmove',{bubbles:true,cancelable:true});
   Object.defineProperty(singleTouch,'touches',{value:[{}]});
   document.querySelector('#viewport').dispatchEvent(singleTouch);
   const pinch=new Event('touchmove',{bubbles:true,cancelable:true});
   Object.defineProperty(pinch,'touches',{value:[{},{}]});
   document.querySelector('#viewport').dispatchEvent(pinch);
   return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,game:r('#game'),profile:r('header .profile'),zone:r('header .zone'),skillbar:r('#skillbar'),skills,
    inputs:[...document.querySelectorAll('#username,#password,#channelInput')].map(x=>parseFloat(getComputedStyle(x).fontSize)),scale:visualViewport?.scale||1,
    gestureBlocked:gesture.defaultPrevented,pinchBlocked:pinch.defaultPrevented,singleBlocked:singleTouch.defaultPrevented,
    allInside:[r('#game'),r('header .profile'),r('header .zone'),r('#skillbar')].every(inside),
    meta:document.querySelector('meta[name=viewport]')?.content};
  });
  assert.ok(data.meta.includes('maximum-scale=1'),'missing viewport scale cap');
  assert.ok(data.allInside,'A HUD panel is clipped at '+width+'px: '+JSON.stringify(data));
  assert.ok(data.skills.length===9&&data.skills.every(x=>x.left>=-1&&x.right<=width+1),'Nine skill buttons clipped at '+width);
  assert.ok(data.documentWidth<=width+2,'Unexpected horizontal scroll '+width);
  assert.ok(data.inputs.every(size=>size>=16),'iPhone input focus can cause automatic page zoom');
  assert.ok(data.gestureBlocked&&data.pinchBlocked&&!data.singleBlocked,'pinch must be blocked but single touches should work');
  assert.deepEqual(errors,[],'Uncaught browser errors');
  console.log('IOS_VIEWPORT_LOCK_OK',JSON.stringify({width,profile:data.profile,zone:data.zone,skillbar:data.skillbar}));
  await page.close();
 }
}finally{await browser?.close();server.kill('SIGTERM');await sleep(100);if(server.exitCode===null)server.kill('SIGKILL')}
