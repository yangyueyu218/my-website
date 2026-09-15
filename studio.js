(() => {
  if(!document.body.classList.contains('studio-edit'))return;
  const light=document.querySelector('.cursor-light');
  const eligible=matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  const thumbnail=new URLSearchParams(location.search).has('thumbnail');
  let frame=0,x=0,y=0,activeCard=null,previousCard=null;
  const clearCard=()=>{previousCard?.classList.remove('is-lit');previousCard=null;};
  const hide=()=>{cancelAnimationFrame(frame);frame=0;light.classList.remove('visible');clearCard();activeCard=null;};
  function paint(){
    frame=0;
    light.style.setProperty('--light-x',`${x}px`);light.style.setProperty('--light-y',`${y}px`);light.classList.add('visible');
    if(previousCard!==activeCard){clearCard();previousCard=activeCard;}
    if(activeCard){const r=activeCard.getBoundingClientRect();activeCard.style.setProperty('--edge-x',`${x-r.left}px`);activeCard.style.setProperty('--edge-y',`${y-r.top}px`);activeCard.classList.add('is-lit');}
  }
  document.addEventListener('pointermove',event=>{
    if(thumbnail||!eligible.matches||event.pointerType==='touch'||document.querySelector('dialog[open]')||document.body.classList.contains('nav-menu-open')){hide();return;}
    x=event.clientX;y=event.clientY;
    activeCard=event.target instanceof Element?event.target.closest('.content-card,.resource-card'):null;
    if(!frame)frame=requestAnimationFrame(paint);
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',hide);
  window.addEventListener('blur',hide);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  document.addEventListener('yueyu:viewchange',hide);
  document.addEventListener('yueyu:menuchange',()=>{if(document.body.classList.contains('nav-menu-open'))hide();});
  window.addEventListener('scroll',clearCard,{passive:true});
  eligible.addEventListener('change',()=>{if(!eligible.matches)hide();});
})();

/* Progressive motion: content is visible and usable even without animation APIs. */
(() => {
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const snapshots=new Map(),running=new Map(),seen=new WeakSet();
  const canAnimate=()=>!reduced.matches&&!document.hidden&&typeof Element.prototype.animate==='function';
  const rootFor=view=>document.querySelector(`[data-collection="${view}"]`);
  const rect=el=>el.getBoundingClientRect();
  function run(el,frames,options={}){
    if(!el||!canAnimate())return null;
    const a=el.animate(frames,{duration:560,easing:'cubic-bezier(.2,.8,.2,1)',...options});
    a.finished.catch(()=>{});return a;
  }
  function placeGlider(root){
    const filters=root?.querySelector('[data-filters]'),selected=filters?.querySelector('[aria-pressed="true"]');
    if(!selected)return;
    let glider=filters.querySelector('.filter-glider');
    if(!glider){glider=document.createElement('span');glider.className='filter-glider';glider.setAttribute('aria-hidden','true');filters.prepend(glider);}
    // Offset coordinates keep the glider aligned when the row wraps on narrow screens.
    glider.style.transform=`translate(${selected.offsetLeft}px,${selected.offsetTop}px)`;
    glider.style.width=`${selected.offsetWidth}px`;glider.style.height=`${selected.offsetHeight}px`;
  }
  document.addEventListener('yueyu:collection-before',event=>{
    const view=event.detail.view,root=rootFor(view),grid=root?.querySelector('[data-grid]');if(!grid)return;
    const old={height:rect(grid).height,items:new Map([...grid.children].map(el=>[el.dataset.itemId,rect(el)]))};
    running.get(view)?.forEach(a=>a?.cancel());running.delete(view);grid.classList.remove('is-changing');
    snapshots.set(view,old);
  });
  document.addEventListener('yueyu:collection-after',event=>{
    const {view,transition}=event.detail,root=rootFor(view),grid=root?.querySelector('[data-grid]');if(!grid)return;
    placeGlider(root);
    const old=snapshots.get(view);snapshots.delete(view);
    if(!transition||!old||!canAnimate())return;
    const animations=[],nextHeight=rect(grid).height;
    [...grid.children].forEach((el,i)=>{
      const from=old.items.get(el.dataset.itemId),to=rect(el);
      animations.push(run(el,from?[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px)`,opacity:.65},{transform:'none',opacity:1}]:[{transform:'translateY(18px) scale(.985)',opacity:0,filter:'blur(3px)'},{transform:'none',opacity:1,filter:'blur(0px)'}],{duration:500,delay:Math.min(i,7)*38,fill:'backwards'}));
    });
    if(Math.abs(old.height-nextHeight)>1){
      grid.classList.add('is-changing');
      animations.push(run(grid,[{height:`${old.height}px`},{height:`${nextHeight}px`}],{duration:520}));
    }
    running.set(view,animations);
    Promise.all(animations.filter(Boolean).map(a=>a.finished.catch(()=>{}))).then(()=>{if(running.get(view)===animations){grid.classList.remove('is-changing');running.delete(view);}});
  });
  const positionAll=()=>document.querySelectorAll('[data-collection]').forEach(placeGlider);
  let resizeFrame=0;
  addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(positionAll);});
  document.fonts?.ready.then(positionAll);
  function revealAbout(){
    const about=document.querySelector('#about');if(!about||seen.has(about)||!canAnimate())return;
    seen.add(about);
    run(about.querySelector('.about-portrait'),[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],{duration:1000});
    about.querySelectorAll('.name-glyph').forEach((el,i)=>run(el,[{opacity:0,transform:'translateY(24px) rotateX(55deg)',filter:'blur(7px)'},{opacity:1,transform:'none',filter:'blur(0px)'}],{delay:120+i*110,duration:950,fill:'backwards'}));
    run(about.querySelector('.about-identity p'),[{opacity:0,transform:'translateX(18px)'},{opacity:1,transform:'none'}],{delay:450,duration:850,fill:'backwards'});
    run(about.querySelector('.follow-platforms'),[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{delay:550,duration:800,fill:'backwards'});
    about.classList.add('has-arrived');
  }
  document.addEventListener('yueyu:ready',()=>{
    positionAll();
    const about=document.querySelector('#about');if(!about)return;
    if('IntersectionObserver'in window){const observer=new IntersectionObserver(items=>{if(items.some(x=>x.isIntersecting)){revealAbout();observer.disconnect();}},{threshold:.2});observer.observe(about);}else revealAbout();
  });
  function stop(){running.forEach(list=>list.forEach(a=>a?.cancel()));running.clear();document.querySelectorAll('.is-changing').forEach(el=>el.classList.remove('is-changing'));}
  reduced.addEventListener('change',()=>{if(reduced.matches){stop();document.querySelectorAll('#about *').forEach(el=>el.getAnimations?.().forEach(a=>a.cancel()));}});
  document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('motion-paused',document.hidden);if(document.hidden)stop();});
})();
