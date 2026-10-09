import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {chromium} from 'playwright';

const base='https://junja-adventure-online-production.up.railway.app';
const screenshotDir=path.resolve('e2e-screenshots','railway-phase2');
await fs.mkdir(screenshotDir,{recursive:true});
const nonce=randomBytes(4).toString('hex');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});

async function assetCheck(){
 const resources=['/visual-phase2.css','/visual-phase2.js','/visual-overhaul.css','/style.css','/app.js',
  '/assets/hero-motion.webp','/assets/rogue-motion.webp','/assets/mage-motion.webp','/assets/healer-motion.webp'];
 for(const resource of resources){
  const response=await fetch(base+resource,{method:'HEAD',signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,'Railway Phase 2 resource missing: '+resource);
  const type=response.headers.get('content-type')||'';
  if(resource.endsWith('.webp'))assert.match(type,/image\/webp/,'Invalid motion sprite: '+resource);
  else if(resource.endsWith('.css'))assert.match(type,/text\/css/,'Invalid stylesheet: '+resource);
  else if(resource.endsWith('.js'))assert.match(type,/(javascript|text\/plain)/,'Invalid script: '+resource);
 }
 const health=await (await fetch(base+'/health')).json();
 assert.ok(health.ok&&health.storage==='postgres','Must not run graphics test on an unpersisted fallback');
 console.log('RAILWAY_PHASE2_ASSETS_OK '+resources.length+' resources');
}
await assetCheck();

const errors=[];
try{
 for(const [index,width] of [360,390,430,1280].entries()){
  const mobile=width<600;
  const context=await browser.newContext({viewport:{width,height:mobile?844:800},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  const jsErrors=[];
  page.on('pageerror',error=>jsErrors.push(error.message));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:35000});
   const username='g2'+nonce+index, password='graphics_recovery_'+nonce+'_'+index;
   await page.locator('#username').fill(username);
   await page.locator('#password').fill(password);
   await page.locator('#registerBtn').click();
   await page.locator('#selectPanel').waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('.character-card').count(),4,'All four classes must exist');
   await page.locator('.character-card').nth(index).click();
   await page.locator('#joinBtn').click();
   await page.waitForFunction(()=>window.__adventure?.snapshot()?.connected===true,{timeout:22000});
   await page.locator('#loading').waitFor({state:'hidden',timeout:12000});
   const display=await page.evaluate(async()=>{
    const el=document.querySelector('#heroArt');
    const hero=document.querySelector('#hero');
    const skills=[...document.querySelectorAll('#skillbar button')];
    const panel=document.querySelector('#fieldShortcuts');
    const sheet=[...document.styleSheets].find(s=>s.href?.includes('visual-phase2.css'));
    const imgUrl=getComputedStyle(el).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    const img=new Image();
    let loaded=false;
    if(imgUrl){img.src=imgUrl;try{await img.decode();loaded=true;}catch{}}
    const grid=getComputedStyle(document.querySelector('#skillbar')).gridTemplateColumns.split(' ').filter(Boolean).length;
    return {
     sheet:!!sheet,loaded,asset:imgUrl?.split('/').pop()||null,
     hero:{w:hero.getBoundingClientRect().width,h:hero.getBoundingClientRect().height,
       cssW:parseFloat(getComputedStyle(hero).width),cssH:parseFloat(getComputedStyle(hero).height),
       visible:getComputedStyle(hero).visibility},
     skills:skills.length,columns:grid,rows:new Set(skills.map(x=>Math.round(x.getBoundingClientRect().top))).size,
     overflow:document.documentElement.scrollWidth-innerWidth,
     mobileDock:getComputedStyle(panel).display,
     player:window.__adventure?.snapshot()?.connected===true,
     cdown:!!skills[0]?.dataset.slot,
    };
   });
   assert.ok(display.sheet,'Phase-two CSS not loaded on live Railway service');
   assert.ok(display.loaded,'Selected class hero image did not load: '+JSON.stringify(display));
   assert.ok(display.asset?.includes('-motion.webp'),'Motion WebP sheet must be used, not static fallback: '+JSON.stringify(display));
   assert.ok(display.hero.w>40&&display.hero.h>50&&display.hero.visible!=='hidden','Character is invisible');
   const expected=width<390?{w:90,h:105}:width<900?{w:98,h:114}:{w:104,h:121};
   assert.equal(display.hero.cssW,expected.w,'Protagonist is oversized at '+width+'px');
   assert.equal(display.hero.cssH,expected.h,'Protagonist height is oversized at '+width+'px');
   assert.equal(display.skills,9,'9 skill buttons must remain available');
   assert.ok(display.overflow<=2,'Mobile horizontal overflow: '+JSON.stringify(display));
   assert.ok(display.cdown,'Skill inputs not bound to their live slots');
   if(mobile){
    assert.equal(display.columns,5,'Mobile 5-column 2-row skill HUD changed');
    assert.equal(display.rows,2,'Mobile skills should occupy two rows');
    assert.notEqual(display.mobileDock,'none','Mobile shortcut dock must be visible');
    await page.locator('#minimapToggle').click();
    assert.equal(await page.locator('#minimapToggle').getAttribute('aria-expanded'),'true');
    await page.locator('#minimapToggle').click();
    await page.locator('#visualMenuToggle').click();
    assert.equal(await page.locator('#visualMenuToggle').getAttribute('aria-expanded'),'true');
    await page.locator('#visualMenuToggle').click();
   }else{
    assert.equal(display.mobileDock,'none','Desktop should not show mobile shortcuts');
   }
   const name=['warrior','rogue','mage','healer'][index];
   await page.screenshot({path:path.join(screenshotDir, (mobile?'mobile-'+width:'desktop')+'-'+name+'.png')});
   assert.deepEqual(jsErrors,[],'Browser JavaScript failures at viewport '+width);
   console.log('RAILWAY_PHASE2_LIVE_OK '+width+'px class='+name+' graphics='+display.asset+' skills='+display.skills+' rows='+display.rows);
  }finally{await context.close();}
 }
}finally{await browser.close();}
console.log('RAILWAY_PHASE2_4_CLASSES_MOBILE_DESKTOP_OK');
