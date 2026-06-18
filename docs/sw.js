const CACHE = 'alenanails-v14';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './logo-banner.png',
  './icon-alena-152.png',
  './icon-alena-167.png',
  './icon-alena-180.png',
  './icon-alena-192.png',
  './icon-alena-512.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

const NETWORK_FIRST = [
  'app.js',
  'style.css',
  'index.html',
  'manifest.json',
  'logo-banner.png',
  'icon-alena-152.png',
  'icon-alena-167.png',
  'icon-alena-180.png',
  'icon-alena-192.png',
  'icon-alena-512.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const path = new URL(event.request.url).pathname;
  const networkFirst = NETWORK_FIRST.some((name) => path.endsWith(name));

  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
