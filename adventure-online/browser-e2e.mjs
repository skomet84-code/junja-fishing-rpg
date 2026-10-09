import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const root=path.dirname(fileURLToPath(import.meta.url)),port=43800+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const screens=path.resolve(root,'../e2e-screenshots');
await mkdir(screens,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(root,'server/online'),env:{...process.env,TEST_MEMORY:'1',PORT:String(port),OPERATOR_USERNAMES:'admin'},stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',b=>output+=String(b));server.stderr.on('data',b=>output+=String(b));
let browser;
try{
 let ready=false;
 for(let i=0;i<110;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw Error('Server terminated: '+output);await sleep(120);}
 assert.ok(ready,'Game server did not start: '+output);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const viewport of [{label:'mobile',width:390,height:844},{label:'desktop',width:1280,height:800}]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,isMobile:viewport.label==='mobile',hasTouch:viewport.label==='mobile'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push('pageerror: '+error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());});
  page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('favicon.ico'))errors.push('HTTP '+response.status()+' '+response.url());});
  try{
   await page.route('**/api/register',async route=>{
    const data=route.request().postDataJSON();data.legacy={level:20,gold:5000,potions:10};
    await route.continue({postData:JSON.stringify(data)});
   });
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.locator('#username').fill(viewport.label==='mobile'?'admin':'qauser');
   await page.locator('#password').fill('playwright-test-pass-99');
   await page.locator('#registerBtn').click();
   await page.locator('#selectPanel').waitFor({state:'visible',timeout:25000});
   assert.equal(await page.locator('.character-card').count(),4,'Must show 4 character choices');
   await page.screenshot({path:path.join(screens,viewport.label+'-selection.png')});
   await page.locator('#joinBtn').click();
   await page.waitForFunction(()=>window.__adventure?.snapshot()?.connected===true,{timeout:25000});
   await page.locator('#loading').waitFor({state:'hidden',timeout:12000});
   assert.equal(await page.locator('#skillbar button').count(),9,'Nine skills must be visible');
   const visual=await page.evaluate(async()=>{
    const a=document.querySelector('#heroArt'),hero=document.querySelector('#hero'),skills=[...document.querySelectorAll('#skillbar button')],grid=getComputedStyle(document.querySelector('#skillbar'));
    const bg=getComputedStyle(a).backgroundImage;const match=bg.match(/url\(["']?([^"')]+)["']?\)/),url=match?.[1];
    let asset={url,loaded:false,width:0,height:0};
    if(url){const img=new Image();img.src=url;try{await img.decode();asset={url,loaded:true,width:img.naturalWidth,height:img.naturalHeight};}catch{}}
    const bounds=hero.getBoundingClientRect();return {asset,hero:{width:bounds.width,height:bounds.height,display:getComputedStyle(hero).display,visibility:getComputedStyle(hero).visibility},grid:getComputedStyle(document.querySelector('#skillbar')).gridTemplateColumns,columns:grid.gridTemplateColumns.split(' ').filter(Boolean).length,rows:skills.map(el=>Math.round(el.getBoundingClientRect().top)),toggle:getComputedStyle(document.querySelector('#minimapToggle')).display};
   });
   assert.ok(visual.asset.loaded,'Hero sprite asset must decode successfully: '+JSON.stringify(visual));
   assert.ok(visual.hero.width>40&&visual.hero.height>50&&visual.hero.visibility!=='hidden','Hero must be renderable');
   if(viewport.label==='mobile')assert.equal(visual.columns,5,'Runtime mobile skill grid should use five columns: '+JSON.stringify(visual));
   else assert.ok(visual.columns>=1,'Desktop skill layout should have a valid computed style: '+JSON.stringify(visual));
   if(viewport.label==='mobile'){
    assert.ok(new Set(visual.rows).size===2,'Nine skills must occupy two rows: '+JSON.stringify(visual.rows));
    await page.locator('#minimapToggle').click();
    assert.equal(await page.locator('#minimapToggle').getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#minimap').isVisible(),true);
    await page.locator('#minimapToggle').click();
    await page.locator('#visualMenuToggle').click();
    assert.equal(await page.locator('#visualMenuToggle').getAttribute('aria-expanded'),'true');
    await page.locator('#bagBtn').waitFor({state:'visible',timeout:3500});
    await page.locator('#visualMenuToggle').click();
   }
   // Mobile and desktop: all cards selectable at the matching player level.
   if(viewport.label==='mobile')await page.locator('#visualMenuToggle').click();
   await page.locator('#adventureBtn').click();
   assert.equal(await page.locator('[data-map-travel]').count(),17,'Existing 11 maps plus 6 creator-ascension maps must appear');
    assert.equal(await page.locator('#modalActions').getByRole('button',{name:'1차 전직 시련'}).count(),1,'Map dialog must not hardcode completed 5~6 chapters');
    assert.equal(await page.locator('[data-map-travel="astral"]').isDisabled(),true,'new maps must honor level gates');
   assert.equal(await page.locator('[data-map-travel="cave"]').isDisabled(),true);
   await page.locator('[data-map-travel="grove"]').click();
   await page.waitForFunction(()=>window.__adventure?.snapshot()?.zone==='grove',{timeout:10000});
   await page.locator(viewport.label==='mobile'?'#fieldShortcuts [data-forward="adventureBtn"]':'#adventureBtn').click();
   await page.locator('[data-map-travel="surface"]').click();
   await page.waitForFunction(()=>window.__adventure?.snapshot()?.zone==='surface',{timeout:10000});
   await page.screenshot({path:path.join(screens,viewport.label+'-map-travel.png')});
   if(viewport.label==='mobile')assert.equal(await page.locator('#visualMenuToggle').getAttribute('aria-expanded'),'false','Map action should auto-collapse mobile utility menu');
   await page.screenshot({path:path.join(screens,viewport.label+'-game.png')});
   await page.evaluate(()=>{window.__warriorFxObserved=false;const effects=document.querySelector('#effects');window.__warriorFxObserver=new MutationObserver(changes=>{for(const c of changes)for(const el of c.addedNodes){if(el?.nodeType===1&&(el.classList?.contains('warrior-technique')||el.querySelector?.('.warrior-technique')))window.__warriorFxObserved=true;}});window.__warriorFxObserver.observe(effects,{childList:true});});
   await page.locator('#autoBtn').click();
   await page.waitForFunction(()=>window.__adventure?.snapshot()?.auto===true,{timeout:10000});
   try{
    await page.waitForFunction(()=>window.__adventure?.snapshot()?.cooldowns?.some(c=>c>0),null,{timeout:9000});
   }catch(error){
    const diag=await page.evaluate(()=>{
     const s=window.__adventure?.snapshot?.();return {self:s?{level:s.level,job:s.job,auto:s.auto,x:s.x,y:s.y,zone:s.zone,hp:s.hp,mp:s.mp,autoTarget:s.autoTarget,cooldowns:s.cooldowns,attackSkill:s.attackSkill,nextAttack:s.nextAttack,connected:s.connected}:null,enemies:s?.enemies?.slice(0,8)};
    });
    await page.screenshot({path:path.join(screens,viewport.label+'-autohunt-failure.png')});
    console.error('AUTO-HUNT_DIAGNOSTICS '+JSON.stringify({viewport:viewport.label,diag,errors,serverLog:output.slice(-4000)}));
    throw error;
   }
   await page.waitForFunction(()=>window.__warriorFxObserved===true,null,{timeout:10000});
   const before=await page.evaluate(()=>({auto:window.__adventure.snapshot().auto,cooldowns:window.__adventure.snapshot().cooldowns,job:window.__adventure.snapshot().job,level:window.__adventure.snapshot().level}));
   assert.equal(before.auto,true);
   await page.locator('#skill0').click();
   await sleep(450);
   const after=await page.evaluate(()=>({auto:window.__adventure.snapshot().auto,queued:window.__adventure.snapshot().autoSkillQueue,skill:getComputedStyle(document.querySelector('#skill0')).opacity}));
   assert.equal(after.auto,true,'Tapping skill during autohunt cannot disable autohunt');
   await page.screenshot({path:path.join(screens,viewport.label+'-autohunt.png')});
   assert.deepEqual(errors,[],'No browser errors or failed assets');
   console.log('E2E PASS '+viewport.label+' '+JSON.stringify({visual,before,after}));
  }finally{await context.close();}
 }
}finally{if(browser)await browser.close();server.kill('SIGTERM');await sleep(300);if(server.exitCode===null)server.kill('SIGKILL');}
