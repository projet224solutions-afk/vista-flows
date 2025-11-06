/**
 * GESTIONNAIRE DU SERVICE WORKER
 * Gère le cache PWA et force le rechargement en cas d'erreur
 */

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;

  private constructor() {
    this.init();
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  private init() {
    // Écouter les erreurs globales
    window.addEventListener('error', (event) => {
      console.error('Erreur détectée:', event.error);
      this.handleError();
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promise rejetée:', event.reason);
      this.handleError();
    });

    // Vérifier si une mise à jour est disponible
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Vérifier les mises à jour toutes les 30 secondes
        setInterval(() => {
          registration.update();
        }, 30000);

        // Écouter les nouveaux service workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Une nouvelle version est disponible
                console.log('Nouvelle version disponible');
                this.promptUpdate();
              }
            });
          }
        });
      });

      // Écouter les messages du service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'CACHE_ERROR') {
          console.error('Erreur de cache détectée');
          this.clearCacheAndReload();
        }
      });
    }
  }

  private errorCount = 0;
  private readonly MAX_ERRORS = 3;

  private handleError() {
    this.errorCount++;
    
    if (this.errorCount >= this.MAX_ERRORS) {
      console.warn(`${this.errorCount} erreurs détectées. Nettoyage du cache...`);
      this.clearCacheAndReload();
    }
  }

  private promptUpdate() {
    // Afficher une notification pour demander le rechargement
    const shouldUpdate = confirm('Une nouvelle version est disponible. Voulez-vous mettre à jour ?');
    if (shouldUpdate) {
      this.clearCacheAndReload();
    }
  }

  async clearCacheAndReload() {
    try {
      // Nettoyer tous les caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Cache nettoyé');
      }

      // Désinscrire le service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('Service worker désinscrit');
      }

      // Nettoyer le localStorage (sauf les tokens d'auth)
      const authToken = localStorage.getItem('app_jwt');
      const supabaseAuth = localStorage.getItem('sb-uakkxaibujzxdiqzpnpr-auth-token');
      localStorage.clear();
      if (authToken) localStorage.setItem('app_jwt', authToken);
      if (supabaseAuth) localStorage.setItem('sb-uakkxaibujzxdiqzpnpr-auth-token', supabaseAuth);

      // Recharger la page
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      // Forcer le rechargement quand même
      window.location.reload();
    }
  }

  // Méthode pour forcer manuellement le nettoyage
  async forceClean() {
    await this.clearCacheAndReload();
  }
}

// Initialiser automatiquement
if (typeof window !== 'undefined') {
  ServiceWorkerManager.getInstance();
}

export const serviceWorkerManager = ServiceWorkerManager.getInstance();
