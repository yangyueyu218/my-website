(() => {
  const hero=document.querySelector('.studio-intro');
  if(!hero)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const title=hero.querySelector('h1');
  const letters=[...title.querySelectorAll('.title-char')];
  const cards=[...hero.querySelectorAll('.intro-chart,.intro-code,.intro-note')];
  const running=new Map();
  let activeLetter=null,touchTimer=0;

  // The hit area stays in place while only the inner glyph grows.
  function clearLetters(){
    letters.forEach(letter=>letter.classList.remove('is-active','is-near'));
    activeLetter=null;
  }
  function activateLetter(letter){
    if(reduced.matches||letter===activeLetter)return;
    clearLetters();
    if(!letter)return;
    activeLetter=letter;letter.classList.add('is-active');
    [letter.previousElementSibling,letter.nextElementSibling].forEach(neighbor=>neighbor?.classList.add('is-near'));
  }
  title.addEventListener('pointermove',event=>{
    if(fine.matches&&event.pointerType!=='touch')activateLetter(event.target.closest('.title-char'));
  });
  title.addEventListener('pointerleave',clearLetters);
  title.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    activateLetter(event.target.closest('.title-char'));
    clearTimeout(touchTimer);touchTimer=setTimeout(clearLetters,500);
  });
  title.addEventListener('pointercancel',clearLetters);

  function animate(card,element,frames,options){
    if(reduced.matches||!element?.animate)return;
    const animation=element.animate(frames,{duration:650,easing:'cubic-bezier(.2,.75,.25,1)',fill:'backwards',...options});
    if(!running.has(card))running.set(card,new Set());
    const group=running.get(card);group.add(animation);
    animation.finished.catch(()=>{}).finally(()=>group.delete(animation));
  }
  function play(card,delay=0){
    if(reduced.matches||document.hidden)return;
    running.get(card)?.forEach(animation=>animation.cancel());
    if(card.classList.contains('intro-chart')){
      card.querySelectorAll('.intro-plot-bars rect').forEach((bar,i)=>animate(card,bar,[{transform:'scaleY(.08)',opacity:.35},{transform:'scaleY(1)',opacity:1}],{delay:delay+i*45,duration:600}));
      animate(card,card.querySelector('.intro-plot-line'),[{strokeDashoffset:1},{strokeDashoffset:0}],{delay:delay+180,duration:1000});
    }else if(card.classList.contains('intro-code')){
      card.querySelectorAll('.code-row').forEach((row,i)=>animate(card,row,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)'}],{delay:delay+i*420,duration:700,easing:'steps(24,end)'}));
      animate(card,card.querySelector('.code-caret'),[{opacity:0},{opacity:1},{opacity:0}],{delay:delay+650,duration:500,iterations:2,easing:'steps(2,end)'});
    }else{
      card.querySelectorAll('svg path').forEach((path,i)=>animate(card,path,[{strokeDashoffset:1},{strokeDashoffset:0}],{delay:delay+i*160,duration:650}));
      animate(card,card.querySelector('.intro-note-star'),[{transform:'rotate(-15deg) scale(.8)'},{transform:'rotate(90deg) scale(1)'}],{delay:delay+160,duration:900});
    }
  }
  cards.forEach(card=>{
    card.addEventListener('pointerenter',event=>{
      if(reduced.matches||!fine.matches||event.pointerType==='touch')return;
      card.classList.add('is-awake');play(card);
    });
    card.addEventListener('pointerleave',()=>card.classList.remove('is-awake'));
    card.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')play(card);});
  });

  function reset(){
    clearTimeout(touchTimer);clearLetters();
    cards.forEach(card=>card.classList.remove('is-awake'));
    running.forEach(group=>group.forEach(animation=>animation.cancel()));
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)reset();});
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  if(!reduced.matches&&!new URLSearchParams(location.search).has('thumbnail')){
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      observer.disconnect();cards.forEach((card,i)=>play(card,i*140));
    },{threshold:.2});
    observer.observe(hero);
  }
})();
