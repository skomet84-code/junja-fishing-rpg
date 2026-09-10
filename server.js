const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
fs.mkdirSync(DATA, { recursive: true });
const DB_PATH = path.resolve(process.env.GAME_DB_PATH || path.join(DATA, 'game.db'));

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 500,
  current_zone TEXT NOT NULL DEFAULT 'pond',
  equipped_rod TEXT NOT NULL DEFAULT 'starter_rod',
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS catches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fish_key TEXT NOT NULL,
  fish_name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  length_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  value INTEGER NOT NULL,
  zone_id TEXT NOT NULL,
  caught_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catches_user ON catches(user_id, caught_at DESC);
CREATE TABLE IF NOT EXISTS fish_dex (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fish_key TEXT NOT NULL,
  fish_name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  max_weight REAL NOT NULL DEFAULT 0,
  max_length REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, fish_key)
);
CREATE TABLE IF NOT EXISTS inventory_items (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, item_id)
);
CREATE TABLE IF NOT EXISTS owned_gear (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, item_id)
);
CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_catches INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  biggest_weight REAL NOT NULL DEFAULT 0,
  biggest_length REAL NOT NULL DEFAULT 0,
  legendary_catches INTEGER NOT NULL DEFAULT 0
);
`);

const RARITY = {
  common:    { name:'일반', rank:1, mult:1.00 },
  uncommon:  { name:'고급', rank:2, mult:1.25 },
  rare:      { name:'희귀', rank:3, mult:1.70 },
  epic:      { name:'영웅', rank:4, mult:2.40 },
  legendary: { name:'전설', rank:5, mult:4.00 },
  mythical:  { name:'신화', rank:6, mult:7.00 }
};

const ZONES = {
  pond:     { id:'pond', name:'초록빛 저수지', level:1,  theme:'pond',    desc:'초보 조사들의 시작점. 붕어와 잉어가 주로 서식한다.' },
  river:    { id:'river', name:'은빛 강 상류', level:5,  theme:'river',   desc:'유속이 빨라 손맛이 강하다. 장어와 쏘가리가 등장한다.' },
  harbor:   { id:'harbor', name:'달빛 항구',    level:10, theme:'harbor',  desc:'바닷바람이 거센 야간 항구. 참돔과 대형 광어를 노려라.' },
  deepsea:  { id:'deepsea', name:'심해 원정선',  level:18, theme:'deepsea', desc:'최상급 장비가 필요한 심해. 전설급 대물이 숨어 있다.' }
};

const FISH = [
  {key:'crucian',name:'붕어',zone:'pond',rarity:'common',weight:42,minKg:.15,maxKg:1.8,minCm:12,maxCm:42,priceKg:110,diff:.25},
  {key:'carp',name:'잉어',zone:'pond',rarity:'uncommon',weight:28,minKg:.8,maxKg:6.5,minCm:28,maxCm:76,priceKg:170,diff:.40},
  {key:'catfish',name:'메기',zone:'pond',rarity:'rare',weight:17,minKg:.7,maxKg:8.0,minCm:30,maxCm:92,priceKg:260,diff:.53},
  {key:'gold_crucian',name:'황금붕어',zone:'pond',rarity:'epic',weight:5,minKg:.4,maxKg:2.6,minCm:20,maxCm:50,priceKg:720,diff:.66},
  {key:'mandarin',name:'쏘가리',zone:'river',rarity:'uncommon',weight:35,minKg:.3,maxKg:3.8,minCm:22,maxCm:62,priceKg:240,diff:.42},
  {key:'eel',name:'민물장어',zone:'river',rarity:'rare',weight:25,minKg:.4,maxKg:4.2,minCm:38,maxCm:98,priceKg:390,diff:.55},
  {key:'river_carp',name:'대형 잉어',zone:'river',rarity:'rare',weight:22,minKg:2.2,maxKg:13,minCm:52,maxCm:110,priceKg:310,diff:.60},
  {key:'white_sturgeon',name:'백철갑상어',zone:'river',rarity:'legendary',weight:4,minKg:8,maxKg:34,minCm:90,maxCm:180,priceKg:920,diff:.79},
  {key:'rockfish',name:'우럭',zone:'harbor',rarity:'common',weight:34,minKg:.4,maxKg:4.0,minCm:22,maxCm:64,priceKg:230,diff:.43},
  {key:'flounder',name:'광어',zone:'harbor',rarity:'uncommon',weight:29,minKg:.7,maxKg:9.5,minCm:32,maxCm:105,priceKg:320,diff:.51},
  {key:'red_seabream',name:'참돔',zone:'harbor',rarity:'rare',weight:22,minKg:.8,maxKg:11,minCm:35,maxCm:100,priceKg:480,diff:.62},
  {key:'amberjack',name:'부시리',zone:'harbor',rarity:'epic',weight:11,minKg:4,maxKg:26,minCm:70,maxCm:145,priceKg:730,diff:.74},
  {key:'giant_grouper',name:'자이언트 그루퍼',zone:'deepsea',rarity:'rare',weight:30,minKg:12,maxKg:68,minCm:95,maxCm:205,priceKg:680,diff:.70},
  {key:'swordfish',name:'황새치',zone:'deepsea',rarity:'epic',weight:24,minKg:28,maxKg:140,minCm:160,maxCm:330,priceKg:830,diff:.79},
  {key:'bluefin',name:'대왕 참다랑어',zone:'deepsea',rarity:'legendary',weight:12,minKg:60,maxKg:310,minCm:190,maxCm:390,priceKg:1200,diff:.88},
  {key:'coelacanth',name:'고대 실러캔스',zone:'deepsea',rarity:'mythical',weight:2,minKg:35,maxKg:115,minCm:140,maxCm:230,priceKg:3300,diff:.95}
];

const RODS = {
  starter_rod:{id:'starter_rod',name:'낡은 대나무 낚싯대',level:1,cost:0,power:1.00,luck:0.00,desc:'초보 조사에게 지급되는 기본 장비.'},
  carbon_rod:{id:'carbon_rod',name:'카본 라이트 Ⅰ',level:3,cost:1300,power:1.08,luck:.02,desc:'가볍고 반응이 빠른 입문용 카본대.'},
  river_master:{id:'river_master',name:'리버 마스터 Ⅱ',level:7,cost:5200,power:1.17,luck:.05,desc:'강한 유속과 중형 어종에 대응한다.'},
  ocean_hunter:{id:'ocean_hunter',name:'오션 헌터 Ⅲ',level:12,cost:16800,power:1.29,luck:.09,desc:'대형 바다 어종용 고탄성 낚싯대.'},
  abyss_legend:{id:'abyss_legend',name:'어비스 레전드',level:20,cost:72000,power:1.47,luck:.15,desc:'심해 대물을 상대하기 위한 최상급 장비.'}
};
const BAITS = {
  worm:{id:'worm',name:'지렁이',pack:10,cost:120,rareBoost:1.0,desc:'모든 낚시터에서 무난한 기본 미끼.'},
  shrimp:{id:'shrimp',name:'새우 미끼',pack:10,cost:520,rareBoost:1.35,desc:'희귀 어종의 입질 확률을 조금 높인다.'},
  lure:{id:'lure',name:'홀로그램 루어',pack:5,cost:1450,rareBoost:1.75,desc:'영웅 이상 대물을 노릴 때 유리하다.'}
};

const activeEncounters = new Map();
const online = new Map(); // userId -> {clients:Set, nickname, level, zone, spot, last}
const chatLog = [];
const rateBuckets = new Map();

function now(){ return Date.now(); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rand(a,b){ return a + Math.random()*(b-a); }
function round(v,n=2){ const p=10**n; return Math.round(v*p)/p; }
function xpNeed(level){ return Math.floor(120 * Math.pow(level, 1.48)); }
function tokenHash(t){ return crypto.createHash('sha256').update(t).digest('hex'); }
function passHash(password, salt=crypto.randomBytes(16).toString('hex')){
  const hash=crypto.scryptSync(password,salt,64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPass(password, stored){
  const [salt,hash]=String(stored).split(':');
  if(!salt||!hash)return false;
  const test=crypto.scryptSync(password,salt,64);
  const actual=Buffer.from(hash,'hex');
  return actual.length===test.length && crypto.timingSafeEqual(actual,test);
}
function parseCookies(req){
  const out={};
  for(const part of String(req.headers.cookie||'').split(';')){
    const i=part.indexOf('='); if(i<0)continue;
    out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());
  }
  return out;
}
function auth(req){
  const t=parseCookies(req).session;
  if(!t)return null;
  const row=db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).get(tokenHash(t),now());
  return row||null;
}
function createSession(res,userId,req){
  const token=crypto.randomBytes(32).toString('hex');
  const expires=now()+7*24*3600*1000;
  db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').run(tokenHash(token),userId,expires);
  const secure=String(req.headers['x-forwarded-proto']||'').includes('https');
  res.setHeader('Set-Cookie',`session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure?'; Secure':''}`);
}
function clearSession(res,req){
  const t=parseCookies(req).session;
  if(t)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(t));
  res.setHeader('Set-Cookie','session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}
function json(res,status,data,extra={}){
  const body=JSON.stringify(data);
  res.writeHead(status,{...securityHeaders(),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});
  res.end(body);
}
function text(res,status,body,type='text/plain; charset=utf-8'){
  res.writeHead(status,{...securityHeaders(),'Content-Type':type,'Cache-Control':'no-store'});res.end(body);
}

async function bodyJson(req){
  return await new Promise((resolve,reject)=>{
    let s='';req.on('data',c=>{s+=c;if(s.length>64_000){reject(new Error('too_large'));req.destroy();}});
    req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch{reject(new Error('bad_json'))}});req.on('error',reject);
  });
}
function rateLimit(req,key='default',limit=30,windowMs=60_000){
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
  const k=`${key}:${ip}`, t=now();
  let b=rateBuckets.get(k); if(!b||t-b.start>windowMs)b={start:t,count:0};
  b.count++;rateBuckets.set(k,b);return b.count<=limit;
}
function publicUser(u){
  return {id:u.id,username:u.username,nickname:u.nickname,level:u.level,xp:u.xp,xpNeed:xpNeed(u.level),gold:u.gold,currentZone:u.current_zone,equippedRod:u.equipped_rod};
}
function getItemQty(userId,itemId){return Number(db.prepare('SELECT qty FROM inventory_items WHERE user_id=? AND item_id=?').get(userId,itemId)?.qty||0)}
function setItemQty(userId,itemId,qty){
  db.prepare(`INSERT INTO inventory_items(user_id,item_id,qty) VALUES(?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET qty=excluded.qty`).run(userId,itemId,Math.max(0,Math.floor(qty)));
}
function userState(userId){
  const u=db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if(!u)return null;
  const inv={}; for(const id of Object.keys(BAITS))inv[id]=getItemQty(userId,id);
  const owned=db.prepare('SELECT item_id FROM owned_gear WHERE user_id=?').all(userId).map(r=>r.item_id);
  const catches=db.prepare('SELECT * FROM catches WHERE user_id=? ORDER BY caught_at DESC LIMIT 40').all(userId);
  const dex=db.prepare('SELECT * FROM fish_dex WHERE user_id=? ORDER BY rarity DESC, max_weight DESC').all(userId);
  const st=db.prepare('SELECT * FROM user_stats WHERE user_id=?').get(userId)||{total_catches:0,total_earned:0,biggest_weight:0,biggest_length:0,legendary_catches:0};
  return {user:publicUser(u),bait:inv,ownedGear:owned,catches,dex,stats:st,zones:Object.values(ZONES),rods:Object.values(RODS),baits:Object.values(BAITS)};
}
function weightedFish(zoneId,baitId,rodId){
  const bait=BAITS[baitId]||BAITS.worm, rod=RODS[rodId]||RODS.starter_rod;
  const pool=FISH.filter(f=>f.zone===zoneId).map(f=>{
    const rank=RARITY[f.rarity].rank;
    const rarityBonus=rank>=3 ? Math.pow(bait.rareBoost,rank-2)*(1+rod.luck*(rank-1)) : 1;
    return {f,w:f.weight*rarityBonus};
  });
  let total=pool.reduce((a,x)=>a+x.w,0), r=Math.random()*total;
  for(const x of pool){r-=x.w;if(r<=0)return x.f}
  return pool[pool.length-1].f;
}
function makeFishInstance(f){
  let q=Math.pow(Math.random(),1.65);
  let kg=f.minKg+(f.maxKg-f.minKg)*q;
  let cm=f.minCm+(f.maxCm-f.minCm)*Math.pow(q,.78)*rand(.94,1.06);
  const trophy=q>.91;
  if(trophy){kg*=rand(1.02,1.10);cm*=rand(1.01,1.05)}
  kg=round(kg,2);cm=round(cm,1);
  const rarity=RARITY[f.rarity];
  const value=Math.max(20,Math.round(kg*f.priceKg*rarity.mult*(trophy?1.12:1)));
  const xp=Math.max(15,Math.round((18+kg*5)*rarity.mult));
  return {fishKey:f.key,fishName:f.name,rarity:f.rarity,rarityName:rarity.name,lengthCm:cm,weightKg:kg,value,xp,trophy};
}
function addXp(userId,amount){
  let u=db.prepare('SELECT level,xp FROM users WHERE id=?').get(userId), levels=[];
  let level=u.level,xp=u.xp+amount;
  while(xp>=xpNeed(level)){xp-=xpNeed(level);level++;levels.push(level)}
  db.prepare('UPDATE users SET level=?,xp=?,last_seen=? WHERE id=?').run(level,xp,now(),userId);
  return {level,xp,levels,xpNeed:xpNeed(level)};
}
function broadcast(event,data,zone=null){
  const payload=`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for(const entry of online.values()){
    if(zone && entry.zone!==zone)continue;
    for(const res of entry.clients){try{res.write(payload)}catch{}}
  }
}
function presenceSnapshot(zone=null){
  const arr=[];
  for(const [id,e] of online){
    if(zone && e.zone!==zone)continue;
    arr.push({id,nickname:e.nickname,level:e.level,zone:e.zone,spot:e.spot});
  }
  return arr;
}
function broadcastPresence(){broadcast('presence',{users:presenceSnapshot(),online:online.size});}
function mime(file){
  const ext=path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}[ext]||'application/octet-stream');
}
function securityHeaders(){
  return {
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'X-Frame-Options':'SAMEORIGIN',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy':'same-origin'
  };
}
function serveStatic(req,res,urlPath){
  let rel=decodeURIComponent(urlPath==='/'?'/index.html':urlPath).replace(/\\/g,'/');
  const file=path.resolve(PUBLIC,'.'+rel);
  if(!file.startsWith(path.resolve(PUBLIC)+path.sep) && file!==path.resolve(PUBLIC,'index.html'))return text(res,403,'Forbidden');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return text(res,404,'Not found');
  res.writeHead(200,{...securityHeaders(),'Content-Type':mime(file),'Cache-Control':file.endsWith('.html')?'no-store':'public, max-age=300'});
  fs.createReadStream(file).pipe(res);
}
function requireAuth(req,res){const u=auth(req);if(!u){json(res,401,{error:'로그인이 필요합니다.'});return null}return u}

function apiRoutes(req,res,url){
  const p=url.pathname, method=req.method;

  if(method==='GET'&&p==='/healthz') return json(res,200,{ok:true,version:'0.2.0',db:path.basename(DB_PATH),time:now()});
  if(method==='GET'&&p==='/api/app-info') return json(res,200,{name:'준자의 낚시왕 RPG',version:'0.2.0',mobile:true,pwa:true,multiplayer:true});

  if(method==='POST'&&p==='/api/register') return (async()=>{
    if(!rateLimit(req,'auth',20))return json(res,429,{error:'요청이 너무 많습니다. 잠시 후 다시 시도하세요.'});
    const b=await bodyJson(req).catch(()=>null); if(!b)return json(res,400,{error:'잘못된 요청입니다.'});
    const username=String(b.username||'').trim().toLowerCase(), password=String(b.password||''), nickname=String(b.nickname||'').trim();
    if(!/^[a-z0-9_]{3,20}$/.test(username))return json(res,400,{error:'아이디는 영문 소문자/숫자/_ 조합 3~20자로 입력하세요.'});
    if(password.length<6||password.length>64)return json(res,400,{error:'비밀번호는 6~64자로 입력하세요.'});
    if(nickname.length<2||nickname.length>12)return json(res,400,{error:'닉네임은 2~12자로 입력하세요.'});
    try{
      const t=now();
      const r=db.prepare('INSERT INTO users(username,password_hash,nickname,created_at,last_seen) VALUES(?,?,?,?,?)').run(username,passHash(password),nickname,t,t);
      const uid=Number(r.lastInsertRowid);
      db.prepare('INSERT INTO owned_gear(user_id,item_id,acquired_at) VALUES(?,?,?)').run(uid,'starter_rod',t);
      db.prepare('INSERT INTO user_stats(user_id) VALUES(?)').run(uid);
      setItemQty(uid,'worm',25);setItemQty(uid,'shrimp',3);setItemQty(uid,'lure',0);
      createSession(res,uid,req);
      return json(res,201,{ok:true,state:userState(uid)});
    }catch(e){
      if(String(e).includes('UNIQUE'))return json(res,409,{error:'이미 사용 중인 아이디 또는 닉네임입니다.'});
      console.error(e);return json(res,500,{error:'계정 생성 중 오류가 발생했습니다.'});
    }
  })();

  if(method==='POST'&&p==='/api/login') return (async()=>{
    if(!rateLimit(req,'auth',25))return json(res,429,{error:'로그인 시도가 너무 많습니다.'});
    const b=await bodyJson(req).catch(()=>null);if(!b)return json(res,400,{error:'잘못된 요청입니다.'});
    const username=String(b.username||'').trim().toLowerCase(), password=String(b.password||'');
    const u=db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if(!u||!verifyPass(password,u.password_hash))return json(res,401,{error:'아이디 또는 비밀번호가 맞지 않습니다.'});
    db.prepare('UPDATE users SET last_seen=? WHERE id=?').run(now(),u.id);
    createSession(res,u.id,req);return json(res,200,{ok:true,state:userState(u.id)});
  })();

  if(method==='POST'&&p==='/api/logout') { clearSession(res,req); return json(res,200,{ok:true}); }
  if(method==='GET'&&p==='/api/me') { const u=requireAuth(req,res);if(!u)return;return json(res,200,userState(u.id)); }

  if(method==='GET'&&p==='/api/leaderboard'){
    const rows=db.prepare(`SELECT u.nickname,u.level,u.xp,s.total_catches,s.total_earned,s.biggest_weight,s.legendary_catches
      FROM users u JOIN user_stats s ON s.user_id=u.id
      ORDER BY u.level DESC,u.xp DESC,s.biggest_weight DESC LIMIT 30`).all();
    return json(res,200,{rows});
  }

  if(method==='GET'&&p==='/api/events'){
    const u=auth(req);if(!u)return json(res,401,{error:'로그인이 필요합니다.'});
    res.writeHead(200,{...securityHeaders(),'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write(`event: hello\ndata: ${JSON.stringify({online:online.size+(!online.has(u.id)?1:0),chat:chatLog.slice(-20)})}\n\n`);
    let e=online.get(u.id);
    if(!e)e={clients:new Set(),nickname:u.nickname,level:u.level,zone:u.current_zone,spot:Math.floor(Math.random()*6),last:now()};
    e.clients.add(res);e.nickname=u.nickname;e.level=u.level;e.zone=u.current_zone;e.last=now();online.set(u.id,e);
    broadcastPresence();
    const ping=setInterval(()=>{try{res.write(`event: ping\ndata: {}\n\n`)}catch{}},20000);
    req.on('close',()=>{clearInterval(ping);const x=online.get(u.id);if(x){x.clients.delete(res);if(!x.clients.size)online.delete(u.id)}broadcastPresence();});
    return;
  }

  if(method==='POST'&&p==='/api/presence') return (async()=>{
    const u=requireAuth(req,res);if(!u)return;const b=await bodyJson(req).catch(()=>({}));
    const zone=String(b.zone||u.current_zone), spot=clamp(Number(b.spot||0),0,5)|0;
    if(!ZONES[zone])return json(res,400,{error:'존재하지 않는 낚시터입니다.'});
    if(u.level<ZONES[zone].level)return json(res,403,{error:`Lv.${ZONES[zone].level}부터 입장할 수 있습니다.`});
    db.prepare('UPDATE users SET current_zone=?,last_seen=? WHERE id=?').run(zone,now(),u.id);
    const e=online.get(u.id);if(e){e.zone=zone;e.spot=spot;e.level=u.level;e.last=now()}
    broadcastPresence();return json(res,200,{ok:true,zone,spot});
  })();

  if(method==='POST'&&p==='/api/chat') return (async()=>{
    const u=requireAuth(req,res);if(!u)return;if(!rateLimit(req,'chat',18,20_000))return json(res,429,{error:'채팅을 너무 빠르게 보내고 있습니다.'});
    const b=await bodyJson(req).catch(()=>({}));const msg=String(b.message||'').trim().replace(/[\r\n]+/g,' ').slice(0,100);
    if(!msg)return json(res,400,{error:'메시지를 입력하세요.'});
    const row={id:crypto.randomUUID(),nickname:u.nickname,level:u.level,message:msg,zone:u.current_zone,time:now()};
    chatLog.push(row);while(chatLog.length>60)chatLog.shift();broadcast('chat',row,u.current_zone);return json(res,200,{ok:true});
  })();

  if(method==='POST'&&p==='/api/fish/start') return (async()=>{
    const u=requireAuth(req,res);if(!u)return;if(!rateLimit(req,'fish',40,60_000))return json(res,429,{error:'낚시 요청이 너무 빠릅니다.'});
    const b=await bodyJson(req).catch(()=>({}));const zone=String(b.zone||u.current_zone),baitId=String(b.bait||'worm');
    if(!ZONES[zone])return json(res,400,{error:'낚시터 정보가 잘못되었습니다.'});
    if(u.level<ZONES[zone].level)return json(res,403,{error:`Lv.${ZONES[zone].level}부터 입장할 수 있습니다.`});
    if(!BAITS[baitId])return json(res,400,{error:'미끼 정보가 잘못되었습니다.'});
    const qty=getItemQty(u.id,baitId);if(qty<=0)return json(res,400,{error:`${BAITS[baitId].name}가 부족합니다.`});
    setItemQty(u.id,baitId,qty-1);
    const fresh=db.prepare('SELECT * FROM users WHERE id=?').get(u.id), rod=RODS[fresh.equipped_rod]||RODS.starter_rod;
    const f=weightedFish(zone,baitId,rod.id), inst=makeFishInstance(f);
    const id=crypto.randomUUID(), biteDelay=Math.round(rand(1500,5200));
    const effectiveDiff=clamp(f.diff/(rod.power*(1+fresh.level*.004)),.18,.97);
    const targetSkill=clamp(.44+effectiveDiff*.38+rand(-.035,.035),.46,.89);
    const fightSeconds=round(7+effectiveDiff*8+rand(-1.0,1.7),1);
    const encounter={id,userId:u.id,zone,baitId,rodId:rod.id,createdAt:now(),biteDelay,targetSkill,effectiveDiff,fish:inst,used:false,fightSeconds};
    activeEncounters.set(id,encounter);
    setTimeout(()=>activeEncounters.delete(id),45_000).unref?.();
    return json(res,200,{encounterId:id,biteDelay,difficulty:round(effectiveDiff,2),fightSeconds,targetSkill:round(targetSkill,3),baitLeft:qty-1,
      hint:effectiveDiff>.78?'엄청난 대물의 기척':effectiveDiff>.62?'힘이 꽤 센 녀석':effectiveDiff>.45?'제법 묵직한 입질':'가벼운 입질'});
  })();

  if(method==='POST'&&p==='/api/fish/resolve') return (async()=>{
    const u=requireAuth(req,res);if(!u)return;const b=await bodyJson(req).catch(()=>({}));
    const id=String(b.encounterId||''), skill=clamp(Number(b.skill||0),0,1), durationMs=Number(b.durationMs||0);
    const e=activeEncounters.get(id);
    if(!e||e.userId!==u.id||e.used)return json(res,400,{error:'유효하지 않거나 종료된 입질입니다.'});
    e.used=true;activeEncounters.delete(id);
    const earliest=e.biteDelay+2400, elapsed=now()-e.createdAt;
    if(elapsed<earliest || durationMs<1800)return json(res,400,{error:'낚시 판정 시간이 비정상적입니다.'});
    const luck=rand(-.035,.035), success=(skill+luck)>=e.targetSkill;
    if(!success){
      return json(res,200,{success:false,escaped:{rarityName:e.fish.rarityName,hint:e.effectiveDiff>.75?'거대한 물고기':'물고기'},message:'줄의 장력을 놓쳐 물고기가 도망갔습니다.'});
    }
    const f=e.fish,t=now();
    const ins=db.prepare(`INSERT INTO catches(user_id,fish_key,fish_name,rarity,length_cm,weight_kg,value,zone_id,caught_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(u.id,f.fishKey,f.fishName,f.rarity,f.lengthCm,f.weightKg,f.value,e.zone,t);
    db.prepare(`INSERT INTO fish_dex(user_id,fish_key,fish_name,rarity,count,max_weight,max_length) VALUES(?,?,?,?,1,?,?)
      ON CONFLICT(user_id,fish_key) DO UPDATE SET count=count+1,max_weight=MAX(max_weight,excluded.max_weight),max_length=MAX(max_length,excluded.max_length),rarity=excluded.rarity,fish_name=excluded.fish_name`)
      .run(u.id,f.fishKey,f.fishName,f.rarity,f.weightKg,f.lengthCm);
    db.prepare(`UPDATE user_stats SET total_catches=total_catches+1,biggest_weight=MAX(biggest_weight,?),biggest_length=MAX(biggest_length,?),legendary_catches=legendary_catches+? WHERE user_id=?`)
      .run(f.weightKg,f.lengthCm,RARITY[f.rarity].rank>=5?1:0,u.id);
    const prog=addXp(u.id,f.xp);
    const catchRow={id:Number(ins.lastInsertRowid),fish_key:f.fishKey,fish_name:f.fishName,rarity:f.rarity,length_cm:f.lengthCm,weight_kg:f.weightKg,value:f.value,zone_id:e.zone,caught_at:t};
    const fresh=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);
    const announcement={nickname:fresh.nickname,level:fresh.level,fishName:f.fishName,rarity:f.rarity,rarityName:f.rarityName,weightKg:f.weightKg,lengthCm:f.lengthCm,zone:ZONES[e.zone].name,trophy:f.trophy};
    if(RARITY[f.rarity].rank>=3 || f.trophy)broadcast('catch',announcement,e.zone);
    const oe=online.get(u.id);if(oe)oe.level=fresh.level;
    return json(res,200,{success:true,catch:catchRow,fish:f,progress:prog,user:publicUser(fresh),levelUps:prog.levels});
  })();

  if(method==='POST'&&p==='/api/sell') return (async()=>{
    const u=requireAuth(req,res);if(!u)return;const b=await bodyJson(req).catch(()=>({}));const id=Number(b.catchId||0);
    const c=db.prepare('SELECT * FROM catches WHERE id=? AND user_id=?').get(id,u.id);if(!c)return json(res,404,{error:'판매할 물고기를 찾을 수 없습니다.'});
    db.prepare('DELETE FROM catches WHERE id=?').run(id);db.prepare('UPDATE users SET gold=gold+? WHERE id=?').run(c.value,u.id);
    db.prepare('UPDATE user_stats SET total_earned=total_earned+? WHERE user_id=?').run(c.value,u.id);
    const fresh=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);return json(res,200,{ok:true,gold:fresh.gold,value:c.value});
  })();

  if(method==='POST'&&p==='/api/sell-all'){
    const u=requireAuth(req,res);if(!u)return;
    const sum=Number(db.prepare('SELECT COALESCE(SUM(value),0) v FROM catches WHERE user_id=?').get(u.id).v||0);
    const count=Number(db.prepare('SELECT COUNT(*) c FROM catches WHERE user_id=?').get(u.id).c||0);
    if(count){db.prepare('DELETE FROM catches WHERE user_id=?').run(u.id);db.prepare('UPDATE users SET gold=gold+? WHERE id=?').run(sum,u.id);db.prepare('UPDATE user_stats SET total_earned=total_earned+? WHERE user_id=?').run(sum,u.id)}
    const fresh=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);return json(res,200,{ok:true,gold:fresh.gold,value:sum,count});
  }

  if(method==='POST'&&p==='/api/shop/buy') return (async()=>{
    const u=requireAuth(req,res);if(!u)return;const b=await bodyJson(req).catch(()=>({}));const itemId=String(b.itemId||'');
    let fresh=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);
    if(BAITS[itemId]){
      const it=BAITS[itemId];if(fresh.gold<it.cost)return json(res,400,{error:'골드가 부족합니다.'});
      db.prepare('UPDATE users SET gold=gold-? WHERE id=?').run(it.cost,u.id);setItemQty(u.id,itemId,getItemQty(u.id,itemId)+it.pack);
      fresh=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);return json(res,200,{ok:true,gold:fresh.gold,qty:getItemQty(u.id,itemId),message:`${it.name} ${it.pack}개를 구매했습니다.`});
    }
    if(RODS[itemId]){
      const it=RODS[itemId];if(itemId==='starter_rod')return json(res,400,{error:'기본 장비입니다.'});
      if(fresh.level<it.level)return json(res,403,{error:`Lv.${it.level}부터 구매할 수 있습니다.`});
      if(db.prepare('SELECT 1 FROM owned_gear WHERE user_id=? AND item_id=?').get(u.id,itemId))return json(res,400,{error:'이미 보유한 장비입니다.'});
      if(fresh.gold<it.cost)return json(res,400,{error:'골드가 부족합니다.'});
      db.prepare('UPDATE users SET gold=gold-? WHERE id=?').run(it.cost,u.id);db.prepare('INSERT INTO owned_gear(user_id,item_id,acquired_at) VALUES(?,?,?)').run(u.id,itemId,now());
      fresh=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);return json(res,200,{ok:true,gold:fresh.gold,message:`${it.name}을(를) 구매했습니다.`});
    }
    return json(res,400,{error:'존재하지 않는 상품입니다.'});
  })();

  if(method==='POST'&&p==='/api/equip') return (async()=>{
    const u=requireAuth(req,res);if(!u)return;const b=await bodyJson(req).catch(()=>({}));const itemId=String(b.itemId||'');
    if(!RODS[itemId])return json(res,400,{error:'장비 정보가 잘못되었습니다.'});
    if(!db.prepare('SELECT 1 FROM owned_gear WHERE user_id=? AND item_id=?').get(u.id,itemId))return json(res,403,{error:'보유하지 않은 장비입니다.'});
    db.prepare('UPDATE users SET equipped_rod=? WHERE id=?').run(itemId,u.id);return json(res,200,{ok:true,equippedRod:itemId});
  })();

  return false;
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(url.pathname.startsWith('/api/') || url.pathname==='/healthz'){
      const handled=apiRoutes(req,res,url);
      if(handled===false)return json(res,404,{error:'API를 찾을 수 없습니다.'});
      if(handled && typeof handled.then==='function') await handled;
      return;
    }
    serveStatic(req,res,url.pathname);
  }catch(e){console.error(e);if(!res.headersSent)json(res,500,{error:'서버 오류가 발생했습니다.'});else res.end();}
});

setInterval(()=>{
  const t=now();
  db.prepare('DELETE FROM sessions WHERE expires_at<?').run(t);
  for(const [k,b] of rateBuckets)if(t-b.start>120_000)rateBuckets.delete(k);
  for(const [id,e] of online)if(t-e.last>120_000&&!e.clients.size)online.delete(id);
},60_000).unref();

server.listen(PORT,HOST,()=>{
  console.log(`\n🎣 준자의 낚시왕 RPG 서버 실행 중`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   같은 와이파이 친구: http://내-PC-IP:${PORT}`);
  console.log(`   종료: Ctrl+C\n`);
});
