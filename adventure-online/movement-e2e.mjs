import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=47000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.mjs'],{
 cwd:path.resolve(root,'server/online'),env:{...process.env,TEST_MEMORY:'1',PORT:String(port)},stdio:['ignore','pipe','pipe']
});
let log='';server.stdout.on('data',x=>log+=String(x));server.stderr.on('data',x=>log+=String(x));
let browser;
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}
  if(server.exitCode!==null)throw Error('movement test server closed: '+log);
  await sleep(130);
 }
 assert.ok(ready,'movement test server did not start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#username').fill('movetest'+port);
 await page.locator('#password').fill('Movement-test-pass-2026!');
 await page.locator('#registerBtn').click();
 await page.locator('#selectPanel').waitFor({state:'visible',timeout:20000});
 await page.locator('#joinBtn').click();
 await page.waitForFunction(()=>window.__adventure?.snapshot()?.connected===true,{timeout:25000});
 await page.locator('#loading').waitFor({state:'hidden',timeout:12000});
 await page.locator('#viewport').focus();

 const stream=page.evaluate(()=>new Promise(resolve=>{
  const entries=[],start=performance.now();
  function take(timestamp){
   const hero=document.querySelector('#hero');
   const point=/translate3d\(([-\d.]+)px,([-\d.]+)px/.exec(hero.style.transform);
   if(point)entries.push({t:timestamp-start,x:Number(point[1]),y:Number(point[2]),motion:hero.dataset.motion});
   if(timestamp-start<1150)requestAnimationFrame(take);
   else resolve(entries);
  }
  requestAnimationFrame(take);
 }));
 await sleep(110);
 await page.keyboard.down('ArrowRight');
 await sleep(730);
 await page.keyboard.up('ArrowRight');
 const entries=await stream;
 await sleep(250);
 assert.ok(entries.length>=28,'animation frames failed to render regularly');
 const xs=entries.map(x=>x.x),travel=Math.max(...xs)-Math.min(...xs);
 const framesWalking=entries.filter(x=>x.motion==='walk').length;
 assert.ok(travel>55,'input failed to move the character: '+JSON.stringify({travel,entries:entries.slice(0,5)}));
 assert.ok(framesWalking>=8,'walking animation did not follow actual travel: '+framesWalking);
 const jumps=xs.slice(1).map((x,i)=>Math.abs(x-xs[i]));
 assert.ok(Math.max(...jumps)<45,'position jumped between frames: '+Math.max(...jumps));
 const distanceBack=entries[entries.length-1].x-Math.max(...xs);
 assert.ok(distanceBack>-85,'server correction dragged the player sharply backward');
 const final=await page.evaluate(()=>({server:window.__adventure.snapshot().x,render:parseFloat((/translate3d\(([-\d.]+)px/.exec(document.querySelector('#hero').style.transform)||[])[1])}));
 assert.ok(Math.abs(final.server-final.render)<80,'visual position diverged from authoritative server: '+JSON.stringify(final));
 assert.deepEqual(errors,[],'browser errors in mobile motion loop');
 const folder=path.resolve(root,'../e2e-screenshots');await mkdir(folder,{recursive:true});
 await page.screenshot({path:path.join(folder,'junja-motion-mobile.png')});
 console.log('JUNJA_MOTION_E2E_OK '+JSON.stringify({travel:Math.round(travel),frames:entries.length,framesWalking,maxJump:Math.round(Math.max(...jumps)),serverDelta:Math.round(final.server-final.render)}));
 await page.close();
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
 await sleep(100);
 if(server.exitCode===null)server.kill('SIGKILL');
}
