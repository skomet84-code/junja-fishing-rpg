/* Phase-two interface polish; do not replace game action handlers or world state. */
(() => {
  function init(){
    const minimap=document.getElementById('minimapToggle');
    const minimapWrap=document.getElementById('minimapWrap');
    const mapShortcut=document.querySelector('#fieldShortcuts [data-forward="adventureBtn"]');
    const returnShortcut=document.querySelector('#fieldShortcuts [data-forward="homeBtn"]');
    const bar=document.getElementById('skillbar');
    if(mapShortcut){
      const label=mapShortcut.querySelector('span');
      if(label)label.textContent='이동';
      mapShortcut.setAttribute('aria-label','월드맵 열기 및 즉시 이동');
      mapShortcut.title='월드맵 · 즉시 이동';
    }
    if(returnShortcut){
      const label=returnShortcut.querySelector('span');
      if(label)label.textContent='귀환';
    }
    function syncMini(){
      if(!minimap||!minimapWrap)return;
      const expanded=minimapWrap.classList.contains('open');
      minimap.textContent=expanded?'미니맵 −':'미니맵 +';
      minimap.setAttribute('aria-label',expanded?'필드 미니맵 접기':'필드 미니맵 펼치기');
    }
    syncMini();
    minimap?.addEventListener('click',()=>queueMicrotask(syncMini));
    if(bar){
      bar.setAttribute('aria-label','직업 전투 스킬 1부터 9');
      // Preserve the engine's exact cooldown and click actions; the CSS
      // reads the game's data-cooldown, --cd-pct and data-kind values.
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
