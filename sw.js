// ABOUTME: Service worker for offline support and caching
// ABOUTME: Implements cache-first strategy with versioning and update notifications

const CACHE_VERSION = 'v1.0.11';
const CACHE_NAME = `lm-track-manager-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './styles/main.css',
    './js/app.js',
    './js/db.js',
    './js/services/sync.js',
    './js/config/firebase-config.js',
    './js/views/auth.js',
    './js/models/Program.js',
    './js/models/Release.js',
    './js/models/Track.js',
    './js/models/Workout.js',
    './js/views/library.js',
    './js/views/tracks.js',
    './js/views/workouts.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .then(fetchResponse => {
                        // Cache dynamic content (HTML, JSON, etc)
                        if (fetchResponse.ok && event.request.method === 'GET') {
                            const responseClone = fetchResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseClone));
                        }
                        return fetchResponse;
                    });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});

// Message event - respond to version checks and skip waiting requests
self.addEventListener('message', (event) => {
    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }

    if (event.data.type === 'SKIP_WAITING') {
        // Activate the new service worker immediately
        self.skipWaiting().then(() => {
            // Notify all clients that activation is complete
            return self.clients.matchAll();
        }).then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'SW_ACTIVATED' });
            });
        });
    }
});
