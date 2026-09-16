const $=s=>document.querySelector(s);
const workerURL=new URL('./vault-worker.js',import.meta.url);
let registration,active=false,lastTouch=0,openedBy,digest='',pendingUnlock=false;
async function worker(){
 if(!isSecureContext||!navigator.serviceWorker)throw Error('请使用支持管理员模式的浏览器，并通过 HTTPS 打开网站。');
 if(!registration)registration=await navigator.serviceWorker.register(workerURL,{scope:new URL('./',workerURL).pathname,updateViaCache:'none'});
 await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',done);resolve();};const timer=setTimeout(()=>reject(Error('管理员模式正在初始化，请刷新后重试。')),8000);navigator.serviceWorker.addEventListener('controllerchange',done);if(navigator.serviceWorker.controller)done();});
 return navigator.serviceWorker.controller;
}
export async function request(type,extra={}){
 const target=await worker();return new Promise((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();reject(Error('连接超时，请重试。'));},30000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();e.data.ok?resolve(e.data):reject(Error(e.data.error));};target.postMessage({type,...extra},[channel.port2]);});
}
export function privateEntry(entry){
 const rewrite=value=>Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)])):typeof value==='string'?value.replace(/(?<![\w/:])uploads\/([A-Za-z0-9_-]+)\//g,'__private__/uploads/$1/'):value;
 return {...rewrite(entry),visibility:'private',encrypted:true};
}
export async function initVault(onChange,{preview=false}={}){
 const dialog=$('#vault-dialog'),form=$('#vault-form'),button=$('[data-vault-open]'),password=$('#vault-password'),message=$('#vault-message');
 if(!dialog||!button)return;
 const apply=result=>{active=!!result.unlocked;document.body.classList.toggle('vault-unlocked',active);button.textContent=active?'管理员模式 · 已开启':'管理员模式';$('#vault-title').textContent=active?'内容已解锁':'开启管理员模式';form.hidden=active;$('#vault-lock').hidden=!active;$('#vault-intro').textContent=active?'当前可以查看全部已发布内容。15 分钟无操作后自动锁定。':'输入密码，查看仅管理员可见的内容。';const next=active?JSON.stringify(result.entries||[]):'locked';if(next!==digest){digest=next;onChange(active?(result.entries||[]).map(privateEntry):[]);}};
 async function status(){if(preview)return;try{apply(await request('status'));}catch{if(active)apply({unlocked:false});}}
 button.addEventListener('click',async()=>{openedBy=button;message.textContent='';password.value='';dialog.showModal();if(preview){form.hidden=true;$('#vault-lock').hidden=true;$('#vault-intro').textContent='本地预览已包含全部内容；正式网站会要求密码解锁。';return;}if(!active)password.focus();await status();});
 form.addEventListener('submit',async event=>{event.preventDefault();const submit=form.querySelector('button[type=submit]');submit.disabled=true;pendingUnlock=true;message.textContent='正在解锁…';try{const result=await request('unlock',{password:password.value});password.value='';if(!pendingUnlock)return;pendingUnlock=false;apply(result);message.textContent='';dialog.close();}catch(error){password.value='';message.textContent=error.message;password.focus();}finally{pendingUnlock=false;submit.disabled=false;}});
 $('#vault-lock').addEventListener('click',async()=>{try{await request('lock');apply({unlocked:false});dialog.close();}catch{message.textContent='锁定未完成，请关闭此网站的所有标签页。';}});
 dialog.addEventListener('close',()=>{if(pendingUnlock){pendingUnlock=false;void request('lock');}password.value='';openedBy?.focus({preventScroll:true});});
 if(preview)return;
 navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='vault-locked')apply({unlocked:false});});
 for(const event of ['pointerdown','keydown','scroll'])addEventListener(event,()=>{if(active&&Date.now()-lastTouch>30000){lastTouch=Date.now();void request('touch').catch(()=>apply({unlocked:false}));}},{passive:true});
 addEventListener('pagehide',()=>{if(active){digest='';onChange([]);document.title='Yang Yueyu’s Personal Website';}});
 addEventListener('pageshow',()=>void status());
 setInterval(()=>{if(active)void status();},15000);
 await status();
}
