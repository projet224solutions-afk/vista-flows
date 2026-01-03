/**
 * CONTEXTE DE LANGUE GLOBAL
 * Gère la langue de l'application avec détection automatique basée sur le pays
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { translations, supportedLanguages, defaultLanguage } from './translations';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  userCountry: string | null;
  isRTL: boolean;
  supportedLanguages: typeof supportedLanguages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';
const COUNTRY_KEY = 'user_country';
const GEO_LANG_KEY = 'geo_detected_language';

// Mapping pays -> langue par défaut
const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  // Europe
  DE: 'de', AT: 'de', CH: 'de', // Allemand
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', // Français
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', // Espagnol
  PT: 'pt', BR: 'pt', // Portugais
  IT: 'it', // Italien
  NL: 'nl', // Néerlandais
  PL: 'pl', // Polonais
  GB: 'en', US: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', // Anglais
  RU: 'ru', BY: 'ru', // Russe
  UA: 'uk', // Ukrainien
  TR: 'tr', // Turc
  
  // Asie
  CN: 'zh', TW: 'zh', HK: 'zh', // Chinois
  JP: 'ja', // Japonais
  KR: 'ko', // Coréen
  IN: 'hi', // Hindi
  TH: 'th', // Thaï
  VN: 'vi', // Vietnamien
  ID: 'id', // Indonésien
  
  // Moyen-Orient
  SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar', DZ: 'ar', TN: 'ar', // Arabe
  IL: 'he', // Hébreu
  IR: 'fa', // Persan
  
  // Afrique
  GN: 'fr', SN: 'fr', ML: 'fr', CI: 'fr', BF: 'fr', NE: 'fr', // Afrique francophone
  NG: 'en', GH: 'en', ZA: 'en', // Afrique anglophone
  TZ: 'sw', KE: 'sw', // Swahili (Kenya, Tanzanie)
  
  // Bangladesh
  BD: 'bn',
};

// Détecte la langue du navigateur
const detectBrowserLanguage = (): string => {
  try {
    const browserLang = navigator.language || (navigator as any).userLanguage || '';
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    const isSupported = supportedLanguages.some(l => l.code === langCode);
    return isSupported ? langCode : defaultLanguage;
  } catch {
    return defaultLanguage;
  }
};

// Détecte le pays via IP et retourne aussi la langue suggérée
const detectCountryAndLanguage = async (): Promise<{ country: string | null; language: string | null }> => {
  try {
    // Vérifier le cache d'abord
    const cachedCountry = localStorage.getItem(COUNTRY_KEY);
    const cachedLang = localStorage.getItem(GEO_LANG_KEY);
    
    if (cachedCountry && cachedLang) {
      return { country: cachedCountry, language: cachedLang };
    }

    // Utiliser ipapi.co (gratuit, fiable)
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      const country = data.country_code || data.country || null;
      
      if (country) {
        localStorage.setItem(COUNTRY_KEY, country);
        
        // Déterminer la langue basée sur le pays
        const suggestedLang = COUNTRY_TO_LANGUAGE[country.toUpperCase()];
        const language = suggestedLang && supportedLanguages.some(l => l.code === suggestedLang) 
          ? suggestedLang 
          : null;
        
        if (language) {
          localStorage.setItem(GEO_LANG_KEY, language);
        }
        
        return { country, language };
      }
    }
    return { country: null, language: null };
  } catch (error) {
    console.warn('Détection du pays échouée:', error);
    return { country: null, language: null };
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    // Priorité: localStorage (choix manuel) > navigateur > défaut
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && supportedLanguages.some(l => l.code === stored)) {
      return stored;
    }
    return detectBrowserLanguage();
  });
  
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  // Détection du pays et langue au chargement - SYNCHRO avec useGeoDetection
  useEffect(() => {
    const detect = async () => {
      // Vérifier si une langue a déjà été choisie manuellement
      const hasManualPref = localStorage.getItem(STORAGE_KEY);
      if (hasManualPref) {
        console.log('🌍 Langue manuelle trouvée:', hasManualPref);
        return;
      }

      // Essayer de récupérer depuis le cache de géo-détection (synchronisation avec useGeoDetection)
      const geoCacheRaw = localStorage.getItem('geo_detection_cache');
      if (geoCacheRaw) {
        try {
          const geoCache = JSON.parse(geoCacheRaw);
          if (geoCache?.data?.country && geoCache?.data?.language) {
            const country = geoCache.data.country;
            const detectedLang = geoCache.data.language;
            
            // Vérifier si la langue est supportée
            if (supportedLanguages.some(l => l.code === detectedLang)) {
              console.log(`🌍 Auto-détection (via geo-cache): pays=${country}, langue=${detectedLang}`);
              setUserCountry(country);
              setLanguageState(detectedLang);
              setHasAutoDetected(true);
              return;
            }
          }
        } catch {}
      }

      // Fallback: détection classique
      const { country, language: detectedLang } = await detectCountryAndLanguage();
      setUserCountry(country);
      
      // Si on a une langue détectée et pas encore auto-détecté
      if (detectedLang && !hasAutoDetected) {
        console.log(`🌍 Auto-détection: pays=${country}, langue=${detectedLang}`);
        setLanguageState(detectedLang);
        setHasAutoDetected(true);
      }
    };
    
    detect();
  }, [hasAutoDetected]);

  // Mise à jour de la direction du document
  useEffect(() => {
    const langInfo = supportedLanguages.find(l => l.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = langInfo?.dir || 'ltr';
  }, [language]);

  const setLanguage = useCallback((lang: string) => {
    if (!supportedLanguages.some(l => l.code === lang)) {
      console.warn(`Langue non supportée: ${lang}`);
      return;
    }

    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang); // Enregistrer le choix manuel
  }, []);

  // Fonction de traduction
  const t = useCallback((key: string): string => {
    const langTranslations = translations[language] || translations[defaultLanguage];
    return langTranslations[key] || translations[defaultLanguage]?.[key] || key;
  }, [language]);

  // Vérifier si RTL
  const isRTL = supportedLanguages.find(l => l.code === language)?.dir === 'rtl';

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    userCountry,
    isRTL,
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
  t: (key: string) => translations[defaultLanguage]?.[key] || key,
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
