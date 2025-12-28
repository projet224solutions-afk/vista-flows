import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectGeo = useCallback(async (gpsCoords?: { lat: number; lng: number }) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // D'abord vérifier si on a déjà les infos en base (sauf si GPS fourni)
      if (!gpsCoords) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('detected_country, detected_currency, detected_language, geo_detection_method')
          .eq('id', user.id)
          .single();

        if (profile?.detected_country && profile?.detected_currency) {
          setGeoInfo({
            country: profile.detected_country,
            currency: profile.detected_currency,
            language: profile.detected_language || 'fr',
            detectionMethod: profile.geo_detection_method || 'cached',
          });
          setLoading(false);
          return;
        }
      }

      // Détecter via l'edge function
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

      if (fnError) throw fnError;

      if (data?.success) {
        setGeoInfo({
          country: data.country,
          currency: data.currency,
          language: data.language,
          detectionMethod: data.detection_method,
          ...(gpsCoords && {
            latitude: gpsCoords.lat,
            longitude: gpsCoords.lng,
          }),
        });
      }
    } catch (err) {
      console.error('Geo detection error:', err);
      setError(err instanceof Error ? err.message : 'Detection failed');
      // Fallback par défaut
      setGeoInfo({
        country: 'GN',
        currency: 'GNF',
        language: 'fr',
        detectionMethod: 'fallback',
      });
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
      
      // Refaire la détection avec les coordonnées GPS
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
