// TimeConvert.io Service Worker
const CACHE_NAME = 'timeconvert-v1';

// Only cache local assets - CDN resources require internet anyway
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/main.js',
  '/assets/images/qr-code.png',
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For external CDN resources (cross-origin), always use network-first
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails, return a fallback or nothing
          return new Response('Network error', { status: 408, statusText: 'Network error' });
        })
    );
    return;
  }

  // For local resources, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response from cache
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it's a one-time use
          const responseToCache = response.clone();

          // Cache the response for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});