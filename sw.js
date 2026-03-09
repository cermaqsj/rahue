const CACHE_NAME = 'rahue-bitacora-v2.0';

const ASSETS = [
    './',
    './index.html',
    './cermaq-style.css',
    './bitacora_mantencion.js',
    './Cermaq_logo2.png',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Promise.allSettled avoids one failing asset from breaking the whole cache process
            return Promise.allSettled(ASSETS.map(url => cache.add(url)));
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.map((key) => {
                        if (key !== CACHE_NAME && key.includes('rahue-bitacora')) {
                            return caches.delete(key);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (e) => {
    // Si la petición es hacia Apps Script (para enviar reportes), usar red e ignorar caché
    if (e.request.url.includes('script.google.com')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            // Serve from cache if available 
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise try crossing the network
            return fetch(e.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                // Optional: Cache dynamically fetched files
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // If network fails (Offline view fallback)
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
