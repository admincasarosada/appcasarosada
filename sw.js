// Casa Rosada POS – la app abre aunque falle internet un momento.
// Red primero: cada vez que hay conexión se toma la versión más nueva publicada en GitHub.
const CACHE = 'casarosada-pos-v232';
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
// Notificación push: se muestra siempre (con la app abierta o cerrada); la app ya no repite los avisos por dentro.
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) { d = {t: e.data ? e.data.text() : ''}; }
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    return self.registration.showNotification('Casa Rosada · ' + String(d.t || 'Novedad en un pedido').replace(/^\S+\s/, ''), {
      body: d.d || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.k || undefined, renotify: true, requireInteraction: true, vibrate: [300, 120, 300]});
  }));
});
// Al tocar una notificación se abre la app instalada (pantalla de inicio) si existe; si no, el navegador.
// Las ventanas de la app instalada se reconocen porque abren con ?app=1 (start_url del manifiesto).
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    const app = cs.find(c => c.url.includes('app=1')) || cs[0];
    if (app && 'focus' in app) return app.focus();
    return self.clients.openWindow('./?app=1');
  }));
});
