/**
 * HOOK DE TRADUCTION
 * Fournit un accès simple aux traductions dans les composants
 * Synchronisé avec LocationContext pour le pays
 */

import { useLanguage } from '@/i18n/LanguageContext';
import { useLocation } from '@/contexts/LocationContext';

export const useTranslation = () => {
  const { t, language, setLanguage, isRTL, supportedLanguages } = useLanguage();
  
  // Récupérer le pays depuis LocationContext (optionnel si le contexte existe)
  let userCountry: string | null = null;
  try {
    const locationContext = useLocation();
    userCountry = locationContext.countryCode;
  } catch {
    // LocationContext non disponible, ignorer
  }
  
  return {
    t,
    language,
    setLanguage,
    isRTL,
    userCountry,
    supportedLanguages,
    // Alias pour compatibilité
    currentLanguage: language,
    changeLanguage: setLanguage,
  };
};

export default useTranslation;
