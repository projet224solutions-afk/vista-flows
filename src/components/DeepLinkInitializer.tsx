/**
 * 🔗 DEEP LINK INITIALIZER
 * Composant qui initialise le système de deep linking au niveau de l'app
 */

import { useEffect } from 'react';
import { useDeepLinking } from '@/hooks/useDeepLinking';

export function DeepLinkInitializer() {
  const { handleDeepLink } = useDeepLinking();

  useEffect(() => {
    const safelyHandleDeepLink = (url: string, source: string) => {
      void handleDeepLink(url).catch((error) => {
        console.error('🔗 [DeepLinkInitializer] Erreur deep link', { source, url, error });
      });
    };

    // Gérer les deep links web (Universal Links / App Links)
    // Vérifier si l'URL actuelle contient des paramètres de deep link
    const currentUrl = window.location.href;
    
    // Log pour le debug
    console.log('🔗 [DeepLinkInitializer] Current URL:', currentUrl);
    safelyHandleDeepLink(currentUrl, 'initial-load');

    // Écouter les événements de navigation pour les deep links
    const handlePopState = () => {
      const nextUrl = window.location.href;
      console.log('🔗 [DeepLinkInitializer] Navigation detected:', nextUrl);
      safelyHandleDeepLink(nextUrl, 'popstate');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleDeepLink]);

  // Ce composant ne rend rien, il initialise juste le système
  return null;
}

export default DeepLinkInitializer;
