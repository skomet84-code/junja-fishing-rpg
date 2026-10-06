import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {chromium,webkit}=require('playwright');
import assert from 'node:assert/strict';import fs from 'node:fs';
const url=process.env.ADVENTURE_URL||'http://127.0.0.1:4173';fs.mkdirSync('artifacts',{recursive:true});
for(const [name,type,viewport] of [['desktop',chromium,{width:1280,height:800}],['iphone',webkit,{width:390,height:844}],['android',chromium,{width:412,height:915}],['landscape',webkit,{width:844,height:390}]]){
 const browser=await type.launch({headless:true});const context=await browser.newContext({viewport,isMobile:name!=='desktop',hasTouch:name!=='desktop'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForSelector('#loading',{state:'hidden'});await page.screenshot({path:`artifacts/${name}-village.png`});assert.equal(errors.length,0,errors.join(','));
 if(await page.locator('#quest').evaluate(e=>e.classList.contains('collapsed')))await page.click('#questToggle');await page.click('#questAction');await page.waitForSelector('#modal:not([hidden])',{timeout:15000});await page.getByRole('button',{name:'임무 수락',exact:true}).click();assert.equal(await page.evaluate(()=>__adventure.snapshot().quest),'active');
 if(await page.locator('#quest').evaluate(e=>e.classList.contains('collapsed')))await page.click('#questToggle');await page.click('#questAction');await page.waitForFunction(()=>__adventure.snapshot().y>670,{timeout:15000});await page.click('#autoBtn');await page.waitForFunction(()=>__adventure.snapshot().kills>=1,{timeout:20000});await page.screenshot({path:`artifacts/${name}-forest.png`});
 if(name==='desktop'){
  const snapshot=()=>page.evaluate(()=>__adventure.snapshot());
  for(let i=0;i<160&&(await snapshot()).quest==='active';i++){
   let s=await snapshot();if(s.hp<60&&s.potions>0)await page.click('#potionBtn');
   if(s.y<590){await page.click('#questAction');await page.waitForFunction(()=>__adventure.snapshot().y>670);if(!(await snapshot()).auto)await page.click('#autoBtn');}
   await page.waitForTimeout(500);
  }
  assert.equal((await snapshot()).quest,'ready');await page.click('#questAction');await page.waitForSelector('#modal:not([hidden])');await page.getByRole('button',{name:'보상 받기',exact:true}).click();
  await page.click('#questAction');await page.waitForSelector('#modal:not([hidden])');await page.getByRole('button',{name:'보스 임무 수락',exact:true}).click();await page.click('#questAction');
  for(let i=0;i<120&&(await snapshot()).quest==='bossActive';i++){
   let s=await snapshot();if(s.hp<70&&s.potions>0)await page.click('#potionBtn');
   if(s.y<590){await page.click('#questAction');await page.waitForFunction(()=>__adventure.snapshot().y>650);}
   if(await page.locator('#attackBtn').isEnabled())await page.click('#attackBtn');
   if(await page.locator('#skillBtn').isEnabled())await page.click('#skillBtn');
   await page.waitForTimeout(450);
  }
  assert.equal((await snapshot()).quest,'bossReady');await page.click('#questAction');await page.waitForSelector('#modal:not([hidden])');await page.getByRole('button',{name:'보상 받기',exact:true}).click();assert.equal((await snapshot()).weapon,1);assert.equal((await snapshot()).quest,'done');await page.screenshot({path:'artifacts/desktop-complete.png'});
 }
 await page.click('#bagBtn');assert.ok(await page.locator('#modalBody').textContent());await page.click('#modalClose');await page.click('#homeBtn');await page.waitForTimeout(100);const before=await page.evaluate(()=>__adventure.snapshot());await page.reload();await page.waitForSelector('#loading',{state:'hidden'});const after=await page.evaluate(()=>__adventure.snapshot());assert.equal(after.kills,before.kills);assert.equal(after.quest,before.quest);assert.equal(after.gold,before.gold);assert.equal(errors.length,0,errors.join(','));
 console.log(name,'PASS',JSON.stringify({level:after.level,kills:after.kills,quest:after.quest,errors}));await browser.close();
}
