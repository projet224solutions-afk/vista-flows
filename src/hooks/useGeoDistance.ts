import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_POSITION = { latitude: 9.6412, longitude: -13.5784 }; // Conakry par défaut

interface GeoPosition {
  latitude: number;
  longitude: number;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
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

export function formatDistance(distance: number | null | undefined): string {
  if (distance === null || distance === undefined) return 'Pas de GPS';
  // Distance très proche (moins de 50 mètres)
  if (distance < 0.05) return 'Ici';
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(1)} km`;
}

export function useGeoDistance() {
  const [userPosition, setUserPosition] = useState<GeoPosition>(DEFAULT_POSITION);
  const [positionReady, setPositionReady] = useState(false);
  const [usingRealLocation, setUsingRealLocation] = useState(false);

  const hasRealLocationRef = useRef(false);
  const lastKnownPositionRef = useRef<GeoPosition>(DEFAULT_POSITION);

  const requestPosition = useCallback((opts?: { force?: boolean }) => {
    return new Promise<GeoPosition>((resolve) => {
      if (!navigator.geolocation) {
        setUsingRealLocation(false);
        setPositionReady(true);
        resolve(DEFAULT_POSITION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };

          lastKnownPositionRef.current = next;
          hasRealLocationRef.current = true;

          setUserPosition(next);
          setUsingRealLocation(true);
          setPositionReady(true);

          resolve(next);
        },
        () => {
          // Si on a déjà eu un GPS valide, on garde la dernière position connue.
          // Sinon on retombe sur la position par défaut.
          const fallback = hasRealLocationRef.current ? lastKnownPositionRef.current : DEFAULT_POSITION;
          setUsingRealLocation(false);
          setPositionReady(true);
          resolve(fallback);
        },
        {
          enableHighAccuracy: true,
          timeout: opts?.force ? 20000 : 10000,
          maximumAge: opts?.force ? 0 : 60000,
        }
      );
    });
  }, []);

  useEffect(() => {
    void requestPosition();
  }, [requestPosition]);

  const refreshPosition = useCallback(() => requestPosition({ force: true }), [requestPosition]);

  const getDistanceTo = useCallback(
    (latitude: number | null | undefined, longitude: number | null | undefined): number | null => {
      if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return null;
      return calculateDistance(userPosition.latitude, userPosition.longitude, Number(latitude), Number(longitude));
    },
    [userPosition]
  );

  return {
    userPosition,
    positionReady,
    usingRealLocation,
    refreshPosition,
    getDistanceTo,
    calculateDistance,
    formatDistance,
    DEFAULT_POSITION,
  };
}
