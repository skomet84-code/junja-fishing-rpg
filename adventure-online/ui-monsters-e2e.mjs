import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const home=path.dirname(fileURLToPath(import.meta.url));
const port=48200+Math.floor(Math.random()*700),base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(home,'server/online'),
 env:{...process.env,TEST_MEMORY:'1',PORT:String(port)},stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await sleep(150)}
 assert.ok(ready,'Graphics smoke server not ready');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#username').fill('freshart'+port);
 await page.locator('#password').fill('fresh_art_test_password2026');
 await page.locator('#registerBtn').click();
 await page.locator('#selectPanel').waitFor({state:'visible',timeout:16000});
 await page.locator('#joinBtn').click();
 await page.waitForFunction(()=>window.__adventure?.snapshot()?.connected===true,{timeout:20000});
 await page.locator('#loading').waitFor({state:'hidden',timeout:10000});
 await sleep(220);
 const result=await page.evaluate(async()=>{
  const hero=document.querySelector('#hero'),skills=[...document.querySelectorAll('#skillbar button')];
  const rects=skills.map(x=>x.getBoundingClientRect());
  const resource=document.querySelector('.resource');
  const textStyle=resource?getComputedStyle(resource):null;
  const samples=[];
  for(const family of ['boar','mushroom','wolf','treant']){
   const im=new Image();im.src='/assets/monster-'+family+'.svg';
   try{await im.decode();samples.push({family,ok:im.naturalWidth===160&&im.naturalHeight===128});}
   catch{samples.push({family,ok:false});}
  }
  return{heroW:parseFloat(getComputedStyle(hero).width),heroH:parseFloat(getComputedStyle(hero).height),
   skills:skills.length,largestSkillHeight:Math.max(...rects.map(r=>r.height)),
   skillCols:new Set(rects.map(r=>Math.round(r.left))).size,resourceCount:document.querySelectorAll('.resource').length,
   resourceColor:textStyle?.color,resourceBackground:textStyle?.backgroundColor,
   images:samples,scroll:document.documentElement.scrollWidth-innerWidth};
 });
 assert.equal(result.heroW,98,'Mobile sprite needs to be smaller');
 assert.equal(result.heroH,114,'Mobile sprite height needs to be smaller');
 assert.equal(result.skills,9,'Nine skills must remain visible');
 assert.equal(result.skillCols,5,'Five columns of skills must remain');
 assert.ok(result.largestSkillHeight<=47,'Mobile skill buttons should be compact');
 assert.ok(result.resourceCount>=8,'Surface has too few harvest nodes');
 assert.match(result.resourceColor||'',/rgb\(255, 251, 230\)/,'Resource labels lack contrast');
 assert.ok(result.images.every(x=>x.ok),'New family images did not decode: '+JSON.stringify(result.images));
 assert.ok(result.scroll<=2,'Mobile UI causes horizontal overflow');
 assert.deepEqual(errors,[],'Browser Javascript must remain error-free');
 const dir=path.resolve(home,'../e2e-screenshots');await mkdir(dir,{recursive:true});
 await page.screenshot({path:path.join(dir,'junja-clarity-and-monsters-390px.png')});
 console.log('JUNJA_UI_MONSTERS_E2E_OK '+JSON.stringify(result));
 await page.close();
}finally{
 await browser?.close();
 child.kill('SIGTERM');await sleep(100);if(child.exitCode===null)child.kill('SIGKILL');
}
