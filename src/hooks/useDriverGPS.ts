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
  const MAX_INVALID_GPS_ATTEMPTS = 10; // Plus tolérant - évite les déconnexions intempestives

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

      // Log mais ne pas afficher de toast sauf si vraiment critique
      console.warn(`[DriverGPS] Précision GPS: ${location.accuracy.toFixed(0)}m (tentative ${invalidGPSCountRef.current}/${MAX_INVALID_GPS_ATTEMPTS})`);

      // On met quand même à jour la position même si imprécise
      onLocationUpdate?.(location);

      // Notification seulement toutes les 5 tentatives
      if (invalidGPSCountRef.current % 5 === 0 && invalidGPSCountRef.current < MAX_INVALID_GPS_ATTEMPTS) {
        toast.info(
          `GPS en mode dégradé (${location.accuracy.toFixed(0)}m)`,
          { description: 'La navigation continue normalement' }
        );
      }

      // Ne pas déconnecter automatiquement - laisser le conducteur continuer
      // Seulement prévenir si vraiment critique
      if (invalidGPSCountRef.current >= MAX_INVALID_GPS_ATTEMPTS) {
        console.warn('[DriverGPS] GPS très imprécis mais on continue...');
      }
    }
  }, [isGPSValid, onLocationUpdate, updateServerPosition]);

  /**
   * Gère une erreur GPS - Plus tolérant
   */
  const handleGPSError = useCallback(async (error: Error) => {
    console.error('[DriverGPS] Erreur GPS:', error.message);

    setState(prev => ({
      ...prev,
      error: error.message,
      isGPSValid: false,
    }));

    // NE PAS basculer hors ligne automatiquement
    // Afficher un toast mais laisser le conducteur continuer
    toast.warning('Signal GPS faible', {
      description: 'La course continue. Essayez de vous déplacer vers un espace dégagé.',
      duration: 5000,
    });

    // Log pour debug mais ne pas déconnecter
    console.warn('[DriverGPS] Erreur GPS ignorée pour éviter déconnexion:', error.message);
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

      // Obtenir une position initiale - plus tolérant
      toast.info('Acquisition GPS en cours...');

      let location: PreciseLocation;
      try {
        location = await precisionGeoService.getCurrentPosition(true);
      } catch (_gpsError: any) {
        // Essayer en mode moins précis
        console.warn('[DriverGPS] Haute précision échouée, essai mode rapide...');
        try {
          location = await precisionGeoService.getCurrentPosition(false);
        } catch (_fallbackError: any) {
          toast.error('GPS indisponible', {
            description: 'Veuillez autoriser l\'accès GPS dans les paramètres du navigateur'
          });
          return false;
        }
      }

      // Accepter même une précision moins bonne pour démarrer
      if (location.accuracy > GPS_CONFIG.MIN_ACCURACY_METERS) {
        toast.warning(
          `GPS en mode dégradé (${location.accuracy.toFixed(0)}m)`,
          { description: 'Vous pouvez continuer, le GPS s\'améliorera.' }
        );
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
