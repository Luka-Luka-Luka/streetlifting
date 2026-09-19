/* Incrémentez CACHE à chaque mise en ligne d'une nouvelle version. */
const CACHE = 'charges-v15';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache d'abord, mise à jour en arrière-plan.
   L'ancienne stratégie était l'inverse : réseau d'abord, cache en secours. Elle donne bien
   la dernière version à chaque lancement, mais au prix d'attendre que le réseau réponde ou
   expire — ce qui, dehors avec deux barres, est le pire des cas. Ici la page s'ouvre
   immédiatement depuis le cache, la nouvelle version est téléchargée pendant ce temps et
   s'applique au lancement suivant. Pour un outil qu'on ouvre entre deux séries, c'est le
   bon compromis : on accepte d'avoir une version de retard, on n'accepte pas d'attendre. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   /* polices et CDN : on laisse passer */
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => {
        if (r && r.status === 200) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return r;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});
