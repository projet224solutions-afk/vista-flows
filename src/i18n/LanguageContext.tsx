/**
 * CONTEXTE DE LANGUE GLOBAL
 * Gère la langue de l'application avec détection automatique basée sur le pays
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supportedLanguages, defaultLanguage } from './translations';
import { resolveTranslation } from './catalog';
import { getLanguageForCountry, isRTLLanguage } from '@/data/countryMappings';
import { supabase } from '@/integrations/supabase/client';
import type { TranslationParams } from '@/i18n/types';


interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, params?: TranslationParams) => string;
  userCountry: string | null;
  isRTL: boolean;
  supportedLanguages: typeof supportedLanguages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';
const MANUAL_LANG_KEY = 'app_language_manual'; // Indique si l'utilisateur a VRAIMENT choisi manuellement
const COUNTRY_KEY = 'user_country';
const GEO_CACHE_KEY = 'geo_detection_cache';

const supportedLanguageCodes = new Set(supportedLanguages.map((lang) => lang.code));

const normalizeLanguage = (lang: string | null | undefined): string => {
  if (!lang) return defaultLanguage;

  const normalized = lang.toLowerCase().split('-')[0];
  return supportedLanguageCodes.has(normalized) ? normalized : defaultLanguage;
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) return template;

  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = params[key];
    return value === null || value === undefined ? '' : String(value);
  });
};

// Détecte la langue du navigateur
const detectBrowserLanguage = (): string => {
  try {
    const browserLang = navigator.language || (navigator as any).userLanguage || '';
    return normalizeLanguage(browserLang);
  } catch {
    return defaultLanguage;
  }
};

// Détecte le pays depuis le cache local (peuplé par useGeoDetection, PAS d'appel direct à l'edge function)
const detectCountryFromCache = (): { country: string | null; language: string | null } => {
  try {
    // Vérifier le cache de géo-détection
    const geoCacheRaw = localStorage.getItem(GEO_CACHE_KEY);
    if (geoCacheRaw) {
      const geoCache = JSON.parse(geoCacheRaw);
      if (geoCache?.data?.country) {
        const country = geoCache.data.country;
        const langFromCache = String(geoCache.data.language || '').toLowerCase();
        const mappedLang = getLanguageForCountry(country);
        const candidateLang = supportedLanguageCodes.has(langFromCache) ? langFromCache : mappedLang;
        const language = candidateLang && supportedLanguageCodes.has(candidateLang) ? candidateLang : null;
        return { country, language };
      }
    }

    // Fallback: user_country dans localStorage
    const cachedCountry = localStorage.getItem(COUNTRY_KEY);
    if (cachedCountry) {
      const language = getLanguageForCountry(cachedCountry);
      return { country: cachedCountry, language: supportedLanguageCodes.has(language) ? language : null };
    }
  } catch {}

  return { country: null, language: null };
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return normalizeLanguage(stored);
    }

    return detectBrowserLanguage();
  });
  
  const [userCountry, setUserCountry] = useState<string | null>(null);

  const setAutomaticLanguage = useCallback((lang: string) => {
    const hasManualChoice = localStorage.getItem(MANUAL_LANG_KEY) === 'true';
    if (hasManualChoice) return;

    const normalized = normalizeLanguage(lang);
    setLanguageState(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
  }, []);

  // Détection du pays au chargement (sans forcer la langue)
  useEffect(() => {
    const detect = () => {
      const geoCacheRaw = localStorage.getItem(GEO_CACHE_KEY);
      if (geoCacheRaw) {
        try {
          const geoCache = JSON.parse(geoCacheRaw);
          if (geoCache?.data?.country) {
            setUserCountry(geoCache.data.country);
            return;
          }
        } catch {}
      }

      const { country } = detectCountryFromCache();
      setUserCountry(country);
    };
    
    detect();
  }, []);

  // Sync optionnelle avec préférence de profil utilisateur si elle existe déjà
  useEffect(() => {
    const syncFromProfile = async () => {
      try {
        const hasManualChoice = localStorage.getItem(MANUAL_LANG_KEY) === 'true';
        if (hasManualChoice) {
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;

        if (!userId) {
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.preferred_language) {
          setAutomaticLanguage(profile.preferred_language);
        }
      } catch {
        // Non bloquant: fallback localStorage + navigateur reste actif
      }
    };

    void syncFromProfile();
  }, [setAutomaticLanguage]);

  // Écouter les changements de cache géo pour synchroniser le pays utilisateur
  useEffect(() => {
    const syncFromGeoCache = () => {
      try {
        const geoCacheRaw = localStorage.getItem(GEO_CACHE_KEY);
        if (geoCacheRaw) {
          const geoCache = JSON.parse(geoCacheRaw);
          if (geoCache?.data?.country) {
            setUserCountry(geoCache.data.country || null);
          }
        }
      } catch {}
    };
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === GEO_CACHE_KEY) {
        syncFromGeoCache();
      }
      if (e.key === STORAGE_KEY && e.newValue) {
        setLanguageState(normalizeLanguage(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Mise à jour de la direction du document
  useEffect(() => {
    const langInfo = supportedLanguages.find(l => l.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = langInfo?.dir || 'ltr';
    document.body.setAttribute('dir', langInfo?.dir || 'ltr');
    document.body.classList.toggle('rtl', (langInfo?.dir || 'ltr') === 'rtl');
  }, [language]);

  const setLanguage = useCallback((lang: string) => {
    const normalized = normalizeLanguage(lang);

    setLanguageState(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
    localStorage.setItem(MANUAL_LANG_KEY, 'true'); // Marquer comme choix manuel explicite
  }, []);

  // Fonction de traduction
  const t = useCallback((key: string, params?: TranslationParams): string => {
    const raw = resolveTranslation(language, key);
    if (!raw) return key;

    return interpolate(raw, params);
  }, [language]);

  // Vérifier si RTL - utiliser notre helper centralisé
  const currentIsRTL = isRTLLanguage(language) || 
    supportedLanguages.find(l => l.code === language)?.dir === 'rtl';

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    userCountry,
    isRTL: currentIsRTL,
    supportedLanguages
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Valeurs par défaut pour usage en dehors du provider (fallback sécurisé)
const defaultContextValue: LanguageContextType = {
  language: defaultLanguage,
  setLanguage: () => console.warn('LanguageProvider not mounted'),
  t: (key: string, params?: TranslationParams) => {
    const raw = resolveTranslation(defaultLanguage, key);
    if (!raw) return key;
    return interpolate(raw, params);
  },
  userCountry: null,
  isRTL: false,
  supportedLanguages
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    console.warn('⚠️ useLanguage utilisé hors du LanguageProvider, fallback activé');
    return defaultContextValue;
  }
  
  return context;
};

export default LanguageContext;
