/**
 * HOOK DE DÉTECTION AUTOMATIQUE DU PAYS
 * Détecte le pays via GPS, IP ou paramètres système avec priorité
 */

import { useState, useEffect, useCallback } from 'react';
import { getCountryByCode, getDefaultLanguageForCountry, Country, countries } from '@/data/countries';
import { toast } from 'sonner';

interface DetectionResult {
  country: Country | null;
  detectionMethod: 'gps' | 'ip' | 'system' | 'manual' | null;
  language: string;
  isLoading: boolean;
  error: string | null;
}

interface UseCountryDetectionOptions {
  autoDetect?: boolean;
  onCountryChange?: (country: Country, method: string) => void;
  onLanguageChange?: (language: string) => void;
}

const COUNTRY_STORAGE_KEY = 'user_detected_country';
const DETECTION_METHOD_KEY = 'country_detection_method';
const LAST_DETECTION_KEY = 'last_country_detection';

// Détection via GPS (reverse geocoding)
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
          
          // Utiliser un service de reverse geocoding gratuit
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            { method: 'GET' }
          );
          
          if (response.ok) {
            const data = await response.json();
            const countryCode = data.countryCode;
            if (countryCode) {
              console.log('🌍 Pays détecté par GPS:', countryCode);
              resolve(countryCode);
              return;
            }
          }
          resolve(null);
        } catch (error) {
          console.warn('Erreur geocoding GPS:', error);
          resolve(null);
        }
      },
      (error) => {
        console.warn('GPS non disponible:', error.message);
        resolve(null);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
};

// Détection via IP
const detectCountryByIP = async (): Promise<string | null> => {
  try {
    // Essayer ipapi.co d'abord
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      const countryCode = data.country_code || data.country;
      if (countryCode) {
        console.log('🌐 Pays détecté par IP:', countryCode);
        return countryCode;
      }
    }
    
    // Fallback vers ip-api.com
    const fallbackResponse = await fetch('http://ip-api.com/json/?fields=countryCode');
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (fallbackData.countryCode) {
        console.log('🌐 Pays détecté par IP (fallback):', fallbackData.countryCode);
        return fallbackData.countryCode;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Détection IP échouée:', error);
    return null;
  }
};

// Détection via les paramètres système
const detectCountryBySystem = (): string | null => {
  try {
    // Essayer la locale du navigateur
    const locale = navigator.language || (navigator as any).userLanguage || '';
    const parts = locale.split('-');
    
    if (parts.length >= 2) {
      const countryCode = parts[1].toUpperCase();
      const country = getCountryByCode(countryCode);
      if (country) {
        console.log('💻 Pays détecté par système:', countryCode);
        return countryCode;
      }
    }
    
    // Essayer les fuseaux horaires
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneToCountry: Record<string, string> = {
      'Africa/Conakry': 'GN',
      'Africa/Freetown': 'SL',
      'Africa/Dakar': 'SN',
      'Africa/Abidjan': 'CI',
      'Africa/Lagos': 'NG',
      'Africa/Accra': 'GH',
      'Europe/Paris': 'FR',
      'Europe/London': 'GB',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      // Ajouter plus si nécessaire
    };
    
    if (timezoneToCountry[timezone]) {
      console.log('⏰ Pays détecté par fuseau horaire:', timezoneToCountry[timezone]);
      return timezoneToCountry[timezone];
    }
    
    return null;
  } catch (error) {
    console.warn('Détection système échouée:', error);
    return null;
  }
};

export const useCountryDetection = (options: UseCountryDetectionOptions = {}) => {
  const { autoDetect = true, onCountryChange, onLanguageChange } = options;
  
  const [result, setResult] = useState<DetectionResult>({
    country: null,
    detectionMethod: null,
    language: 'fr',
    isLoading: true,
    error: null
  });

  // Charger depuis le cache
  const loadFromCache = useCallback((): { country: Country | null; method: string | null } => {
    try {
      const cachedCode = localStorage.getItem(COUNTRY_STORAGE_KEY);
      const cachedMethod = localStorage.getItem(DETECTION_METHOD_KEY);
      const lastDetection = localStorage.getItem(LAST_DETECTION_KEY);
      
      // Vérifier si la détection a été faite dans les dernières 24h
      if (cachedCode && lastDetection) {
        const lastTime = parseInt(lastDetection, 10);
        const now = Date.now();
        const hoursSinceDetection = (now - lastTime) / (1000 * 60 * 60);
        
        if (hoursSinceDetection < 24) {
          const country = getCountryByCode(cachedCode);
          if (country) {
            return { country, method: cachedMethod };
          }
        }
      }
      
      return { country: null, method: null };
    } catch {
      return { country: null, method: null };
    }
  }, []);

  // Sauvegarder dans le cache
  const saveToCache = useCallback((countryCode: string, method: string) => {
    try {
      localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
      localStorage.setItem(DETECTION_METHOD_KEY, method);
      localStorage.setItem(LAST_DETECTION_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Erreur sauvegarde cache pays:', error);
    }
  }, []);

  // Détection principale avec priorité: GPS > IP > System
  const detectCountry = useCallback(async (forceRefresh = false) => {
    setResult(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Vérifier le cache d'abord (sauf si forceRefresh)
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached.country) {
        const language = getDefaultLanguageForCountry(cached.country.code);
        setResult({
          country: cached.country,
          detectionMethod: cached.method as any,
          language,
          isLoading: false,
          error: null
        });
        return cached.country;
      }
    }

    try {
      // 1. Essayer GPS d'abord
      const gpsCountryCode = await detectCountryByGPS();
      if (gpsCountryCode) {
        const country = getCountryByCode(gpsCountryCode);
        if (country) {
          const language = getDefaultLanguageForCountry(gpsCountryCode);
          saveToCache(gpsCountryCode, 'gps');
          setResult({
            country,
            detectionMethod: 'gps',
            language,
            isLoading: false,
            error: null
          });
          onCountryChange?.(country, 'gps');
          onLanguageChange?.(language);
          return country;
        }
      }

      // 2. Essayer IP
      const ipCountryCode = await detectCountryByIP();
      if (ipCountryCode) {
        const country = getCountryByCode(ipCountryCode);
        if (country) {
          const language = getDefaultLanguageForCountry(ipCountryCode);
          saveToCache(ipCountryCode, 'ip');
          setResult({
            country,
            detectionMethod: 'ip',
            language,
            isLoading: false,
            error: null
          });
          onCountryChange?.(country, 'ip');
          onLanguageChange?.(language);
          return country;
        }
      }

      // 3. Essayer les paramètres système
      const systemCountryCode = detectCountryBySystem();
      if (systemCountryCode) {
        const country = getCountryByCode(systemCountryCode);
        if (country) {
          const language = getDefaultLanguageForCountry(systemCountryCode);
          saveToCache(systemCountryCode, 'system');
          setResult({
            country,
            detectionMethod: 'system',
            language,
            isLoading: false,
            error: null
          });
          onCountryChange?.(country, 'system');
          onLanguageChange?.(language);
          return country;
        }
      }

      // Aucune détection réussie - défaut Guinée
      const defaultCountry = getCountryByCode('GN')!;
      setResult({
        country: defaultCountry,
        detectionMethod: null,
        language: 'fr',
        isLoading: false,
        error: 'Détection automatique échouée, pays par défaut utilisé'
      });
      
      return defaultCountry;
    } catch (error) {
      console.error('Erreur détection pays:', error);
      setResult(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur lors de la détection du pays'
      }));
      return null;
    }
  }, [loadFromCache, saveToCache, onCountryChange, onLanguageChange]);

  // Définir le pays manuellement
  const setCountryManually = useCallback((countryCode: string) => {
    const country = getCountryByCode(countryCode);
    if (country) {
      const language = getDefaultLanguageForCountry(countryCode);
      saveToCache(countryCode, 'manual');
      setResult({
        country,
        detectionMethod: 'manual',
        language,
        isLoading: false,
        error: null
      });
      onCountryChange?.(country, 'manual');
      onLanguageChange?.(language);
      return true;
    }
    return false;
  }, [saveToCache, onCountryChange, onLanguageChange]);

  // Vérifier si le pays a changé (pour les voyageurs)
  const checkForCountryChange = useCallback(async (): Promise<Country | null> => {
    const currentCountry = result.country;
    
    // Détecter le nouveau pays sans utiliser le cache
    const ipCountryCode = await detectCountryByIP();
    if (ipCountryCode && currentCountry && ipCountryCode !== currentCountry.code) {
      const newCountry = getCountryByCode(ipCountryCode);
      if (newCountry) {
        return newCountry;
      }
    }
    
    return null;
  }, [result.country]);

  // Détection automatique au chargement
  useEffect(() => {
    if (autoDetect) {
      detectCountry();
    }
  }, [autoDetect, detectCountry]);

  return {
    ...result,
    detectCountry,
    setCountryManually,
    checkForCountryChange,
    refreshDetection: () => detectCountry(true)
  };
};

export default useCountryDetection;
