// Service Worker v6 - PWA + Firebase Cloud Messaging (Unifié)
const CACHE_VERSION = "v6";
const STATIC_CACHE = `224solutions-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `224solutions-dynamic-${CACHE_VERSION}`;

// --- Firebase Cloud Messaging (FCM) ---
// IMPORTANT: Un seul Service Worker par scope, on intègre FCM ici.
// Utiliser Firebase 10.x pour compatibilité avec version moderne
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

let firebaseConfig = null;
let fcmInitialized = false;

function initFCM() {
  if (fcmInitialized) return;
  if (!firebaseConfig) {
    console.log('[FCM SW] Config Firebase non disponible');
    return;
  }

  try {
    // Eviter double init
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

// Actions selon le type de notification
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

// Liste minimale à précacher
const PRECACHE_ASSETS = ["/manifest.json", "/favicon.png"];

// INSTALL - Ne jamais bloquer
self.addEventListener("install", (event) => {
  console.log("[SW] Installation v6");
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => console.log("[SW] Précache partiel"))
  );
});

// ACTIVATE - Nettoyer anciens caches et prendre le contrôle
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation v6");

  event.waitUntil(
    Promise.all([
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
      self.clients.claim(),
    ])
  );
});

// FETCH - Stratégie Network-First pour tout sauf assets statiques
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignorer les APIs externes et supabase
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("mapbox") ||
    url.hostname.includes("agora") ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // Navigation (HTML) - TOUJOURS Network First
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match("/index.html") || caches.match(event.request))
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

  // Autres ressources statiques - Network First avec cache fallback
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
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

console.log("[SW] Service Worker chargé (v6 - Firebase 10.13.0)");
