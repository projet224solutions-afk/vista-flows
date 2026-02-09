/**
 * CONTEXTE DE DEVISE GLOBAL
 * Gère la devise de l'application avec détection automatique basée sur le pays
 * Synchronisé avec useGeoDetection
 */

import { createContext, useState, useContext, useEffect, useCallback, ReactNode } from "react";
import { getCurrencyForCountry } from "@/data/countryMappings";
import { supabase } from '@/integrations/supabase/client';

interface CurrencyContextType {
  currency: string;
  setCurrency: (c: string) => void;
  userCountry: string | null;
  loading: boolean;
}

const CURRENCY_STORAGE_KEY = 'app_currency';
const CURRENCY_MANUAL_KEY = 'app_currency_manual'; // Flag explicite pour choix manuel
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
      // Si on a déjà auto-détecté, ne pas relancer (les sync live sont gérées plus bas)
      if (hasAutoDetected) {
        setLoading(false);
        return;
      }

      // Vérifier si une devise a été choisie manuellement (flag explicite)
      const hasManualChoice = localStorage.getItem(CURRENCY_MANUAL_KEY) === 'true';
      if (hasManualChoice) {
        console.log('💱 Devise choisie manuellement, pas de sync auto');
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

      // Fallback: Edge Function geo-detect (plus fiable que ipapi côté navigateur)
      try {
        const { data, error } = await supabase.functions.invoke('geo-detect', {
          body: { user_id: null, update_profile: false },
        });

        if (!error && data?.success && data.country) {
          const country = data.country as string;
          const detectedCurrency = (data.currency as string | undefined) || getCurrencyForCountry(country);

          console.log(`💱 Auto-détection (edge): pays=${country}, devise=${detectedCurrency}`);
          setUserCountry(country);
          setCurrencyState(detectedCurrency);
          setHasAutoDetected(true);
        }
      } catch (error) {
        console.warn('💱 Détection devise (edge) échouée:', error);
      }

      setLoading(false);
    };

    detectCurrency();
  }, [hasAutoDetected]);

  // Sync live depuis geo-cache (quand useGeoDetection met à jour le cache dans le même onglet)
  useEffect(() => {
    const syncFromGeoCache = () => {
      // Ne pas écraser si choix manuel explicite
      const hasManualChoice = localStorage.getItem(CURRENCY_MANUAL_KEY) === 'true';
      if (hasManualChoice) return;

      try {
        const geoCacheRaw = localStorage.getItem(GEO_CACHE_KEY);
        if (!geoCacheRaw) return;

        const geoCache = JSON.parse(geoCacheRaw);
        const nextCurrency = geoCache?.data?.currency;
        const nextCountry = geoCache?.data?.country;

        if (nextCurrency && nextCurrency !== currency) {
          console.log(`💱 Sync devise depuis geo-cache: ${nextCurrency}`);
          setCurrencyState(nextCurrency);
          setUserCountry(nextCountry || null);
          setHasAutoDetected(true);
        }
      } catch {}
    };

    syncFromGeoCache();
    const interval = setInterval(syncFromGeoCache, 2000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === GEO_CACHE_KEY) syncFromGeoCache();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currency]);

  // Fonction pour changer manuellement la devise
  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    localStorage.setItem(CURRENCY_MANUAL_KEY, 'true'); // Marquer comme choix manuel
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
