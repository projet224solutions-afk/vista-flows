/**
 * CONTEXTE DE LANGUE GLOBAL
 * Gère la langue de l'application avec détection automatique et stockage
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { translations, supportedLanguages, defaultLanguage } from './translations';
import { supabase } from '@/integrations/supabase/client';

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

// Détecte la langue du navigateur
const detectBrowserLanguage = (): string => {
  try {
    const browserLang = navigator.language || (navigator as any).userLanguage || '';
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Vérifier si la langue est supportée
    const isSupported = supportedLanguages.some(l => l.code === langCode);
    return isSupported ? langCode : defaultLanguage;
  } catch {
    return defaultLanguage;
  }
};

// Détecte le pays via IP (utilise un service gratuit)
const detectCountry = async (): Promise<string | null> => {
  try {
    // Vérifier le cache d'abord
    const cached = localStorage.getItem(COUNTRY_KEY);
    if (cached) return cached;

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
      }
      return country;
    }
    return null;
  } catch (error) {
    console.warn('Détection du pays échouée:', error);
    return null;
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    // Priorité: localStorage > navigateur > défaut
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && supportedLanguages.some(l => l.code === stored)) {
      return stored;
    }
    return detectBrowserLanguage();
  });
  
  const [userCountry, setUserCountry] = useState<string | null>(null);

  // Détection du pays au chargement
  useEffect(() => {
    detectCountry().then(setUserCountry);
  }, []);

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
    localStorage.setItem(STORAGE_KEY, lang);
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

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
