// Fichier temporaire - PWA désactivée
// Ce fichier existe uniquement pour résoudre l'erreur de build
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
