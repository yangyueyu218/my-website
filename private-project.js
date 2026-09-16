import {request} from './vault.js';
// Runs inside an opaque-origin sandbox. It receives only this project's files, never keys or other entries.
function projectRuntime(){
 const nativeFetch=window.fetch.bind(window),nativeOpen=XMLHttpRequest.prototype.open;
 let raw={},urls={},base='',root='',htmlPages={};
 const decoder=new TextDecoder();
 function absolute(value,from=base){try{return new URL(value,from).href.split('#')[0].split('?')[0];}catch{return value;}}
 function mapped(value,from=base){if(!value||/^(?:data:|blob:|#|mailto:|javascript:)/i.test(value))return value;const hash=value.includes('#')?'#'+value.split('#').slice(1).join('#'):'';return (urls[absolute(value,from)]||value)+hash;}
 window.fetch=(input,options)=>{const source=typeof input==='string'||input instanceof URL?String(input):input.url;const dest=mapped(source);return nativeFetch(typeof input==='string'||input instanceof URL?dest:new Request(dest,input),options);};
 XMLHttpRequest.prototype.open=function(method,url,...rest){return nativeOpen.call(this,method,mapped(String(url)),...rest);};
 function js(text,from){return text.replace(/((?:from\s*|import\s*\(\s*|import\s+)["'])([^"']+)(["'])/g,(all,a,path,b)=>/^(?:\.|\/)/.test(path)?a+absolute(path,from)+b:all);}
 function css(text,from){return text.replace(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g,(_,quote,path)=>'url("'+mapped(path,from)+'")');}
 function render(path){
  if(!htmlPages[path])return;base=path;
  const doc=new DOMParser().parseFromString(htmlPages[path],'text/html');doc.querySelectorAll('base').forEach(x=>x.remove());
  const importmap=doc.createElement('script');importmap.type='importmap';importmap.textContent=JSON.stringify({imports:urls});doc.head.prepend(importmap);
  for(const el of doc.querySelectorAll('*')){
   for(const attr of ['src','href','poster','data'])if(el.hasAttribute(attr)){const value=el.getAttribute(attr);el.setAttribute(attr,htmlPages[absolute(value,path)]?absolute(value,path):mapped(value,path));}
   if(el.hasAttribute('srcset'))el.setAttribute('srcset',el.getAttribute('srcset').split(',').map(part=>{const [src,...size]=part.trim().split(/\s+/);return [mapped(src,path),...size].join(' ');}).join(', '));
   if(el.hasAttribute('style'))el.setAttribute('style',css(el.getAttribute('style'),path));
   if(el.tagName==='STYLE')el.textContent=css(el.textContent,path);
   if(el.tagName==='SCRIPT'&&!el.src&&el.type!=='importmap')el.textContent=js(el.textContent,path);
  }
  document.open();document.write('<!doctype html>'+doc.documentElement.outerHTML);document.close();
  document.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(!a)return;const destination=absolute(a.getAttribute('href'));if(htmlPages[destination]){event.preventDefault();render(destination);}});
 }
 addEventListener('message',event=>{
  if(event.source!==parent||event.data?.type!=='project-files'||base)return;
  root=event.data.root;raw=event.data.files;
  for(const [path,file] of Object.entries(raw)){if(/html/.test(file.mime))htmlPages[path]=decoder.decode(file.bytes);else urls[path]=URL.createObjectURL(new Blob([file.bytes],{type:file.mime}));}
  for(const [path,file] of Object.entries(raw)){if(/javascript/.test(file.mime)){const old=urls[path];urls[path]=URL.createObjectURL(new Blob([js(decoder.decode(file.bytes),path)],{type:'text/javascript'}));URL.revokeObjectURL(old);}}
  for(const [path,file] of Object.entries(raw)){if(file.mime==='text/css'){const old=urls[path];urls[path]=URL.createObjectURL(new Blob([css(decoder.decode(file.bytes),path)],{type:'text/css'}));URL.revokeObjectURL(old);}}
  render(root);
 },{once:true});
 parent.postMessage({type:'private-project-ready'},'*');
}
export async function mountPrivateProjects(root){
 for(const frame of root.querySelectorAll('[data-private-project]')){
  try{
   const original=frame.dataset.privateProject.replace(/^__private__\//,'');const result=await request('project',{path:original});const files={};
   // Load in small batches to avoid flooding the browser with a large bundle.
   const names=Object.keys(result.files);
   for(let i=0;i<names.length;i+=8)await Promise.all(names.slice(i,i+8).map(async name=>{const response=await fetch('__private__/'+name,{cache:'no-store'});if(!response.ok)throw Error('项目文件未能解锁');files[new URL(name,document.baseURI).href]={bytes:await response.arrayBuffer(),mime:result.files[name].mime};}));
   if(!frame.isConnected)return;
   const listener=event=>{if(event.source!==frame.contentWindow||event.data?.type!=='private-project-ready')return;removeEventListener('message',listener);frame.contentWindow.postMessage({type:'project-files',root:new URL(original,document.baseURI).href,files},'*',Object.values(files).map(f=>f.bytes));};
   addEventListener('message',listener);
   frame.srcdoc='<!doctype html><meta charset="utf-8"><script>('+projectRuntime.toString().replace(/<\/script/gi,'<\\/script')+')();<\/script>';
  }catch{if(frame.isConnected)frame.srcdoc='<meta charset="utf-8"><p>项目未能加载，请重新解锁后重试。</p>';}
 }
}
