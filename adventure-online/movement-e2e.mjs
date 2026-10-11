import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

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
 const webkitMode=process.env.BROWSER_ENGINE==='webkit';
 browser=await (webkitMode?webkit:chromium).launch({headless:true,...(webkitMode?{}:{args:['--no-sandbox']})});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(process.env.BROWSER_ENGINE==='webkit'){
  const baseline=await page.evaluate(()=>new Promise(resolve=>{
   const start=performance.now();let count=0,active=true;
   function next(){if(!active)return;count++;requestAnimationFrame(next);}
   requestAnimationFrame(next);
   setTimeout(()=>{active=false;resolve({frames:count,hidden:document.hidden,visibility:document.visibilityState,elapsed:performance.now()-start});},1350);
  }));
  console.log('WEBKIT_BLANK_PAGE_RAF '+JSON.stringify(baseline));
 }
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#username').fill('movetest'+port);
 await page.locator('#password').fill('Movement-test-pass-2026!');
 await page.locator('#registerBtn').click();
 await page.locator('#selectPanel').waitFor({state:'visible',timeout:20000});
 await page.locator('#joinBtn').click();
 await page.waitForFunction(()=>window.__adventure?.snapshot()?.connected===true,{timeout:25000});
 await page.locator('#loading').waitFor({state:'hidden',timeout:12000});
 await page.locator('#viewport').focus();
 if(process.env.BROWSER_ENGINE==='webkit'){
  async function probe(label){
   const values=await page.evaluate(()=>new Promise(resolve=>{
    let count=0,active=true;const t=performance.now();
    const next=()=>{if(!active)return;count++;requestAnimationFrame(next);};
    requestAnimationFrame(next);
    setTimeout(()=>{active=false;resolve({frames:count,elapsed:Math.round(performance.now()-t),hidden:document.hidden,visible:document.visibilityState});},1250);
   }));
   console.log('WEBKIT_GAME_PROBE '+JSON.stringify({label,...values}));
   return values;
  }
  await probe('original-game');
  const low=await page.addStyleTag({content:'#world *,#effects *,#game .entity,#game .entity *{animation:none!important;transition:none!important;filter:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'});
  await probe('effects-disabled');
  const hidden=await page.addStyleTag({content:'#world{visibility:hidden!important}'});
  await probe('world-hidden');
  await hidden.evaluate(el=>el.remove());await low.evaluate(el=>el.remove());
 }

 const stream=page.evaluate(()=>new Promise(resolve=>{
  const entries=[],start=performance.now();
  function take(timestamp){
   const hero=document.querySelector('#hero');
   const point=/translate3d\(\s*([-\d.]+)px,\s*([-\d.]+)px/.exec(hero.style.transform);
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
 console.log('MOTION_FRAME_DIAGNOSTIC '+JSON.stringify({frames:entries.length,span:entries.length?entries.at(-1).t-entries[0].t:0,xStart:entries[0]?.x,xEnd:entries.at(-1)?.x,walkFrames:entries.filter(x=>x.motion==='walk').length}));
 console.log('MOTION_TRANSFORM_DIAGNOSTIC '+await page.locator('#hero').evaluate(el=>el.style.transform));
 assert.ok(entries.length>=14,'animation frames failed to render regularly: '+entries.length);
 const xs=entries.map(x=>x.x),travel=Math.max(...xs)-Math.min(...xs);
 const framesWalking=entries.filter(x=>x.motion==='walk').length;
 assert.ok(travel>55,'input failed to move the character: '+JSON.stringify({travel,entries:entries.slice(0,5)}));
 assert.ok(framesWalking>=8,'walking animation did not follow actual travel: '+framesWalking);
 const jumps=xs.slice(1).map((x,i)=>Math.abs(x-xs[i]));
 assert.ok(Math.max(...jumps)<45,'position jumped between frames: '+Math.max(...jumps));
 const distanceBack=entries[entries.length-1].x-Math.max(...xs);
 assert.ok(distanceBack>-85,'server correction dragged the player sharply backward');
 const final=await page.evaluate(()=>({server:window.__adventure.snapshot().x,render:parseFloat((/translate3d\(\s*([-\d.]+)px/.exec(document.querySelector('#hero').style.transform)||[])[1])}));
 assert.ok(Math.abs(final.server-final.render)<80,'visual position diverged from authoritative server: '+JSON.stringify(final));
 // Real mobile gesture regression: drag-release should navigate to the
 // RELEASE coordinates (not stick steering, not the original touch point).
 const actionRecords=[];
 await page.route('**/api/action',async route=>{
  try { const action=JSON.parse(route.request().postData()||'{}');actionRecords.push(action); }catch{}
  await route.continue();
 });
 const viewportRect=await page.locator('#viewport').boundingBox();
 assert.ok(viewportRect?.width>100&&viewportRect?.height>100,'game field has usable touch size');
 const sx=viewportRect.x+viewportRect.width*.39,sy=viewportRect.y+viewportRect.height*.47;
 const ex=viewportRect.x+viewportRect.width*.68,ey=viewportRect.y+viewportRect.height*.54;
 await page.mouse.move(sx,sy);await page.mouse.down();
 await page.mouse.move(ex,ey,{steps:12});await page.mouse.up();
 await sleep(950);
 const afterDrag=await page.evaluate(()=>({joystickHidden:document.querySelector('#joystick').hidden,hero:document.querySelector('#hero').dataset.motion}));
 assert.equal(afterDrag.joystickHidden,true,'touch drag must not show virtual joystick');
 assert.ok(actionRecords.some(a=>a.type==='navigate'),'release should request real server navigation: '+JSON.stringify(actionRecords.slice(0,8)));
 assert.ok(!actionRecords.some(a=>a.type==='move'&&a.manual),'gesture must not turn into manual joystick movement');
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
