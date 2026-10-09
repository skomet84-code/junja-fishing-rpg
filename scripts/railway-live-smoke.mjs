import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

const adventure='https://junja-adventure-online-production.up.railway.app';
const land='https://junja-land-online-production.up.railway.app';
const suffix=randomBytes(4).toString('hex');
const password='T!'+randomBytes(18).toString('hex');
const attempts=8;

async function request(base,path,{method='GET',body,headers={},expect=200,retry=false}={}){
  let error;
  for(let attempt=0;attempt<(retry?attempts:1);attempt++){
    try{
      const res=await fetch(base+path,{
        method,headers:{...(body?{'content-type':'application/json'}:{}),...headers},
        body:body?JSON.stringify(body):undefined,
        signal:AbortSignal.timeout(20000),redirect:'manual'
      });
      const raw=await res.text();
      let data;try{data=JSON.parse(raw)}catch{data=raw}
      if(res.status!==expect)throw Error(method+' '+path+' returned HTTP '+res.status+'; expected '+expect+'; body '+String(raw).slice(0,250));
      return {data,headers:res.headers};
    }catch(e){
      error=e;
      if(!retry||attempt===attempts-1)throw e;
      await new Promise(resolve=>setTimeout(resolve,4000));
    }
  }
  throw error;
}
function ensure(cond,msg){assert.ok(cond,msg)}
function redacted(name,data){console.log(name+' OK '+(data||''))}
async function adventureSmoke(){
  const health=(await request(adventure,'/health',{retry:true})).data;
  ensure(health?.ok===true && health?.storage==='postgres','Adventure must use PostgreSQL');
  const html=(await request(adventure,'/')).data;
  ensure(typeof html==='string' && html.length>1500 && /<html/i.test(html),'Adventure front-end missing');
  await request(adventure,'/app.js');
  redacted('Adventure health + front-end');

  const players=[];
  for(let i=0;i<2;i++){
    const username='ar'+suffix+i;
    const reg=(await request(adventure,'/api/register',{method:'POST',body:{username,password}})).data;
    ensure(reg?.token && Array.isArray(reg.roster),'Adventure signup failed');
    const login=(await request(adventure,'/api/login',{method:'POST',body:{username,password}})).data;
    ensure(login?.token && login.roster?.length>=4,'Adventure login failed');
    players.push({username,token:login.token});
  }
  redacted('Adventure registration + login for 2 users');
  const channel='repair'+suffix;
  for(const player of players){
    const joined=(await request(adventure,'/api/join',{method:'POST',body:{slot:0,channel},headers:{authorization:'Bearer '+player.token}})).data;
    ensure(joined?.connectionKey && joined?.snapshot?.self?.channel===channel,'Adventure join failed');
    player.key=joined.connectionKey;
  }
  for(const player of players){
    const state=(await request(adventure,'/api/state',{headers:{authorization:'Bearer '+player.token,'x-adventure-connection':player.key}})).data;
    ensure(state?.players?.length>=2 && players.every(p=>state.players.some(x=>x.name===p.username)),'Adventure shared-world presence failed');
  }
  redacted('Adventure two players in shared channel');
  const res=await fetch(adventure+'/api/events',{
    headers:{authorization:'Bearer '+players[0].token,'x-adventure-connection':players[0].key},
    signal:AbortSignal.timeout(15000)
  });
  ensure(res.status===200 && String(res.headers.get('content-type')).includes('text/event-stream'),'Adventure SSE endpoint failed');
  const reader=res.body.getReader();
  const {value}=await reader.read();
  ensure(new TextDecoder().decode(value).includes('data:'),'Adventure SSE initial snapshot missing');
  await reader.cancel();
  redacted('Adventure real-time SSE snapshot');
}
async function landSmoke(){
  const health=(await request(land,'/healthz',{retry:true})).data;
  ensure(health?.ok===true,'Land health failed');
  const html=(await request(land,'/')).data;
  ensure(typeof html==='string' && html.length>1500 && /<html/i.test(html),'Land front-end missing');
  await request(land,'/app.js');
  redacted('Land health + front-end');
  const users=[];
  for(let i=0;i<2;i++){
    const username='lr'+suffix+i, nickname='복구시험'+suffix.slice(0,4)+i;
    const registered=await request(land,'/api/register',{method:'POST',body:{username,nickname,password},expect:201});
    ensure(registered.data?.user?.username===username,'Land registration failed');
    const cookie=registered.headers.get('set-cookie')?.split(';')[0];
    ensure(cookie?.startsWith('sid='),'Land registration cookie missing');
    const login=await request(land,'/api/login',{method:'POST',body:{username,password}});
    ensure(login.data?.user?.username===username,'Land login failed');
    const session=login.headers.get('set-cookie')?.split(';')[0];
    ensure(session?.startsWith('sid='),'Land login cookie missing');
    const me=(await request(land,'/api/me',{headers:{cookie:session}})).data;
    ensure(me?.user?.username===username,'Land authenticated session failed');
    users.push({username,cookie:session});
  }
  redacted('Land registration + login for 2 users');
  const room=(await request(land,'/api/rooms',{method:'POST',body:{game:'sevenpoker',maxPlayers:2},headers:{cookie:users[0].cookie},expect:201})).data?.room;
  ensure(room?.id,'Land Seven Poker room creation failed');
  const join=(await request(land,'/api/rooms/'+room.id+'/join',{method:'POST',body:{},headers:{cookie:users[1].cookie}})).data?.room;
  ensure(join?.players?.length===2,'Land second player cannot join room');
  const list=(await request(land,'/api/rooms?game=sevenpoker',{headers:{cookie:users[0].cookie}})).data;
  ensure(list?.rooms?.some(x=>x.id===room.id),'Land rooms directory missing the multiplayer table');
  redacted('Land 2-player Seven Poker room and lobby');
  for(const user of users)await request(land,'/api/rooms/'+room.id+'/leave',{method:'POST',body:{},headers:{cookie:user.cookie}});
  redacted('Land multiplayer leave/cashout');
}
await adventureSmoke();
await landSmoke();
console.log('RAILWAY_LIVE_RECOVERY_SMOKE_OK');
