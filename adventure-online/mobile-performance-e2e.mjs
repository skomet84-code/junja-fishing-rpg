import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=48910+Math.floor(Math.random()*600),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(root,'server/online'),
 env:{...process.env,TEST_MEMORY:'1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',b=>output+=b.toString());server.stderr.on('data',b=>output+=b.toString());
let browser;
try{
 let up=false;
 for(let i=0;i<80;i++){
  try{const res=await fetch(base+'/health');if(res.ok){up=true;break;}}catch{}
  await sleep(130);
 }
 assert.ok(up,'Test server not ready '+output.slice(-400));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('#username').fill('mobileperf'+port);
 await page.locator('#password').fill('MobilePerf_2026_test123');
 await page.locator('#registerBtn').click();
 await page.locator('#selectPanel').waitFor({state:'visible',timeout:16000});
 await page.locator('#joinBtn').click();
 await page.waitForFunction(()=>window.__adventure?.snapshot()?.connected===true,{timeout:20000});
 await page.locator('#loading').waitFor({state:'hidden',timeout:10000});
 await sleep(300);
 const metrics=await page.evaluate(()=>{
  const toast=document.getElementById('toast');
  toast.textContent='EXP +20';toast.classList.add('show','combat-toast');
  const hero=document.getElementById('hero').getBoundingClientRect();
  const bubble=toast.getBoundingClientRect();
  const interW=Math.max(0,Math.min(hero.right,bubble.right)-Math.max(hero.left,bubble.left));
  const interH=Math.max(0,Math.min(hero.bottom,bubble.bottom)-Math.max(hero.top,bubble.top));
  const overlap=interW*interH/(hero.width*hero.height||1);
  const p=document.querySelector('header .profile');
  return{viewport:innerWidth,hero:[hero.left,hero.top,hero.width,hero.height],
   toast:[bubble.left,bubble.top,bubble.width,bubble.height],
   overlap,blur:getComputedStyle(p).backdropFilter,
   webkitBlur:getComputedStyle(p).webkitBackdropFilter,
   stylesheet:[...document.styleSheets].some(s=>s.href?.includes('mobile-performance.css'))};
 });
 const npcArt=await page.evaluate(()=>{
  const elder=document.querySelector('#elder .npc-art'),merchant=document.querySelector('#merchant .npc-art');
  return {
   chief:getComputedStyle(elder).backgroundImage,
   chiefPosition:getComputedStyle(elder).backgroundPosition,
   merchant:getComputedStyle(merchant).backgroundImage,
   merchantPosition:getComputedStyle(merchant).backgroundPosition,
   npcWidth:parseFloat(getComputedStyle(document.getElementById('elder')).width),
   restored:[...document.styleSheets].some(sheet=>sheet.href?.includes('npc-restore.css'))
  };
 });
 assert.ok(npcArt.restored,'Original NPC restoration stylesheet did not load');
 assert.match(npcArt.chief,/assets\\/npcs\\.png/,'Chief must render original npc illustration, not the healer class');
 assert.match(npcArt.merchant,/assets\\/npcs\\.png/,'Merchant must render original npc illustration, not the rogue class');
 assert.match(npcArt.merchantPosition,/100%/,'Merchant must use second frame in dedicated NPC atlas');
 assert.ok(npcArt.npcWidth<=80,'NPC silhouette should stay reasonably sized');
 console.log('NPC_ORIGINAL_ATLAS_OK '+JSON.stringify(npcArt));
 assert.ok(metrics.stylesheet,'The mobile performance stylesheet was not loaded');
 assert.equal(metrics.blur,'none','Mobile panel blur is still creating expensive composited layers');
 if(metrics.webkitBlur!=null)assert.equal(metrics.webkitBlur,'none','Safari webkit backdrop blur must be disabled'); // Chromium may not expose this prefixed property.
 assert.ok(metrics.toast[0]<=12&&metrics.toast[2]<=130,'EXP notification must stay a small left-side pill: '+JSON.stringify(metrics));
 assert.ok(metrics.overlap<.26,'EXP pill hides too much of the character: '+JSON.stringify(metrics));
 const mutationCount=await page.evaluate(async()=>{
  const portal=document.querySelector('.world-portal');
  if(!portal)return null;
  let count=0;const observer=new MutationObserver(ms=>{count+=ms.filter(m=>m.type==='childList').length;});
  observer.observe(portal,{childList:true,subtree:true});
  await new Promise(resolve=>setTimeout(resolve,460));
  observer.disconnect();return count;
 });
 if(mutationCount!=null)assert.equal(mutationCount,0,'Unchanged portal HTML still recreated every network tick');
 const dir=path.resolve(root,'../e2e-screenshots');
 await mkdir(dir,{recursive:true});
 await page.screenshot({path:path.join(dir,'mobile-compact-kill-toast.png')});
 await page.evaluate(()=>document.getElementById('toast').classList.remove('show','combat-toast'));
 assert.deepEqual(errors,[],'Mobile gameplay JavaScript error');
 console.log('MOBILE_PERF_E2E_OK '+JSON.stringify({...metrics,portalDomRewrites:mutationCount}));
 await page.close();
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');await sleep(100);if(server.exitCode===null)server.kill('SIGKILL');
}
