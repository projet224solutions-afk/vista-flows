/**
 * 🔗 DEEP LINKING HOOK
 * Gère les deep links pour web et mobile (Capacitor)
 */

import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface DeepLinkHandler {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray) => string;
}

// Patterns de deep linking supportés
const DEEP_LINK_PATTERNS: DeepLinkHandler[] = [
  // Boutique: /shop/:vendorId ou myapp://shop/:vendorId
  {
    pattern: /(?:myapp:\/\/|.*\/)shop\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/shop/${matches[1]}`
  },
  // Produit: /product/:productId
  {
    pattern: /(?:myapp:\/\/|.*\/)product\/([a-zA-Z0-9-]+)/,
    handler: (matches) => `/product/${matches[1]}`
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
  const location = useLocation();

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

  // Écouter les deep links Capacitor (App.addListener)
  useEffect(() => {
    const setupCapacitorDeepLinks = async () => {
      try {
        // Vérifier si Capacitor est disponible
        const { App } = await import('@capacitor/app');
        
        // Écouter les deep links quand l'app est ouverte via un lien
        const appUrlOpenListener = await App.addListener('appUrlOpen', (event) => {
          console.log('🔗 [Capacitor] App opened with URL:', event.url);
          handleDeepLink(event.url);
        });

        // Vérifier si l'app a été lancée avec un deep link
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('🔗 [Capacitor] App launched with URL:', launchUrl.url);
          handleDeepLink(launchUrl.url);
        }

        return () => {
          appUrlOpenListener.remove();
        };
      } catch (error) {
        // Capacitor n'est pas disponible (web mode)
        console.log('🔗 [DeepLink] Running in web mode (Capacitor not available)');
      }
    };

    setupCapacitorDeepLinks();
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
      
      // Incrémenter le compteur de vues
      await supabase.rpc('increment_shared_link_views', { 
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

// Créer un lien court pour le partage
export async function createShortLink(params: {
  originalUrl: string;
  title: string;
  type: 'shop' | 'product' | 'service' | 'other';
  resourceId?: string;
}): Promise<string | null> {
  try {
    const shortCode = generateShortCode();
    
    const { error } = await supabase
      .from('shared_links')
      .insert({
        short_code: shortCode,
        original_url: params.originalUrl,
        title: params.title,
        link_type: params.type,
        resource_id: params.resourceId,
        views_count: 0
      });

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
    const { data, error } = await supabase
      .from('shared_links')
      .select('original_url, title, link_type')
      .eq('short_code', shortCode)
      .single();

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
