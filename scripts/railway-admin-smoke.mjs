'use strict';
const endpoints=[
 {name:'Adventure',base:'https://junja-adventure-online-production.up.railway.app',health:'/health'},
 {name:'Land',base:'https://junja-land-online-production.up.railway.app',health:'/healthz'}
];
for(const {name,base,health} of endpoints){
  const api=async(path,options={},expected=200)=>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const res=await fetch(base+path,{...options,signal:controller.signal});
      const text=await res.text();
      if(res.status!==expected)throw Error(name+' '+path+' HTTP '+res.status+' expected '+expected+': '+text.slice(0,200));
      return text;
    }finally{clearTimeout(timeout);}
  };
  const post=(path,body,expected)=>api(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)},expected);
  const healthBody=JSON.parse(await api(health));
  if(!healthBody.ok)throw Error(name+' health not OK');
  const html=await api('/admin-setup.html');
  if(!html.includes('admin_junja')||!html.includes('admin-setup.js'))throw Error(name+' setup form missing');
  const js=await api('/admin-setup.js');
  if(!js.includes('/api/admin/claim'))throw Error(name+' setup script missing');
  const denied=JSON.parse(await post('/api/admin/claim',{setupCode:'invalid-setup-code',password:'not_the_admin_password_1234'},403));
  if(!denied.error)throw Error(name+' admin claim bypass');
  const user='admin_junja',password='not_the_admin_password_1234';
  const body=name==='Land'?{username:user,nickname:'테스트관리자',password}:{username:user,password};
  const reserve=JSON.parse(await post('/api/register',body,403));
  if(!reserve.error)throw Error(name+' reserved name not protected');
  console.log(name+' ADMIN_CLAIM_PAGE_AND_SECURITY_SMOKE_OK');
}
console.log('RAILWAY_ADMIN_SETUP_SAFE_OK');
