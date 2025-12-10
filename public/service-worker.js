// Service Worker v4 - Ultra-optimisé pour Vercel
const CACHE_VERSION = "v4";
const STATIC_CACHE = `224solutions-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `224solutions-dynamic-${CACHE_VERSION}`;

// Liste minimale à précacher
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/favicon.png"
];

// INSTALL - Ne jamais bloquer
self.addEventListener("install", (event) => {
  console.log("[SW] Installation v4");
  self.skipWaiting(); // Activation immédiate
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(() => console.log("[SW] Précache partiel"))
  );
});

// ACTIVATE - Nettoyer anciens caches et prendre le contrôle
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation v4");
  
  event.waitUntil(
    Promise.all([
      // Supprimer tous les anciens caches
      caches.keys().then(keys => 
        Promise.all(
          keys
            .filter(key => !key.includes(CACHE_VERSION))
            .map(key => {
              console.log("[SW] Suppression cache:", key);
              return caches.delete(key);
            })
        )
      ),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

// FETCH - Stratégie Network-First pour tout sauf assets statiques
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-GET
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
        .then(response => {
          // Mettre en cache pour offline
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
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
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
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
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});

// Message handler pour skip waiting
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
  
  // Force refresh tous les clients
  if (event.data === "forceRefresh") {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.navigate(client.url));
    });
  }
});
