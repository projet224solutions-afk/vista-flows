// Service Worker désactivé
// Ce fichier existe uniquement pour éviter les erreurs de build
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});
