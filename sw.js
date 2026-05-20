const CACHE_NAME = 'translator-v1';
const ASSETS = [
  './',
  './index.html',
  './main.js',
  './lhil0-dovhv-001.ico'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
