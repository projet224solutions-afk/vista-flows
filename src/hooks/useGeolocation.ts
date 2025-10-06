/**
 * HOOK GÉOLOCALISATION
 * Gestion de la géolocalisation pour les taxis-motos
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect, useCallback } from 'react';

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    address?: string;
}

export interface GeolocationState {
    location: LocationData | null;
    loading: boolean;
    error: string | null;
    permission: PermissionState | null;
}

export function useCurrentLocation() {
    const [state, setState] = useState<GeolocationState>({
        location: null,
        loading: false,
        error: null,
        permission: null
    });

    const getCurrentLocation = useCallback((): Promise<LocationData> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Géolocalisation non supportée'));
                return;
            }

            setState(prev => ({ ...prev, loading: true, error: null }));

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const locationData: LocationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: Date.now()
                    };

                    setState(prev => ({
                        ...prev,
                        location: locationData,
                        loading: false,
                        error: null
                    }));

                    resolve(locationData);
                },
                (error) => {
                    const errorMessage = getGeolocationErrorMessage(error.code);
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: errorMessage
                    }));
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }, []);

    const watchLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, error: 'Géolocalisation non supportée' }));
            return null;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const locationData: LocationData = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: Date.now()
                };

                setState(prev => ({
                    ...prev,
                    location: locationData,
                    loading: false,
                    error: null
                }));
            },
            (error) => {
                const errorMessage = getGeolocationErrorMessage(error.code);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage
                }));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );

        return watchId;
    }, []);

    const stopWatching = useCallback((watchId: number) => {
        navigator.geolocation.clearWatch(watchId);
    }, []);

    const checkPermission = useCallback(async () => {
        if ('permissions' in navigator) {
            try {
                const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                setState(prev => ({ ...prev, permission: permission.state }));
                return permission.state;
            } catch (error) {
                console.warn('Erreur vérification permission:', error);
                return 'unknown';
            }
        }
        return 'unknown';
    }, []);

    const requestPermission = useCallback(async () => {
        try {
            await getCurrentLocation();
            return true;
        } catch (error) {
            return false;
        }
    }, [getCurrentLocation]);

    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    const getGeolocationErrorMessage = (code: number): string => {
        switch (code) {
            case 1:
                return 'Permission de géolocalisation refusée';
            case 2:
                return 'Position indisponible';
            case 3:
                return 'Délai d\'attente dépassé';
            default:
                return 'Erreur de géolocalisation inconnue';
        }
    };

    return {
        ...state,
        getCurrentLocation,
        watchLocation,
        stopWatching,
        checkPermission,
        requestPermission
    };
}

export default useCurrentLocation;