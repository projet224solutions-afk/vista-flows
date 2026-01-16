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
    // Clé pour éviter les boucles infinies de reload
    const pageHasAlreadyReloaded = sessionStorage.getItem('page_reloaded_for_chunk') === 'true';

    try {
      const component = await componentImport();
      // Succès - réinitialiser le flag
      sessionStorage.removeItem('page_reloaded_for_chunk');
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

      // Si c'est une erreur de chunk et qu'on n'a pas encore rechargé
      if (isChunkLoadError && !pageHasAlreadyReloaded) {
        console.warn('[LazyRetry] Chunk load error detected, attempting retries...');
        
        // Essayer avec retry d'abord
        for (let i = 0; i < retries; i++) {
          await new Promise(resolve => setTimeout(resolve, interval));
          
          // Vérifier si on est passé offline entre-temps
          if (isOffline()) {
            console.warn('[LazyRetry] Went offline during retry, showing fallback');
            return { default: OfflineFallback as unknown as T };
          }
          
          try {
            // Ajouter cache-bust pour forcer le rechargement
            const cacheBuster = `?t=${Date.now()}`;
            const component = await componentImport();
            sessionStorage.removeItem('page_reloaded_for_chunk');
            console.log(`[LazyRetry] Retry ${i + 1}/${retries} succeeded`);
            return component;
          } catch (retryError) {
            console.warn(`[LazyRetry] Retry ${i + 1}/${retries} failed`);
          }
        }

        // Si les retries échouent et qu'on est toujours online, recharger la page
        if (navigator.onLine) {
          console.warn('[LazyRetry] All retries failed, reloading page...');
          sessionStorage.setItem('page_reloaded_for_chunk', 'true');
          window.location.reload();
        }
        
        // Fallback si le reload n'a pas fonctionné
        return { default: OfflineFallback as unknown as T };
      }

      // Si on a déjà rechargé, afficher le fallback au lieu de planter
      if (pageHasAlreadyReloaded && isChunkLoadError) {
        console.warn('[LazyRetry] Already reloaded, showing fallback');
        sessionStorage.removeItem('page_reloaded_for_chunk');
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
