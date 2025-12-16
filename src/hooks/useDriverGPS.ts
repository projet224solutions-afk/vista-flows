/**
 * HOOK GPS CONDUCTEUR/LIVREUR
 * Gestion GPS obligatoire avec mise hors ligne automatique
 * 224Solutions - Taxi-Moto & Livraison
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { 
  precisionGeoService, 
  PreciseLocation, 
  GPS_CONFIG 
} from '@/services/gps/PrecisionGeolocationService';

export interface DriverGPSState {
  isOnline: boolean;
  location: PreciseLocation | null;
  accuracy: number | null;
  isGPSValid: boolean;
  lastUpdate: number | null;
  error: string | null;
}

export interface UseDriverGPSOptions {
  onGoOffline?: (reason: string) => void;
  onLocationUpdate?: (location: PreciseLocation) => void;
  updateServerPosition?: (location: PreciseLocation) => Promise<void>;
}

/**
 * Hook GPS obligatoire pour conducteurs/livreurs
 * Bascule automatiquement hors ligne si GPS invalide
 */
export function useDriverGPS(options: UseDriverGPSOptions = {}) {
  const { onGoOffline, onLocationUpdate, updateServerPosition } = options;

  const [state, setState] = useState<DriverGPSState>({
    isOnline: false,
    location: null,
    accuracy: null,
    isGPSValid: false,
    lastUpdate: null,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const invalidGPSCountRef = useRef(0);
  const MAX_INVALID_GPS_ATTEMPTS = 3;

  /**
   * Vérifie si le GPS est valide
   */
  const isGPSValid = useCallback((accuracy: number): boolean => {
    return accuracy <= GPS_CONFIG.MIN_ACCURACY_METERS;
  }, []);

  /**
   * Gère une mise à jour de position
   */
  const handleLocationUpdate = useCallback(async (location: PreciseLocation) => {
    const valid = isGPSValid(location.accuracy);

    setState(prev => ({
      ...prev,
      location,
      accuracy: location.accuracy,
      isGPSValid: valid,
      lastUpdate: Date.now(),
      error: null,
    }));

    if (valid) {
      invalidGPSCountRef.current = 0;
      onLocationUpdate?.(location);

      // Mettre à jour le serveur
      if (updateServerPosition) {
        try {
          await updateServerPosition(location);
        } catch (error) {
          console.error('[DriverGPS] Erreur mise à jour serveur:', error);
        }
      }
    } else {
      invalidGPSCountRef.current++;
      
      if (invalidGPSCountRef.current >= MAX_INVALID_GPS_ATTEMPTS) {
        // Trop de positions invalides, basculer hors ligne
        await goOffline(`GPS imprécis (${location.accuracy.toFixed(0)}m > ${GPS_CONFIG.MIN_ACCURACY_METERS}m)`);
      } else {
        toast.warning(
          `Précision GPS insuffisante: ${location.accuracy.toFixed(0)}m`,
          { description: 'Déplacez-vous vers un espace dégagé' }
        );
      }
    }
  }, [isGPSValid, onLocationUpdate, updateServerPosition]);

  /**
   * Gère une erreur GPS
   */
  const handleGPSError = useCallback(async (error: Error) => {
    console.error('[DriverGPS] Erreur GPS:', error.message);
    
    setState(prev => ({
      ...prev,
      error: error.message,
      isGPSValid: false,
    }));

    // Basculer hors ligne en cas d'erreur GPS
    await goOffline(error.message);
  }, []);

  /**
   * Passe en ligne avec validation GPS
   */
  const goOnline = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Vérifier d'abord la disponibilité GPS
      if (!navigator.geolocation) {
        toast.error('GPS non disponible sur cet appareil');
        return false;
      }

      // Obtenir une position initiale valide
      toast.info('Acquisition GPS en cours...');
      
      const location = await precisionGeoService.getCurrentPosition(true);
      
      if (!isGPSValid(location.accuracy)) {
        toast.error(
          `Précision GPS insuffisante: ${location.accuracy.toFixed(0)}m`,
          { description: `Minimum requis: ${GPS_CONFIG.MIN_ACCURACY_METERS}m. Déplacez-vous vers un espace dégagé.` }
        );
        return false;
      }

      // GPS valide, démarrer le suivi
      invalidGPSCountRef.current = 0;

      watchIdRef.current = precisionGeoService.startWatching(
        handleLocationUpdate,
        handleGPSError
      );

      // Démarrer le heartbeat
      heartbeatRef.current = setInterval(async () => {
        const { location: currentLocation, isGPSValid: valid } = state;
        
        if (currentLocation && valid && updateServerPosition) {
          try {
            await updateServerPosition(currentLocation);
          } catch (error) {
            console.error('[DriverGPS] Erreur heartbeat:', error);
          }
        }
      }, GPS_CONFIG.HEARTBEAT_INTERVAL_MS);

      setState(prev => ({
        ...prev,
        isOnline: true,
        location,
        accuracy: location.accuracy,
        isGPSValid: true,
        lastUpdate: Date.now(),
        error: null,
      }));

      toast.success(`GPS activé (précision: ${location.accuracy.toFixed(0)}m)`);
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Impossible d\'activer le GPS');
      setState(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, [isGPSValid, handleLocationUpdate, handleGPSError, updateServerPosition, state]);

  /**
   * Passe hors ligne
   */
  const goOffline = useCallback(async (reason?: string) => {
    // Arrêter le suivi GPS
    if (watchIdRef.current !== null) {
      precisionGeoService.stopWatching();
      watchIdRef.current = null;
    }

    // Arrêter le heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isOnline: false,
      isGPSValid: false,
    }));

    if (reason) {
      toast.error(`Vous êtes maintenant hors ligne`, {
        description: reason,
      });
      onGoOffline?.(reason);
    }

    console.log('[DriverGPS] Hors ligne:', reason);
  }, [onGoOffline]);

  /**
   * Force une mise à jour de position
   */
  const forceLocationUpdate = useCallback(async () => {
    try {
      const location = await precisionGeoService.getCurrentPosition(true);
      await handleLocationUpdate(location);
      return location;
    } catch (error: any) {
      toast.error(error.message);
      return null;
    }
  }, [handleLocationUpdate]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        precisionGeoService.stopWatching();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  return {
    ...state,
    goOnline,
    goOffline,
    forceLocationUpdate,
    minAccuracy: GPS_CONFIG.MIN_ACCURACY_METERS,
  };
}

export default useDriverGPS;
