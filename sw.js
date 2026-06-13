// Version: 1.0.1 - Purge cache after PWA updates
// Firebase SW handle push notifications separately in firebase-messaging-sw.js

self.addEventListener('install', (event) => {
    // Immediately clear old SW cache if needed, but primarily skip waiting
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Clear old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
            );
        }).then(() => {
            return clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // Skip API calls and external resources
    // Update router when reload page
    if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
        return;
    }

    // For navigation requests (page loads), serve index.html as fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('/index.html').then((response) => {
                    return response || fetch('/index.html');
                });
            })
        );
    }
});


