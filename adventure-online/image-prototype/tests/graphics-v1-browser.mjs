import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:390,height:844,isMobile:true,hasTouch:true},{width:1280,height:800}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4173/adventure-online/image-prototype/',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
   const m=await import('./graphics-v1.js?v=20261012-graphics1');
   const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('failed atlas '+src));i.src=src;});
   const [characters,monsters]=await Promise.all([load('./assets/characters-v1.png'),load('./assets/monsters-v1.png')]);
   const sample=(image,col,row,cols,rows)=>{const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');ctx.drawImage(image,col*image.width/cols,row*image.height/rows,image.width/cols,image.height/rows,0,0,32,32);const data=ctx.getImageData(0,0,32,32).data;let count=0;for(let j=3;j<data.length;j+=4)if(data[j]>40)count++;return count;};
   const counts=['warrior','rogue','mage','healer'].map(job=>{const cell=m.characterCell(job,'idle');return sample(characters,cell.column,0,8,3);});
   const beasts=Array.from({length:9},(_,i)=>sample(monsters,i%3,Math.floor(i/3),3,3));
   const self=document.getElementById('heroArt');
   self.style.backgroundImage="url('./assets/characters-v1.png')";
   Object.assign(self.style,{backgroundSize:'800% 300%',backgroundPosition:m.characterCell('warrior','idle').backgroundPosition});
   const pos=getComputedStyle(self).backgroundPosition;
   return {characterSize:[characters.width,characters.height],monsterSize:[monsters.width,monsters.height],counts,beasts,pos,legacy:m.newArtRequested('?graphics=legacy')};
  });
  assert.ok(result.counts.every(x=>x>4),JSON.stringify(result));
  assert.ok(result.beasts.every(x=>x>4),JSON.stringify(result));
  assert.equal(result.legacy,false);
  assert.equal(result.pos,'0% 0%');
  assert.deepEqual(errors.filter(x=>!/network|fetch/i.test(x)),[],errors.join('; '));
  console.log('graphics browser PASS',viewport.width,result);
  await page.close();
 }
}finally{await browser.close();}
