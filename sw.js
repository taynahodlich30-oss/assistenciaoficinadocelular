const CACHE_NAME = 'oficina-os-cache-v8-sem-emojis';
const urlsToCache = [
  'index.html',
  'style.css',
  'redesign.css?v=3',
  'icons.svg?v=3',
  'app-icon-192.png',
  'app-icon-512.png',
  'script.js?v=3',
  'garantia.html',
  'garantia.js',
  'manifest.json?v=3'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('oficina-os-cache-') && key !== CACHE_NAME).map(key => caches.delete(key))))]));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Sempre consulte a versão publicada; o cache mantém apenas o acesso offline.
  event.respondWith(fetch(request).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = url.pathname.endsWith('/garantia.html') ? 'garantia.html' : 'index.html';
      return (await caches.match(fallback)) || Response.error();
    }
    return Response.error();
  }));
});
