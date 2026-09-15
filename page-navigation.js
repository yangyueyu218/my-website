(() => {
  if(document.body.dataset.layout!=='sections')return;
  const header=document.querySelector('.refined-header');
  const nav=header.querySelector('.atlas-nav');
  const cursor=nav.querySelector('.nav-cursor');
  const links=[...nav.querySelectorAll('[data-section]')];
  const mobile=header.querySelector('.mobile-nav');
  const home=(document.body.dataset.page||'home')==='home';
  const sections=links.map(link=>document.getElementById(link.dataset.section)).filter(Boolean);
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const colors={work:['#47715e','#e9f1e8'],discover:['#4b7380','#e8eff0'],thought:['#79609a','#eee9f5'],about:['#af6544','#f6e9df']};
  let current='work',hovered=null,frame=0;

  function moveCursor(key){
    const link=links.find(link=>link.dataset.section===key);
    const [accent,wash]=colors[key];
    document.body.style.setProperty('--chapter-accent',accent);
    document.body.style.setProperty('--chapter-wash',wash);
    if(nav.getClientRects().length){
      const r=link.getBoundingClientRect(),p=nav.getBoundingClientRect();
      cursor.style.setProperty('--cursor-x',`${r.left-p.left+5}px`);
      cursor.style.setProperty('--cursor-width',`${Math.max(0,r.width-10)}px`);
      cursor.classList.add('is-ready');
    }
  }
  function update(){
    frame=0;
    const threshold=header.getBoundingClientRect().bottom+100;
    let next=home?'work':(document.body.dataset.current||'work');
    if(home)sections.forEach(section=>{if(section.getBoundingClientRect().top<=threshold)next=section.id;});
    if(home&&scrollY>0&&innerHeight+scrollY>=document.documentElement.scrollHeight-4)next='about';
    if(next!==current){current=next;document.dispatchEvent(new CustomEvent('yueyu:viewchange',{detail:{view:current}}));}
    header.querySelectorAll('[data-section]').forEach(link=>{
      const active=link.dataset.section===current;
      link.classList.toggle('is-current',active);
      if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
    });
    header.classList.toggle('is-pinned',scrollY>30);
    moveCursor(hovered||current);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  function navigate(key,addHistory=true,instant=false){
    const section=sections.find(section=>section.id===key);
    if(!section)return;
    window.closeMenus?.();
    if(addHistory&&location.hash!==`#${key}`)history.pushState(null,'',`#${key}`);
    document.getElementById(`${key}-title`).focus({preventScroll:true});
    section.scrollIntoView({behavior:instant||reduced.matches?'instant':'smooth',block:'start'});
    schedule();
  }
  header.addEventListener('click',event=>{
    const link=event.target.closest('a[data-section]');
    if(!home||!link||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigate(link.dataset.section);
  });
  links.forEach((link,i)=>{
    link.addEventListener('pointerenter',()=>{hovered=link.dataset.section;moveCursor(hovered);});
    link.addEventListener('focus',()=>moveCursor(link.dataset.section));
    link.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?links.length-1:(i+(event.key==='ArrowRight'?1:-1)+links.length)%links.length;
      links[next].focus();
    });
  });
  nav.addEventListener('pointerleave',()=>{hovered=null;moveCursor(current);});
  nav.addEventListener('focusout',event=>{if(!nav.contains(event.relatedTarget))moveCursor(current);});
  header.querySelector('.mobile-toggle').addEventListener('click',()=>{if(!mobile.hidden)mobile.querySelector('a').focus();});
  document.addEventListener('yueyu:navigate',event=>navigate(event.detail.view));
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('hashchange',()=>{const key=location.hash.slice(1);if(sections.some(section=>section.id===key))navigate(key,false);});
  new ResizeObserver(schedule).observe(document.querySelector('main'));
  document.fonts?.ready.then(schedule);
  document.addEventListener('yueyu:entryview',schedule);
  document.addEventListener('yueyu:ready',()=>{const key=location.hash.slice(1);if(home&&sections.some(s=>s.id===key))navigate(key,false,true);else schedule();});
  update();
})();
