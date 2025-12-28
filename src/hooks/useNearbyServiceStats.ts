/**
 * Hook: useNearbyServiceStats
 * Compte les services à proximité (rayon 20km) avec la MÊME position fallback que useGeoDistance.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeoDistance, calculateDistance as calcDistanceFn } from '@/hooks/useGeoDistance';

const RADIUS_KM = 20;

interface NearbyStats {
  boutiques: number;
  taxi: number;
  livraison: number;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
}

const statsCache = {
  data: null as NearbyStats | null,
  positionKey: '' as string,
  timestamp: 0,
  TTL: 60000,
};

function keyFromPosition(pos: GeoPosition) {
  // Arrondir pour éviter de recalculer à cause des micro-variations GPS
  return `${pos.latitude.toFixed(3)}:${pos.longitude.toFixed(3)}`;
}

export function useNearbyServiceStats() {
  const { userPosition, positionReady, DEFAULT_POSITION } = useGeoDistance();

  const [stats, setStats] = useState<NearbyStats>(() =>
    statsCache.data || { boutiques: 0, taxi: 0, livraison: 0 }
  );
  const [loading, setLoading] = useState(true);
  const isLoading = useRef(false);

  const loadNearbyStats = useCallback(async (origin: GeoPosition) => {
    const posKey = keyFromPosition(origin);

    if (statsCache.data && statsCache.positionKey === posKey && Date.now() - statsCache.timestamp < statsCache.TTL) {
      setStats(statsCache.data);
      setLoading(false);
      return;
    }

    if (isLoading.current) return;
    isLoading.current = true;
    setLoading(true);

    try {
      const [vendorsResult, taxiResult, livreurResult] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, latitude, longitude')
          .eq('is_active', true),
        supabase
          .from('profiles')
          .select('id, latitude, longitude')
          .eq('role', 'taxi'),
        supabase
          .from('profiles')
          .select('id, latitude, longitude')
          .eq('role', 'livreur'),
      ]);

      const countInRadius = (items: any[] | null | undefined) => {
        if (!items?.length) return 0;
        return items
          .map((item) => {
            const lat = item?.latitude;
            const lon = item?.longitude;
            if (lat === null || lat === undefined || lon === null || lon === undefined) return null;
            const dist = calcDistanceFn(origin.latitude, origin.longitude, Number(lat), Number(lon));
            if (!Number.isFinite(dist)) return null;
            return dist;
          })
          .filter((dist) => dist !== null && dist <= RADIUS_KM).length;
      };

      const newStats: NearbyStats = {
        boutiques: countInRadius(vendorsResult.data),
        taxi: countInRadius(taxiResult.data),
        livraison: countInRadius(livreurResult.data),
      };

      // Cache
      statsCache.data = newStats;
      statsCache.positionKey = posKey;
      statsCache.timestamp = Date.now();

      setStats(newStats);
    } catch (error) {
      console.error('[NearbyServiceStats] Error:', error);
    } finally {
      isLoading.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const origin = positionReady ? userPosition : DEFAULT_POSITION;
    void loadNearbyStats(origin);
  }, [positionReady, userPosition, DEFAULT_POSITION, loadNearbyStats]);

  // Refresh silencieux toutes les 60s (même TTL)
  useEffect(() => {
    const interval = window.setInterval(() => {
      const origin = positionReady ? userPosition : DEFAULT_POSITION;
      void loadNearbyStats(origin);
    }, 60000);

    return () => window.clearInterval(interval);
  }, [positionReady, userPosition, DEFAULT_POSITION, loadNearbyStats]);

  return { stats, loading };
}
