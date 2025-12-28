/**
 * Hook pour compter les services à proximité (dans un rayon de 20km)
 * Utilise la même logique de filtrage que useNearbyVendors
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RADIUS_KM = 20;
const DEFAULT_POSITION = { latitude: 9.5370, longitude: -13.6785 }; // Coyah par défaut

interface NearbyStats {
  boutiques: number;
  taxi: number;
  livraison: number;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
}

// Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Cache avec TTL
const statsCache = {
  data: null as NearbyStats | null,
  position: null as GeoPosition | null,
  timestamp: 0,
  TTL: 60000, // 1 minute
};

export function useNearbyServiceStats() {
  const [stats, setStats] = useState<NearbyStats>(() => 
    statsCache.data || { boutiques: 0, taxi: 0, livraison: 0 }
  );
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<GeoPosition | null>(null);
  const isLoading = useRef(false);

  // Obtenir la position de l'utilisateur
  const getUserPosition = useCallback((): Promise<GeoPosition> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('[NearbyStats] Geolocation not supported, using default');
        resolve(DEFAULT_POSITION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('[NearbyStats] Got user position:', pos);
          resolve(pos);
        },
        (error) => {
          console.log('[NearbyStats] Geolocation error:', error.message);
          resolve(DEFAULT_POSITION);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    });
  }, []);

  // Calculer les stats à proximité
  const loadNearbyStats = useCallback(async (position: GeoPosition) => {
    // Vérifier cache
    if (
      statsCache.data &&
      statsCache.position &&
      statsCache.position.latitude === position.latitude &&
      statsCache.position.longitude === position.longitude &&
      Date.now() - statsCache.timestamp < statsCache.TTL
    ) {
      setStats(statsCache.data);
      setLoading(false);
      return;
    }

    if (isLoading.current) return;
    isLoading.current = true;
    setLoading(true);

    try {
      // Récupérer toutes les données avec coordonnées
      const [vendorsResult, taxiResult, livreurResult] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, latitude, longitude')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null),
        supabase
          .from('profiles')
          .select('id, latitude, longitude')
          .eq('role', 'taxi')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null),
        supabase
          .from('profiles')
          .select('id, latitude, longitude')
          .eq('role', 'livreur')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null),
      ]);

      // Filtrer par distance (20km)
      const filterByDistance = (items: any[] | null): number => {
        if (!items) return 0;
        return items.filter((item) => {
          if (!item.latitude || !item.longitude) return false;
          const dist = calculateDistance(
            position.latitude,
            position.longitude,
            item.latitude,
            item.longitude
          );
          return dist <= RADIUS_KM;
        }).length;
      };

      const newStats: NearbyStats = {
        boutiques: filterByDistance(vendorsResult.data),
        taxi: filterByDistance(taxiResult.data),
        livraison: filterByDistance(livreurResult.data),
      };

      console.log('[NearbyStats] Stats calculées:', newStats, 'depuis position:', position);

      // Mettre en cache
      statsCache.data = newStats;
      statsCache.position = position;
      statsCache.timestamp = Date.now();

      setStats(newStats);
    } catch (error) {
      console.error('[NearbyStats] Error loading stats:', error);
    } finally {
      isLoading.current = false;
      setLoading(false);
    }
  }, []);

  // Initialiser
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const pos = await getUserPosition();
      if (mounted) {
        setUserPosition(pos);
        await loadNearbyStats(pos);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [getUserPosition, loadNearbyStats]);

  // Rafraîchir périodiquement (1 minute)
  useEffect(() => {
    if (!userPosition) return;
    
    const interval = setInterval(() => {
      loadNearbyStats(userPosition);
    }, 60000);

    return () => clearInterval(interval);
  }, [userPosition, loadNearbyStats]);

  const refresh = useCallback(async () => {
    const pos = await getUserPosition();
    setUserPosition(pos);
    // Invalider le cache
    statsCache.timestamp = 0;
    await loadNearbyStats(pos);
  }, [getUserPosition, loadNearbyStats]);

  return { stats, loading, userPosition, refresh };
}
