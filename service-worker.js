const CACHE_NAME = 'muscle-boss-v2';
const CORE_ASSETS = [
  './',
  './index.html'
];

// Installation : on met en cache le coeur de l'app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// Activation : on nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});

// Fetch : stratégie cache d'abord, sinon réseau, sinon fallback index.html
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Si offline et que la requête échoue, on renvoie la page principale
        return caches.match('./index.html');
      });
    })
  );
});
