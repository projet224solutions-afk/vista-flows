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
    const hasManualChoice = localStorage.getItem(CURRENCY_MANUAL_KEY) === 'true';
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (hasManualChoice && stored) return stored;

    // Sinon, essayer de récupérer depuis le cache géo (ignorer les fallback)
    try {
      const geoCache = localStorage.getItem(GEO_CACHE_KEY);
      if (geoCache) {
        const parsed = JSON.parse(geoCache);
        if (parsed?.data?.currency && parsed?.data?.detectionMethod !== 'fallback') {
          return parsed.data.currency;
        }
      }
    } catch {}

    return "GNF"; // Défaut
  });

  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAutoDetected, setHasAutoDetected] = useState(false);

  // Synchronisation avec géo-détection (utilise UNIQUEMENT le cache de useGeoDetection, pas d'appel direct)
  useEffect(() => {
    // Si on a déjà auto-détecté, ne pas relancer
    if (hasAutoDetected) {
      setLoading(false);
      return;
    }
    // ...existing code...
  });

  // ...existing code...
}

export const useCurrency = () => useContext(CurrencyContext);
