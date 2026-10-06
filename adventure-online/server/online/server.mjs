import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID,randomBytes,createHash,scrypt as sc,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {World} from './engine.mjs';
import {profile,JOBS,BUILD} from '../../image-prototype/catalog.js';
const scrypt=promisify(sc),hash=s=>createHash('sha256').update(s).digest('hex'),memory=process.env.TEST_MEMORY==='1';
const staticRoot=fileURLToPath(new URL('../../image-prototype/',import.meta.url));
const accounts=new Map(),sessions=new Map(),streams=new Map(),limits=new Map();let pool;
if(!memory){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required; no temporary production save fallback.');const {default:pg}=await import('pg');pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000});await pool.query(`CREATE SCHEMA IF NOT EXISTS junja_adventure_online; CREATE TABLE IF NOT EXISTS junja_adventure_online.accounts(id text PRIMARY KEY,username text UNIQUE NOT NULL,salt text NOT NULL,password_hash text NOT NULL,roster jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()); CREATE TABLE IF NOT EXISTS junja_adventure_online.sessions(token_hash text PRIMARY KEY,account_id text NOT NULL REFERENCES junja_adventure_online.accounts(id),expires_at timestamptz NOT NULL);`);}
function touch(p){const a=accounts.get(p.id.split(':')[0]);if(!a)return;a.roster[p.slot]=structuredClone(p.state);a.dirty=true;a.rev++;a.saveError=false;}
const world=new World({onDirty:touch});
async function flush(a){if(a.saving||!a.dirty)return;a.saving=true;const rev=a.rev;try{if(pool)await pool.query('UPDATE junja_adventure_online.accounts SET roster=$2,updated_at=now() WHERE id=$1',[a.id,JSON.stringify(a.roster)]);if(a.rev===rev)a.dirty=false;a.saveError=false;}catch(e){a.saveError=true;console.error('SAVE_FAILED',e.code||e.message);}finally{a.saving=false;}}
async function account(id){if(accounts.has(id))return accounts.get(id);if(!pool)return null;const r=await pool.query('SELECT * FROM junja_adventure_online.accounts WHERE id=$1',[id]);if(!r.rows.length)return null;const a=r.rows[0];a.roster=a.roster.map((s,i)=>profile(s,Object.keys(JOBS)[i]));a.rev=0;a.dirty=false;accounts.set(id,a);return a;}
async function auth(req){const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(token.length<32)return null;const h=hash(token);let session=sessions.get(h);if(!session&&pool){const r=await pool.query('SELECT account_id,expires_at FROM junja_adventure_online.sessions WHERE token_hash=$1 AND expires_at>now()',[h]);if(r.rows[0]){session={accountId:r.rows[0].account_id,expires:new Date(r.rows[0].expires_at).getTime()};sessions.set(h,session);}}if(!session||session.expires<Date.now())return null;const a=await account(session.accountId);return a?{a,session}:null;}
async function newSession(a){const token=randomBytes(32).toString('base64url'),h=hash(token),expires=Date.now()+30*86400000;if(pool)await pool.query('INSERT INTO junja_adventure_online.sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)',[h,a.id,new Date(expires)]);sessions.set(h,{accountId:a.id,expires});return token;}
function allow(key,n,seconds){const now=Date.now();let v=limits.get(key);if(!v||now>v.until){v={count:0,until:now+seconds*1000};limits.set(key,v);}return ++v.count<=n;}
async function body(req){let text='';for await(const part of req){text+=part;if(text.length>16000)throw Error('요청이 너무 큽니다.');}try{return JSON.parse(text||'{}');}catch{throw Error('요청 형식이 올바르지 않습니다.');}}
const origins=new Set(['https://junja-adventure-preview.onrender.com','http://127.0.0.1:4173','http://localhost:4173']);
function headers(req){const o=req.headers.origin;return {'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'Origin',...(origins.has(o)?{'access-control-allow-origin':o}:{}),'access-control-allow-headers':'authorization,content-type,x-adventure-connection','access-control-allow-methods':'GET,POST,OPTIONS'};}
function json(req,res,obj,status=200){res.writeHead(status,headers(req));res.end(JSON.stringify(obj));}
function publicRoster(a){return a.roster.map((s,slot)=>({slot,job:s.job,level:s.level,rank:s.rank,equipment:s.equipment,kills:s.kills}));}
function disconnect(id,text='다른 창에서 접속했습니다.'){const stream=streams.get(id);if(stream){stream.write('data: '+JSON.stringify({disconnected:text})+'\n\n');stream.end();streams.delete(id);}const p=world.players.get(id);if(p){touch(p);world.players.delete(id);}}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{
 if(req.method==='OPTIONS'){res.writeHead(204,headers(req));res.end();return;}
 if(url.pathname==='/health'){json(req,res,{ok:true,build:BUILD,online:world.players.size,storage:memory?'test':'postgres'});return;}
 if(url.pathname.startsWith('/api/')){
  if(req.headers.origin&&!origins.has(req.headers.origin)&&req.headers.origin!==`https://${req.headers.host}`&&req.headers.origin!==`http://${req.headers.host}`){json(req,res,{error:'허용되지 않은 접속입니다.'},403);return;}
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0];
  if(['/api/register','/api/login'].includes(url.pathname)&&req.method==='POST'){
   if(!allow('auth:'+ip,25,60)){json(req,res,{error:'잠시 후 다시 시도하세요.'},429);return;}const input=await body(req),username=String(input.username||'').trim(),password=String(input.password||'');if(!/^[A-Za-z0-9가-힣_]{2,20}$/.test(username)||password.length<6||password.length>72){json(req,res,{error:'아이디는 한글·영문·숫자 2~20자, 비밀번호는 6~72자입니다.'},400);return;}
   let a;
   if(url.pathname==='/api/register'){
    if(!allow('reg:'+ip,10,3600)){json(req,res,{error:'새 계정을 너무 많이 만들었습니다.'},429);return;}if([...accounts.values()].some(a=>a.username===username)){json(req,res,{error:'이미 사용 중인 아이디입니다.'},409);return;}
    const salt=randomBytes(16).toString('hex'),passwordHash=(await scrypt(password,salt,64)).toString('hex'),roster=Object.keys(JOBS).map(job=>profile({},job));
    if(input.legacy&&typeof input.legacy==='object'){const old=input.legacy;const allowed={};for(const k of ['level','exp','kills','gold','tails','potions','quest','questKills','questBoss','weapon'])allowed[k]=old[k];allowed.level=Math.min(10,Number(old.level)||1);allowed.gold=Math.min(1000000,Number(old.gold)||0);allowed.kills=Math.min(10000,Number(old.kills)||0);allowed.potions=Math.min(100,Number(old.potions)||5);allowed.exp=Math.min(400,Number(old.exp)||0);allowed.bossKills=['bossReady','done'].includes(old.quest)?1:0;roster[0]=profile(allowed,'warrior');}
    a={id:randomUUID(),username,salt,password_hash:passwordHash,roster,rev:0,dirty:false};if(pool){try{await pool.query('INSERT INTO junja_adventure_online.accounts(id,username,salt,password_hash,roster) VALUES($1,$2,$3,$4,$5)',[a.id,username,salt,passwordHash,JSON.stringify(roster)]);}catch(e){if(e.code==='23505'){json(req,res,{error:'이미 사용 중인 아이디입니다.'},409);return;}throw e;}}accounts.set(a.id,a);
   }else{
    if(pool){const r=await pool.query('SELECT id FROM junja_adventure_online.accounts WHERE username=$1',[username]);a=r.rows[0]?await account(r.rows[0].id):null;}else a=[...accounts.values()].find(a=>a.username===username);
    const candidate=await scrypt(password,a?.salt||'dummy-salt',64),expected=Buffer.from(a?.password_hash||'00'.repeat(64),'hex');if(!a||!timingSafeEqual(candidate,expected)){json(req,res,{error:'아이디 또는 비밀번호를 확인하세요.'},401);return;}
   }
   json(req,res,{token:await newSession(a),name:a.username,roster:publicRoster(a)});return;
  }
  const user=await auth(req);if(!user){json(req,res,{error:'로그인이 필요합니다.'},401);return;}const {a,session}=user;
  if(url.pathname==='/api/me'){json(req,res,{name:a.username,roster:publicRoster(a)});return;}
  if(url.pathname==='/api/join'&&req.method==='POST'){
   const input=await body(req),slot=Number(input.slot),channel=String(input.channel||'준자마을').trim();if(!Number.isInteger(slot)||slot<0||slot>3||!/^[A-Za-z0-9가-힣_-]{2,16}$/.test(channel)){json(req,res,{error:'캐릭터와 채널 이름을 확인하세요.'},400);return;}
   if([...world.players.values()].filter(p=>p.channel===channel&&!p.id.startsWith(a.id+':')).length>=24){json(req,res,{error:'채널이 가득 찼습니다. 다른 채널을 선택하세요.'},409);return;}
   for(const id of [...world.players.keys()])if(id.startsWith(a.id+':'))disconnect(id);await flush(a);const id=a.id+':'+slot;const p=world.add(id,a.username,a.roster[slot],channel,slot);session.active=id;p.connectionKey=randomBytes(24).toString('base64url');json(req,res,{connectionKey:p.connectionKey,snapshot:world.snapshot(p)});return;
  }
  const p=world.players.get(session.active);if(!p||req.headers['x-adventure-connection']!==p.connectionKey){json(req,res,{error:'캐릭터를 선택해 접속하세요.'},409);return;}
  if(url.pathname==='/api/events'&&req.method==='GET'){
   const old=streams.get(p.id);if(old)old.end();streams.set(p.id,res);res.writeHead(200,{...headers(req),'content-type':'text/event-stream','connection':'keep-alive','x-accel-buffering':'no'});res.write('data: '+JSON.stringify(world.snapshot(p))+'\n\n');res.on('close',()=>{if(streams.get(p.id)===res){streams.delete(p.id);touch(p);world.players.delete(p.id);flush(a);}});return;
  }
  if(url.pathname==='/api/action'&&req.method==='POST'){if(!allow('action:'+p.id,35,1)){json(req,res,{error:'요청이 너무 빠릅니다.'},429);return;}const input=await body(req);world.action(p,input);if(!['move','attack','auto','chat'].includes(input.type))await flush(a);json(req,res,{ok:true});return;}
  if(url.pathname==='/api/logout'&&req.method==='POST'){disconnect(p.id,'로그아웃했습니다.');await flush(a);const token=(req.headers.authorization||'').replace(/^Bearer /,'');sessions.delete(hash(token));if(pool)await pool.query('DELETE FROM junja_adventure_online.sessions WHERE token_hash=$1',[hash(token)]);json(req,res,{ok:true});return;}
  json(req,res,{error:'요청을 찾을 수 없습니다.'},404);return;
 }
 if(!['GET','HEAD'].includes(req.method)){json(req,res,{error:'지원하지 않는 요청입니다.'},405);return;}
 let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';const file=path.resolve(staticRoot,'.'+pathname);if(!file.startsWith(staticRoot)||!/^\/(?:[a-zA-Z0-9_-]+\.(?:html|js|css|png)|assets\/[a-zA-Z0-9_-]+\.png)$/.test(pathname)){res.writeHead(404);res.end();return;}const data=await readFile(file),ext=path.extname(file);res.writeHead(200,{'content-type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[ext]||'application/octet-stream','cache-control':ext==='.png'?'public,max-age=86400':'no-cache','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){if(e.code==='ENOENT'){res.writeHead(404);res.end();return;}console.error('REQUEST_FAILED',e.code||e.message);if(!res.headersSent)json(req,res,{error:'서버 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.'},500);else res.end();}});
let tickCount=0;const tick=setInterval(()=>{world.tick(.1);if(++tickCount%2)return;for(const [id,res] of streams){const p=world.players.get(id);if(p&&!res.destroyed){if(res.writableLength>256000){res.end();continue;}const a=accounts.get(id.split(':')[0]);res.write('data: '+JSON.stringify({...world.snapshot(p),saveStatus:a?.saveError?'error':a?.dirty?'pending':'saved'})+'\n\n');}}},100);
const saveTimer=setInterval(async()=>{for(const a of accounts.values())await flush(a);for(const [key,v] of limits)if(Date.now()>v.until)limits.delete(key);for(const [key,s] of sessions)if(s.expires<Date.now())sessions.delete(key);if(pool)await pool.query('DELETE FROM junja_adventure_online.sessions WHERE expires_at<now()').catch(()=>{});},30000);
server.listen(Number(process.env.PORT)||4174,'0.0.0.0',()=>console.log('JUNJA ONLINE',BUILD,'ready'));
async function shutdown(){clearInterval(tick);clearInterval(saveTimer);for(const p of world.players.values())touch(p);for(const res of streams.values())res.end();for(const a of accounts.values()){while(a.saving)await new Promise(r=>setTimeout(r,20));await flush(a);}server.close();if(pool)await pool.end();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
