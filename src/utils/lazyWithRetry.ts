import { lazy, ComponentType } from 'react';

type ComponentImport<T> = () => Promise<{ default: T }>;

/**
 * Wrapper pour les imports dynamiques avec retry automatique
 * Gère les erreurs de cache après déploiement en rechargeant la page
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: ComponentImport<T>,
  retries = 2,
  interval = 1000
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
      const isChunkLoadError = 
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Loading CSS chunk') ||
        error?.name === 'ChunkLoadError';

      // Si c'est une erreur de chunk et qu'on n'a pas encore rechargé
      if (isChunkLoadError && !pageHasAlreadyReloaded) {
        console.warn('[LazyRetry] Chunk load error detected, attempting reload...', error);
        
        // Essayer avec retry d'abord
        for (let i = 0; i < retries; i++) {
          await new Promise(resolve => setTimeout(resolve, interval));
          try {
            const component = await componentImport();
            sessionStorage.removeItem('page_reloaded_for_chunk');
            return component;
          } catch (retryError) {
            console.warn(`[LazyRetry] Retry ${i + 1}/${retries} failed`);
          }
        }

        // Si les retries échouent, recharger la page
        console.warn('[LazyRetry] All retries failed, reloading page...');
        sessionStorage.setItem('page_reloaded_for_chunk', 'true');
        window.location.reload();
        
        // Ne sera jamais atteint mais nécessaire pour TypeScript
        return { default: (() => null) as unknown as T };
      }

      // Si on a déjà rechargé ou autre erreur, propager l'erreur
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
