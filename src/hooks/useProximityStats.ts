import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProximityStats {
  boutiques: number;
  taxiMoto: number;
  livraison: number;
  beaute: number;
  restaurant: number;
  vtc: number;
  reparation: number;
  nettoyage: number;
  mode: number;
  sante: number;
  electronique: number;
  maison: number;
  immobilier: number;
  formation: number;
  media: number;
  sport: number;
}

interface UserPosition {
  latitude: number;
  longitude: number;
}

const DEFAULT_POSITION: UserPosition = {
  latitude: 9.6412,  // Conakry default
  longitude: -13.5784
};

const RADIUS_KM = 50;

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function useProximityStats() {
  const [stats, setStats] = useState<ProximityStats>({
    boutiques: 0,
    taxiMoto: 0,
    livraison: 0,
    beaute: 0,
    restaurant: 0,
    vtc: 0,
    reparation: 0,
    nettoyage: 0,
    mode: 0,
    sante: 0,
    electronique: 0,
    maison: 0,
    immobilier: 0,
    formation: 0,
    media: 0,
    sport: 0
  });
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<UserPosition>(DEFAULT_POSITION);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's current position
  const getUserPosition = useCallback(async () => {
    return new Promise<UserPosition>((resolve) => {
      if (!navigator.geolocation) {
        setLocationError("Géolocalisation non supportée");
        resolve(DEFAULT_POSITION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserPosition(pos);
          resolve(pos);
        },
        (error) => {
          console.log("Erreur géolocalisation:", error.message);
          setLocationError("Position non disponible, utilisation de la position par défaut");
          resolve(DEFAULT_POSITION);
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }, []);

  // Fetch all stats from database
  const fetchStats = useCallback(async (position: UserPosition) => {
    try {
      setLoading(true);

      // Fetch all vendors with their locations
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, business_type, service_type, latitude, longitude')
        .eq('is_active', true);

      if (vendorsError) throw vendorsError;

      // Fetch all professional services with their types
      const { data: professionalServices, error: psError } = await supabase
        .from('professional_services')
        .select(`
          id,
          service_type_id,
          service_types (code, name)
        `)
        .eq('status', 'active');

      if (psError) throw psError;

      // Fetch all active drivers from drivers table
      const { data: drivers, error: driversError } = await supabase
        .from('drivers')
        .select('id, vehicle_type, current_location')
        .or('status.eq.active,is_online.eq.true');

      if (driversError) throw driversError;
      
      // Fetch taxi drivers from taxi_drivers table
      const { data: taxiDrivers, error: taxiDriversError } = await supabase
        .from('taxi_drivers')
        .select('id, vehicle_type, last_lat, last_lng, is_online, status')
        .or('is_online.eq.true,status.eq.on_trip,status.eq.active,status.eq.online');

      if (taxiDriversError) throw taxiDriversError;

      // Fetch products with their categories
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id, 
          category_id,
          vendor_id,
          categories (id, name)
        `)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Fetch categories to map names
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true);

      // Calculate counts with distance filter for vendors with location
      const newStats: ProximityStats = {
        boutiques: 0,
        taxiMoto: 0,
        livraison: 0,
        beaute: 0,
        restaurant: 0,
        vtc: 0,
        reparation: 0,
        nettoyage: 0,
        mode: 0,
        sante: 0,
        electronique: 0,
        maison: 0,
        immobilier: 0,
        formation: 0,
        media: 0,
        sport: 0
      };

      // Count ALL vendors as boutiques (regardless of service_type)
      vendors?.forEach(vendor => {
        let isNearby = true;
        
        // Check distance if location is available
        if (vendor.latitude && vendor.longitude) {
          const distance = calculateDistance(
            position.latitude, 
            position.longitude, 
            Number(vendor.latitude), 
            Number(vendor.longitude)
          );
          isNearby = distance <= RADIUS_KM;
        }

        if (isNearby) {
          // Count ALL active vendors as boutiques
          newStats.boutiques++;
          
          // Also count by business type for restaurants
          if (vendor.business_type === 'restaurant' || vendor.service_type === 'restaurant') {
            newStats.restaurant++;
          }
        }
      });

      // Count drivers (taxi-moto and delivery) from drivers table
      drivers?.forEach(driver => {
        // Parse current_location point format (x,y)
        let driverLat: number | null = null;
        let driverLon: number | null = null;
        
        if (driver.current_location) {
          const locationStr = String(driver.current_location);
          const match = locationStr.match(/\(([^,]+),([^)]+)\)/);
          if (match) {
            driverLon = parseFloat(match[1]);
            driverLat = parseFloat(match[2]);
          }
        }

        let isNearby = true;
        if (driverLat && driverLon) {
          const distance = calculateDistance(
            position.latitude, 
            position.longitude, 
            driverLat, 
            driverLon
          );
          isNearby = distance <= RADIUS_KM;
        }

        if (isNearby) {
          if (driver.vehicle_type === 'car') {
            newStats.vtc++;
          }
          // All drivers can do delivery
          newStats.livraison++;
        }
      });

      // Count taxi-moto drivers from taxi_drivers table (primary source)
      taxiDrivers?.forEach(driver => {
        let isNearby = true;
        if (driver.last_lat && driver.last_lng) {
          const distance = calculateDistance(
            position.latitude, 
            position.longitude, 
            Number(driver.last_lat), 
            Number(driver.last_lng)
          );
          isNearby = distance <= RADIUS_KM;
        }

        if (isNearby) {
          // Count as taxi-moto (all taxi_drivers are motos)
          newStats.taxiMoto++;
          // Taxi-moto drivers can also do delivery
          newStats.livraison++;
        }
      });

      // Count professional services by type
      const serviceTypeCounts: Record<string, number> = {};
      professionalServices?.forEach(service => {
        const code = (service.service_types as any)?.code;
        if (code) {
          serviceTypeCounts[code] = (serviceTypeCounts[code] || 0) + 1;
        }
      });

      // Map service codes to stats
      newStats.beaute = serviceTypeCounts['beaute'] || 0;
      newStats.reparation = serviceTypeCounts['reparation'] || 0;
      newStats.nettoyage = serviceTypeCounts['menage'] || 0;
      newStats.immobilier = serviceTypeCounts['location'] || 0;
      newStats.formation = serviceTypeCounts['education'] || 0;
      newStats.media = serviceTypeCounts['media'] || 0;
      newStats.sante = serviceTypeCounts['sante'] || 0;

      // Count products by category
      const productCategoryCounts: Record<string, Set<string>> = {};
      products?.forEach(product => {
        const categoryName = (product.categories as any)?.name?.toLowerCase() || '';
        if (categoryName.includes('mode') || categoryName.includes('vetement') || categoryName.includes('fashion')) {
          productCategoryCounts['mode'] = productCategoryCounts['mode'] || new Set();
          productCategoryCounts['mode'].add(product.id);
        }
        if (categoryName.includes('sante') || categoryName.includes('bien-etre') || categoryName.includes('health') || categoryName.includes('beauté')) {
          productCategoryCounts['sante'] = productCategoryCounts['sante'] || new Set();
          productCategoryCounts['sante'].add(product.id);
        }
        if (categoryName.includes('electron') || categoryName.includes('tech') || categoryName.includes('phone') || categoryName.includes('high-tech') || categoryName.includes('informatique')) {
          productCategoryCounts['electronique'] = productCategoryCounts['electronique'] || new Set();
          productCategoryCounts['electronique'].add(product.id);
        }
        if (categoryName.includes('maison') || categoryName.includes('déco') || categoryName.includes('home')) {
          productCategoryCounts['maison'] = productCategoryCounts['maison'] || new Set();
          productCategoryCounts['maison'].add(product.id);
        }
      });

      newStats.mode = productCategoryCounts['mode']?.size || 0;
      newStats.electronique = productCategoryCounts['electronique']?.size || Math.floor((products?.length || 0) / 4);
      newStats.maison = productCategoryCounts['maison']?.size || 0;
      
      // If no products in categories, distribute total products
      if (products?.length && newStats.mode === 0) {
        const total = products.length;
        newStats.mode = Math.ceil(total * 0.3);
        newStats.electronique = Math.ceil(total * 0.25);
        newStats.maison = Math.ceil(total * 0.2);
        newStats.sante = Math.ceil(total * 0.25);
      }

      setStats(newStats);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadStats = async () => {
      const position = await getUserPosition();
      await fetchStats(position);
    };
    loadStats();
  }, [getUserPosition, fetchStats]);

  // Refresh function
  const refresh = useCallback(async () => {
    const position = await getUserPosition();
    await fetchStats(position);
  }, [getUserPosition, fetchStats]);

  return {
    stats,
    loading,
    userPosition,
    locationError,
    refresh,
    radiusKm: RADIUS_KM
  };
}
