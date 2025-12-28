import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GeoInfo {
  country: string;
  currency: string;
  language: string;
  detectionMethod: string;
}

interface UseGeoDetectionResult {
  geoInfo: GeoInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGeoDetection(): UseGeoDetectionResult {
  const { user } = useAuth();
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectGeo = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // D'abord vérifier si on a déjà les infos en base
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

      // Sinon, détecter via l'edge function
      const { data, error: fnError } = await supabase.functions.invoke('geo-detect', {
        body: {
          user_id: user.id,
          update_profile: true,
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setGeoInfo({
          country: data.country,
          currency: data.currency,
          language: data.language,
          detectionMethod: data.detection_method,
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

  useEffect(() => {
    detectGeo();
  }, [detectGeo]);

  return {
    geoInfo,
    loading,
    error,
    refresh: detectGeo,
  };
}
