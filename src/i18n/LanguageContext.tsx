/**
 * CONTEXTE DE LANGUE GLOBAL
 * Synchronisé avec LocationContext pour une détection automatique cohérente
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { translations, supportedLanguages, defaultLanguage } from './translations';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  isRTL: boolean;
  supportedLanguages: typeof supportedLanguages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Écouter les changements de localStorage (synchro avec LocationContext)
  const [language, setLanguageState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && supportedLanguages.some(l => l.code === stored)) {
      return stored;
    }
    return defaultLanguage;
  });

  // Synchroniser avec localStorage (changements depuis LocationContext)
  useEffect(() => {
    const handleStorageChange = () => {
      const newLang = localStorage.getItem(STORAGE_KEY);
      if (newLang && newLang !== language && supportedLanguages.some(l => l.code === newLang)) {
        console.log('🌐 Langue synchronisée:', newLang);
        setLanguageState(newLang);
        document.documentElement.lang = newLang;
      }
    };

    // Vérifier immédiatement au montage
    handleStorageChange();

    // Écouter les changements de storage
    window.addEventListener('storage', handleStorageChange);
    
    // Polling pour les changements dans le même onglet
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

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
    document.documentElement.lang = lang;
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
