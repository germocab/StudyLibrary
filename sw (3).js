// Cambia VERSION en cada actualización de la app para renovar la caché.
const VERSION='1.8.7.2',CACHE='biblioteca-'+VERSION;
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png'];
const EXTRA=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(SHELL);await Promise.all(EXTRA.map(u=>c.add(new Request(u,{mode:'no-cors'})).catch(()=>{})));self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('biblioteca-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.hostname.endsWith('supabase.co')||u.hostname.endsWith('jw.org'))return; // datos en vivo: sin caché
 if(r.mode==='navigate'){e.respondWith((async()=>{try{const n=await fetch(r);const c=await caches.open(CACHE);c.put('./index.html',n.clone());return n}catch(_){return (await caches.match('./index.html'))||(await caches.match('./'))||Response.error()}})());return}
 // recursos estáticos y fuentes: usa caché y actualiza en segundo plano
 e.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(r);
  const net=fetch(r).then(n=>{if(n&&(n.ok||n.type==='opaque'))c.put(r,n.clone());return n}).catch(()=>hit);
  return hit||net})())});
