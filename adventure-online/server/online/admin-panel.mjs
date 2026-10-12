import {randomBytes,scrypt as nativeScrypt} from 'node:crypto';
import {promisify} from 'node:util';
import {ITEMS,JOBS,profile,stats} from '../../image-prototype/catalog.js';
import {LEVEL_CAP,PROMOTIONS,classWeapon} from '../../image-prototype/mmo-data.js';

const scrypt=promisify(nativeScrypt);
const SETS={
 primordial:['primordialblade','primordialarmor','primordialcape','primordialcrown','primordialboots','primordialring','primordialear'],
 primordialcreation:['primordialcreationblade','primordialcreationarmor','primordialcreationcape','primordialcreationcrown','primordialcreationboots','primordialcreationring','primordialcreationear'],
 mythic:['mythicblade','mythicarmor','mythiccape','mythiccrown','mythicboots','mythicring','mythicear'],
 astral:['astralblade','astralarmor','astralcape','astralcrown','astralboots','astralring','astralear']
};
const editing=new Set();
let ready=false;
export async function initAdminPanel(pool){
 if(!pool)return false;
 try{
  await pool.query("CREATE TABLE IF NOT EXISTS junja_adventure_online.admin_panel_audit(id bigserial PRIMARY KEY,actor_id text NOT NULL,target_id text NOT NULL,target_name text NOT NULL,action text NOT NULL,detail text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())");
  await pool.query("CREATE TABLE IF NOT EXISTS junja_adventure_online.admin_panel_backups(id bigserial PRIMARY KEY,target_id text NOT NULL,roster jsonb NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())");
  await pool.query("CREATE INDEX IF NOT EXISTS admin_panel_backup_user_idx ON junja_adventure_online.admin_panel_backups(target_id,id DESC)");
  ready=true;console.log('[ADMIN-PANEL] Protected administration ready.');
 }catch(e){ready=false;console.error('[ADMIN-PANEL] Migration failed',e.code||e.message);}
 return ready;
}
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const isInt=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const number=(raw,min,max)=>{const n=Number(raw);if(raw===null||raw===''||!isInt(n,min,max))fail('허용 범위의 정수를 입력하세요. ('+min+' ~ '+max+')');return n;};
const accountSummary=(a,onlineIds)=>{
 const slots=(Array.isArray(a.roster)?a.roster:[]).map((s,i)=>({slot:i,job:s?.job||Object.keys(JOBS)[i]||'warrior',level:Number(s?.level)||1,rank:Number(s?.rank)||0,bagCount:s?.bag?.length||0}));
 const top=slots.reduce((best,s)=>!best||s.level>best.level?s:best,null);
 return {id:a.id,username:a.username,online:onlineIds.has(a.id),best:top,slots,updatedAt:a.updated_at};
};
const safeCharacter=(s,i)=>({
 slot:i,job:s.job,jobName:JOBS[s.job]?.name||s.job,level:s.level,rank:s.rank,gold:s.gold||0,
 kills:s.kills||0,bossKills:s.bossKills||0,zone:s.zone||'surface',
 equipment:Object.entries(s.equipment||{}).map(([slot,id])=>({slot,id,name:ITEMS[id]?.name||id})),
 bag:(s.bag||[]).map((id,index)=>({index,id,name:ITEMS[id]?.name||id,level:ITEMS[id]?.level||1,rarity:ITEMS[id]?.rarity||'normal'})),
 pending:(s.primordialPending||[]).map(id=>({id,name:ITEMS[id]?.name||id})),
 enhanceStones:s.enhanceStones||0,shiningStones:s.shiningStones||0,
 materials:s.materials||{},stats:stats(s)
});
export function getSetIds(key,job){
 const ids=SETS[key];
 if(!ids||!Object.hasOwn(JOBS,job))fail('장비 세트나 직업을 확인하세요.');
 const actual=ids.map((id,i)=>i===0?classWeapon(id,job):id);
 if(actual.some(id=>!ITEMS[id]))fail('선택한 세트를 지급할 수 없습니다.');
 return actual;
}
export function changeCharacter(s,input){
 const kind=String(input.type||'');
 let detail='';
 if(kind==='grant-item'||kind==='grant-set'){
  let ids;
  if(kind==='grant-set')ids=getSetIds(String(input.set||''),s.job);
  else{
   const id=String(input.item||'');
   if(!Object.hasOwn(ITEMS,id)||['training','glowing'].includes(id))fail('아이템을 확인하세요.');
   if(ITEMS[id].job&&ITEMS[id].job!==s.job)fail('현재 직업에 맞는 장비만 지급할 수 있습니다.');
   ids=Array(number(input.qty,1,20)).fill(id);
  }
  s.bag=Array.isArray(s.bag)?s.bag:[];
  s.primordialPending=Array.isArray(s.primordialPending)?s.primordialPending:[];
  if(s.bag.length+s.primordialPending.length+ids.length>160 || ids.some(id=>ITEMS[id].rarity!=='primordial')&&s.bag.length+ids.filter(id=>ITEMS[id].rarity!=='primordial').length>80)fail('가방 공간이 부족합니다.');
  for(const id of ids){
   if(s.bag.length<80)s.bag.push(id);
   else if(ITEMS[id].rarity==='primordial'&&s.primordialPending.length<80)s.primordialPending.push(id);
   else fail('가방 공간이 부족합니다.');
  }
  detail=ids.map(id=>ITEMS[id].name).join(', ');
 }else if(kind==='set-level'){
  s.level=number(input.value,1,LEVEL_CAP);
  s.exp=0;
  s.hp=stats(s).hp;s.mp=stats(s).mp;
  detail='레벨 '+s.level;
 }else if(kind==='set-rank'){
  const rank=number(input.value,0,PROMOTIONS.length);
  if(rank>0&&s.level<PROMOTIONS[rank-1].level)fail('해당 전직에 필요한 최소 레벨에 미달합니다.');
  s.rank=rank;s.hp=stats(s).hp;s.mp=stats(s).mp;
  detail='전직 '+rank+'차';
 }else if(kind==='set-gold'||kind==='add-gold'){
  const value=number(input.value,0,1000000000000);
  s.gold=kind==='set-gold'?value:(number(s.gold||0,0,1000000000000)+value);
  if(!Number.isSafeInteger(s.gold)||s.gold>1000000000000)fail('골드 상한을 넘었습니다.');
  detail=(kind==='set-gold'?'골드 설정 ':'골드 추가 ')+value;
 }else if(kind==='grant-stones'){
  const value=number(input.value,1,9999),field=input.stone==='shining'?'shiningStones':'enhanceStones';
  s[field]=Math.min(9999,Math.max(0,Math.floor(s[field]||0))+value);
  detail=(field==='shiningStones'?'빛나는':'일반')+' 강화석 +'+value;
 }else fail('지원하지 않는 관리자 명령입니다.');
 return detail;
}
export async function handleAdminPanel(req,res,url,ctx){
 const {pool,accounts,world,disconnect,json,body,actor}=ctx;
 if(!ready||!pool){json(req,res,{error:'관리자 DB 준비 중입니다.'},503);return;}
 try{
  if(url.pathname==='/api/admin/panel/overview'&&req.method==='GET'){
   const [total,audit]=await Promise.all([
    pool.query('SELECT count(*)::int AS total FROM junja_adventure_online.accounts'),
    pool.query('SELECT id,target_name,action,detail,created_at FROM junja_adventure_online.admin_panel_audit ORDER BY id DESC LIMIT 30')
   ]);
   const onlineIds=new Set([...world.players.keys()].map(x=>x.split(':')[0]));
   json(req,res,{ok:true,totalUsers:total.rows[0].total,onlineUsers:onlineIds.size,onlineCharacters:world.players.size,build:ctx.build,storage:'PostgreSQL',events:audit.rows});
   return;
  }
  if(url.pathname==='/api/admin/panel/users'&&req.method==='GET'){
   const q=String(url.searchParams.get('q')||'').trim().slice(0,40);
   const rows=await pool.query("SELECT id,username,roster,updated_at FROM junja_adventure_online.accounts WHERE lower(username) LIKE lower($1) ORDER BY updated_at DESC LIMIT 80",['%'+q+'%']);
   const onlineIds=new Set([...world.players.keys()].map(x=>x.split(':')[0]));
   json(req,res,{ok:true,users:rows.rows.map(a=>accountSummary(accounts.get(a.id)&&!accounts.get(a.id).locked?{...a,roster:accounts.get(a.id).roster}:a,onlineIds))});
   return;
  }
  if(url.pathname==='/api/admin/panel/items'&&req.method==='GET'){
   const list=Object.entries(ITEMS).filter(([id])=>!['training','glowing'].includes(id)).map(([id,v])=>({id,name:v.name,rarity:v.rarity,level:v.level||1,slot:v.slot,job:v.job||''}));
   json(req,res,{ok:true,items:list,sets:Object.keys(SETS),jobs:Object.entries(JOBS).map(([id,j])=>({id,name:j.name})),maxLevel:LEVEL_CAP,maxRank:PROMOTIONS.length});
   return;
  }
  if(url.pathname==='/api/admin/panel/user'&&req.method==='GET'){
   const name=String(url.searchParams.get('username')||'').trim();
   if(!name||name.length>40)fail('유저 이름을 확인하세요.');
   const r=await pool.query("SELECT id,username,roster,updated_at FROM junja_adventure_online.accounts WHERE username=$1",[name]);
   if(!r.rowCount)fail('해당 유저를 찾을 수 없습니다.',404);
   const row=r.rows[0],cached=accounts.get(row.id),roster=cached&&!cached.locked?cached.roster:row.roster;
   const b=await pool.query('SELECT id,reason,created_at FROM junja_adventure_online.admin_panel_backups WHERE target_id=$1 ORDER BY id DESC LIMIT 8',[row.id]);
   json(req,res,{ok:true,username:row.username,online:[...world.players.keys()].some(id=>id.startsWith(row.id+':')),characters:roster.map((s,i)=>safeCharacter(profile(s,Object.keys(JOBS)[i]),i)),backups:b.rows});
   return;
  }
  if(url.pathname==='/api/admin/panel/action'&&req.method==='POST'){
   const input=await body(req);
   const username=String(input.username||'').trim();
   if(!username||username.length>40||input.confirmUsername!==username)fail('유저 이름을 다시 확인해주세요.');
   const row=(await pool.query('SELECT id,username FROM junja_adventure_online.accounts WHERE username=$1',[username])).rows[0];
   if(!row)fail('해당 유저가 없습니다.',404);
   if(row.id===actor.id)fail('운영자 본인 계정은 이 화면에서 수정할 수 없습니다.',403);
   if(editing.has(row.id))fail('해당 유저의 데이터가 수정 중입니다.',409);
   editing.add(row.id);
   const cached=accounts.get(row.id);
   let db=null,committed=false,newPassword=null,updatedRoster=null,passwordSalt=null,passwordHash=null;
   try{
    if(cached){
     if(cached.locked)fail('유저가 현재 거래 또는 저장 중입니다.',409);
     for(const id of [...world.players.keys()])if(id.startsWith(row.id+':'))disconnect(id,'운영자가 데이터를 변경했습니다. 재접속해주세요.');
     cached.locked=true;
     while(cached.saving)await new Promise(resolve=>setTimeout(resolve,20));
    }
    db=await pool.connect();await db.query('BEGIN');
    const result=await db.query('SELECT id,username,roster FROM junja_adventure_online.accounts WHERE id=$1 FOR UPDATE',[row.id]);
    if(!result.rowCount)fail('유저 데이터를 찾을 수 없습니다.',404);
    const before=structuredClone(cached?cached.roster:result.rows[0].roster);
    const roster=structuredClone(before);
    const slot=number(input.slot,0,3);
    if(!Array.isArray(roster)||!roster[slot])fail('캐릭터 슬롯이 존재하지 않습니다.');
    const s=roster[slot];
    const type=String(input.type||'');
    let detail='';
    if(type==='restore'){
     const bid=number(input.backupId,1,Number.MAX_SAFE_INTEGER);
     const old=await db.query('SELECT roster FROM junja_adventure_online.admin_panel_backups WHERE id=$1 AND target_id=$2',[bid,row.id]);
     if(!old.rowCount)fail('해당 백업을 찾을 수 없습니다.',404);
     updatedRoster=old.rows[0].roster;
     if(!Array.isArray(updatedRoster)||updatedRoster.length!==roster.length)fail('백업 구조가 일치하지 않습니다.');
     detail='저장본 #'+bid+' 복구';
    }else if(type==='reset-password'){
     newPassword=randomBytes(24).toString('base64url');
     passwordSalt=randomBytes(16).toString('hex');
     passwordHash=(await scrypt(newPassword,passwordSalt,64)).toString('hex');
     detail='임시 비밀번호 재발급 (기존 접속 세션 만료)';
     updatedRoster=roster;
    }else{
     detail=changeCharacter(s,input);
     updatedRoster=roster;
    }
    await db.query('INSERT INTO junja_adventure_online.admin_panel_backups(target_id,roster,reason) VALUES($1,$2,$3)',[row.id,JSON.stringify(before),type]);
    await db.query('UPDATE junja_adventure_online.accounts SET roster=$2,updated_at=now() WHERE id=$1',[row.id,JSON.stringify(updatedRoster)]);
    if(passwordHash){
     await db.query('UPDATE junja_adventure_online.accounts SET salt=$2,password_hash=$3 WHERE id=$1',[row.id,passwordSalt,passwordHash]);
     await db.query('DELETE FROM junja_adventure_online.sessions WHERE account_id=$1',[row.id]);
    }
    await db.query('INSERT INTO junja_adventure_online.admin_panel_audit(actor_id,target_id,target_name,action,detail) VALUES($1,$2,$3,$4,$5)',[actor.id,row.id,row.username,type,detail]);
    await db.query('COMMIT');committed=true;
    if(cached){
     cached.roster=structuredClone(updatedRoster);cached.dirty=false;cached.rev++;cached.saveError=false;
     if(passwordHash){cached.salt=passwordSalt;cached.password_hash=passwordHash;}
    }
    if(passwordHash)ctx.revokeSessions(row.id);
    json(req,res,{ok:true,username:row.username,detail,...(newPassword?{temporaryPassword:newPassword}:{})});
   }catch(e){if(db&&!committed)await db.query('ROLLBACK').catch(()=>{});throw e;}
   finally{db?.release();if(cached)cached.locked=false;editing.delete(row.id);}
   return;
  }
  json(req,res,{error:'관리자 요청을 찾을 수 없습니다.'},404);
 }catch(e){
  if(e.status)json(req,res,{error:e.message},e.status);
  else{console.error('[ADMIN-PANEL] Request failed',e.code||e.message);json(req,res,{error:'관리 요청을 처리하지 못했습니다.'},500);}
 }
}
