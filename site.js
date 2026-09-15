import {studioArt} from './render-art.js';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg={work:{name:'创作',categories:['全部','工作实践','生活实验','精选项目'],url:'creations.html',limit:6},discover:{name:'发现',categories:['全部','学习资料','软件工具','网站精选'],url:'resources.html',limit:6},thought:{name:'思考',categories:['全部','随想手记','教程实践','他山之石'],url:'notes.html',limit:3}};
const page=document.body.dataset.page||'home', params=new URLSearchParams(location.search), states={};
if($('.skip'))$('.skip').href=location.pathname+location.search+'#main';
$$('.back-top').forEach(a=>a.href=location.pathname+location.search+'#');
const bookmark='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h10v14l-5-3-5 3z"/></svg>';
let entries=[],profile={},saved=new Set(),noticeTimer;
try{saved=new Set(JSON.parse(localStorage.getItem('yueyu-saved-v1')||'[]'));}catch{}
function url(value,{email=false}={}){if(typeof value!=='string'||!value.trim())return '';try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)||(email&&u.protocol==='mailto:')?u.href:'';}catch{return '';}}
function fileUrl(value){return typeof value==='string'&&/^uploads\/[a-zA-Z0-9_-]+\//.test(value)&&!value.split('/').includes('..')?value:'';}
function entryUrl(item){return `entries/${encodeURIComponent(item.id)}.html`;}
function toast(message){$('.toast').textContent=message;$('.toast').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('.toast').classList.remove('show'),2600);}
window.closeMenus=()=>{$('.mobile-nav').hidden=true;$('.menu-backdrop').hidden=true;$('.mobile-toggle').setAttribute('aria-expanded','false');document.body.classList.remove('nav-menu-open');document.dispatchEvent(new CustomEvent('yueyu:menuchange'));};
$('.mobile-toggle').addEventListener('click',()=>{const open=$('.mobile-nav').hidden;closeMenus();$('.mobile-nav').hidden=!open;$('.menu-backdrop').hidden=!open;$('.mobile-toggle').setAttribute('aria-expanded',String(open));document.body.classList.toggle('nav-menu-open',open);if(open)$('a',$('.mobile-nav'))?.focus();});
$('.menu-backdrop').addEventListener('click',closeMenus);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const inside=$('.mobile-nav').contains(document.activeElement);closeMenus();if(inside)$('.mobile-toggle').focus();}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}});
if(['127.0.0.1','localhost'].includes(location.hostname))$$('[data-local-manager]').forEach(a=>a.hidden=false);
function coverLegacy(item){if(fileUrl(item.coverImage))return `<div class="card-art uploaded-cover"><img src="${esc(fileUrl(item.coverImage))}" alt="" loading="lazy"></div>`;return item.type==='work'?studioArt(item):'';}
function card(item){
  if(item.type==='discover')return `<article class="resource-card" data-item-id="${esc(item.id)}"><a class="resource-open" href="${entryUrl(item)}"><div class="resource-head"><span class="resource-icon" style="--iconbg:#e7edda;--iconfg:#607344">${esc(item.icon||item.title.slice(0,1))}</span></div>${hasCover(item)?cover(item):''}<h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></a></article>`;
  return `<article data-item-id="${esc(item.id)}" class="content-card ${hasCover(item)||['audio','video','html','download'].includes(item.format)?'with-media':''}"><a class="card-open" href="${entryUrl(item)}">${cover(item)}<div class="card-meta"><span>${esc(item.category)}${item.pinned?' · 置顶':''}</span><span>${item.status==='draft'?'本地草稿':item.sample?'示例内容':esc(item.date||'')}</span></div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></a></article>`;
}
function matching(view,state){return entries.filter(item=>item.type===view&&(state.category==='全部'||item.category===state.category)&&(!state.savedOnly||saved.has(item.id))&&(!state.q||[item.title,item.description,...(item.tags||[])].join(' ').toLowerCase().includes(state.q.toLowerCase()))).filter(item=>page!=='home'||!item.hideFromHome).sort((a,b)=>Number(b.pinned||false)-Number(a.pinned||false)||(a.pinned&&b.pinned?(Number(a.pinOrder)||0)-(Number(b.pinOrder)||0):0)||Number(!!a.sample)-Number(!!b.sample)||String(b.date).localeCompare(String(a.date))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));}
function render(view,transition=false){
  const root=$(`[data-collection="${view}"]`);if(!root)return;
  if(transition)document.dispatchEvent(new CustomEvent('yueyu:collection-before',{detail:{view}}));
  const state=states[view],c=cfg[view],items=matching(view,state),isList=page===view,limit=isList?9:c.limit,pages=Math.max(1,Math.ceil(items.length/limit));state.page=Math.min(state.page,pages);
  const visible=items.slice((isList?state.page-1:0)*limit,(isList?state.page:1)*limit);
  const filters=$('[data-filters]',root);
  if(!filters.querySelector('[data-category]'))filters.innerHTML=c.categories.map(cat=>`<button data-category="${cat}" data-view="${view}" aria-controls="${view}-grid" aria-pressed="${state.category===cat}">${cat}</button>`).join('');
  $$('[data-category]',filters).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===state.category)));
  $('[data-grid]',root).innerHTML=visible.length?visible.map(card).join(''):`<div class="empty-state"><strong>${state.savedOnly?'还没有收藏的资源':state.q?'没有找到相关内容':view==='thought'?'还没有收录文章':'这里还没有内容'}</strong><button data-reset="${view}">浏览全部${c.name} →</button></div>`;
  $('[data-grid]',root).dataset.items=String(visible.length);
  $('[data-count]',root).textContent=`${items.length} ${view==='thought'?'篇':'项'}`;
  const more=$('[data-more]',root);if(more)more.href=`${c.url}${state.category!=='全部'?`?category=${encodeURIComponent(state.category)}`:''}`;
  const favorite=$('.saved-filter',root);if(favorite){favorite.setAttribute('aria-pressed',String(state.savedOnly));$('span',favorite).textContent=entries.filter(x=>x.type==='discover'&&saved.has(x.id)).length;}
  const note=$('[data-section-note]',root);if(note)note.textContent=visible.length&&visible.every(x=>x.sample)?'示例内容':'';
  if(isList){const pager=$('.pagination');pager.innerHTML=pages>1?Array.from({length:pages},(_,i)=>`<a href="${listUrl(view,i+1)}" ${state.page===i+1?'aria-current="page"':''}>${i+1}</a>`).join(''):'';document.title=`${c.name} · 杨越宇`;}
  document.dispatchEvent(new CustomEvent('yueyu:collection-after',{detail:{view,transition}}));
}
function listUrl(view,n=1){const s=states[view],p=new URLSearchParams();if(s.category!=='全部')p.set('category',s.category);if(s.q)p.set('q',s.q);if(s.savedOnly)p.set('saved','1');if(n>1)p.set('page',n);return cfg[view].url+(p.size?'?'+p.toString():'');}
function update(view){states[view].page=1;render(view,true);if(page===view)history.replaceState(null,'',listUrl(view));}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.category){const view=b.dataset.view;if(states[view].category===b.dataset.category)return;states[view].category=b.dataset.category;update(view);$$(`[data-view="${view}"]`).find(x=>x.dataset.category===b.dataset.category)?.focus({preventScroll:true});}
  if(b.dataset.reset){const view=b.dataset.reset;Object.assign(states[view],{category:'全部',q:'',savedOnly:false});const input=$('[data-list-search]');if(input)input.value='';update(view);}
  if(b.dataset.save){const id=b.dataset.save;saved.has(id)?saved.delete(id):saved.add(id);let stored=true;try{localStorage.setItem('yueyu-saved-v1',JSON.stringify([...saved]));}catch{stored=false;}render('discover');$$('[data-save]').filter(x=>x.dataset.save===id).forEach(x=>{x.setAttribute('aria-pressed',String(saved.has(id)));if(x.classList.contains('detail-save'))x.textContent=saved.has(id)?'已收藏':'收藏资源';});toast(saved.has(id)?stored?'已收藏，保存在当前浏览器':'已加入本次收藏，浏览器无法保存':'已取消收藏');}
  if(b.classList.contains('saved-filter')){states.discover.savedOnly=!states.discover.savedOnly;update('discover');}
  if(b.dataset.copy){(navigator.clipboard?navigator.clipboard.writeText(b.dataset.copy):Promise.reject()).then(()=>toast('已复制')).catch(()=>toast('复制失败，请手动选择文字复制'));}
});
const search=$('#search-dialog');let searchScope='all';
function highlighted(value,q){const text=String(value||'');if(!q)return esc(text);const index=text.toLowerCase().indexOf(q.toLowerCase());return index<0?esc(text):esc(text.slice(0,index))+'<mark>'+esc(text.slice(index,index+q.length))+'</mark>'+esc(text.slice(index+q.length));}
function searchResults(value=''){
 const q=value.trim();const words=q.toLowerCase().split(/\s+/).filter(Boolean);
 const found=entries.filter(x=>(searchScope==='all'||x.type===searchScope)&&words.every(w=>[x.title,x.description,x.category,...(x.tags||[]),String(x.body||'').replace(/<[^>]*>/g,' ')].join(' ').toLowerCase().includes(w))).sort((a,b)=>Number(!!a.sample)-Number(!!b.sample)||Number(!!b.pinned)-Number(!!a.pinned)||String(b.date).localeCompare(String(a.date))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 const shown=found.slice(0,q?60:8);$('#search-count').textContent=q?found.length+' 个结果': '最近收录';$('#search-clear').hidden=!q;
 $('#search-results').innerHTML=shown.length?shown.map(x=>`<a class="search-item" href="${entryUrl(x)}"><span class="search-thumb">${coverSource(x)?`<img src="${esc(coverSource(x))}" alt="" loading="lazy">`:`<span>${{work:'↗',discover:'✳',thought:'≋'}[x.type]}</span>`}</span><span class="search-copy"><small>${cfg[x.type].name} / ${esc(x.category)}${x.sample?' · 示例':''}</small><strong>${highlighted(x.title,q)}</strong><span class="search-description">${highlighted(x.description,q)}</span></span><span class="search-arrow" aria-hidden="true">↗</span></a>`).join(''):'<div class="search-empty"><span aria-hidden="true">⌕</span><strong>暂时没有找到</strong><p>试试更短的关键词，或切换到“全部”。</p></div>';
}
function openSearch(){const open=$('dialog[open]');if(open&&open!==search)return;if(search.open){$('#search-input').focus();return;}closeMenus();searchScope='all';$$('[data-search-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.searchScope==='all')));$('#search-input').value='';searchResults();search.showModal();$('#search-input').focus();}
$('.search-open').addEventListener('click',openSearch);$('#search-input').addEventListener('input',e=>searchResults(e.target.value));
$('#search-clear').addEventListener('click',()=>{$('#search-input').value='';searchResults();$('#search-input').focus();});
$$('[data-search-scope]').forEach(b=>b.addEventListener('click',()=>{searchScope=b.dataset.searchScope;$$('[data-search-scope]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));searchResults($('#search-input').value);}));
search.addEventListener('keydown',e=>{const links=$$('.search-item',search),index=links.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(!links.length)return;e.preventDefault();const n=e.key==='ArrowDown'?(index+1)%links.length:index<=0?links.length-1:index-1;links[n].focus();}if(e.key==='Enter'&&e.target===$('#search-input')&&links.length){e.preventDefault();links[0].click();}});
search.addEventListener('close',()=>$('.search-open').focus({preventScroll:true}));
let dialogOpener=null;
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-qr-open]');if(!button)return;
 const social=(profile.socials||[]).find(s=>s.name===button.dataset.qrOpen&&fileUrl(s.qr));if(!social)return;
 closeMenus();dialogOpener=button;$('#qr-title').textContent=social.name;$('#qr-view').innerHTML=qrArtwork(social);
 const save=$('#qr-download');save.href=fileUrl(social.qr);save.setAttribute('download',social.name+'二维码.jpg');
 $('#qr-dialog').showModal();
});

document.addEventListener('click',e=>{const contact=e.target.closest('[data-contact-open]'),manage=e.target.closest('[data-manage-open]'),close=e.target.closest('[data-close-dialog]');if(close){close.closest('dialog').close();return;}if(contact||manage){closeMenus();dialogOpener=contact||manage;const dialog=$(contact?'#contact-dialog':'#manage-dialog');dialog.showModal();if(contact)$('[name="message"]',dialog).focus();}});
$$('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});if(dialog!==search)dialog.addEventListener('close',()=>dialogOpener?.focus({preventScroll:true}));});
if(!['127.0.0.1','localhost'].includes(location.hostname)){$('#manage-state').textContent='线上管理尚未连接';$('#manage-description').textContent='线上登录需要连接身份验证与内容存储服务。';$('#manager-launch').hidden=true;$('#manage-note').textContent='站主目前通过电脑上的「内容管家」编辑和同步网站。';}

function attachments(item){return item.attachments?.length?`<div class="file-list">${item.attachments.filter(x=>fileUrl(x.url)).map(x=>`<a class="file-download" href="${esc(x.url)}" download="${esc(x.name)}"><div><strong>${esc(x.name)}</strong><br><small>${x.size?`${(x.size/1024/1024).toFixed(1)} MiB`:''}</small></div><span>下载 ↓</span></a>`).join('')}</div>`:'';}
function body(item){return `<div class="article-body">${mediaMarkup(item)}${item.body||''}</div>`;}
function hydrateVideos(){
  $$('.article-body [data-bvid]').forEach(el=>{const bvid=el.dataset.bvid;if(!/^BV[0-9A-Za-z]{10}$/.test(bvid)){el.remove();return;}const source=`https://www.bilibili.com/video/${bvid}/`;el.className='video-block';el.innerHTML=`<div class="video-frame"><iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&page=1&autoplay=0" loading="lazy" title="B 站视频" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><a href="${source}" target="_blank" rel="noopener noreferrer">在 B 站观看 ↗</a>`;});
  $$('.article-body img').forEach(img=>{img.loading='lazy';if(!img.alt)img.alt='文章配图';});
}
function renderEntry(){
  const item=entries.find(x=>x.id===(document.body.dataset.entryId||params.get('id'))),root=$('#entry-content');
  if(!item){root.innerHTML='<div class="entry-error"><h1>内容不存在或尚未发布</h1><a href="index.html">回到首页 →</a></div>';return;}
  document.title=`${item.title} · 杨越宇`;$('meta[name="description"]').content=item.description||item.title;document.body.dataset.current=item.type;document.dispatchEvent(new CustomEvent('yueyu:entryview',{detail:{view:item.type}}));
  let html=`<div class="breadcrumb"><a href="index.html">首页</a><span>/</span><a href="${cfg[item.type].url}">${cfg[item.type].name}</a><span>/</span><span>${esc(item.category)}</span></div><div class="detail-tag">${esc(item.date||'')}${item.status==='draft'?' · 本地草稿':item.sample?' · 示例内容':''}${item.pinned?' · 置顶':''}</div><h1 class="detail-title">${esc(item.title)}</h1><p class="detail-description">${esc(item.description)}</p>`;
  if(item.type==='work'){
    const entry=fileUrl(item.project?.entry);
    if(entry)html+=`<div class="project-stage"><div class="project-toolbar"><span>在线体验</span><a href="${esc(entry)}" target="_blank" rel="noopener noreferrer">独立打开 ↗</a></div><iframe src="${esc(entry)}" title="${esc(item.title)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals" loading="lazy" allow="fullscreen" allowfullscreen></iframe></div>`;
    else if(!(item.media||[]).length&&!item.bvid)html+=`<div class="detail-visual">${cover(item)}</div>`;
    html+=body(item);
    if(!item.body&&(item.process||item.learn))html+=`<div class="detail-columns">${item.process?`<div><h3>从哪里开始</h3><p>${esc(item.process)}</p></div>`:''}${item.learn?`<div><h3>想解决什么</h3><p>${esc(item.learn)}</p></div>`:''}</div>`;
  }else if(item.type==='thought'){
    if(item.source)html+=`<div class="detail-columns"><div><h3>原文作者</h3><p>${esc(item.source.author||'未填写')}</p></div><div><h3>文章出处</h3><p>${esc(item.source.name||'未填写')}</p></div></div>`;
    html+=body(item);
    if(url(item.source?.url))html+=`<div class="detail-actions"><a class="button-dark" href="${esc(url(item.source.url))}" target="_blank" rel="noopener noreferrer">阅读原文 ↗</a></div>`;
  }else{
    html+=body(item);if(!item.body&&item.detail)html+=`<p class="detail-description">${esc(item.detail)}</p>`;
    html+=`<div class="resource-links">${(item.links||[]).filter(l=>url(l.url)).map(l=>`<a class="button-dark" href="${esc(url(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label||'打开链接')} ↗</a>`).join('')}</div>`;
    if(item.extractionCode)html+=`<div class="resource-access"><span>网盘提取码：<strong>${esc(item.extractionCode)}</strong></span><button data-copy="${esc(item.extractionCode)}">复制提取码</button></div>`;
    if(item.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email))html+=`<div class="resource-access"><span>联系邮箱：<a href="mailto:${esc(item.email)}">${esc(item.email)}</a></span><button data-copy="${esc(item.email)}">复制邮箱</button></div>`;
  }
  html+=((item.platform||item.softwareVersion)?`<p class="package-meta">${esc(item.platform)} ${esc(item.softwareVersion)}</p>`:'')+attachments(item)+`<div class="entry-end"><a href="${cfg[item.type].url}">← 全部${cfg[item.type].name}</a><button data-copy="${esc(location.href)}">复制分享链接</button></div>`;
  root.innerHTML=html;hydrateVideos();
}
function qrArtwork(s){
 const c=s.qrCrop;
 const valid=c&&['x','y','w','h'].every(k=>Number.isFinite(c[k]))&&c.x>=0&&c.y>=0&&c.w>=.05&&c.h>=.05&&c.x+c.w<=1.00001&&c.y+c.h<=1.00001;
 const style=valid?`style="width:${100/c.w}%;height:${100/c.h}%;left:${-100*c.x/c.w}%;top:${-100*c.y/c.h}%"`:'';
 return `<span class="qr-artwork ${valid?'is-cropped':''}"><img class="qr-image" src="${esc(fileUrl(s.qr))}" alt="${esc(s.name)}二维码" ${style} loading="lazy"></span>`;
}
function renderAbout(){
 const el=$('#about-content');if(!el)return;
 const portrait=fileUrl(profile.portrait);
 el.classList.toggle('has-portrait',!!portrait);
 el.innerHTML=`${portrait?`<div class="about-portrait"><div class="portrait-paper" aria-hidden="true"></div><span class="portrait-orbit" aria-hidden="true"></span><img src="${esc(portrait)}" alt="${esc(profile.name||'杨越宇')}的照片" width="1024" height="1536" loading="lazy" decoding="async"><span class="portrait-spark" aria-hidden="true">✳</span></div>`:''}<div class="about-details"><div class="about-identity"><h3 class="about-name" aria-label="${esc(profile.name||'杨越宇')}"><span aria-hidden="true">${Array.from(profile.name||'杨越宇').map((char,i)=>`<span class="name-glyph" style="--glyph-index:${i}">${esc(char)}</span>`).join('')}</span></h3><p>${esc(profile.description||'')}</p></div><div class="follow-platforms" aria-label="关注方式">${(profile.socials||[]).map(s=>`<div class="follow-platform"><h3>${esc(s.name)}</h3>${fileUrl(s.qr)?`<button class="qr-enlarge" data-qr-open="${esc(s.name)}" aria-label="放大${esc(s.name)}二维码" aria-haspopup="dialog">${qrArtwork(s)}</button>`:'<div class="qr-slot"><span>二维码<br>待添加</span></div>'}${url(s.url)?`<a href="${esc(url(s.url))}" target="_blank" rel="noopener noreferrer">关注</a>`:''}</div>`).join('')}</div><button class="contact-invite" data-contact-open aria-haspopup="dialog"><span class="note-envelope" aria-hidden="true">✉</span><strong>给我留言</strong></button></div>`;
}

const formatNames={text:'文字',article:'图文长文',image:'图片集',audio:'音频',video:'视频',html:'HTML 网页',download:'下载文件',link:'外部链接'};
function cardTags(item){return [...(item.format==='download'?[item.platform,item.softwareVersion,item.attachments?.[0]?.size?(item.attachments[0].size/1024/1024).toFixed(1)+' MiB':'']:[]),...(item.tags||[])].filter(Boolean);}
function coverSource(item){const first=(item.media||[]).find(m=>m.kind==='image');const bodyImage=(item.body||'').match(/<img[^>]+src="(uploads\/[^"<>]+)"/);return fileUrl(item.coverImage)||fileUrl(first?.url)||fileUrl(bodyImage?.[1]);}
function hasCover(item){return Boolean(coverSource(item));}
function cover(item){
 const src=coverSource(item),format=item.format||'text',label=formatNames[format]||'文字';
 if(src)return `<div class="card-art uploaded-cover"><img src="${esc(src)}" alt="" loading="lazy"><span class="format-badge">${format==='video'?'▷ ':format==='audio'?'♫ ':''}${label}</span></div>`;
 if(item.sample&&item.type==='work')return coverLegacy(item);
 if(item.type==='thought'&&!['audio','video','html','download'].includes(format))return '';
 return `<div class="card-art format-cover format-${format}"><span class="format-symbol">${{html:'〈/〉',audio:'♫',video:'▷',download:'↓',image:'▧',link:'↗',text:'Aa',article:'¶'}[format]||'Aa'}</span><span>${esc(label)}</span>${item.platform?`<small>${esc(item.platform)}</small>`:''}</div>`;
}
function mediaMarkup(item){
 let html='';const images=(item.media||[]).filter(m=>m.kind==='image'&&fileUrl(m.url));
 if(images.length)html+=`<div class="entry-gallery">${images.map(m=>`<figure><a href="${esc(m.url)}" target="_blank" rel="noopener"><img src="${esc(m.url)}" alt="${esc(m.caption||m.name||'作品图片')}" loading="lazy"></a>${m.caption?`<figcaption>${esc(m.caption)}</figcaption>`:''}</figure>`).join('')}</div>`;
 for(const m of item.media||[]){if(!fileUrl(m.url)||!['audio','video'].includes(m.kind))continue;html+=`<figure class="media-player"><${m.kind} controls preload="metadata" ${m.kind==='video'?'playsinline':''} ${m.kind==='video'&&coverSource(item)?`poster="${esc(coverSource(item))}"`:''} src="${esc(m.url)}">浏览器无法播放，可下载文件。</${m.kind}><figcaption>${esc(m.caption||m.name)} <a href="${esc(m.url)}" download>下载原文件 ↓</a></figcaption></figure>`;}
 if(item.bvid&&/^BV[0-9A-Za-z]{10}$/.test(item.bvid))html+=`<div data-bvid="${item.bvid}"></div>`;
 if(item.type!=='work'&&fileUrl(item.project?.entry))html+=`<div class="project-stage"><div class="project-toolbar"><span>在线体验</span><a href="${esc(item.project.entry)}" target="_blank" rel="noopener">独立打开 ↗</a></div><iframe src="${esc(item.project.entry)}" title="${esc(item.title)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals" loading="lazy"></iframe></div>`;
 return html;
}
function setupContact(contact,preview){
 const form=$('#contact-form');if(!form)return;const status=$('#contact-status'),button=$('button[type="submit"]',form);
 if(!contact?.available){status.textContent='留言通道尚未开通，请通过「关于」中的关注方式联系。';button.disabled=true;return;}
 button.disabled=false;status.textContent=preview?'本地体验：留言会进入本机内容管家。':'留言仅站主可见。';
 form.addEventListener('submit',async e=>{e.preventDefault();if(button.disabled||!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));values.consent=$('[name="consent"]',form).checked;if(!values.phone&&!values.email){status.textContent='请留下电话或邮箱，方便回复。';return;}button.disabled=true;status.textContent='正在发送…';try{const response=await fetch(contact.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});const result=await response.json();if(!response.ok)throw new Error(result.error||'发送失败');form.reset();status.textContent='留言已收到，谢谢你。';}catch(error){status.textContent=error.message||'暂时未能发送，请稍后重试。';}finally{button.disabled=false;}});
}

async function load(){
  try{const response=await fetch('data/content.json',{cache:'no-store'});if(!response.ok)throw new Error('load');const data=await response.json();entries=data.entries.filter(x=>cfg[x.type]);profile=data.profile||{};for(const [key,count] of Object.entries(data.display||{})){if(cfg[key])cfg[key].limit=Math.max(1,Math.min(12,Number(count)||cfg[key].limit));}setupContact(data.contact,data.preview);
    for(const [view,c] of Object.entries(cfg)){states[view]={category:page===view&&c.categories.includes(params.get('category'))?params.get('category'):'全部',page:Math.max(1,Math.floor(Number(params.get('page')))||1),q:page===view?params.get('q')||'':'',savedOnly:false};render(view);}
    if(page==='entry')renderEntry();renderAbout();document.dispatchEvent(new CustomEvent('yueyu:ready'));const input=$('[data-list-search]');if(input){input.value=states[page].q;input.addEventListener('input',()=>{states[page].q=input.value;update(page);});}
  }catch{const root=$('#entry-content')||$('main');root.insertAdjacentHTML('afterbegin','<div class="empty-state"><strong>内容暂时未能加载</strong><p>请刷新页面重试。</p></div>');}
}
load();
