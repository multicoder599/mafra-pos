const CACHE_NAME = 'mafra-cashier-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './background.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cause:wght@100..900&display=swap'
];

// Install Event: Skip waiting and cache files fault-tolerantly
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the SW to activate instantly
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Adds files individually. If one fails (like a missing image), it won't break the whole app.
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url))
            );
        })
    );
});

// Activate Event: Take control and delete old v1 caches
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); 
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event: Network-First, fallback to Cache
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return; // Don't cache POST/PATCH requests

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then((response) => {
                if (response) return response;
                // If the user navigates while offline, show them the main app UI
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});