import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const directory=path.resolve(import.meta.dirname,'../../artifacts');
fs.mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/adventure-online/image-prototype/',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#fieldShortcuts');
 await page.evaluate(()=>{document.querySelector('#loading').hidden=true;});
 const stat=await page.evaluate(()=>{
   const profile=getComputedStyle(document.querySelector('.profile'));
   const npc=getComputedStyle(document.querySelector('#merchant .npc-art'));
   const menu=getComputedStyle(document.querySelector('nav.utility'));
   return {css:[...document.styleSheets].some(x=>x.href?.includes('visual-overhaul.css')), 
     ivory:profile.backgroundColor,npcArt:npc.backgroundImage,menuVisibility:menu.visibility,
     portraitPresent:!!document.querySelector('#heroArt'),
     width:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 assert.equal(stat.css,true,'New visual CSS loaded');
 assert.match(stat.npcArt,/rogue\.png/,'World NPC must use actual full-body character atlas, not a portrait sheet');
 assert.equal(stat.menuVisibility,'hidden','mobile extras start collapsed');
 assert.ok(stat.portraitPresent,'keep original player sprite');
 assert.ok(stat.width<=stat.viewport+2,'no horizontal scroll');
 await page.locator('#visualMenuToggle').click();
 console.log('MENU DEBUG',await page.evaluate(()=>({open:document.querySelector('nav.utility').className,expanded:document.querySelector('#visualMenuToggle').getAttribute('aria-expanded'),ready:document.readyState,source:document.querySelector('script[src*=visual-overhaul]')?.src})));
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('nav.utility')).visibility==='visible',null,{timeout:2500});
 await page.locator('#visualMenuToggle').click();
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('nav.utility')).visibility==='hidden',null,{timeout:2500});
 const preview=await page.screenshot({type:'jpeg',quality:52});
 console.log('VISUAL_SCREENSHOT_B64:'+preview.toString('base64'));
 await page.evaluate(()=>{window.forwarded=0;document.querySelector('#bagBtn').addEventListener('click',()=>window.forwarded++);});
 await page.locator('[data-forward="bagBtn"]').click();
 assert.equal(await page.evaluate(()=>window.forwarded),1,'quick action forwards to original gameplay button');
 await page.screenshot({path:path.join(directory,'junja-mobile-visual.png'),fullPage:true});

 const desktop=await browser.newPage({viewport:{width:1280,height:800}});
 await desktop.goto('http://127.0.0.1:4173/adventure-online/image-prototype/',{waitUntil:'domcontentloaded'});
 assert.equal(await desktop.locator('#fieldShortcuts').evaluate(el=>getComputedStyle(el).display),'none','desktop retains full nav');
 assert.equal(await desktop.locator('nav.utility').evaluate(el=>getComputedStyle(el).visibility),'visible','desktop utility controls visible');
 await desktop.screenshot({path:path.join(directory,'junja-desktop-visual.png'),fullPage:true});
 assert.deepEqual(errors.filter(x=>x.includes('visual-overhaul')),[],'visual layer throws no page errors');
 console.log('VISUAL SMOKE PASS: CSS, NPC atlas, mobile menu, shortcuts, desktop controls');
} finally {await browser.close();}
