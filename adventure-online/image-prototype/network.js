const SAFE={groveIntro:'complete',groveHunt:'active',groveBoss:'bossActive',caveIntro:'complete',caveHunt:'active',caveBoss:'bossActive',ruinsIntro:'complete',ruinsHunt:'active',ruinsBoss:'bossActive',abyssIntro:'complete',abyssHunt:'active',abyssElite:'active',abyssBoss:'bossActive',celestialIntro:'complete',celestialHunt:'active',celestialBoss:'bossActive',storyDone:'done'};
const STORY={
 groveIntro:['2장 · 깊은숲의 이상징후','촌장에게 깊은숲 조사 임무를 받으세요.','다음 임무 수락'],
 groveHunt:['깊은 다람쥐숲 정찰',s=>`깊은숲 몬스터 처치 ${Math.min(12,s.questKills||0)} / 12`,'사냥 계속하기'],
 groveBoss:['고목의 수호수','깊은숲 보스 고목의 수호수를 처치하세요.','보스 찾아가기'],
 caveIntro:['3장 · 수정 동굴의 균열','촌장에게 수정 동굴 조사 임무를 받으세요.','다음 임무 수락'],
 caveHunt:['수정 동굴 조사',s=>`동굴 몬스터 처치 ${Math.min(15,s.questKills||0)} / 15`,'사냥 계속하기'],
 caveBoss:['수정 동굴주','동굴 최심부의 수정 동굴주를 처치하세요.','보스 찾아가기'],
 ruinsIntro:['4장 · 붉은 폐허','촌장에게 폐허 정화 임무를 받으세요.','다음 임무 수락'],
 ruinsHunt:['붉은 폐허 정화',s=>`폐허 몬스터 처치 ${Math.min(15,s.questKills||0)} / 15`,'사냥 계속하기'],
 ruinsBoss:['폐허의 집행자','보스 구역의 폐허의 집행자를 처치하세요.','보스 찾아가기'],
 abyssIntro:['5장 · 그림자 심연','촌장에게 심연 조사 임무를 받으세요.','다음 임무 수락'],
 abyssHunt:['심연의 기운',s=>`심연 몬스터 처치 ${Math.min(15,s.questKills||0)} / 15`,'사냥 계속하기'],
 abyssElite:['암흑 추적자',s=>`정예 암흑 추적자 처치 ${Math.min(2,s.questKills||0)} / 2`,'정예 찾아가기'],
 abyssBoss:['심연 파수왕','심연의 보스 심연 파수왕을 처치하세요.','보스 찾아가기'],
 celestialIntro:['6장 · 천룡의 유적','촌장에게 마지막 원정 임무를 받으세요.','다음 임무 수락'],
 celestialHunt:['천룡 유적 돌파',s=>`천계 몬스터 처치 ${Math.min(20,s.questKills||0)} / 20`,'사냥 계속하기'],
 celestialBoss:['천룡 수문장','최종 보스 천룡 수문장을 처치하세요.','최종 보스 찾아가기'],
 storyDone:['메인 스토리 1장 완료','천룡의 유적을 정복했습니다. 정예·네임드·일일 임무에 도전하세요.','완료']
};
const SKILL_INFO={
 warrior:['360° 공격 · 주변 적 넉백','8초 철벽 · 받는 피해 72% 감소','강타 · 기절 + 넉백','넓은 검기 폭풍'],
 rogue:['4연속 쌍검 난무','피해의 60% 흡혈','체력 35% 이하 처형 보너스 · 짧은 기절','달빛 범위참 · 둔화'],
 mage:['화염구 직격 + 주변 폭발','넓은 냉기장 · 5초 둔화','최대 4마리 연쇄 낙뢰','초대형 범위 낙뢰 · 기절'],
 healer:['성광 피해 + 자신 10% 회복','주변 아군 38% 회복','주변 파티 7초 보호막','넓은 범위 62% 회복 + 2초 보호']
};
let lastStory=null,lastSelf=null,lastPaintKey='';
function present(snapshot){
 if(!snapshot?.self)return snapshot;
 const raw=snapshot.self.storyQuest||snapshot.self.quest;
 snapshot={...snapshot,self:{...snapshot.self,storyQuest:raw,quest:SAFE[raw]||raw}};
 lastSelf=snapshot.self;
 if(raw!==lastStory&&STORY[raw]){lastStory=raw;flash(raw,snapshot.self);}
 if(typeof document!=='undefined'){
  const uiKey=snapshot.self.job+'|'+raw;
  const modal=document.getElementById('modal');
  const npcModal=modal&&!modal.hidden&&document.getElementById('modalTitle')?.textContent==='준자마을 촌장';
  if(lastPaintKey!==uiKey||npcModal){lastPaintKey=uiKey;queueMicrotask(paint);}
 }
 return snapshot;
}
function paint(){
 const s=lastSelf,raw=s?.storyQuest,m=STORY[raw];if(!s||!m)return;
 // The main app owns #quest. Do not rewrite quest title/text here:
 // two writers caused the HUD to alternate every few frames.
 const bar=document.getElementById('skillbar'),info=SKILL_INFO[s.job];if(bar&&info)[...bar.querySelectorAll('button')].forEach((b,i)=>{const label=info[i]||'';if(b.title!==label)b.title=label;if(b.dataset.skillRole!==label)b.dataset.skillRole=label;});
 const modal=document.getElementById('modal'),titleEl=document.getElementById('modalTitle'),body=document.getElementById('modalBody'),actions=document.getElementById('modalActions');
 if(modal&&!modal.hidden&&titleEl?.textContent==='준자마을 촌장'&&raw.endsWith('Intro')){
  const p=body?.querySelector('p');if(p)p.textContent=(typeof m[1]==='function'?m[1](s):m[1]);
  const first=actions?.querySelector('button');if(first)first.textContent='지역 조사 임무 수락';
 }
}
function flash(raw,s){
 const m=STORY[raw];if(!m||!document.getElementById('game'))return;
 document.querySelector('.quest-net-flash')?.remove();const el=document.createElement('div');el.className='quest-net-flash';
 el.innerHTML='<small>QUEST UPDATED</small><b>'+m[0]+'</b><span>'+(typeof m[1]==='function'?m[1](s):m[1])+'</span>';document.getElementById('game').append(el);
 requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>el.remove(),2200);
}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{
  const q=e.target.closest?.('#questAction');if(!q||!lastSelf)return;
  const raw=lastSelf.storyQuest;if(raw?.endsWith('Intro')&&lastSelf.zone!=='surface'){e.preventDefault();e.stopImmediatePropagation();document.getElementById('homeBtn')?.click();return;}if(raw==='storyDone'){e.preventDefault();e.stopImmediatePropagation();document.getElementById('adventureBtn')?.click();return;}
  if(!['groveHunt','caveHunt','ruinsHunt','abyssHunt','abyssElite','celestialHunt'].includes(raw))return;
  e.preventDefault();e.stopImmediatePropagation();
  const selector=raw==='abyssElite'?'.enemy.elite:not(.dead)':'.enemy:not(.boss):not(.dead)',hero=document.getElementById('hero')?.getBoundingClientRect();
  const targets=[...document.querySelectorAll(selector)];if(!targets.length){document.getElementById('adventureBtn')?.click();return;}
  const target=targets.sort((a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.hypot(x.left-hero.left,x.top-hero.top)-Math.hypot(y.left-hero.left,y.top-hero.top);})[0];
  try{target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:91}));}catch{target.dispatchEvent(new Event('pointerdown',{bubbles:true}));}
 },true);

 const style=document.createElement('style');style.textContent='.quest-net-flash{position:absolute;left:50%;top:29%;z-index:3300;transform:translate(-50%,-50%) scale(.82);opacity:0;min-width:min(520px,86vw);padding:14px 28px;text-align:center;background:linear-gradient(90deg,transparent,#14261de8 16%,#203b2df2 50%,#14261de8 84%,transparent);border-top:1px solid #e3cd7c88;border-bottom:1px solid #e3cd7c88;text-shadow:0 2px 7px #000;transition:.3s;pointer-events:none}.quest-net-flash.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.quest-net-flash small{display:block;font-size:9px;letter-spacing:4px;color:#d9c885}.quest-net-flash b{display:block;font-size:22px;color:#fff0ae;margin:4px}.quest-net-flash span{font-size:11px;color:#d9e1d3}';document.head.append(style);
}
export function mergeSnapshot(previous,data){
 if(!data.delta)return present(data);
 if(!previous)return null;
 const merged={...previous,...data,self:{...previous.self,...data.self}};
 if(data.self&&Object.hasOwn(data.self,'quest'))merged.self.storyQuest=data.self.quest;
 for(const key of ['players','enemies','nodes'])if(data[key]){const map=new Map(previous[key].map(e=>[e.id,e]));for(const id of data[key].removed)map.delete(id);for(const e of data[key].updates)map.set(e.id,{...map.get(e.id),...e});merged[key]=[...map.values()];}
 delete merged.delta;return present(merged);
}
