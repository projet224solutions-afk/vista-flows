/**
 * 🔗 DEEP LINKING HOOK
 * Gère les deep links pour web et mobile (Capacitor)
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface DeepLinkHandler {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray) => string;
}

// Patterns de deep linking supportés
const DEEP_LINK_PATTERNS: DeepLinkHandler[] = [
  // Boutique: /shop/:vendorId, /boutique/:vendorId, myapp://shop/:vendorId, myapp://boutique/:vendorId
  {
    pattern: /(?:myapp:\/\/|.*\/)(?:shop|boutique)\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/shop/${matches[1]}`,
  },
  // Produit: /product/:productId, /produit/:productId
  {
    pattern: /(?:myapp:\/\/|.*\/)(?:product|produit)\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/product/${matches[1]}`,
  },
  // Short URL: /s/:shortCode
  {
    pattern: /(?:myapp:\/\/|.*\/)s\/([a-zA-Z0-9]+)/,
    handler: (matches) => `/s/${matches[1]}`
  },
  // Marketplace avec catégorie
  {
    pattern: /(?:myapp:\/\/|.*\/)marketplace\?category=([a-zA-Z0-9-]+)/,
    handler: (matches) => `/marketplace?category=${matches[1]}`
  },
  // Service de proximité
  {
    pattern: /(?:myapp:\/\/|.*\/)services-proximite\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/services-proximite/${matches[1]}`
  }
];

export function useDeepLinking() {
  const navigate = useNavigate();

  // Parser un deep link et retourner la route correspondante
  const parseDeepLink = useCallback((url: string): string | null => {
    for (const { pattern, handler } of DEEP_LINK_PATTERNS) {
      const matches = url.match(pattern);
      if (matches) {
        return handler(matches);
      }
    }
    return null;
  }, []);

  // Gérer un deep link entrant
  const handleDeepLink = useCallback(async (url: string) => {
    console.log('🔗 [DeepLink] Handling:', url);
    
    const route = parseDeepLink(url);
    if (route) {
      console.log('🔗 [DeepLink] Navigating to:', route);
      
      // Tracker l'ouverture du lien
      await trackLinkOpen(url);
      
      navigate(route);
      return true;
    }
    
    console.warn('🔗 [DeepLink] No matching pattern for:', url);
    return false;
  }, [navigate, parseDeepLink]);

  // Écouter les deep links Capacitor via l'API globale
  useEffect(() => {
    // Vérifier si on est dans un contexte Capacitor natif
    const capacitor = (window as any).Capacitor;
    if (!capacitor || !capacitor.isNativePlatform?.()) {
      console.log('🔗 [DeepLink] Running in web mode');
      return;
    }

    // Accéder aux plugins Capacitor via l'API globale
    const plugins = capacitor.Plugins;
    if (!plugins?.App) {
      console.log('🔗 [DeepLink] Capacitor App plugin not available');
      return;
    }

    const App = plugins.App;

    // Écouter les deep links quand l'app est ouverte via un lien
    const handleAppUrlOpen = (event: { url: string }) => {
      console.log('🔗 [Capacitor] App opened with URL:', event.url);
      handleDeepLink(event.url);
    };

    App.addListener('appUrlOpen', handleAppUrlOpen);

    // Vérifier si l'app a été lancée avec un deep link
    App.getLaunchUrl().then((result: { url?: string } | null) => {
      if (result?.url) {
        console.log('🔗 [Capacitor] App launched with URL:', result.url);
        handleDeepLink(result.url);
      }
    }).catch(() => {
      // Ignorer les erreurs
    });

    return () => {
      App.removeAllListeners?.();
    };
  }, [handleDeepLink]);

  return {
    handleDeepLink,
    parseDeepLink
  };
}

// Tracker l'ouverture d'un lien partagé
async function trackLinkOpen(url: string) {
  try {
    // Extraire le shortCode si c'est un short URL
    const shortMatch = url.match(/\/s\/([a-zA-Z0-9]+)/);
    if (shortMatch) {
      const shortCode = shortMatch[1];
      
      // Incrémenter le compteur de vues via RPC (cast to any pour éviter les erreurs de type)
      await (supabase.rpc as any)('increment_shared_link_views', { 
        p_short_code: shortCode 
      });
    }
  } catch (error) {
    console.error('🔗 [DeepLink] Error tracking link open:', error);
  }
}

// Générer un short code unique
export function generateShortCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface SharedLink {
  id: string;
  short_code: string;
  original_url: string;
  title: string;
  link_type: string;
  resource_id: string | null;
  views_count: number;
  created_at: string;
  created_by: string | null;
  expires_at: string | null;
  is_active: boolean;
  metadata: any;
}

// Créer un lien court pour le partage
export async function createShortLink(params: {
  originalUrl: string;
  title: string;
  type: 'shop' | 'product' | 'service' | 'other';
  resourceId?: string;
}): Promise<string | null> {
  try {
    const shortCode = generateShortCode();
    
    // Utiliser un cast pour éviter les erreurs de type avec la nouvelle table
    const { error } = await (supabase
      .from('shared_links' as any)
      .insert({
        short_code: shortCode,
        original_url: params.originalUrl,
        title: params.title,
        link_type: params.type,
        resource_id: params.resourceId || null,
        views_count: 0
      }) as any);

    if (error) {
      console.error('Error creating short link:', error);
      return null;
    }

    return `${window.location.origin}/s/${shortCode}`;
  } catch (error) {
    console.error('Error creating short link:', error);
    return null;
  }
}

// Résoudre un short code vers l'URL originale
export async function resolveShortLink(shortCode: string): Promise<{
  originalUrl: string;
  title: string;
  type: string;
} | null> {
  try {
    const { data, error } = await (supabase
      .from('shared_links' as any)
      .select('original_url, title, link_type')
      .eq('short_code', shortCode)
      .single() as any) as { data: Pick<SharedLink, 'original_url' | 'title' | 'link_type'> | null; error: any };

    if (error || !data) {
      console.error('Error resolving short link:', error);
      return null;
    }

    return {
      originalUrl: data.original_url,
      title: data.title,
      type: data.link_type
    };
  } catch (error) {
    console.error('Error resolving short link:', error);
    return null;
  }
}

export default useDeepLinking;
