/* JW Library Pro · Service Worker (v7.1)
   - Precachea la app para que abra sin conexión.
   - HTML: red primero (siempre la última versión) y caché si no hay conexión.
   - Archivos estáticos, fuentes y librerías: caché primero y se actualizan en segundo plano.
   - Supabase (sincronización / sesión) nunca se guarda en caché. */
const VERSION = '7.1';
const CACHE = 'biblioteca-' + VERSION;
const ICONS = 'favicon_io%20(1)/';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  ICONS + 'android-chrome-192x192.png', ICONS + 'android-chrome-512x512.png',
  ICONS + 'apple-touch-icon.png', ICONS + 'favicon-32x32.png',
  ICONS + 'favicon-16x16.png', ICONS + 'favicon.ico'
];
const CDN = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];
const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(u => c.add(u)));
    await Promise.allSettled(CDN.map(async u => c.put(u, await fetch(new Request(u, { mode: 'no-cors' })))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('biblioteca-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

const pageKey = url => new Request(url.origin + url.pathname); // ignora ?pane=1 y #hash

async function networkFirst(req, url) {
  const c = await caches.open(CACHE), key = pageKey(url);
  try {
    const res = await fetch(req);
    if (res && res.ok) c.put(key, res.clone());
    return res;
  } catch (_) {
    return (await c.match(key)) || (await c.match('index.html')) || (await c.match('./')) ||
      new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE), hit = await c.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return; // sync: siempre red
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, url)); return; }
  if (url.origin === location.origin || CACHEABLE_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
