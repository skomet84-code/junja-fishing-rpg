import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';
const base='http://127.0.0.1:4173/adventure-online/image-prototype/';
const browser=await chromium.launch({headless:true});
const artifacts=path.resolve(import.meta.dirname,'../../artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const overlap=(a,b)=>a.x<b.x+b.width-2&&a.x+a.width>b.x+2&&a.y<b.y+b.height-2&&a.y+a.height>b.y+2;
try{
 for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#fieldShortcuts');
  await page.waitForFunction(()=>!!document.querySelector('link[href*="visual-phase2.css"]') && document.querySelector('#fieldShortcuts [data-forward="adventureBtn"] span')?.textContent==='이동');
  await page.evaluate(()=>{
    document.querySelector('#loading').hidden=true;
    const quest=document.querySelector('#quest');quest.classList.add('collapsed');
    document.querySelector('#questTitle').textContent='8차 전직 · 10장 · 천국의 맹세';
    document.querySelector('#level').textContent='Lv.752 성운암제 · 7차 · 정복 9';
    document.querySelector('#gold').textContent='64,218,827 G';
    const skills=document.querySelector('#skillbar');
    skills.replaceChildren();
    const jobs=['hit','area','hit','guard','area','drain','heal','burst','move'];
    for(let i=0;i<9;i++){
      const btn=document.createElement('button');
      btn.id='skill'+i;btn.dataset.slot=String(i+1);btn.dataset.kind=jobs[i];
      btn.dataset.cooldown=i===2?'active':'ready';
      btn.style.setProperty('--cd-pct','65%');
      btn.innerHTML='<b>전투 스킬 '+(i+1)+'</b><small>'+(i===2?'쿨 8.5초':'준비 · 쿨 14초')+'</small>';
      skills.append(btn);
    }
  });
  const r=await page.evaluate(()=>{
    const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
    const bar=document.querySelector('#skillbar');
    return{
      dock:rect('#fieldShortcuts'),actions:rect('nav.actions'),skillbar:rect('#skillbar'),
      screen:{width:innerWidth,height:innerHeight},
      count:bar.children.length,columns:getComputedStyle(bar).gridTemplateColumns.split(' ').filter(Boolean).length,
      heroWidth:parseFloat(getComputedStyle(document.querySelector('#hero')).width),
      mapLabel:document.querySelector('#minimapToggle').textContent,
      stylesheet:[...document.styleSheets].some(s=>s.href?.includes('visual-phase2.css')),
      readyBorder:getComputedStyle(bar.children[0]).borderTopColor,
      cooldownImage:getComputedStyle(bar.children[2],'::after').backgroundImage,
      overflow:document.documentElement.scrollWidth-innerWidth,
      cssQuest:getComputedStyle(document.querySelector('#quest')).maxHeight
    };
  });
  assert.equal(r.count,9,'All nine skills remain accessible');
  assert.equal(r.columns,5,'Five skill columns produce two rows');
  assert.equal(r.heroWidth,width<390?90:98,'phase 2 protagonist stays compact on mobile without altering world coordinates');
  assert.ok(!overlap(r.dock,r.actions),'Dock and combat actions must not overlap');
  assert.ok(!overlap(r.skillbar,r.actions),'Nine-skill ribbon must sit above action row');
  assert.ok(!overlap(r.skillbar,r.dock),'Nine-skill ribbon must sit above shortcuts');
  assert.ok(r.overflow<=2,'Never allow horizontal scrolling');
  assert.equal(r.mapLabel,'미니맵 +','Distinguish minimap from world travel');
  assert.ok(r.stylesheet,'Phase-two stylesheet must load');
  assert.match(r.cooldownImage,/linear-gradient/,'Server cooldown percentage drives shaded overlay');
  await page.locator('#visualMenuToggle').click();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#utilityNav')).visibility==='visible');
  await page.locator('#visualMenuToggle').click();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#utilityNav')).visibility==='hidden');
  if(width===390){
    await page.screenshot({path:path.join(artifacts,'junja-phase2-mobile.png'),fullPage:true});
    console.log('PHASE2_SCREENSHOT_B64:'+(await page.screenshot({type:'jpeg',quality:46})).toString('base64'));
  }
  assert.deepEqual(errors.filter(e=>e.includes('visual-phase2')),[],'No phase-two visual Javascript errors');
  console.log('PHASE2_PASS viewport='+width+' columns='+r.columns+' actor='+r.heroWidth+'px');
  await page.close();
 }
 const wide=await browser.newPage({viewport:{width:1280,height:800}});
 await wide.goto(base,{waitUntil:'domcontentloaded'});
 assert.equal(await wide.locator('#fieldShortcuts').evaluate(el=>getComputedStyle(el).display),'none','Desktop shortcuts hidden');
 assert.equal(await wide.locator('#hero').evaluate(el=>parseFloat(getComputedStyle(el).width)),104,'Desktop illustrated character must also be compact');
 console.log('PHASE2_PASS desktop');
}finally{await browser.close();}
