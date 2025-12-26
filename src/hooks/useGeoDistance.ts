import { useState, useEffect, useCallback } from 'react';

const DEFAULT_POSITION = { latitude: 9.6412, longitude: -13.5784 }; // Conakry par défaut

interface GeoPosition {
  latitude: number;
  longitude: number;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function formatDistance(distance: number | null | undefined): string {
  if (distance === null || distance === undefined) return "Pas de GPS";
  // Distance très proche (moins de 50 mètres) - afficher "Ici" ou "< 50 m"
  if (distance < 0.05) return "Ici";
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  return `${distance.toFixed(1)} km`;
}

export function useGeoDistance() {
  const [userPosition, setUserPosition] = useState<GeoPosition>(DEFAULT_POSITION);
  const [positionReady, setPositionReady] = useState(false);
  const [usingRealLocation, setUsingRealLocation] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setPositionReady(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setUsingRealLocation(true);
        setPositionReady(true);
      },
      () => {
        // Position par défaut si géolocalisation refusée
        setPositionReady(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const getDistanceTo = useCallback((latitude: number | null | undefined, longitude: number | null | undefined): number | null => {
    if (!latitude || !longitude) return null;
    return calculateDistance(userPosition.latitude, userPosition.longitude, Number(latitude), Number(longitude));
  }, [userPosition]);

  return {
    userPosition,
    positionReady,
    usingRealLocation,
    getDistanceTo,
    calculateDistance,
    formatDistance,
    DEFAULT_POSITION
  };
}
