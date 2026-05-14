const CACHE_NAME = 'animevault-v3';
const ASSETS = ['/', '/index.html', '/css/style.css',
  '/js/utils.js','/js/db.js','/js/api.js','/js/dashboard.js',
  '/js/anime-list.js','/js/anime-detail.js','/js/merch.js',
  '/js/charts.js','/js/timeline.js','/js/calendar.js',
  '/js/theme.js','/js/settings.js','/js/login.js','/js/invite.js','/js/app.js','/js/share.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Don't cache API calls or uploads
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return e.respondWith(fetch(e.request));
  }
  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
