const CACHE_VERSION = 'v22';
const STATIC_CACHE = `224solutions-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `224solutions-dynamic-${CACHE_VERSION}`;
const APP_SHELL_CACHE = `224solutions-app-shell-${CACHE_VERSION}`;

let firebaseAvailable = false;
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');
  firebaseAvailable = true;
} catch (e) {
  console.warn('[FCM SW] Firebase scripts non chargés', e);
}

let firebaseConfig = null;
let fcmInitialized = false;

function initFCM() {
  if (fcmInitialized || !firebaseAvailable || !firebaseConfig) return;
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || 'Nouvelle notification';
      self.registration.showNotification(title, {
        body: payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        tag: payload.data?.notification_id || 'default',
        data: payload.data,
        vibrate: [200, 100, 200],
      });
    });
    fcmInitialized = true;
    console.log('[FCM SW] Initialisé');
  } catch (error) {
    console.error('[FCM SW] Erreur init:', error);
  }
}

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest?v=3',
  '/offline.html',
  '/favicon.png?v=3',
  '/apple-touch-icon.png?v=3',
  '/icon-192.png?v=3',
  '/icon-512.png?v=3',
];

const EXTERNAL_API_DOMAINS = [
  'supabase',
  'googleapis',
  'mapbox',
  'agora',
  'stripe',
  'gstatic',
  'firebase',
  'paypal',
  'cognito',
  'amazoncognito',
  'sentry',
  'emailjs',
];

function fetchWithTimeout(url, timeout = 5000, init = undefined) {
  return Promise.race([
    fetch(url, init),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
  ]);
}

async function precacheShell() {
  const staticCache = await caches.open(STATIC_CACHE);
  console.log(`[SW ${CACHE_VERSION}] Precaching shell...`);

  await Promise.allSettled(
    PRECACHE_ASSETS.map(async (url) => {
      try {
        const response = await fetchWithTimeout(url, 10000);
        if (response.ok) await staticCache.put(url, response);
      } catch (err) {
        console.warn(`[SW] Skip ${url}:`, err?.message || err);
      }
    }),
  );

  try {
    const res = await fetchWithTimeout('/index.html', 10000, { cache: 'no-cache' });
    if (res?.ok) {
      const shellCache = await caches.open(APP_SHELL_CACHE);
      await shellCache.put('/', res.clone());
      await staticCache.put('/index.html', res.clone());

      const html = await res.text();
      const assetUrls = [
        ...new Set(Array.from(html.matchAll(/(?:href|src)=["'](\/assets\/[^"']+)["']/g)).map((m) => m[1])),
      ].filter((u) => /\.(js|css)$/.test(u));

      await Promise.allSettled(
        assetUrls.map(async (u) => {
          try {
            const r = await fetchWithTimeout(u, 15000, { cache: 'no-cache' });
            if (r.ok) await staticCache.put(u, r);
          } catch {
            return;
          }
        }),
      );
      console.log(`[SW] Cached ${assetUrls.length} build assets`);
    }
  } catch (e) {
    console.warn('[SW] Shell precache failed:', e?.message || e);
  }
}

self.addEventListener('install', (event) => {
  console.log(`[SW] Install ${CACHE_VERSION}`);
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activate ${CACHE_VERSION}`);
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.includes(CACHE_VERSION))
            .map((k) => {
              console.log('[SW] Delete old cache:', k);
              return caches.delete(k);
            }),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.pathname === '/manifest.webmanifest' || url.pathname === '/manifest.json') return;

  if (url.pathname === '/healthz.json') return;

  if (url.pathname.startsWith('/~oauth')) return;

  if (url.hostname !== self.location.hostname) {
    const isExternalApi = EXTERNAL_API_DOMAINS.some((d) => url.hostname.includes(d));
    if (isExternalApi) return;
    return;
  }

  if (
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/functions/') ||
    url.pathname.startsWith('/storage/')
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request, {
            cache: 'no-cache',
            credentials: 'same-origin',
          });

          if (networkResponse?.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put('/', networkResponse.clone());
            cache.put('/index.html', networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const shell =
            (await caches.match('/')) ||
            (await caches.match('/index.html')) ||
            (await caches.open(APP_SHELL_CACHE).then((c) => c.match('/')));

          if (shell) return shell;

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5;margin:0"><div style="text-align:center;max-width:400px;padding:40px"><div style="font-size:60px;margin-bottom:16px">📡</div><h1 style="margin-bottom:12px">Mode Hors Ligne</h1><p style="color:#666;margin-bottom:24px">Connexion Internet requise pour charger l\'application.</p><button onclick="location.reload()" style="padding:12px 24px;background:#023288;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer">Réessayer</button></div><script>window.addEventListener("online",()=>location.reload())</script></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') && /\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
            return response;
          }
          // 404 means a new deployment invalidated this chunk.
          // Clear all caches to force a fresh load on next navigation.
          if (response.status === 404) {
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          // Network failed and no cache — signal a hard reload is needed.
          caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
          return Response.error();
        }),
    );
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (response?.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#ddd" width="200" height="200"/><text fill="#999" x="50%" y="50%" text-anchor="middle" dy=".3em">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } },
              );
            }
            return Response.error();
          });
      }),
    );
    return;
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'forceRefresh') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    });
    return;
  }
  if (event.data?.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initFCM();
    return;
  }
  if (event.data === 'clearAllCaches') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || '224Solutions', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        data: data.data || {},
        tag: data.tag || 'default',
        vibrate: [200, 100, 200],
      }),
    );
  } catch (e) {
    console.warn('[SW] Push parse error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});

self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
});

console.log(`[SW] Service Worker chargé (${CACHE_VERSION})`);
