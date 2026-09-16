/* Memory-only private viewing session. No plaintext/key is stored in CacheStorage or IndexedDB. */
const BASE=new URL('./',self.location),PREFIX=new URL('__private__/',BASE).pathname;
const SHELL=new Set(['','index.html','creations.html','resources.html','notes.html','entry.html']);
const AAD=new TextEncoder().encode('yueyu-vault-v1:');
let session=null,revision=0;
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const aad=name=>new TextEncoder().encode('yueyu-vault-v1:'+name);
const pageAllowed=client=>{try{const u=new URL(client.url),path=u.pathname.slice(BASE.pathname.length);return u.origin===BASE.origin&&u.pathname.startsWith(BASE.pathname)&&(SHELL.has(path)||/^entries\/[A-Za-z0-9_-]{1,80}\.html$/.test(path));}catch{return false;}};
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function lock(){session=null;revision++;for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'vault-locked'});}
async function current(){if(session&&(Date.now()>session.expires||!(await self.clients.matchAll({type:'window'})).some(pageAllowed)))await lock();return session;}
async function readConfig(){const r=await fetch(new URL('_private/config.json',BASE),{cache:'no-store'});if(!r.ok)throw Error('尚未启用管理员模式，请先在 Mac 内容管家设置密码并发布。');const c=await r.json();if(c.version!==1||!/^\w{32}$/.test(c.id)||!Number.isInteger(c.iterations)||c.iterations<600000||c.iterations>2000000||!/^[a-f0-9]{64}\.bin$/.test(c.manifest))throw Error('加密配置无法识别，请重新发布网站。');return c;}
async function decryptFile(key,name,file){if(!/^[a-f0-9]{64}\.bin$/.test(file))throw Error('文件索引无效');const r=await fetch(new URL('_private/'+file,BASE),{cache:'no-store'});if(!r.ok)throw Error('私有文件未能加载，请重新解锁或检查网络。');const encrypted=new Uint8Array(await r.arrayBuffer());return crypto.subtle.decrypt({name:'AES-GCM',iv:encrypted.slice(0,12),additionalData:aad(name)},key,encrypted.slice(12));}
self.addEventListener('message',event=>{
 const port=event.ports[0];if(!port||!pageAllowed(event.source))return;
 event.waitUntil((async()=>{try{
  const message=event.data||{};
  if(message.type==='lock'){await lock();port.postMessage({ok:true,unlocked:false});return;}
  if(message.type==='unlock'){
   const attempt=++revision;session=null;
   const c=await readConfig();let key,manifest;
   try{
    const password=await crypto.subtle.importKey('raw',new TextEncoder().encode(message.password),'PBKDF2',false,['deriveKey']);
    const wrapping=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(c.salt),iterations:c.iterations,hash:'SHA-256'},password,{name:'AES-GCM',length:256},false,['decrypt']);
    const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(c.nonce),additionalData:aad('wrap:'+c.id)},wrapping,bytes(c.wrappedKey));
    key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);new Uint8Array(raw).fill(0);
   }catch{throw Error('密码不正确，请重新输入。');}
   manifest=JSON.parse(new TextDecoder().decode(await decryptFile(key,'manifest',c.manifest)));
   if(!Array.isArray(manifest.entries)||!manifest.files)throw Error('私有内容索引不完整');
   if(attempt!==revision)throw Error('解锁已取消，请重试');
   session={key,manifest,expires:Date.now()+15*60*1000};
   port.postMessage({ok:true,unlocked:true,entries:manifest.entries});return;
  }
  const active=await current();
  if(active&&message.type==='project'){const entry=active.manifest.entries.find(e=>e.project?.entry===message.path);if(!entry)throw Error('项目未找到');const folder=message.path.split('/').slice(0,2).join('/')+'/';port.postMessage({ok:true,files:Object.fromEntries(Object.entries(active.manifest.files).filter(([name])=>name.startsWith(folder)))});return;}
  if(active&&message.type==='touch')active.expires=Date.now()+15*60*1000;
  port.postMessage({ok:true,unlocked:!!active,...(active&&message.type==='status'?{entries:active.manifest.entries}:{})});
 }catch(error){port.postMessage({ok:false,error:error.message||'解锁未完成，请重试。'});}})());
});
const denied=()=>new Response('内容已锁定。请回到网站开启管理员模式。',{status:401,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(u.origin!==BASE.origin)return;
 let name;try{name=decodeURIComponent(u.pathname.startsWith(PREFIX)?u.pathname.slice(PREFIX.length):u.pathname.slice(BASE.pathname.length));}catch{return;}
 const virtual=u.pathname.startsWith(PREFIX);
 if(!virtual&&!session?.manifest.files[name])return;
 event.respondWith((async()=>{
  const active=await current();if(!active)return denied();
  const descriptor=active.manifest.files[name];if(!descriptor)return new Response('Not found',{status:404});
  if(!['GET','HEAD'].includes(event.request.method))return new Response('Method not allowed',{status:405});
  try{
   const data=await decryptFile(active.key,name,descriptor.cipher);if(session!==active)return denied();
   const headers={'Content-Type':descriptor.mime,'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Access-Control-Allow-Origin':'*','Accept-Ranges':'bytes'};
   if(/html|svg\+xml/.test(descriptor.mime))headers['Content-Security-Policy']="sandbox allow-scripts allow-forms allow-modals allow-downloads; object-src 'none'; base-uri 'self'";
   const range=event.request.headers.get('Range');let body=data,status=200;
   if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m)return new Response(null,{status:416});const start=m[1]?Number(m[1]):Math.max(0,data.byteLength-Number(m[2]));const end=m[1]?(m[2]?Math.min(Number(m[2]),data.byteLength-1):data.byteLength-1):data.byteLength-1;if(start>end||start>=data.byteLength)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+data.byteLength}});body=data.slice(start,end+1);headers['Content-Range']=`bytes ${start}-${end}/${data.byteLength}`;status=206;}
   headers['Content-Length']=String(body.byteLength);
   return new Response(event.request.method==='HEAD'?null:body,{status,headers});
  }catch{return new Response('文件加载失败，请重新解锁后重试。',{status:503,headers:{'Cache-Control':'no-store'}});}
 })());
});
