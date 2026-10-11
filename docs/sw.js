const CACHE='postcard-studio-v2';
const FILES=['./','./index.html','./style.css','./app.js','./model.js','./core-adapter.js','./render.js','./export.js','./storage.js','./sample.svg','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(FILES);for(const f of ['./core.generated.js','./core.generated.wasm']){try{await c.add(f);}catch{/* Uncompiled local preview uses the numerical fallback. */}}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('postcard-studio-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;return fetch(event.request);})());
});
