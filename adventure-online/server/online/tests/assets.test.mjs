import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import path from 'node:path';import {setTimeout as delay} from 'node:timers/promises';
const home=path.dirname(fileURLToPath(import.meta.url));
test('real Render entrypoint serves all 4 motion WebP images',async()=>{
 const port=43000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(home,'..'),env:{...process.env,TEST_MEMORY:'1',PORT:String(port)},stdio:'ignore'});
 try{
  let ready=false;for(let i=0;i<80;i++){if(child.exitCode!==null)throw Error('server did not start');try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await delay(100)}
  assert.ok(ready);
  for(const art of ['hero','rogue','mage','healer']){
   const a=await fetch(base+'/assets/'+art+'-motion.webp',{method:'HEAD'}),b=await fetch(base+'/assets/'+art+'.png',{method:'HEAD'});
   assert.equal(a.status,200,'motion '+art);assert.match(a.headers.get('content-type')||'',/image\/webp/);
   assert.equal(b.status,200,'fallback '+art);
  }
  for(const art of ['boar','mushroom','wolf','treant']){
   const a=await fetch(base+'/assets/monster-'+art+'.svg');
   assert.equal(a.status,200,'monster svg '+art);
   assert.match(a.headers.get('content-type')||'',/image\/svg\+xml/);
   assert.match(await a.text(),/<svg/);
  }
  const script=await fetch(base+'/combat-queue.js');assert.equal(script.status,200);
  const html=await fetch(base+'/');assert.equal(html.status,200);assert.match(await html.text(),/준자/);
 }finally{child.kill('SIGTERM');await delay(100);if(child.exitCode===null)child.kill('SIGKILL');}
});
