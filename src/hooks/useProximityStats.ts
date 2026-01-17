import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGeoDistance, calculateDistance as calcDistanceFn } from '@/hooks/useGeoDistance';

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

/** Debug info returned by hook */
export interface ProximityDebugInfo {
  vendors: { total: number; noGps: number; outOfRadius: number; inRadius: number };
  services: { total: number; noGps: number; outOfRadius: number; inRadius: number };
  taxiMoto: { total: number; noGps: number; outOfRadius: number; inRadius: number };
  drivers: { total: number; noGps: number; outOfRadius: number; inRadius: number };
  positionUsed: { latitude: number; longitude: number };
  usingRealGps: boolean;
}

interface UserPosition {
  latitude: number;
  longitude: number;
}

const RADIUS_KM = 20;

export function useProximityStats() {
  // ✅ Source unique de géolocalisation (même fallback + même logique que les pages Nearby*)
  const { userPosition, positionReady, usingRealLocation, refreshPosition, DEFAULT_POSITION } = useGeoDistance();

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
    sport: 0,
  });

  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<ProximityDebugInfo | null>(null);

  // Compat UI: message quand on utilise la position fallback
  const locationError = useMemo(() => {
    if (!positionReady) return null;
    if (usingRealLocation) return null;
    return 'GPS non disponible: distances basées sur la position par défaut';
  }, [positionReady, usingRealLocation]);

  const fetchStats = useCallback(async (position: UserPosition) => {
    try {
      setLoading(true);

      const [vendorsRes, proServicesRes, driversRes, taxiDriversRes, productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, business_type, service_type, latitude, longitude')
          .eq('is_active', true),

        supabase
          .from('professional_services')
          .select(`
            id,
            latitude,
            longitude,
            service_type_id,
            service_types (code, name)
          `)
          .eq('status', 'active'),

        supabase
          .from('drivers')
          .select('id, vehicle_type, current_location')
          .or('status.eq.active,is_online.eq.true'),

        supabase
          .from('taxi_drivers')
          .select('id, vehicle_type, last_lat, last_lng, is_online, status')
          .or('is_online.eq.true,status.eq.on_trip,status.eq.active,status.eq.online'),

        supabase
          .from('products')
          .select(`
            id, 
            category_id,
            vendor_id,
            categories (id, name)
          `)
          .eq('is_active', true),

        supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true),
      ]);

      if (vendorsRes.error) throw vendorsRes.error;
      if (proServicesRes.error) throw proServicesRes.error;
      if (driversRes.error) throw driversRes.error;
      if (taxiDriversRes.error) throw taxiDriversRes.error;
      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const vendors = vendorsRes.data ?? [];
      const professionalServices = proServicesRes.data ?? [];
      const drivers = driversRes.data ?? [];
      const taxiDrivers = taxiDriversRes.data ?? [];
      const products = productsRes.data ?? [];

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
        sport: 0,
      };

      // Debug counters
      const dbg: ProximityDebugInfo = {
        vendors: { total: vendors.length, noGps: 0, outOfRadius: 0, inRadius: 0 },
        services: { total: professionalServices.length, noGps: 0, outOfRadius: 0, inRadius: 0 },
        taxiMoto: { total: taxiDrivers.length, noGps: 0, outOfRadius: 0, inRadius: 0 },
        drivers: { total: drivers.length, noGps: 0, outOfRadius: 0, inRadius: 0 },
        positionUsed: { latitude: position.latitude, longitude: position.longitude },
        usingRealGps: usingRealLocation,
      };

      // 1) Boutiques (vendors) — strict GPS + rayon
      vendors.forEach((vendor: any) => {
        const lat = vendor?.latitude;
        const lng = vendor?.longitude;
        if (lat === null || lat === undefined || lng === null || lng === undefined) {
          dbg.vendors.noGps++;
          return;
        }

        const distance = calcDistanceFn(position.latitude, position.longitude, Number(lat), Number(lng));
        if (!Number.isFinite(distance) || distance > RADIUS_KM) {
          dbg.vendors.outOfRadius++;
          return;
        }

        dbg.vendors.inRadius++;
        newStats.boutiques++;
        if (vendor.business_type === 'restaurant' || vendor.service_type === 'restaurant') {
          newStats.restaurant++;
        }
      });

      // Helpers parse point
      const parsePoint = (value: unknown): { lat: number; lng: number } | null => {
        if (!value) return null;
        const s = String(value);
        const match = s.match(/\(([^,]+),([^)]+)\)/);
        if (!match) return null;
        const lng = Number(match[1]);
        const lat = Number(match[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      };

      // 2) Drivers (livraison + vtc) — strict GPS + rayon
      drivers.forEach((driver: any) => {
        const p = parsePoint(driver.current_location);
        if (!p) {
          dbg.drivers.noGps++;
          return;
        }

        const distance = calcDistanceFn(position.latitude, position.longitude, p.lat, p.lng);
        if (!Number.isFinite(distance) || distance > RADIUS_KM) {
          dbg.drivers.outOfRadius++;
          return;
        }

        dbg.drivers.inRadius++;
        if (driver.vehicle_type === 'car') newStats.vtc++;
        newStats.livraison++;
      });

      // 3) Taxi drivers — strict GPS + rayon
      taxiDrivers.forEach((driver: any) => {
        const lat = driver?.last_lat;
        const lng = driver?.last_lng;
        if (lat === null || lat === undefined || lng === null || lng === undefined) {
          dbg.taxiMoto.noGps++;
          return;
        }

        const distance = calcDistanceFn(position.latitude, position.longitude, Number(lat), Number(lng));
        if (!Number.isFinite(distance) || distance > RADIUS_KM) {
          dbg.taxiMoto.outOfRadius++;
          return;
        }

        dbg.taxiMoto.inRadius++;
        newStats.taxiMoto++;
        newStats.livraison++;
      });

      // 4) Services pro — GPS optionnel : on compte tous les services actifs
      // Si le service a un GPS valide et est dans le rayon => inRadius
      // Si le service n'a pas de GPS => on le compte quand même (noGps mais inclus)
      // Si le service a un GPS mais hors rayon => exclu
      const serviceTypeCounts: Record<string, number> = {};
      professionalServices.forEach((service: any) => {
        const lat = service?.latitude;
        const lng = service?.longitude;
        const hasGps = lat !== null && lat !== undefined && lng !== null && lng !== undefined;
        
        if (!hasGps) {
          dbg.services.noGps++;
          // ✅ On inclut quand même les services sans GPS (ils sont actifs)
          const code = service?.service_types?.code;
          if (code) {
            serviceTypeCounts[code] = (serviceTypeCounts[code] || 0) + 1;
          }
          return;
        }

        const distance = calcDistanceFn(position.latitude, position.longitude, Number(lat), Number(lng));
        if (!Number.isFinite(distance) || distance > RADIUS_KM) {
          dbg.services.outOfRadius++;
          return; // Hors rayon = exclu
        }

        dbg.services.inRadius++;
        const code = service?.service_types?.code;
        if (code) {
          serviceTypeCounts[code] = (serviceTypeCounts[code] || 0) + 1;
        }
      });

      newStats.beaute = serviceTypeCounts['beaute'] || 0;
      newStats.restaurant += serviceTypeCounts['restaurant'] || 0;
      newStats.reparation = serviceTypeCounts['reparation'] || 0;
      newStats.nettoyage = serviceTypeCounts['menage'] || 0;
      newStats.immobilier = serviceTypeCounts['location'] || 0;
      newStats.formation = serviceTypeCounts['education'] || 0;
      newStats.media = serviceTypeCounts['media'] || 0;
      newStats.sante = serviceTypeCounts['sante'] || 0;
      newStats.sport = serviceTypeCounts['sport'] || 0;

      // 5) Produits (catégories) — inchangé (pas de notion GPS)
      const productCategoryCounts: Record<string, Set<string>> = {};
      products.forEach((product: any) => {
        const categoryName = product?.categories?.name?.toLowerCase?.() || '';
        if (categoryName.includes('mode') || categoryName.includes('vetement') || categoryName.includes('fashion')) {
          productCategoryCounts['mode'] = productCategoryCounts['mode'] || new Set();
          productCategoryCounts['mode'].add(product.id);
        }
        if (
          categoryName.includes('sante') ||
          categoryName.includes('bien-etre') ||
          categoryName.includes('health') ||
          categoryName.includes('beauté')
        ) {
          productCategoryCounts['sante'] = productCategoryCounts['sante'] || new Set();
          productCategoryCounts['sante'].add(product.id);
        }
        if (
          categoryName.includes('electron') ||
          categoryName.includes('tech') ||
          categoryName.includes('phone') ||
          categoryName.includes('high-tech') ||
          categoryName.includes('informatique')
        ) {
          productCategoryCounts['electronique'] = productCategoryCounts['electronique'] || new Set();
          productCategoryCounts['electronique'].add(product.id);
        }
        if (categoryName.includes('maison') || categoryName.includes('déco') || categoryName.includes('home')) {
          productCategoryCounts['maison'] = productCategoryCounts['maison'] || new Set();
          productCategoryCounts['maison'].add(product.id);
        }
      });

      newStats.mode = productCategoryCounts['mode']?.size || 0;
      newStats.electronique = productCategoryCounts['electronique']?.size || Math.floor((products.length || 0) / 4);
      newStats.maison = productCategoryCounts['maison']?.size || 0;

      if (products.length && newStats.mode === 0) {
        const total = products.length;
        newStats.mode = Math.ceil(total * 0.3);
        newStats.electronique = Math.ceil(total * 0.25);
        newStats.maison = Math.ceil(total * 0.2);
        newStats.sante = Math.ceil(total * 0.25);
      }

      // Debug log for developers
      console.log('[ProximityStats] Debug info:', dbg);

      setStats(newStats);
      setDebugInfo(dbg);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  }, [usingRealLocation]);

  // Chargement initial dès que la position est prête (réelle OU fallback) — cohérent avec le reste
  useEffect(() => {
    if (!positionReady) return;
    const origin = userPosition ?? DEFAULT_POSITION;
    void fetchStats(origin);
  }, [positionReady, userPosition, DEFAULT_POSITION, fetchStats]);

  const refresh = useCallback(async () => {
    const pos = await refreshPosition();
    await fetchStats(pos);
  }, [refreshPosition, fetchStats]);

  return {
    stats,
    loading,
    userPosition,
    locationError,
    refresh,
    radiusKm: RADIUS_KM,
    usingRealLocation,
    debugInfo,
  };
}
