/**
 * Service Worker for Offline Support
 * 
 * Caches critical assets and API responses
 * Provides offline email viewing like Gmail
 */

const CACHE_NAME = 'easemail-v1';
const RUNTIME_CACHE = 'easemail-runtime-v1';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/inbox',
  '/manifest.json',
  // Add critical JS/CSS bundles here
];

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  '/api/nylas/accounts',
  '/api/nylas/folders/sync',
  '/api/nylas/folders/counts',
  '/api/nylas/messages',
];

// Install: Cache critical assets
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching precache assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('📦 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch: Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Check if this is a cacheable API request
  const isCacheableAPI = CACHEABLE_API_PATTERNS.some(pattern => 
    url.pathname.startsWith(pattern)
  );

  if (isCacheableAPI) {
    // Network-first strategy for API
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone response to cache it
          const responseToCache = response.clone();
          
          caches.open(RUNTIME_CACHE)
            .then(cache => {
              cache.put(request, responseToCache);
            });

          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('📦 Serving from cache (offline):', url.pathname);
                return cachedResponse;
              }
              
              // Return offline page for email lists
              return new Response(
                JSON.stringify({
                  success: false,
                  offline: true,
                  message: 'You are offline. Showing cached data.',
                }),
                {
                  headers: { 'Content-Type': 'application/json' },
                  status: 503,
                }
              );
            });
        })
    );
  } else {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then(response => {
              // Cache successful responses
              if (response.status === 200) {
                const responseToCache = response.clone();
                caches.open(RUNTIME_CACHE)
                  .then(cache => {
                    cache.put(request, responseToCache);
                  });
              }

              return response;
            });
        })
    );
  }
});

// Background Sync: Queue failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emails') {
    console.log('🔄 Background sync: Syncing emails');
    
    event.waitUntil(
      // Retry failed requests
      syncFailedRequests()
    );
  }
});

async function syncFailedRequests() {
  // Get failed requests from IndexedDB
  // Retry them when online
  // This is a placeholder - implement based on your needs
  console.log('🔄 Retrying failed requests...');
}

// Message handler: Clear cache on command
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    console.log('🗑️ Clearing all caches');
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
  }
});

export {}; // Make this a module

