/**
 * HOOK: useNearbyVendors
 * Fetches vendors with proximity sorting and geolocation
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NearbyVendor {
  id: string;
  business_name: string;
  description?: string | null;
  address?: string | null;
  logo_url?: string | null;
  rating?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_type?: 'physical' | 'digital' | 'hybrid' | null;
  service_type?: 'wholesale' | 'retail' | 'mixed' | null;
  is_verified?: boolean | null;
  distance?: number; // Distance in km (calculated client-side)
}

interface UserPosition {
  latitude: number;
  longitude: number;
}

interface UseNearbyVendorsOptions {
  enabled?: boolean;
  limit?: number;
  searchQuery?: string;
  businessTypeFilter?: 'physical' | 'digital' | 'hybrid' | 'all';
  serviceTypeFilter?: 'wholesale' | 'retail' | 'mixed' | 'all';
}

// Haversine formula to calculate distance between two points
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
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
};

export function useNearbyVendors(options: UseNearbyVendorsOptions = {}) {
  const {
    enabled = true,
    limit = 50,
    searchQuery = '',
    businessTypeFilter = 'all',
    serviceTypeFilter = 'all',
  } = options;

  const [vendors, setVendors] = useState<NearbyVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's current position
  const getUserPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        // Default to Conakry center if geolocation fails
        setUserPosition({
          latitude: 9.6412,
          longitude: -13.5784,
        });
        setLocationError('Position par défaut utilisée');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  // Fetch vendors from database
  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          description,
          address,
          logo_url,
          rating,
          city,
          neighborhood,
          latitude,
          longitude,
          business_type,
          service_type,
          is_verified
        `)
        .eq('is_active', true)
        .limit(limit);

      // Apply business type filter
      if (businessTypeFilter !== 'all') {
        query = query.eq('business_type', businessTypeFilter);
      }

      // Apply service type filter
      if (serviceTypeFilter !== 'all') {
        query = query.eq('service_type', serviceTypeFilter);
      }

      const { data, error: dbError } = await query;

      if (dbError) throw dbError;

      let vendorList: NearbyVendor[] = (data || []).map((vendor) => ({
        ...vendor,
        business_type: vendor.business_type as NearbyVendor['business_type'],
        service_type: vendor.service_type as NearbyVendor['service_type'],
      }));

      // Calculate distance if user position is available
      if (userPosition) {
        vendorList = vendorList.map((vendor) => {
          if (vendor.latitude && vendor.longitude) {
            const distance = calculateDistance(
              userPosition.latitude,
              userPosition.longitude,
              vendor.latitude,
              vendor.longitude
            );
            return { ...vendor, distance };
          }
          return { ...vendor, distance: undefined };
        });

        // Sort by distance (closest first), vendors without location go to end
        vendorList.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) {
            // Both without location: sort by rating
            return (b.rating || 0) - (a.rating || 0);
          }
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      } else {
        // If no user position, sort by rating
        vendorList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      // Apply search filter client-side (for reactivity)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        vendorList = vendorList.filter(
          (v) =>
            v.business_name.toLowerCase().includes(query) ||
            v.city?.toLowerCase().includes(query) ||
            v.neighborhood?.toLowerCase().includes(query) ||
            v.description?.toLowerCase().includes(query)
        );
      }

      setVendors(vendorList);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Erreur lors du chargement des boutiques');
    } finally {
      setLoading(false);
    }
  }, [userPosition, limit, businessTypeFilter, serviceTypeFilter, searchQuery]);

  // Get user position on mount
  useEffect(() => {
    if (enabled) {
      getUserPosition();
    }
  }, [enabled, getUserPosition]);

  // Fetch vendors when position changes or filters change
  useEffect(() => {
    if (enabled) {
      fetchVendors();
    }
  }, [enabled, fetchVendors]);

  const refresh = useCallback(() => {
    getUserPosition();
    fetchVendors();
  }, [getUserPosition, fetchVendors]);

  return {
    vendors,
    loading,
    error,
    userPosition,
    locationError,
    refresh,
  };
}

export default useNearbyVendors;
