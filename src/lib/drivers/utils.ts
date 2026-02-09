/**
 * Utilitaires pour le traitement des drivers
 * 224Solutions
 */

import { calculateDistance } from '@/hooks/useGeoDistance';
import type { DriverPosition, NearbyDriver, DeliveryDriver, TaxiDriver, DriverProfile } from './types';

/**
 * Parse les coordonnées PostGIS POINT format: POINT(lng lat) ou (lng,lat)
 * @returns Position ou null si invalide
 */
export function parsePostGISPoint(value: unknown): DriverPosition | null {
  if (!value) return null;

  const str = String(value);

  // Format POINT(lng lat)
  const pointMatch = str.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
  if (pointMatch) {
    const lng = parseFloat(pointMatch[1]);
    const lat = parseFloat(pointMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Format (lng,lat) - Supabase geography
  const parenMatch = str.match(/\(\s*([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)\s*\)/);
  if (parenMatch) {
    const lng = parseFloat(parenMatch[1]);
    const lat = parseFloat(parenMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Vérifie si les coordonnées sont valides
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/**
 * Parse les coordonnées lat/lng directes
 */
export function parseDirectCoordinates(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined
): DriverPosition | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  const parsedLat = typeof lat === 'string' ? parseFloat(lat) : lat;
  const parsedLng = typeof lng === 'string' ? parseFloat(lng) : lng;

  if (isValidCoordinate(parsedLat, parsedLng)) {
    return { lat: parsedLat, lng: parsedLng };
  }

  return null;
}

/**
 * Calcule la distance entre deux positions
 * @returns Distance en km ou undefined si non calculable
 */
export function getDriverDistance(
  userPosition: DriverPosition,
  driverPosition: DriverPosition | null
): number | undefined {
  if (!driverPosition) return undefined;

  const distance = calculateDistance(
    userPosition.lat,
    userPosition.lng,
    driverPosition.lat,
    driverPosition.lng
  );

  return Number.isFinite(distance) ? distance : undefined;
}

/**
 * Formate la distance pour l'affichage
 */
export function formatDriverDistance(distance: number | undefined): string {
  if (distance === undefined) return '';
  if (distance < 1) return `${Math.round(distance * 1000)}m`;
  return `${distance.toFixed(1)}km`;
}

/**
 * Transforme les données brutes de delivery driver en NearbyDriver
 */
export function processDeliveryDriver(
  raw: any,
  userPosition: DriverPosition,
  profileMap: Map<string, DriverProfile>
): DeliveryDriver {
  const position = parsePostGISPoint(raw.current_location);
  const distance = getDriverDistance(userPosition, position);

  return {
    id: raw.id,
    user_id: raw.user_id,
    vehicle_type: raw.vehicle_type || 'moto',
    status: raw.status || 'inactive',
    is_online: raw.is_online ?? false,
    rating: raw.rating ?? null,
    total_deliveries: raw.total_deliveries ?? 0,
    current_lat: position?.lat,
    current_lng: position?.lng,
    distance,
    profile: profileMap.get(raw.user_id) ?? null,
    source: 'drivers',
  };
}

/**
 * Transforme les données brutes de taxi driver en NearbyDriver
 */
export function processTaxiDriver(
  raw: any,
  userPosition: DriverPosition,
  profileMap: Map<string, DriverProfile>
): TaxiDriver {
  const position = parseDirectCoordinates(raw.last_lat, raw.last_lng);
  const distance = getDriverDistance(userPosition, position);

  return {
    id: raw.id,
    user_id: raw.user_id,
    vehicle_type: raw.vehicle_type || 'moto',
    vehicle_plate: raw.vehicle_plate || '',
    status: raw.status || 'inactive',
    is_online: raw.is_online ?? false,
    rating: raw.rating ?? null,
    total_rides: raw.total_rides ?? 0,
    last_lat: position?.lat ?? null,
    last_lng: position?.lng ?? null,
    distance,
    profile: profileMap.get(raw.user_id) ?? null,
    source: 'taxi_drivers',
  };
}

/**
 * Filtre les drivers par rayon
 */
export function filterDriversByRadius<T extends { distance?: number }>(
  drivers: T[],
  radiusKm: number
): T[] {
  return drivers.filter(d => d.distance !== undefined && d.distance <= radiusKm);
}

/**
 * Trie les drivers par disponibilité puis par distance
 */
export function sortDrivers<T extends { is_online: boolean; status: string; distance?: number }>(
  drivers: T[]
): T[] {
  return [...drivers].sort((a, b) => {
    // Online first
    if (a.is_online && !b.is_online) return -1;
    if (!a.is_online && b.is_online) return 1;

    // Available first (pour taxi)
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (b.status === 'available' && a.status !== 'available') return 1;

    // Then by distance
    if (a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    if (a.distance !== undefined) return -1;
    if (b.distance !== undefined) return 1;

    return 0;
  });
}

/**
 * Crée une map de profils à partir des données
 */
export function createProfileMap(profiles: any[] | null): Map<string, DriverProfile> {
  const map = new Map<string, DriverProfile>();
  if (!profiles) return map;

  for (const p of profiles) {
    if (p?.id) {
      map.set(p.id, {
        id: p.id,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        phone: p.phone ?? null,
        avatar_url: p.avatar_url ?? null,
      });
    }
  }

  return map;
}
