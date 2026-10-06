import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOTS=['adventure-preview','adventure-online/image-prototype'];
const NAMES=['hero','rogue','mage','healer'];
const FW=192,FH=224,FRAMES=12,DIRS=3,STATES=['idle','walk','attack'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);

function blend(a,b,t){
 if(t<=.001)return Buffer.from(a);
 if(t>=.999)return Buffer.from(b);
 const out=Buffer.allocUnsafe(a.length),u=1-t;
 for(let i=0;i<a.length;i+=4){
  out[i]=(a[i]*u+b[i]*t+.5)|0;
  out[i+1]=(a[i+1]*u+b[i+1]*t+.5)|0;
  out[i+2]=(a[i+2]*u+b[i+2]*t+.5)|0;
  out[i+3]=(a[i+3]*u+b[i+3]*t+.5)|0;
 }
 return out;
}
function paste(sheet,sw,frame,x,y,ox=0,oy=0){
 const sx=Math.max(0,-ox),sy=Math.max(0,-oy),dx=x+Math.max(0,ox),dy=y+Math.max(0,oy);
 const w=FW-Math.abs(ox),h=FH-Math.abs(oy); if(w<=0||h<=0)return;
 for(let row=0;row<h;row++){
  const from=((sy+row)*FW+sx)*4,to=((dy+row)*sw+dx)*4;
  frame.copy(sheet,to,from,from+w*4);
 }
}
function between(keys,f,loop=true){
 const span=loop?keys.length:keys.length-1, z=(f/(FRAMES-(loop?0:1)))*span;
 const base=loop?(z%keys.length):Math.min(keys.length-1,z);
 const i=Math.floor(base),j=loop?(i+1)%keys.length:Math.min(keys.length-1,i+1);
 return {a:keys[i],b:keys[j],t:smooth(base-i)};
}
async function build(root,name){
 const src=path.join(root,'assets',name+'.png'),meta=await sharp(src).metadata();
 if(!meta.width||!meta.height)throw new Error(src+' has no readable dimensions');
 const cw=Math.floor(meta.width/4),ch=Math.floor(meta.height/3),cells=[];
 console.log(src,'source',meta.width+'x'+meta.height,'cell',cw+'x'+ch);
 for(let row=0;row<DIRS;row++){
  const r=[];
  for(let col=0;col<4;col++){
   r.push(await sharp(src).extract({left:col*cw,top:row*ch,width:cw,height:ch}).resize(FW,FH,{fit:'fill',kernel:'lanczos3'}).ensureAlpha().raw().toBuffer());
  }
  cells.push(r);
 }
 const SW=FW*FRAMES,SH=FH*STATES.length*DIRS,sheet=Buffer.alloc(SW*SH*4);
 for(let state=0;state<STATES.length;state++)for(let dir=0;dir<DIRS;dir++)for(let f=0;f<FRAMES;f++){
  let spec,ox=0,oy=0;
  if(state===0){spec={a:0,b:0,t:0};oy=-Math.round((1+Math.sin(f/FRAMES*Math.PI*2))*.65);}
  else if(state===1){spec=between([1,0,2,0],f,true);const phase=f/FRAMES*Math.PI*2;ox=Math.round(Math.sin(phase)*.8);oy=-Math.round(Math.abs(Math.sin(phase*2))*2);}
  else {spec=between([0,1,3,3,2,0],f,false);const p=f/(FRAMES-1);oy=-Math.round(Math.sin(p*Math.PI)*2.2);ox=dir===2?Math.round(Math.sin(p*Math.PI)*2):0;}
  const frame=blend(cells[dir][spec.a],cells[dir][spec.b],spec.t);
  paste(sheet,SW,frame,f*FW,(state*DIRS+dir)*FH,ox,oy);
 }
 const out=path.join(root,'assets',name+'-motion.webp');
 await sharp(sheet,{raw:{width:SW,height:SH,channels:4}}).webp({quality:88,alphaQuality:96,smartSubsample:true,effort:6}).toFile(out);
 console.log(name,'=>',out,SW+'x'+SH);
}
for(const root of ROOTS)for(const name of NAMES)await build(root,name);
