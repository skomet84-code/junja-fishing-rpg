import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
test('operator action endpoint sends explicit skill accepted and cooldown metadata',async()=>{
 const port=46600+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const home=path.dirname(fileURLToPath(import.meta.url));
 const child=spawn(process.execPath,['server.mjs'],{cwd:path.resolve(home,'..'),env:{...process.env,TEST_MEMORY:'1',PORT:String(port),OPERATOR_USERNAMES:'admin'},stdio:'ignore'});
 const api=async(route,token,connectionKey,payload)=>{
  const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...(connectionKey?{'x-adventure-connection':connectionKey}:{})},body:JSON.stringify(payload)});
  const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;
 };
 try{
  let live=false;
  for(let i=0;i<80;i++){if(child.exitCode!==null)throw Error('server start failed');try{if((await fetch(base+'/health')).ok){live=true;break;}}catch{}await sleep(100);}
  assert.ok(live);
  const register=await api('register',null,null,{username:'admin',password:'operator-test-1234'});
  const join=await api('join',register.token,null,{slot:0,channel:'테스트'});
  assert.equal(join.snapshot.self.operator,true);
  const result=await api('action',register.token,join.connectionKey,{type:'attack',skill:0,manual:true});
  assert.equal(result.ok,true);
  assert.equal(result.accepted,false,'no enemy in village, must reject cast');
  assert.equal(result.cooldowns.length,9);
  assert.equal(result.cooldowns[0],0,'no phantom cooldown on failed cast');
  assert.equal(result.mp,join.snapshot.self.mp,'failed cast does not consume MP');
 }finally{child.kill('SIGTERM');await sleep(100);if(child.exitCode===null)child.kill('SIGKILL');}
});
