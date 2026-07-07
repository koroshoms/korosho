const CACHE_NAME = 'korosho-ems-v3'; // Increased version number to force update
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // Force the waiting service worker to become the active one
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Delete old caches
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all open clients immediately
});

self.addEventListener('fetch', event => {
  // Skip cross-origin requests like Supabase API calls
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Network First Strategy for HTML files
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        // If we get a valid response, clone it and put it in the cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If the network fails (offline), serve from cache
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // Cache First Strategy for other assets (icons, css)
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
