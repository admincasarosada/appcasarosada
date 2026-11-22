// Casa Rosada POS – la app abre aunque falle internet un momento.
// Red primero: cada vez que hay conexión se toma la versión más nueva publicada en GitHub.
const CACHE = 'casarosada-pos-v72';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // Firebase y otros sitios: sin caché
  e.respondWith(fetch(e.request, {cache: 'no-cache'})
    .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
// Al tocar una notificación (por ejemplo, ticket pendiente de cobro) se abre o enfoca la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
