/**
 * Service Worker for Mage Knight PWA
 * Cache-first strategy for static assets, network-first for dynamic content
 */

const CACHE_NAME = 'mageknight-v16';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.png',
    '/css/reset.css',
    '/css/layout.css',
    '/css/hud.css',
    '/css/cards.css',
    '/css/modals.css',
    '/css/tutorial.css',
    '/css/effects.css',
    '/css/loading.css',
    '/styles-events.css',
    '/combat-effects.css',
    '/time-effects.css',
    '/mobile.css',
    '/js/main.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.warn('[SW] Cache addAll failed, continuing anyway:', err);
                return self.skipWaiting();
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - cache-first for static, network-first for dynamic
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) protocols
    if (!url.protocol.startsWith('http')) return;

    // Cache-first strategy for static assets
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
    } else {
        // Network-first for everything else
        event.respondWith(networkFirst(request));
    }
});

// Check if request is for a static asset
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname === '/' || pathname.endsWith('.html');
}

// Cache-first strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('[SW] Fetch failed:', error);
        // Return offline fallback if available
        return caches.match('/index.html');
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        // Return offline fallback
        return caches.match('/index.html');
    }
}
