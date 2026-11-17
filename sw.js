/**
 * FoodTrack - Enterprise Service Worker
 * Soporte Offline-First y rotacion atomica de cache
 * AiAppFactory Standard
 */

const CACHE_NAME = 'foodtrack-cache-v1.0.01';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './version.json',
  './src/main.js',
  './src/sw-register.js',
  './src/core/employeeRegistry.js',
  './src/core/haccpThermalSentinel.js',
  './src/core/menuProductionEngine.js',
  './src/services/corporateBillingService.js',
  './src/services/foodTrackCache.service.js',
  './src/services/mealValidationService.js',
  './src/services/whatsAppMenuNotifier.service.js',
  './src/utils/cryptoSeal.js',
  './src/utils/formatters.js',
  './src/utils/icons.js',
  './src/utils/sanitizer.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key.startsWith('foodtrack-cache-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const isHtmlOrVersion =
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname.endsWith('/index.html');

  if (isHtmlOrVersion) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
