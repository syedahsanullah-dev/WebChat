/**
 * WebChat Service Worker (PWA & Offline Reconnection)
 * Provides caching for shell assets, sounds, icons, and offline fallback
 */

const CACHE_NAME = 'webchat-cache-v1';

const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/patterns/doodle-bg.png',
  '/sounds/sent.mp3',
  '/sounds/receive.mp3',
  '/sounds/ringtone.mp3',
];

// 1. Install Event: Cache core shell and media assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-caching assets failed:', err);
      })
  );
});

// 2. Activate Event: Clean up outdated cache stores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Routing & Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Never cache API routes or WebSocket upgrade traffic
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // Strategy A: Page navigation requests (Network-first with /offline.html fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html').then((offlineResponse) => {
          return (
            offlineResponse ||
            new Response('You are offline. Please reconnect to the internet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          );
        });
      })
    );
    return;
  }

  // Strategy B: Static assets (sounds, icons, patterns, Next.js static bundles)
  // Cache-first strategy
  const isStaticAsset =
    url.pathname.startsWith('/sounds/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/patterns/') ||
    url.pathname.startsWith('/_next/static/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy C: Other GET requests (Stale-while-revalidate / Network with cache fallback)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Background Web Push Notification Handlers (Phase 23 VAPID)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = { title: 'WebChat', body: event.data.text() };
  }

  const title = data.title || data.senderName || 'WebChat';
  const options = {
    body: data.body || 'New message',
    icon: data.avatarUrl || data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || (data.chatId ? `/chat/${data.chatId}` : '/chat'),
      chatId: data.chatId,
    },
    tag: data.tag || data.chatId || 'webchat-msg',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes('/chat')) {
            client.focus();
            if (client.navigate && targetUrl) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

