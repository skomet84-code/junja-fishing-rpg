/* Visual layer only. Forward shortcuts to existing wired actions; no game-state writes. */
(() => {
  function ready() {
    const shortcuts = document.getElementById('fieldShortcuts');
    const utility = document.getElementById('utilityNav');
    const toggle = document.getElementById('visualMenuToggle');
    if (!shortcuts || !utility || !toggle) return;
    const setOpen = (open) => {
      utility.classList.toggle('visual-open', !!open);
      utility.classList.toggle('expanded', !!open);
      const nativeToggle = document.getElementById('utilityToggle');
      if (nativeToggle) nativeToggle.setAttribute('aria-expanded', String(!!open));
      toggle.setAttribute('aria-expanded', String(!!open));
      utility.setAttribute('aria-hidden', String(!open && matchMedia('(max-width:900px)').matches));
    };
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!utility.classList.contains('visual-open'));
    });
    shortcuts.querySelectorAll('[data-forward]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.forward);
        if (target && !target.disabled) target.click();
        setOpen(false);
      });
    });
    utility.addEventListener('click', (event) => {
      if (event.target.closest('button') && matchMedia('(max-width:900px)').matches) setOpen(false);
    });
    document.addEventListener('pointerdown', (event) => {
      if (!utility.contains(event.target) && !shortcuts.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
    const mq = matchMedia('(max-width:900px)');
    mq.addEventListener?.('change', () => {
      if (!mq.matches) setOpen(false);
      utility.setAttribute('aria-hidden', String(mq.matches && !utility.classList.contains('visual-open')));
    });
    setOpen(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true});
  else ready();
})();
