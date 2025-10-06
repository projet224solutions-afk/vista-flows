/**
 * 📍 HOOK DE GÉOLOCALISATION - 224SOLUTIONS
 * Hook React pour gérer la géolocalisation et le partage de position
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import GeolocationService, { Position, LocationData, Geofence } from '../services/geolocation/GeolocationService';

export interface UseGeolocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    watchPosition?: boolean;
    interval?: number;
}

export interface UseGeolocationReturn {
    position: Position | null;
    error: string | null;
    loading: boolean;
    isTracking: boolean;
    locationHistory: Position[];
    startTracking: () => void;
    stopTracking: () => void;
    getCurrentPosition: () => Promise<Position>;
    shareLocation: (toUserId: string, duration?: number) => Promise<string>;
    stopSharing: (sharingId: string) => Promise<void>;
    findNearbyUsers: (center: Position, radius?: number, userType?: 'delivery' | 'client') => Promise<LocationData[]>;
    calculateDistance: (pos1: Position, pos2: Position) => number;
    addGeofence: (geofence: Geofence) => void;
    removeGeofence: (geofenceId: string) => void;
    getAddressFromCoordinates: (position: Position) => Promise<string>;
    getCoordinatesFromAddress: (address: string) => Promise<Position | null>;
}

export const useGeolocation = (options: UseGeolocationOptions = {}): UseGeolocationReturn => {
    const {
        enableHighAccuracy = true,
        timeout = 10000,
        maximumAge = 30000,
        watchPosition = false,
        interval = 5000
    } = options;

    const [position, setPosition] = useState<Position | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [locationHistory, setLocationHistory] = useState<Position[]>([]);

    const geolocationService = useRef(GeolocationService.getInstance());
    const positionListenerId = useRef<string>('');

    // Initialiser le service
    useEffect(() => {
        const service = geolocationService.current;

        // Ajouter un listener pour les mises à jour de position
        positionListenerId.current = `listener_${Date.now()}`;
        service.addPositionListener(positionListenerId.current, (newPosition) => {
            setPosition(newPosition);
            setLocationHistory(service.getLocationHistory());
        });

        // Démarrer le suivi automatique si demandé
        if (watchPosition) {
            startTracking();
        }

        // Nettoyer à la destruction
        return () => {
            if (positionListenerId.current) {
                service.removePositionListener(positionListenerId.current);
            }
            if (isTracking) {
                service.stopTracking();
            }
        };
    }, [watchPosition]);

    // Démarrer le suivi de position
    const startTracking = useCallback(() => {
        try {
            setLoading(true);
            setError(null);

            const service = geolocationService.current;
            service.startTracking(interval);
            setIsTracking(true);

            console.log('📍 Suivi de position démarré');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
            console.error('Erreur démarrage suivi:', err);
        } finally {
            setLoading(false);
        }
    }, [interval]);

    // Arrêter le suivi de position
    const stopTracking = useCallback(() => {
        try {
            const service = geolocationService.current;
            service.stopTracking();
            setIsTracking(false);

            console.log('📍 Suivi de position arrêté');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
            console.error('Erreur arrêt suivi:', err);
        }
    }, []);

    // Obtenir la position actuelle
    const getCurrentPosition = useCallback(async (): Promise<Position> => {
        setLoading(true);
        setError(null);

        try {
            const service = geolocationService.current;
            const pos = await service.getCurrentPosition();
            setPosition(pos);
            setLocationHistory(service.getLocationHistory());
            return pos;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur géolocalisation';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Partager sa position
    const shareLocation = useCallback(async (toUserId: string, duration: number = 3600000): Promise<string> => {
        try {
            const service = geolocationService.current;
            const sharingId = await service.shareLocation(toUserId, duration);
            console.log(`📍 Position partagée avec ${toUserId}: ${sharingId}`);
            return sharingId;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur partage position';
            setError(errorMessage);
            throw err;
        }
    }, []);

    // Arrêter le partage de position
    const stopSharing = useCallback(async (sharingId: string): Promise<void> => {
        try {
            const service = geolocationService.current;
            await service.stopSharing(sharingId);
            console.log(`📍 Partage arrêté: ${sharingId}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur arrêt partage';
            setError(errorMessage);
            throw err;
        }
    }, []);

    // Trouver les utilisateurs proches
    const findNearbyUsers = useCallback(async (
        center: Position,
        radius: number = 5000,
        userType?: 'delivery' | 'client'
    ): Promise<LocationData[]> => {
        try {
            const service = geolocationService.current;
            const users = await service.findNearbyUsers(center, radius, userType);
            console.log(`📍 ${users.length} utilisateurs trouvés dans un rayon de ${radius}m`);
            return users;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur recherche utilisateurs';
            setError(errorMessage);
            console.error('Erreur recherche utilisateurs:', err);
            return [];
        }
    }, []);

    // Calculer la distance entre deux positions
    const calculateDistance = useCallback((pos1: Position, pos2: Position): number => {
        const service = geolocationService.current;
        return service.calculateDistance(pos1, pos2);
    }, []);

    // Ajouter un géofence
    const addGeofence = useCallback((geofence: Geofence) => {
        const service = geolocationService.current;
        service.addGeofence(geofence);
        console.log(`📍 Géofence ajoutée: ${geofence.name}`);
    }, []);

    // Supprimer un géofence
    const removeGeofence = useCallback((geofenceId: string) => {
        const service = geolocationService.current;
        service.removeGeofence(geofenceId);
        console.log(`📍 Géofence supprimée: ${geofenceId}`);
    }, []);

    // Obtenir l'adresse à partir des coordonnées
    const getAddressFromCoordinates = useCallback(async (position: Position): Promise<string> => {
        try {
            const service = geolocationService.current;
            return await service.getAddressFromCoordinates(position);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur géocodage inverse';
            setError(errorMessage);
            throw err;
        }
    }, []);

    // Obtenir les coordonnées à partir d'une adresse
    const getCoordinatesFromAddress = useCallback(async (address: string): Promise<Position | null> => {
        try {
            const service = geolocationService.current;
            return await service.getCoordinatesFromAddress(address);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur géocodage';
            setError(errorMessage);
            throw err;
        }
    }, []);

    // Gérer les erreurs de géolocalisation
    useEffect(() => {
        const handleGeolocationError = (event: CustomEvent) => {
            const { error, message } = event.detail;
            setError(message);
            console.error('Erreur géolocalisation:', error);
        };

        window.addEventListener('geolocationError', handleGeolocationError as EventListener);

        return () => {
            window.removeEventListener('geolocationError', handleGeolocationError as EventListener);
        };
    }, []);

    return {
        position,
        error,
        loading,
        isTracking,
        locationHistory,
        startTracking,
        stopTracking,
        getCurrentPosition,
        shareLocation,
        stopSharing,
        findNearbyUsers,
        calculateDistance,
        addGeofence,
        removeGeofence,
        getAddressFromCoordinates,
        getCoordinatesFromAddress
    };
};

export default useGeolocation;