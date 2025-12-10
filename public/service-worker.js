const CACHE_NAME = "224solutions-v2";
const STATIC_CACHE = "224solutions-static-v2";
const DYNAMIC_CACHE = "224solutions-dynamic-v2";

// Assets statiques critiques - préchargés immédiatement
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png"
];

// INSTALL — Mise en cache initiale rapide
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activer immédiatement
  self.skipWaiting();
});

// ACTIVATE — Nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  const validCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Déterminer la stratégie de cache selon le type de ressource
const getCacheStrategy = (request) => {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Assets statiques: Cache First (JS, CSS, images, fonts)
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return 'cache-first';
  }
  
  // HTML et navigation: Network First avec fallback
  if (request.mode === 'navigate' || path.endsWith('.html')) {
    return 'network-first';
  }
  
  // API et données: Network Only
  return 'network-only';
};

// FETCH — Stratégies optimisées
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== "GET") return;
  
  const url = new URL(event.request.url);
  
  // Ignorer les APIs externes
  if (url.hostname.includes("supabase") || 
      url.hostname.includes("googleapis") ||
      url.hostname.includes("mapbox") ||
      url.hostname.includes("api.")) {
    return;
  }
  
  const strategy = getCacheStrategy(event.request);
  
  if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(event.request));
  } else if (strategy === 'network-first') {
    event.respondWith(networkFirst(event.request));
  }
  // network-only: ne pas intercepter
});

// Cache First: rapide pour assets statiques
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network First: frais pour HTML, fallback cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // SPA: retourner index.html pour navigation
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Message pour mise à jour
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
