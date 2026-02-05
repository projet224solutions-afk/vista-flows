import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  COUNTRY_TO_CURRENCY, 
  COUNTRY_TO_LANGUAGE, 
  getCurrencyForCountry, 
  getLanguageForCountry 
} from '@/data/countryMappings';

interface GeoInfo {
  country: string;
  currency: string;
  language: string;
  detectionMethod: string;
  latitude?: number;
  longitude?: number;
}

interface UseGeoDetectionResult {
  geoInfo: GeoInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Demander la localisation GPS (avec consentement) */
  requestGpsLocation: () => Promise<boolean>;
}

// Cache pour éviter les appels répétés
const GEO_CACHE_KEY = 'geo_detection_cache';
const GEO_CACHE_DURATION = 60 * 60 * 1000; // 1 heure

interface CachedGeo {
  data: GeoInfo;
  timestamp: number;
}

function getCachedGeo(): GeoInfo | null {
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed: CachedGeo = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < GEO_CACHE_DURATION) {
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

function setCachedGeo(data: GeoInfo) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {}
}

// Helper pour obtenir la position GPS
const getGpsPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // Cache 5 minutes
    });
  });
};

export function useGeoDetection(): UseGeoDetectionResult {
  const { user } = useAuth();
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(getCachedGeo);
  const [loading, setLoading] = useState(!getCachedGeo());
  const [error, setError] = useState<string | null>(null);

  const detectGeo = useCallback(async (gpsCoords?: { lat: number; lng: number }) => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier le cache d'abord (sauf si GPS fourni)
      if (!gpsCoords) {
        const cached = getCachedGeo();
        if (cached) {
          setGeoInfo(cached);
          setLoading(false);
          return;
        }
      }

      // Pour utilisateur connecté, vérifier en base
      if (user?.id && !gpsCoords) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('detected_country, detected_currency, detected_language, geo_detection_method')
          .eq('id', user.id)
          .single();

        if (profile?.detected_country && profile?.detected_currency) {
          const info: GeoInfo = {
            country: profile.detected_country,
            currency: profile.detected_currency,
            language: profile.detected_language || 'fr',
            detectionMethod: profile.geo_detection_method || 'cached',
          };
          setGeoInfo(info);
          setCachedGeo(info);
          setLoading(false);
          return;
        }
      }

      // Essayer l'edge function si disponible
      if (user?.id) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke('geo-detect', {
            body: {
              user_id: user.id,
              update_profile: true,
              ...(gpsCoords && {
                gps_latitude: gpsCoords.lat,
                gps_longitude: gpsCoords.lng,
              }),
            },
          });

          if (!fnError && data?.success) {
            const info: GeoInfo = {
              country: data.country,
              currency: data.currency,
              language: data.language,
              detectionMethod: data.detection_method,
              ...(gpsCoords && {
                latitude: gpsCoords.lat,
                longitude: gpsCoords.lng,
              }),
            };
            setGeoInfo(info);
            setCachedGeo(info);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Fallback: API IP gratuite (ipapi.co) pour tous les visiteurs
      try {
        const response = await fetch('https://ipapi.co/json/', {
          headers: { 'Accept': 'application/json' },
        });
        
        if (response.ok) {
          const data = await response.json();
          const country = data.country_code || 'GN';
          // Utiliser notre mapping complet, avec fallback sur l'API
          const currency = getCurrencyForCountry(country) || data.currency || 'GNF';
          const language = getLanguageForCountry(country) || 'fr';
          
          const info: GeoInfo = {
            country,
            currency,
            language,
            detectionMethod: 'ipapi',
          };
          setGeoInfo(info);
          setCachedGeo(info);
          setLoading(false);
          return;
        }
      } catch {}

      // Dernier fallback
      const fallbackInfo: GeoInfo = {
        country: 'GN',
        currency: 'GNF',
        language: 'fr',
        detectionMethod: 'fallback',
      };
      setGeoInfo(fallbackInfo);
      setCachedGeo(fallbackInfo);
    } catch (err) {
      console.error('Geo detection error:', err);
      setError(err instanceof Error ? err.message : 'Detection failed');
      const fallback: GeoInfo = {
        country: 'GN',
        currency: 'GNF',
        language: 'fr',
        detectionMethod: 'fallback',
      };
      setGeoInfo(fallback);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Demander la localisation GPS avec consentement
  const requestGpsLocation = useCallback(async (): Promise<boolean> => {
    try {
      const position = await getGpsPosition();
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      await detectGeo(coords);
      return true;
    } catch (err) {
      console.warn('GPS location denied or failed:', err);
      return false;
    }
  }, [detectGeo]);

  useEffect(() => {
    detectGeo();
  }, [detectGeo]);

  return {
    geoInfo,
    loading,
    error,
    refresh: () => detectGeo(),
    requestGpsLocation,
  };
}
