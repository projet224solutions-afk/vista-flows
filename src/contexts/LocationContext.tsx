/**
 * CONTEXTE GLOBAL DE LOCALISATION
 * Gère le pays et la langue de l'utilisateur avec détection automatique
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Country, getCountryByCode, getDefaultLanguageForCountry } from '@/data/countries';
import { toast } from 'sonner';

interface LocationContextType {
  // Pays
  country: Country | null;
  countryCode: string | null;
  dialCode: string | null;
  setCountry: (countryCode: string) => void;
  
  // Langue
  language: string;
  setLanguage: (lang: string) => void;
  
  // Détection
  isDetecting: boolean;
  detectionMethod: 'gps' | 'ip' | 'system' | 'manual' | null;
  refreshDetection: () => Promise<void>;
  
  // Voyage
  checkForTravelChange: () => Promise<Country | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const COUNTRY_STORAGE_KEY = 'user_country_code';
const LANGUAGE_STORAGE_KEY = 'app_language';
const DETECTION_METHOD_KEY = 'country_detection_method';
const LAST_DETECTION_KEY = 'last_country_detection';

// Détection via GPS
const detectCountryByGPS = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.countryCode) {
              console.log('🌍 Pays détecté par GPS:', data.countryCode);
              resolve(data.countryCode);
              return;
            }
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
};

// Détection via IP
const detectCountryByIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      if (data.country_code) {
        console.log('🌐 Pays détecté par IP:', data.country_code);
        return data.country_code;
      }
    }
    return null;
  } catch {
    return null;
  }
};

// Détection via système
const detectCountryBySystem = (): string | null => {
  try {
    const locale = navigator.language || '';
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const countryCode = parts[1].toUpperCase();
      if (getCountryByCode(countryCode)) {
        console.log('💻 Pays détecté par système:', countryCode);
        return countryCode;
      }
    }
    return null;
  } catch {
    return null;
  }
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [country, setCountryState] = useState<Country | null>(null);
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'fr';
  });
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectionMethod, setDetectionMethod] = useState<'gps' | 'ip' | 'system' | 'manual' | null>(null);

  // Initialiser le pays depuis le cache ou détecter
  useEffect(() => {
    const initializeLocation = async () => {
      // Vérifier le cache d'abord
      const cachedCode = localStorage.getItem(COUNTRY_STORAGE_KEY);
      const cachedMethod = localStorage.getItem(DETECTION_METHOD_KEY);
      const lastDetection = localStorage.getItem(LAST_DETECTION_KEY);
      
      if (cachedCode && lastDetection) {
        const hoursSince = (Date.now() - parseInt(lastDetection, 10)) / (1000 * 60 * 60);
        // Cache valide seulement si détection manuelle, sinon re-détecter
        if (hoursSince < 24 && cachedMethod === 'manual') {
          const cached = getCountryByCode(cachedCode);
          if (cached) {
            const cachedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) || getDefaultLanguageForCountry(cachedCode);
            setCountryState(cached);
            setLanguageState(cachedLang);
            setDetectionMethod(cachedMethod as any);
            setIsDetecting(false);
            return;
          }
        }
      }

      // Détection automatique
      setIsDetecting(true);
      
      // 1. GPS
      const gpsCode = await detectCountryByGPS();
      if (gpsCode) {
        const c = getCountryByCode(gpsCode);
        if (c) {
          const detectedLang = getDefaultLanguageForCountry(gpsCode);
          console.log('🌍 Pays:', c.nameFr, '| Langue détectée:', detectedLang);
          setCountryState(c);
          setDetectionMethod('gps');
          setLanguageState(detectedLang);
          localStorage.setItem(COUNTRY_STORAGE_KEY, gpsCode);
          localStorage.setItem(DETECTION_METHOD_KEY, 'gps');
          localStorage.setItem(LAST_DETECTION_KEY, Date.now().toString());
          localStorage.setItem(LANGUAGE_STORAGE_KEY, detectedLang);
          document.documentElement.lang = detectedLang;
          setIsDetecting(false);
          return;
        }
      }

      // 2. IP
      const ipCode = await detectCountryByIP();
      if (ipCode) {
        const c = getCountryByCode(ipCode);
        if (c) {
          setCountryState(c);
          setDetectionMethod('ip');
          setLanguageState(getDefaultLanguageForCountry(ipCode));
          localStorage.setItem(COUNTRY_STORAGE_KEY, ipCode);
          localStorage.setItem(DETECTION_METHOD_KEY, 'ip');
          localStorage.setItem(LAST_DETECTION_KEY, Date.now().toString());
          setIsDetecting(false);
          return;
        }
      }

      // 3. Système
      const sysCode = detectCountryBySystem();
      if (sysCode) {
        const c = getCountryByCode(sysCode);
        if (c) {
          setCountryState(c);
          setDetectionMethod('system');
          setLanguageState(getDefaultLanguageForCountry(sysCode));
          localStorage.setItem(COUNTRY_STORAGE_KEY, sysCode);
          localStorage.setItem(DETECTION_METHOD_KEY, 'system');
          localStorage.setItem(LAST_DETECTION_KEY, Date.now().toString());
          setIsDetecting(false);
          return;
        }
      }

      // Défaut: Guinée
      const defaultCountry = getCountryByCode('GN');
      if (defaultCountry) {
        setCountryState(defaultCountry);
        setLanguageState('fr');
      }
      setIsDetecting(false);
    };

    initializeLocation();
  }, []);

  // Mettre à jour la langue
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, []);

  // Mettre à jour le pays
  const setCountry = useCallback((countryCode: string) => {
    const c = getCountryByCode(countryCode);
    if (c) {
      setCountryState(c);
      setDetectionMethod('manual');
      localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
      localStorage.setItem(DETECTION_METHOD_KEY, 'manual');
      localStorage.setItem(LAST_DETECTION_KEY, Date.now().toString());
      
      // Optionnel: mettre à jour la langue aussi
      const newLang = getDefaultLanguageForCountry(countryCode);
      setLanguage(newLang);
    }
  }, [setLanguage]);

  // Forcer une nouvelle détection
  const refreshDetection = useCallback(async () => {
    setIsDetecting(true);
    localStorage.removeItem(COUNTRY_STORAGE_KEY);
    localStorage.removeItem(DETECTION_METHOD_KEY);
    localStorage.removeItem(LAST_DETECTION_KEY);
    
    const ipCode = await detectCountryByIP();
    if (ipCode) {
      const c = getCountryByCode(ipCode);
      if (c) {
        setCountryState(c);
        setDetectionMethod('ip');
        setLanguage(getDefaultLanguageForCountry(ipCode));
        localStorage.setItem(COUNTRY_STORAGE_KEY, ipCode);
        localStorage.setItem(DETECTION_METHOD_KEY, 'ip');
        localStorage.setItem(LAST_DETECTION_KEY, Date.now().toString());
        toast.success(`Pays détecté: ${c.nameFr}`);
      }
    }
    setIsDetecting(false);
  }, [setLanguage]);

  // Vérifier si le pays a changé (voyage)
  const checkForTravelChange = useCallback(async (): Promise<Country | null> => {
    if (!country) return null;
    
    const ipCode = await detectCountryByIP();
    if (ipCode && ipCode !== country.code) {
      const newCountry = getCountryByCode(ipCode);
      if (newCountry) {
        return newCountry;
      }
    }
    return null;
  }, [country]);

  const value: LocationContextType = {
    country,
    countryCode: country?.code || null,
    dialCode: country?.dialCode || null,
    setCountry,
    language,
    setLanguage,
    isDetecting,
    detectionMethod,
    refreshDetection,
    checkForTravelChange
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export default LocationContext;
