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
    // Nettoyer immédiatement au démarrage si nécessaire
    this.checkAndCleanOnStartup();

    // Écouter les erreurs critiques uniquement
    window.addEventListener('error', (event) => {
      if (this.isCriticalError(event.error)) {
        console.error('Erreur critique détectée:', event.error);
        this.handleError();
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (this.isCriticalError(event.reason)) {
        console.error('Promise critique rejetée:', event.reason);
        this.handleError();
      }
    });

    // Gestion du service worker uniquement en production
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      this.setupServiceWorker();
    }
  }

  private isCriticalError(error: any): boolean {
    const errorStr = String(error);
    // Filtrer uniquement les erreurs critiques
    return errorStr.includes('ChunkLoadError') || 
           errorStr.includes('Failed to fetch') ||
           errorStr.includes('Loading chunk');
  }

  private async checkAndCleanOnStartup() {
    const lastError = localStorage.getItem('app_last_error');
    const lastClean = localStorage.getItem('app_last_clean');
    const now = Date.now();
    
    if (lastError && lastClean) {
      const timeSinceClean = now - parseInt(lastClean);
      // Si la dernière erreur était récente (moins de 1 minute) et qu'on a déjà nettoyé
      if (timeSinceClean < 60000) {
        return;
      }
    }

    // Si on détecte un chargement raté
    if (lastError) {
      const errorTime = parseInt(lastError);
      if (now - errorTime < 5000) {
        console.warn('Erreur récente détectée au démarrage, nettoyage...');
        await this.clearCacheAndReload();
      }
    }
  }

  private setupServiceWorker() {
    navigator.serviceWorker.ready.then((registration) => {
      // Vérifier les mises à jour toutes les 5 minutes
      setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Nouvelle version disponible');
              this.promptUpdate();
            }
          });
        }
      });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'CACHE_ERROR') {
        console.error('Erreur de cache détectée');
        this.clearCacheAndReload();
      }
    });
  }

  private errorCount = 0;
  private readonly MAX_ERRORS = 3;

  private handleError() {
    this.errorCount++;
    localStorage.setItem('app_last_error', Date.now().toString());
    
    if (this.errorCount >= this.MAX_ERRORS) {
      console.warn(`${this.errorCount} erreurs critiques détectées. Nettoyage du cache...`);
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
      console.log('🧹 Nettoyage complet du cache et service worker...');
      localStorage.setItem('app_last_clean', Date.now().toString());

      // 1. Nettoyer tous les caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✓ Cache nettoyé');
      }

      // 2. Désinscrire tous les service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        console.log('✓ Service workers désinscrit');
      }

      // 3. Nettoyer sessionStorage
      sessionStorage.clear();

      // 4. Nettoyer localStorage (préserver auth uniquement)
      const authToken = localStorage.getItem('app_jwt');
      const supabaseAuth = localStorage.getItem('sb-uakkxaibujzxdiqzpnpr-auth-token');
      const lastClean = localStorage.getItem('app_last_clean');
      
      localStorage.clear();
      
      if (authToken) localStorage.setItem('app_jwt', authToken);
      if (supabaseAuth) localStorage.setItem('sb-uakkxaibujzxdiqzpnpr-auth-token', supabaseAuth);
      if (lastClean) localStorage.setItem('app_last_clean', lastClean);

      console.log('✓ Storage nettoyé');

      // 5. Recharger avec cache bust
      window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      // Force reload en dernier recours
      window.location.href = window.location.origin + '?t=' + Date.now();
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
