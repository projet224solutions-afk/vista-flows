/**
 * HOOK DE GÉOLOCALISATION ULTRA PROFESSIONNEL
 * Gestion avancée de la position GPS avec fallbacks et optimisations
 * 224Solutions - Taxi-Moto System
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    heading?: number;
    speed?: number;
}

export interface LocationError {
    code: number;
    message: string;
    type: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
}

export interface GeolocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    watchPosition?: boolean;
    fallbackToIP?: boolean;
}

export interface GeolocationState {
    location: LocationCoordinates | null;
    error: LocationError | null;
    loading: boolean;
    isWatching: boolean;
    lastUpdate: Date | null;
    accuracy: 'high' | 'medium' | 'low' | null;
}

const DEFAULT_OPTIONS: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
    watchPosition: false,
    fallbackToIP: true
};

export const useGeolocation = (options: GeolocationOptions = {}) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const watchIdRef = useRef<number | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [state, setState] = useState<GeolocationState>({
        location: null,
        error: null,
        loading: false,
        isWatching: false,
        lastUpdate: null,
        accuracy: null
    });

    /**
     * Détermine la précision basée sur l'accuracy GPS
     */
    const getAccuracyLevel = (accuracy: number): 'high' | 'medium' | 'low' => {
        if (accuracy <= 10) return 'high';
        if (accuracy <= 50) return 'medium';
        return 'low';
    };

    /**
     * Gère les erreurs de géolocalisation
     */
    const handleError = useCallback((error: GeolocationPositionError) => {
        let errorType: LocationError['type'] = 'UNKNOWN';
        let message = 'Erreur de géolocalisation inconnue';

        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorType = 'PERMISSION_DENIED';
                message = 'Permission de géolocalisation refusée. Veuillez autoriser l\'accès à votre position.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorType = 'POSITION_UNAVAILABLE';
                message = 'Position indisponible. Vérifiez votre connexion et votre GPS.';
                break;
            case error.TIMEOUT:
                errorType = 'TIMEOUT';
                message = 'Délai d\'attente dépassé pour obtenir votre position.';
                break;
        }

        setState(prev => ({
            ...prev,
            error: {
                code: error.code,
                message,
                type: errorType
            },
            loading: false
        }));

        // Fallback vers géolocalisation IP si activé
        if (opts.fallbackToIP && errorType !== 'PERMISSION_DENIED') {
            fallbackToIPLocation();
        }
    }, [opts.fallbackToIP]);

    /**
     * Gère le succès de géolocalisation
     */
    const handleSuccess = useCallback((position: GeolocationPosition) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;

        const location: LocationCoordinates = {
            latitude,
            longitude,
            accuracy,
            altitude: altitude || undefined,
            heading: heading || undefined,
            speed: speed || undefined
        };

        setState(prev => ({
            ...prev,
            location,
            error: null,
            loading: false,
            lastUpdate: new Date(),
            accuracy: accuracy ? getAccuracyLevel(accuracy) : null
        }));

        // Log pour debugging (à supprimer en production)
        console.log('📍 Position obtenue:', {
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
            accuracy: accuracy ? `${Math.round(accuracy)}m` : 'N/A'
        });
    }, []);

    /**
     * Fallback vers géolocalisation IP
     */
    const fallbackToIPLocation = useCallback(async () => {
        try {
            console.log('🌐 Tentative de géolocalisation IP...');

            // Utiliser un service de géolocalisation IP (exemple avec ipapi.co)
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();

            if (data.latitude && data.longitude) {
                const location: LocationCoordinates = {
                    latitude: parseFloat(data.latitude),
                    longitude: parseFloat(data.longitude),
                    accuracy: 10000 // Précision approximative pour IP
                };

                setState(prev => ({
                    ...prev,
                    location,
                    error: null,
                    loading: false,
                    lastUpdate: new Date(),
                    accuracy: 'low'
                }));

                console.log('🌐 Position IP obtenue:', data.city, data.country);
            }
        } catch (error) {
            console.error('Erreur géolocalisation IP:', error);
            setState(prev => ({
                ...prev,
                loading: false
            }));
        }
    }, []);

    /**
     * Obtient la position actuelle
     */
    const getCurrentPosition = useCallback(() => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: {
                    code: -1,
                    message: 'Géolocalisation non supportée par ce navigateur',
                    type: 'POSITION_UNAVAILABLE'
                },
                loading: false
            }));
            return;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        // Timeout personnalisé pour une meilleure UX
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setState(prev => ({
                ...prev,
                error: {
                    code: 3,
                    message: 'Délai d\'attente dépassé. Vérifiez votre GPS.',
                    type: 'TIMEOUT'
                },
                loading: false
            }));

            if (opts.fallbackToIP) {
                fallbackToIPLocation();
            }
        }, opts.timeout);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                handleSuccess(position);
            },
            (error) => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                handleError(error);
            },
            {
                enableHighAccuracy: opts.enableHighAccuracy,
                timeout: opts.timeout,
                maximumAge: opts.maximumAge
            }
        );
    }, [opts, handleSuccess, handleError, fallbackToIPLocation]);

    /**
     * Démarre la surveillance de position
     */
    const startWatching = useCallback(() => {
        if (!navigator.geolocation || watchIdRef.current !== null) {
            return;
        }

        setState(prev => ({ ...prev, isWatching: true, loading: true }));

        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy: opts.enableHighAccuracy,
                timeout: opts.timeout,
                maximumAge: opts.maximumAge
            }
        );
    }, [opts, handleSuccess, handleError]);

    /**
     * Arrête la surveillance de position
     */
    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setState(prev => ({ ...prev, isWatching: false, loading: false }));
        }
    }, []);

    /**
     * Remet à zéro l'état
     */
    const reset = useCallback(() => {
        stopWatching();
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setState({
            location: null,
            error: null,
            loading: false,
            isWatching: false,
            lastUpdate: null,
            accuracy: null
        });
    }, [stopWatching]);

    /**
     * Vérifie si la position est récente
     */
    const isLocationFresh = useCallback((maxAgeMinutes: number = 5): boolean => {
        if (!state.lastUpdate) return false;
        const ageMinutes = (Date.now() - state.lastUpdate.getTime()) / (1000 * 60);
        return ageMinutes <= maxAgeMinutes;
    }, [state.lastUpdate]);

    /**
     * Obtient une position fraîche (force refresh si nécessaire)
     */
    const getFreshPosition = useCallback(async (maxAgeMinutes: number = 5): Promise<LocationCoordinates | null> => {
        return new Promise((resolve) => {
            if (state.location && isLocationFresh(maxAgeMinutes)) {
                resolve(state.location);
                return;
            }

            // Écouter le prochain changement d'état
            const unsubscribe = () => { };

            getCurrentPosition();

            // Simuler l'attente de la nouvelle position
            const checkInterval = setInterval(() => {
                if (state.location && !state.loading) {
                    clearInterval(checkInterval);
                    resolve(state.location);
                } else if (state.error && !state.loading) {
                    clearInterval(checkInterval);
                    resolve(null);
                }
            }, 100);

            // Timeout de sécurité
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve(state.location);
            }, opts.timeout || 10000);
        });
    }, [state.location, state.loading, state.error, isLocationFresh, getCurrentPosition, opts.timeout]);

    // Effet pour démarrer la surveillance automatique si demandée
    useEffect(() => {
        if (opts.watchPosition) {
            startWatching();
        }

        return () => {
            stopWatching();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [opts.watchPosition, startWatching, stopWatching]);

    // Nettoyage à la destruction du composant
    useEffect(() => {
        return () => {
            stopWatching();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [stopWatching]);

    return {
        ...state,
        getCurrentPosition,
        startWatching,
        stopWatching,
        reset,
        isLocationFresh,
        getFreshPosition,
        // Utilitaires
        hasPermission: state.error?.type !== 'PERMISSION_DENIED',
        isSupported: !!navigator.geolocation,
        // Méthodes de commodité
        refresh: getCurrentPosition,
        watch: startWatching,
        unwatch: stopWatching
    };
};

/**
 * Hook simplifié pour obtenir juste la position actuelle
 */
export const useCurrentLocation = (options?: GeolocationOptions) => {
    const geolocation = useGeolocation({ ...options, watchPosition: false });

    useEffect(() => {
        geolocation.getCurrentPosition();
    }, []);

    return {
        location: geolocation.location,
        error: geolocation.error,
        loading: geolocation.loading,
        refresh: geolocation.getCurrentPosition,
        accuracy: geolocation.accuracy
    };
};

/**
 * Hook pour surveiller la position en continu
 */
export const useLocationWatcher = (options?: GeolocationOptions) => {
    return useGeolocation({ ...options, watchPosition: true });
};

// Utilitaires exportés
export const requestLocationPermission = async (): Promise<boolean> => {
    if (!navigator.geolocation) return false;

    try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state === 'granted';
    } catch {
        // Fallback: tenter d'obtenir la position
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => resolve(true),
                () => resolve(false),
                { timeout: 1000 }
            );
        });
    }
};

export const formatCoordinates = (location: LocationCoordinates): string => {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
};

export const getLocationAccuracyText = (accuracy: number | undefined): string => {
    if (!accuracy) return 'Précision inconnue';
    if (accuracy <= 10) return 'Très précis';
    if (accuracy <= 50) return 'Précis';
    if (accuracy <= 100) return 'Moyennement précis';
    return 'Peu précis';
};
