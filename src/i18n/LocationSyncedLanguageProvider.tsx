import React, { ReactNode, useCallback, useEffect, useMemo } from "react";
import LanguageContext from "@/i18n/LanguageContext";
import { translations, supportedLanguages, defaultLanguage } from "@/i18n/translations";
import { useLocation } from "@/contexts/LocationContext";

interface Props {
  children: ReactNode;
}

/**
 * Provider de langue dont la source de vérité est LocationContext.
 * Garantit que la langue détectée (GPS/IP/Système) s'applique partout (vendeur/client/taxi/livreur).
 */
export const LocationSyncedLanguageProvider: React.FC<Props> = ({ children }) => {
  const { language: detectedLanguage, setLanguage: setDetectedLanguage } = useLocation();

  const language = useMemo(() => {
    const lang = detectedLanguage || defaultLanguage;
    return supportedLanguages.some((l) => l.code === lang) ? lang : defaultLanguage;
  }, [detectedLanguage]);

  const setLanguage = useCallback(
    (lang: string) => {
      if (!supportedLanguages.some((l) => l.code === lang)) return;
      setDetectedLanguage(lang);
    },
    [setDetectedLanguage]
  );

  const t = useCallback(
    (key: string) => {
      const langTranslations = translations[language] || translations[defaultLanguage];
      return langTranslations[key] || translations[defaultLanguage]?.[key] || key;
    },
    [language]
  );

  const isRTL = supportedLanguages.find((l) => l.code === language)?.dir === "rtl";

  // Appliquer immédiatement sur le document (important pour tout le routing)
  useEffect(() => {
    const langInfo = supportedLanguages.find((l) => l.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = langInfo?.dir || "ltr";
  }, [language]);
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isRTL,
      supportedLanguages,
    }),
    [isRTL, language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export default LocationSyncedLanguageProvider;
