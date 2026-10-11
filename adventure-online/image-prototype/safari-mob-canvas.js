// Safari/iOS monster compositing: one transparent 2D canvas replaces dozens
// of independently promoted normal-enemy DOM layers. The server still owns
// monster positions, HP, hit detection, attacks and rewards.
const cache=new Map();
function sourceOf(e){
 const style=e.art?.style?.backgroundImage||'';
 const url=/url\((?:"|')?([^"')]+)(?:"|')?\)/.exec(style)?.[1];
 return url||'./assets/squirrel.png';
}
function imageFor(src){
 let item=cache.get(src);
 if(!item){
  const image=new Image();item={image,ready:false};
  image.onload=()=>{item.ready=true;};image.onerror=()=>{item.ready=false;};
  image.src=src;cache.set(src,item);
 }
 return item;
}
export function createSafariMobPainter(viewport){
 const canvas=document.createElement('canvas');
 canvas.id='safariMobCanvas';
 canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;';
 viewport.append(canvas);
 const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
 if(!ctx)return{canvas,draw:()=>{}};
 let lastAt=-Infinity,lastSize='',painted=0;
 function draw(enemies,cam,scale,time,nowSeconds,viewportW,viewportH,selected){
  if(time-lastAt<.10)return;
  const dt=Math.min(.15,Math.max(.016,time-lastAt||.05));lastAt=time;
  const w=Math.max(1,Math.round(viewportW)),h=Math.max(1,Math.round(viewportH)),dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const size=w+'x'+h+'x'+dpr;
  if(lastSize!==size){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);lastSize=size;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);painted=0;
  for(const e of enemies.values()){
   if(e.boss||!e.alive)continue;
   const age=Math.min(.12,Math.max(0,nowSeconds-(e.sampleAt||nowSeconds)));
   const tx=e.x+(e.netVx||0)*age,ty=e.y+(e.netVy||0)*age;
   const previousX=Number.isFinite(e.canvasX)?e.canvasX:tx,previousY=Number.isFinite(e.canvasY)?e.canvasY:ty;
   const distance=Math.hypot(tx-previousX,ty-previousY),mix=distance>170?1:1-Math.exp(-17*dt);
   e.canvasX=previousX+(tx-previousX)*mix;e.canvasY=previousY+(ty-previousY)*mix;
   const x=(e.canvasX-cam.x)*scale,y=(e.canvasY-cam.y)*scale;
   const sw=(e.mmo?125:80)*scale,sh=(e.mmo?84:78)*scale;
   if(x+sw<-30||x-sw>w+30||y+sh<0||y-sh>h)continue;
   const asset=imageFor(sourceOf(e));
   if(!asset.ready||!asset.image.naturalWidth)continue;
   if(e.illustrated){
    // Name-matched original paintings already have their own full source art.
    const iw=asset.image.naturalWidth,ih=asset.image.naturalHeight;
    const factor=Math.min(sw/iw,sh/ih),pw=iw*factor,ph=ih*factor;
    ctx.drawImage(asset.image,x-pw/2,y-ph,pw,ph);
   }else{
    const rows=e.mmo?4:2,col=e.tellAt?3:1+Math.floor(time*8)%2;
    const row=e.mmo?({'stoneking':0,'shadowking':1,'dragon':2}[e.named]??e.skin??3):(e.boss?1:0);
    const iw=asset.image.naturalWidth/4,ih=asset.image.naturalHeight/rows;
    ctx.drawImage(asset.image,col*iw,Math.max(0,Math.min(rows-1,row))*ih,iw,ih,x-sw/2,y-sh,sw,sh);
   }
   const hp=Math.max(0,Math.min(1,(Number(e.hp)||0)/Math.max(1,Number(e.max)||1)));
   const bw=Math.min(66,sw*.74),bh=3,by=y-sh-7;
   ctx.fillStyle='#1c1a16';ctx.fillRect(x-bw/2,by,bw,bh);
   ctx.fillStyle='#f07f67';ctx.fillRect(x-bw/2,by,bw*hp,bh);
   ctx.font='600 '+Math.max(9,Math.round(11*scale))+'px sans-serif';
   ctx.textAlign='center';ctx.textBaseline='bottom';
   ctx.lineWidth=3;ctx.strokeStyle='#101514';ctx.strokeText((e.name||'몬스터')+' Lv.'+(e.level||1),x,by-3);
   ctx.fillStyle='#fff0d6';ctx.fillText((e.name||'몬스터')+' Lv.'+(e.level||1),x,by-3);
   if(e.id===selected){ctx.beginPath();ctx.ellipse(x,y-3,sw*.4,5,0,0,Math.PI*2);ctx.strokeStyle='#ffdd70';ctx.lineWidth=2;ctx.stroke();}
   painted++;
  }
 }
 return {canvas,draw,get painted(){return painted}};
}
