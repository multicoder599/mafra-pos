const CACHE_NAME = 'mafra-cashier-v1';
const ASSETS = [
    './',
    './index.html',
    './background.png',
    'https://fonts.googleapis.com/css2?family=Cause:wght@100..900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. Install and Cache the UI
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Offline cache loaded');
            return cache.addAll(ASSETS);
        })
    );
});

// 2. Serve from Cache if Offline
self.addEventListener('fetch', event => {
    // We only cache the UI files. We ignore API calls here because our app handles offline API data manually.
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});