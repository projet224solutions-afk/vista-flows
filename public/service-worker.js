const CACHE_NAME = "224solutions-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.png"
];

// INSTALL — Mise en cache initiale
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Cache ouvert, ajout des assets statiques");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ACTIVATE — Suppression ancien cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Suppression ancien cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// FETCH — Stratégie Network first + fallback offline
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== "GET") return;
  
  // Ignorer les requêtes vers Supabase et APIs externes
  const url = new URL(event.request.url);
  if (url.hostname.includes("supabase") || 
      url.hostname.includes("googleapis") ||
      url.hostname.includes("mapbox")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Ne pas mettre en cache les erreurs
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // Fallback vers le cache en cas d'erreur réseau
        return caches.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }
          // Pour les navigations, retourner index.html (SPA)
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});

// Message pour diriger la mise à jour
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
