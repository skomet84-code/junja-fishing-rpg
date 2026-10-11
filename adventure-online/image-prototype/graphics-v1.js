// Generated 2D graphics v1 — presentation-only. Server identity, damage, and drops stay authoritative.
// Character sheet: 4 jobs x 2 frames (8 columns), idle/walk/attack (3 rows).
// Monster sheet: 9 illustrated families (3 columns x 3 rows).
export const CHARACTERS_V1='characters-v1.webp';
export const MONSTERS_V1='monsters-v1.webp';
export function characterColumn(job){return {warrior:0,rogue:1,mage:2,healer:3}[job]??-1;}
export function characterCell(job,mode='idle',frame=0){
 const column=characterColumn(job);if(column<0)return null;
 const row=mode==='attack'||mode==='skill'?2:mode==='walk'?1:0;
 const f=frame?1:0;
 return {column:column*2+f,row,backgroundSize:'800% 300%',backgroundPosition:`${(column*2+f)*100/7}% ${row*50}%`};
}
export function monsterCell(name,zone='',boss=false){
 const n=String(name||'');
 let index=null;
 if(/다람쥐|청설모/.test(n))index=0;
 else if(/버섯|독균|곰팡|포자/.test(n))index=1;
 else if(/슬라임|점액/.test(n))index=2;
 else if(/늑대|암영 짐승|그림자 짐승|추적자/.test(n))index=3;
 else if(/멧돼지|산돼지|돼지왕|야생 멧돼지/.test(n))index=4;
 else if(/박쥐|흡혈귀 박쥐/.test(n))index=5;
 else if(/고목|수호수|나무 정령|나무정령|숲정령/.test(n))index=6;
 else if(/골렘|석상 거인|바위 거인/.test(n))index=7;
 else if((zone==='surface'||zone==='grove')&&boss&&/숲.*수호자|수호.*나무|수호.*정령/.test(n))index=8;
 if(index===null)return null;
 return {index,col:index%3,row:Math.floor(index/3),backgroundSize:'300% 300%',backgroundPosition:`${(index%3)*50}% ${Math.floor(index/3)*50}%`};
}
export function newArtRequested(search=''){
 const flags=new URLSearchParams(String(search).replace(/^\?/,''));return flags.get('graphics')!=='legacy';
}
