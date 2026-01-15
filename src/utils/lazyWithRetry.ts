import { lazy, ComponentType, createElement } from 'react';

type ComponentImport<T> = () => Promise<{ default: T }>;

// Composant fallback pour mode offline - affiche un message utilisateur
const OfflineFallback = () => {
  return createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      padding: '20px',
      textAlign: 'center',
      color: '#666'
    }
  }, [
    createElement('div', { 
      key: 'icon',
      style: { fontSize: '48px', marginBottom: '16px' } 
    }, '📡'),
    createElement('h3', { 
      key: 'title',
      style: { margin: '0 0 8px 0', color: '#333' } 
    }, 'Connexion requise'),
    createElement('p', { 
      key: 'message',
      style: { margin: '0', fontSize: '14px' } 
    }, 'Cette page nécessite une connexion Internet.'),
    createElement('button', {
      key: 'button',
      onClick: () => window.location.reload(),
      style: {
        marginTop: '16px',
        padding: '8px 16px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        background: '#fff',
        cursor: 'pointer'
      }
    }, 'Réessayer')
  ]);
};

/**
 * Vérifie si l'app est en mode hors ligne
 */
const isOffline = (): boolean => {
  return typeof navigator !== 'undefined' && !navigator.onLine;
};

/**
 * Wrapper pour les imports dynamiques avec retry automatique
 * Gère les erreurs de cache après déploiement et le mode offline
 * v3 - Support mode hors ligne amélioré avec meilleur fallback UI
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: ComponentImport<T>,
  retries = 3,
  interval = 1500
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    // Clés anti-boucles (mobile/PWA) : sessionStorage peut être instable sur certains navigateurs
    const reloadedInSession = sessionStorage.getItem('page_reloaded_for_chunk') === 'true';
    const lastRecoveryAt = Number(localStorage.getItem('chunk_recovery_last_at') || '0');
    const recentlyRecovered = Date.now() - lastRecoveryAt < 5 * 60 * 1000; // 5 min

    // Guard global pour éviter plusieurs reloads simultanés (plusieurs chunks peuvent échouer)
    const w = window as any;
    if (w.__chunkRecoveryInProgress) {
      return { default: OfflineFallback as unknown as T };
    }

    try {
      const component = await componentImport();
      // Succès - réinitialiser les flags
      sessionStorage.removeItem('page_reloaded_for_chunk');
      localStorage.removeItem('chunk_recovery_last_at');
      w.__chunkRecoveryInProgress = false;
      return component;
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const isChunkLoadError =
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('Loading CSS chunk') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Failed to load') ||
        error?.name === 'ChunkLoadError';

      console.warn('[LazyRetry] Module load error:', errorMessage);

      // En mode offline, ne pas essayer de recharger - afficher fallback
      if (isOffline()) {
        console.warn('[LazyRetry] Offline mode detected, showing fallback');
        return { default: OfflineFallback as unknown as T };
      }

      // ✅ Stratégie robuste mobile/PWA:
      // 1) tenter quelques retries
      // 2) si échec: nettoyer SW+caches puis recharger UNE seule fois (avec cache-bust)
      // 3) si déjà tenté récemment: afficher fallback (pas de boucle infinie)
      if (isChunkLoadError) {
        // Retries rapides
        for (let i = 0; i < retries; i++) {
          await new Promise(resolve => setTimeout(resolve, interval));
          if (isOffline()) {
            console.warn('[LazyRetry] Went offline during retry, showing fallback');
            return { default: OfflineFallback as unknown as T };
          }
          try {
            const component = await componentImport();
            sessionStorage.removeItem('page_reloaded_for_chunk');
            localStorage.removeItem('chunk_recovery_last_at');
            w.__chunkRecoveryInProgress = false;
            console.log(`[LazyRetry] Retry ${i + 1}/${retries} succeeded`);
            return component;
          } catch {
            console.warn(`[LazyRetry] Retry ${i + 1}/${retries} failed`);
          }
        }

        // Si on a déjà fait une recovery récemment, STOP: on affiche un fallback au lieu de boucler
        if (reloadedInSession || recentlyRecovered) {
          console.warn('[LazyRetry] Recovery already attempted recently, showing fallback');
          sessionStorage.removeItem('page_reloaded_for_chunk');
          w.__chunkRecoveryInProgress = false;
          return { default: OfflineFallback as unknown as T };
        }

        // Marquer une tentative de recovery
        sessionStorage.setItem('page_reloaded_for_chunk', 'true');
        localStorage.setItem('chunk_recovery_last_at', String(Date.now()));
        w.__chunkRecoveryInProgress = true;

        // Nettoyage best-effort (résout les chunks manquants après déploiement)
        try {
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch (cleanupError) {
          console.warn('[LazyRetry] Cache/SW cleanup failed:', cleanupError);
        }

        // Reload avec cache-bust pour forcer un index.html frais
        const url = new URL(window.location.href);
        url.searchParams.set('v', String(Date.now()));
        window.location.replace(url.toString());

        // Si jamais le navigateur bloque le reload, fallback
        return { default: OfflineFallback as unknown as T };
      }

      // Pour les autres erreurs, propager
      throw error;
    }
  });
}

/**
 * Version simplifiée qui recharge immédiatement sans retry
 */
export function lazyWithReload<T extends ComponentType<any>>(
  componentImport: ComponentImport<T>
): React.LazyExoticComponent<T> {
  return lazyWithRetry(componentImport, 0, 0);
}
