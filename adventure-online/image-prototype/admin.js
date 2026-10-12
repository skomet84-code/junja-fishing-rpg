'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const model={token:sessionStorage.getItem('junja_admin_token')||'',tab:'overview',current:null,slot:0,users:[],items:[],overview:null,busy:false};
function notice(message,type='ok'){
 const el=$('notice');el.hidden=!message;el.className='notice '+type;el.textContent=message||'';
 if(message)el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function api(path,method='GET',data){
 const r=await fetch(path,{method,headers:{'content-type':'application/json',...(model.token?{authorization:'Bearer '+model.token}:{})},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});
 let obj={};try{obj=await r.json();}catch{}
 if(!r.ok)throw Error(obj.error||'서버 응답 오류 ('+r.status+')');
 return obj;
}
async function verifySession(){
 if(!model.token)return false;
 try{
  const data=await api('/api/admin/panel/overview');
  model.overview=data;return true;
 }catch{return false;}
}
async function showLoggedIn(){
 $('loginScreen').hidden=true;$('app').hidden=false;
 await Promise.all([loadOverview(),loadItems(),loadUsers('')]);
 selectTab(model.tab);notice('');
}
function showLogin(msg=''){
 sessionStorage.removeItem('junja_admin_token');model.token='';
 $('app').hidden=true;$('loginScreen').hidden=false;$('loginMessage').textContent=msg;
}
function selectTab(tab){
 model.tab=tab;
 for(const name of ['overview','users','records'])$('view'+name[0].toUpperCase()+name.slice(1)).hidden=tab!==name;
 for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===tab);
 $('viewTitle').textContent=({overview:'운영 현황',users:'유저 및 캐릭터 관리',records:'운영 기록'})[tab];
 if(tab==='records'&&model.overview)paintAudit(model.overview.events||[]);
}
function paintAudit(logs){
 for(const id of ['recentOverview','allRecords']){
  $(id).innerHTML=logs.length?logs.map(x=>'<div class="record"><div><strong>'+esc(x.target_name)+' · '+esc(x.action)+'</strong><span>'+esc(x.detail)+'</span></div><time>'+esc(new Date(x.created_at).toLocaleString('ko-KR'))+'</time></div>').join(''):'<p class="muted">아직 관리 작업 기록이 없습니다.</p>';
 }
}
async function loadOverview(){
 const d=await api('/api/admin/panel/overview');model.overview=d;
 $('totalUsers').textContent=d.totalUsers.toLocaleString('ko-KR');
 $('onlineUsers').textContent=d.onlineUsers.toLocaleString('ko-KR');
 $('onlineCharacters').textContent=d.onlineCharacters.toLocaleString('ko-KR');
 paintAudit(d.events||[]);
}
async function loadItems(){const d=await api('/api/admin/panel/items');model.items=d.items||[];}
async function loadUsers(query=''){
 const d=await api('/api/admin/panel/users?q='+encodeURIComponent(query));
 model.users=d.users||[];
 $('usersList').innerHTML=model.users.length?model.users.map(u=>{
  const best=u.best||{};
  return '<button type="button" class="user '+(model.current?.username===u.username?'active':'')+'" data-user="'+esc(u.username)+'"><span><strong>'+esc(u.username)+'</strong><small>'+esc(best.job||'-')+' · Lv.'+esc(best.level||1)+' · '+esc(best.rank||0)+'차</small></span><span class="'+(u.online?'online':'offline')+'">'+(u.online?'접속 중':'오프라인')+'</span></button>';
 }).join(''):'<p class="muted">검색 결과가 없습니다.</p>';
 for(const b of $('usersList').querySelectorAll('[data-user]'))b.addEventListener('click',()=>loadUser(b.dataset.user).catch(error=>notice(error.message,'error')));
}
async function loadUser(name){
 const d=await api('/api/admin/panel/user?username='+encodeURIComponent(name));
 model.current=d;model.slot=0;
 $('selectedInfo').hidden=false;$('selectedTitle').textContent='👤 '+d.username;
 $('selectedHint').textContent=d.online?'현재 접속 중 · 수정하면 해당 계정이 재접속됩니다.':'접속하지 않은 계정';
 $('characterSlot').innerHTML=d.characters.map(c=>'<option value="'+c.slot+'">'+esc(c.jobName)+' · Lv.'+c.level+' · '+c.rank+'차</option>').join('');
 paintCharacter();paintBackups();
 for(const b of $('usersList').querySelectorAll('[data-user]'))b.classList.toggle('active',b.dataset.user===name);
}
function currentCharacter(){return model.current?.characters?.[model.slot]||null;}
function paintCharacter(){
 const c=currentCharacter();if(!c)return;
 $('characterSlot').value=String(model.slot);
 const equip=c.equipment.length?c.equipment.map(x=>esc(x.name)).join(' · '):'없음';
 $('characterDetails').innerHTML='<strong>'+esc(c.jobName)+' · Lv.'+c.level+' / '+c.rank+'차 전직</strong>'
  +'<div class="tags"><span class="tag">골드 '+Number(c.gold).toLocaleString('ko-KR')+'</span><span class="tag">가방 '+c.bag.length+'/80</span><span class="tag">보스 '+c.bossKills+'</span><span class="tag">태초 수령함 '+c.pending.length+'개</span></div>'
  +'<p class="hint"><b>착용 장비:</b> '+equip+'</p>'
  +'<p class="hint"><b>보유 장비:</b> '+(c.bag.filter(x=>x.id!=='training').slice(0,16).map(x=>esc(x.name)).join(', ')||'없음')+(c.bag.length>16?' 외':'')+'</p>';
 const sel=$('itemId');
 const filtered=model.items.filter(item=>!item.job||item.job===c.job);
 sel.innerHTML=filtered.map(item=>'<option value="'+esc(item.id)+'">['+esc(item.rarity)+'] '+esc(item.name)+' · Lv.'+item.level+'</option>').join('');
 actionFields();
}
function paintBackups(){
 const rows=model.current?.backups||[];
 $('backups').innerHTML=rows.length?rows.map(b=>'<div class="backup"><span>#'+b.id+' · '+esc(b.reason)+'<br><small>'+esc(new Date(b.created_at).toLocaleString('ko-KR'))+'</small></span><button type="button" data-restore="'+b.id+'">복구</button></div>').join(''):'<p class="hint">아직 자동 백업이 없습니다. 다음 수정부터 생성됩니다.</p>';
 for(const b of $('backups').querySelectorAll('[data-restore]'))b.addEventListener('click',()=>runAction('restore',Number(b.dataset.restore)));
}
function actionFields(){
 const type=$('actionType').value;
 $('setFields').hidden=type!=='grant-set';
 $('itemFields').hidden=type!=='grant-item';
 $('valueFields').hidden=!['set-level','set-rank','set-gold','add-gold','grant-stones'].includes(type);
 $('stoneFields').hidden=type!=='grant-stones';
 const labels={'set-level':'설정할 레벨 (1~1500)','set-rank':'전직 단계 (0~12)','set-gold':'설정할 골드','add-gold':'추가할 골드','grant-stones':'지급할 강화석 개수'};
 $('valueLabel').firstChild.textContent=labels[type]||'수량 입력';
 $('actionValue').min=type==='set-level'||type==='grant-stones'?'1':'0';
 $('actionValue').max=type==='set-level'?'1500':type==='set-rank'?'12':type==='grant-stones'?'9999':'1000000000000';
 $('actionNote').textContent=type==='reset-password'?'무작위 임시 비밀번호를 새로 발급합니다. 이전 접속 세션은 종료되고 새 비밀번호는 이 화면에 한 번 표시됩니다.':type==='grant-set'?'7부위 세트를 가방에 지급합니다. 태초 등급만 가방이 찬 경우 수령함으로 들어갑니다.':type==='set-level'||type==='set-rank'?'캐릭터 진행을 수정합니다. 저장 전 백업이 생성됩니다.':'실제 운영 서버의 저장 데이터를 변경합니다. 변경 전 백업과 작업 기록이 남습니다.';
}
async function runAction(override=null,backupId=null){
 if(model.busy||!model.current)return;
 const c=currentCharacter(),type=override||$('actionType').value;
 const name=model.current.username;
 let input={username:name,confirmUsername:name,slot:model.slot,type};
 if(type==='grant-set')input.set=$('setKey').value;
 if(type==='grant-item'){input.item=$('itemId').value;input.qty=$('itemQty').value;}
 if(['set-level','set-rank','set-gold','add-gold','grant-stones'].includes(type))input.value=$('actionValue').value;
 if(type==='grant-stones')input.stone=$('stoneType').value;
 if(type==='restore')input.backupId=backupId;
 const details=type==='grant-set'?$('setKey').selectedOptions[0]?.textContent:type==='grant-item'?$('itemId').selectedOptions[0]?.textContent+' ×'+input.qty:type==='restore'?'백업 #'+backupId+' 복구 (계정 전체 캐릭터에 적용)':type==='reset-password'?'비밀번호 재설정':type;
 const risky=['restore','reset-password'].includes(type);
 if(risky){if(prompt('중요 변경입니다. 대상 계정명을 정확히 입력하세요: '+name)!==name)return;}
 else if(!confirm(name+' / '+c.jobName+'\n'+details+'\n\n실행하시겠습니까?'))return;
 model.busy=true;$('executeAction').disabled=true;notice('');
 try{
  const data=await api('/api/admin/panel/action','POST',input);
  notice(data.temporaryPassword?'변경 성공: '+data.username+'\n\n임시 비밀번호: '+data.temporaryPassword+'\n\n이 화면을 닫기 전 사용자에게 안전하게 전달하세요.':name+' · '+data.detail+' 완료','ok');
  await Promise.all([loadOverview(),loadUsers($('userSearch').value)]);
  await loadUser(name);
 }catch(e){notice(e.message,'error');}
 finally{model.busy=false;$('executeAction').disabled=false;}
}
async function refresh(){
 try{
  if(model.tab==='users'){
   await loadUsers($('userSearch').value);
   if(model.current)await loadUser(model.current.username);
  }else await loadOverview();
  notice('서버 정보를 새로 불러왔습니다.');
 }catch(e){notice(e.message,'error');}
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('loginForm').querySelector('button');button.disabled=true;$('loginMessage').textContent='';
 try{
  const r=await api('/api/login','POST',{username:'admin_junja',password:$('loginPassword').value});
  model.token=r.token;sessionStorage.setItem('junja_admin_token',r.token);
  if(!await verifySession())throw Error('이 계정에는 관리자 페이지 접근 권한이 없습니다.');
  $('loginPassword').value='';
  await showLoggedIn();
 }catch(e){showLogin(e.message);}finally{button.disabled=false;}
});
$('logoutBtn').addEventListener('click',async()=>{try{await api('/api/admin/panel/logout','POST',{});}catch{}showLogin('로그아웃했습니다.');});
for(const button of document.querySelectorAll('[data-tab]'))button.addEventListener('click',()=>selectTab(button.dataset.tab));
$('showRecords').addEventListener('click',()=>selectTab('records'));
$('refreshBtn').addEventListener('click',refresh);
$('searchBtn').addEventListener('click',()=>loadUsers($('userSearch').value).catch(e=>notice(e.message,'error')));
$('userSearch').addEventListener('keydown',e=>{if(e.key==='Enter')$('searchBtn').click();});
$('quickGo').addEventListener('click',async()=>{
 $('userSearch').value=$('quickSearch').value;selectTab('users');
 try{await loadUsers($('userSearch').value);if(model.users.length===1)await loadUser(model.users[0].username);}catch(e){notice(e.message,'error');}
});
$('characterSlot').addEventListener('change',e=>{model.slot=Number(e.target.value);paintCharacter();});
$('actionType').addEventListener('change',actionFields);
$('executeAction').addEventListener('click',()=>runAction());
if(model.token)verifySession().then(ok=>ok?showLoggedIn().catch(e=>showLogin(e.message)):showLogin('관리자 인증이 만료되었습니다. 다시 로그인하세요.'));
setInterval(()=>{if(!document.hidden&&model.token&&model.tab!=='users')loadOverview().catch(()=>{});},60000);
