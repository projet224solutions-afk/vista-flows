/**
 * CONTEXTE DE DEVISE GLOBAL
 * Gère la devise de l'application avec détection automatique basée sur le pays
 * Synchronisé avec useGeoDetection
 */

import { createContext, useState, useContext, useEffect, useCallback, ReactNode } from "react";
import { getCurrencyForCountry } from "@/data/countryMappings";

interface CurrencyContextType {
  currency: string;
  setCurrency: (c: string) => void;
  userCountry: string | null;
  loading: boolean;
}

const CURRENCY_STORAGE_KEY = 'app_currency';
const GEO_CACHE_KEY = 'geo_detection_cache';

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "GNF",
  setCurrency: () => {},
  userCountry: null,
  loading: true,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    // Vérifier d'abord le choix manuel
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored) return stored;
    
    // Sinon, essayer de récupérer depuis le cache géo
    try {
      const geoCache = localStorage.getItem(GEO_CACHE_KEY);
      if (geoCache) {
        const parsed = JSON.parse(geoCache);
        if (parsed?.data?.currency) {
          return parsed.data.currency;
        }
      }
    } catch {}
    
    return "GNF"; // Défaut
  });
  
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  // Synchronisation avec géo-détection
  useEffect(() => {
    const detectCurrency = async () => {
      // Vérifier si une devise a été choisie manuellement
      const hasManualPref = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (hasManualPref) {
        console.log('💱 Devise manuelle trouvée:', hasManualPref);
        setLoading(false);
        return;
      }

      // Essayer de récupérer depuis le cache de géo-détection
      try {
        const geoCacheRaw = localStorage.getItem(GEO_CACHE_KEY);
        if (geoCacheRaw) {
          const geoCache = JSON.parse(geoCacheRaw);
          if (geoCache?.data?.country && geoCache?.data?.currency) {
            const country = geoCache.data.country;
            const detectedCurrency = geoCache.data.currency;
            
            console.log(`💱 Auto-détection (via geo-cache): pays=${country}, devise=${detectedCurrency}`);
            setUserCountry(country);
            setCurrencyState(detectedCurrency);
            setHasAutoDetected(true);
            setLoading(false);
            return;
          }
        }
      } catch {}

      // Fallback: détection IP directe
      if (!hasAutoDetected) {
        try {
          const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            const country = data.country_code;
            
            if (country) {
              setUserCountry(country);
              
              // Utiliser la devise de l'API ou notre mapping
              const detectedCurrency = data.currency || getCurrencyForCountry(country);
              
              console.log(`💱 Auto-détection (IP): pays=${country}, devise=${detectedCurrency}`);
              setCurrencyState(detectedCurrency);
              setHasAutoDetected(true);
            }
          }
        } catch (error) {
          console.warn('💱 Détection devise échouée:', error);
        }
      }
      
      setLoading(false);
    };

    detectCurrency();
  }, [hasAutoDetected]);

  // Fonction pour changer manuellement la devise
  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    console.log('💱 Devise changée manuellement:', newCurrency);
  }, []);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      userCountry,
      loading 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
