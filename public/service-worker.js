// Service Worker v8 - PWA + Firebase Cloud Messaging + Mode Offline Desktop & Mobile
const CACHE_VERSION = "v8";
const STATIC_CACHE = `224solutions-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `224solutions-dynamic-${CACHE_VERSION}`;
const APP_SHELL_CACHE = `224solutions-app-shell-${CACHE_VERSION}`;

// --- Firebase Cloud Messaging (FCM) ---
let firebaseAvailable = false;
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');
  firebaseAvailable = true;
} catch (e) {
  console.warn('[FCM SW] Firebase scripts non chargés — notifications désactivées', e);
}

let firebaseConfig = null;
let fcmInitialized = false;

function initFCM() {
  if (fcmInitialized) return;
  if (!firebaseAvailable) {
    console.log('[FCM SW] Firebase indisponible, init FCM ignorée');
    return;
  }
  if (!firebaseConfig) {
    console.log('[FCM SW] Config Firebase non disponible');
    return;
  }

  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Message reçu en arrière-plan:', payload);

      const notificationTitle = payload.notification?.title || 'Nouvelle notification';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        tag: payload.data?.notification_id || 'default',
        data: payload.data,
        vibrate: [200, 100, 200],
        requireInteraction: payload.data?.type === 'emergency',
        actions: getNotificationActions(payload.data?.type),
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    fcmInitialized = true;
    console.log('[FCM SW] Firebase Messaging initialisé');
  } catch (error) {
    console.error('[FCM SW] Erreur initialisation:', error);
  }
}

function getNotificationActions(type) {
  switch (type) {
    case 'emergency':
      return [
        { action: 'view', title: '🚨 Voir l\'urgence' },
        { action: 'call', title: '📞 Appeler' },
      ];
    case 'transaction':
      return [{ action: 'view', title: '💰 Voir détails' }];
    case 'message':
      return [
        { action: 'reply', title: '💬 Répondre' },
        { action: 'view', title: '👁️ Voir' },
      ];
    default:
      return [{ action: 'view', title: 'Voir' }];
  }
}

// Assets essentiels à précacher pour le mode offline
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/offline.html",
  "/favicon.png",
  "/icon-72.png",
  "/icon-96.png",
  "/icon-128.png",
  "/icon-144.png",
  "/icon-152.png",
  "/icon-192.png",
  "/icon-384.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

// Routes principales de l'app vendeur à mettre en cache dynamiquement (desktop & mobile)
const VENDOR_ROUTES = [
  "/vendeur",
  "/vendeur/dashboard",
  "/vendeur/products",
  "/vendeur/orders",
  "/vendeur/pos",
  "/vendeur/clients",
  "/vendeur/inventory",
  "/vendeur/wallet",
  "/vendeur/settings",
  "/vendeur/analytics",
  "/vendeur/marketing",
  "/vendeur/support",
  "/vendeur/agents",
  "/vendeur/expenses",
  "/vendeur/payments"
];

// Routes additionnelles pour marketplace/auth (desktop)
const CORE_ROUTES = [
  "/",
  "/marketplace",
  "/login",
  "/signup"
];

// Pré-cache robuste: index.html + assets build (/assets/...) pour éviter l'écran blanc au redémarrage offline (iOS)
async function precacheIndexAndBuildAssets() {
  const staticCache = await caches.open(STATIC_CACHE);

  // 1) Assets essentiels (best-effort)
  await Promise.allSettled(
    PRECACHE_ASSETS.map((url) =>
      staticCache.add(url).catch((err) => console.warn(`[SW] Échec cache ${url}:`, err))
    )
  );

  // 2) Index + extraction des assets Vite (/assets/*.js|css)
  try {
    const res = await fetch('/index.html', {
      cache: 'reload',
      credentials: 'same-origin',
    });

    if (!res || !res.ok) return;

    // Garder une copie "app shell" pour les routes SPA
    const shellCache = await caches.open(APP_SHELL_CACHE);
    await shellCache.put('/', res.clone());

    // Mettre aussi /index.html en cache
    await staticCache.put('/index.html', res.clone());

    const html = await res.text();
    const assetUrls = Array.from(
      html.matchAll(/(?:href|src)=["'](\/assets\/[^"']+)["']/g)
    ).map((m) => m[1]);

    const uniqueAssetUrls = Array.from(new Set(assetUrls));

    await Promise.allSettled(
      uniqueAssetUrls.map((u) =>
        staticCache.add(new Request(u, { cache: 'reload' })).catch(() => {})
      )
    );

    console.log('[SW] Précache build assets:', uniqueAssetUrls.length);
  } catch (e) {
    console.warn('[SW] Impossible de précacher index/assets:', e);
  }
}

// INSTALL - Précacher les assets essentiels (mobile + desktop)
self.addEventListener("install", (event) => {
  console.log("[SW] Installation v8 - Mode offline desktop & mobile activé");

  event.waitUntil(
    precacheIndexAndBuildAssets().then(() => {
      console.log("[SW] Précache terminé");
      self.skipWaiting();
    })
  );
});

// ACTIVATE - Nettoyer anciens caches et mettre en cache les routes vendeur + core
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation v8");

  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.includes(CACHE_VERSION))
            .map((key) => {
              console.log("[SW] Suppression cache:", key);
              return caches.delete(key);
            })
        )
      ),
      // Prendre le contrôle immédiatement
      self.clients.claim(),
      // Précacher les routes vendeur + core en arrière-plan
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log("[SW] Mise en cache des routes vendeur + core...");
        const allRoutes = [...VENDOR_ROUTES, ...CORE_ROUTES];
        return Promise.allSettled(
          allRoutes.map(route => 
            fetch(route, { cache: 'reload' })
              .then(response => {
                if (response.ok) {
                  cache.put(route, response);
                  console.log(`[SW] Route en cache: ${route}`);
                }
              })
              .catch(() => {})
          )
        );
      })
    ])
  );
});

// FETCH - Stratégie optimisée pour mode offline vendeur
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignorer les APIs externes
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("mapbox") ||
    url.hostname.includes("agora") ||
    url.hostname.includes("stripe") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("firebase")
  ) {
    return;
  }

  // Si hostname différent et pas une extension connue, ignorer
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // Navigation (HTML) - Network First avec fallback app shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Essayer le réseau d'abord
          const networkResponse = await fetch(event.request, { 
            cache: 'no-cache',
            credentials: 'same-origin'
          });
          
          if (networkResponse && networkResponse.ok) {
            // Mettre en cache pour usage offline
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(event.request, networkResponse.clone());
            
            // Aussi mettre en cache l'URL canonique pour les routes SPA
            if (url.pathname.startsWith('/vendeur')) {
              cache.put(url.pathname, networkResponse.clone());
            }
          }
          return networkResponse;
        } catch (error) {
          console.log("[SW] Mode offline - Récupération depuis cache pour:", url.pathname);
          
          // 1. Essayer le cache exact
          const exactMatch = await caches.match(event.request);
          if (exactMatch) return exactMatch;
          
          // 2. Essayer le chemin seul (sans query string)
          const pathMatch = await caches.match(url.pathname);
          if (pathMatch) return pathMatch;
          
          // 3. Pour les routes SPA, servir l'app shell (index.html)
          const appShell = await caches.match('/') || 
                          await caches.match('/index.html') ||
                          await caches.open(APP_SHELL_CACHE).then(c => c.match('/'));
          
          if (appShell) {
            console.log("[SW] Serving app shell for offline SPA route:", url.pathname);
            return appShell;
          }
          
          // 4. Page offline d'urgence avec toutes les infos
          console.log("[SW] Serving emergency offline page");
          return new Response(
            `<!DOCTYPE html>
            <html lang="fr">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>224Solutions - Mode Hors Ligne</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: system-ui, -apple-system, sans-serif;
                  background: linear-gradient(135deg, #667eea, #764ba2);
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 20px;
                  text-align: center;
                  max-width: 400px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                h1 { color: #2c3e50; margin-bottom: 15px; }
                p { color: #7f8c8d; margin-bottom: 25px; line-height: 1.6; }
                .icon { font-size: 60px; margin-bottom: 20px; }
                button {
                  padding: 14px 28px;
                  background: linear-gradient(135deg, #667eea, #764ba2);
                  color: white;
                  border: none;
                  border-radius: 50px;
                  font-size: 16px;
                  cursor: pointer;
                  font-weight: 600;
                }
                button:hover { transform: scale(1.05); }
                .info { 
                  margin-top: 20px;
                  padding: 15px;
                  background: #f8f9fa;
                  border-radius: 10px;
                  font-size: 13px;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">📡</div>
                <h1>Mode Hors Ligne</h1>
                <p>Vous n'êtes pas connecté à Internet. L'interface vendeur nécessite une connexion pour charger initialement.</p>
                <button onclick="location.reload()">🔄 Réessayer</button>
                <div class="info">
                  <strong>💡 Conseil:</strong> Visitez l'interface une première fois avec Internet pour activer le mode hors-ligne.
                </div>
              </div>
              <script>
                window.addEventListener('online', () => location.reload());
              </script>
            </body>
            </html>`,
            { 
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' } 
            }
          );
        }
      })()
    );
    return;
  }

  // Assets avec hash (immutables) - Cache First
  if (url.pathname.match(/\/assets\/.*\.[a-f0-9]{8}\./)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Autres ressources statiques - Cache First pour meilleur offline
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) {
            console.log("[SW] Serving from cache:", url.pathname);
            return cached;
          }
          
          // Pas en cache, fetch depuis réseau
          return fetch(event.request)
            .then((response) => {
              if (response && response.ok) {
                const clone = response.clone();
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(event.request, clone);
                  console.log("[SW] Cached:", url.pathname);
                });
              }
              return response;
            })
            .catch((err) => {
              console.warn("[SW] Network failed, no cache available:", url.pathname);
              // Retourner une image placeholder pour les images
              if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#ddd" width="200" height="200"/><text fill="#999" x="50%" y="50%" text-anchor="middle" dy=".3em">Offline</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              throw err;
            });
        })
    );
    return;
  }
});

// Message handler
self.addEventListener("message", (event) => {
  // PWA: skip waiting
  if (event.data === "skipWaiting") {
    self.skipWaiting();
    return;
  }

  // PWA: refresh clients
  if (event.data === "forceRefresh") {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    });
    return;
  }

  // FCM: inject config
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    firebaseConfig = event.data.config;
    initFCM();
  }
});

// Gérer les clics sur les notifications
self.addEventListener("notificationclick", (event) => {
  console.log("[FCM SW] Clic sur notification:", event);

  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = "/";

  if (event.action === "view" || !event.action) {
    if (data.action_url) {
      targetUrl = data.action_url;
    } else if (data.type === "emergency" && data.alert_id) {
      targetUrl = `/emergency/${data.alert_id}`;
    } else if (data.type === "transaction" && data.transaction_id) {
      targetUrl = `/wallet/transactions/${data.transaction_id}`;
    } else if (data.type === "message" && data.conversation_id) {
      targetUrl = `/messages/${data.conversation_id}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            url: targetUrl,
            data: data,
          });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[FCM SW] Notification fermée:", event.notification.tag);
});

console.log("[SW] Service Worker chargé (v8 - Desktop & Mobile Offline)");
