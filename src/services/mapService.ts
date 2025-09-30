/**
 * SERVICE DE GESTION DES APIS CARTOGRAPHIQUES
 * Système ultra professionnel avec basculement automatique Mapbox ↔ Google Maps
 * 224Solutions - Taxi-Moto System
 */

import { supabase } from '@/integrations/supabase/client';

// Types pour la gestion des APIs
export interface MapProvider {
    id: string;
    name: string;
    provider: 'mapbox' | 'google_maps';
    apiKey: string;
    isActive: boolean;
    dailyLimit: number;
    currentUsage: number;
    priority: number;
    status: 'active' | 'expired' | 'limit_reached' | 'error';
    errorCount: number;
    lastErrorAt?: string;
}

export interface RouteResponse {
    distance: number; // en km
    duration: number; // en minutes
    polyline: string;
    steps: RouteStep[];
    provider: 'mapbox' | 'google_maps';
}

export interface RouteStep {
    instruction: string;
    distance: number;
    duration: number;
    coordinates: [number, number];
}

export interface LocationCoordinates {
    latitude: number;
    longitude: number;
}

export interface GeocodeResult {
    address: string;
    coordinates: LocationCoordinates;
    placeId?: string;
}

class MapService {
    private currentProvider: MapProvider | null = null;
    private providers: MapProvider[] = [];
    private failoverInProgress = false;

    constructor() {
        this.initializeProviders();
    }

    /**
     * Initialise les fournisseurs d'API depuis la base de données
     */
    private async initializeProviders(): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('map_api_config')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: true });

            if (error) {
                console.error('Erreur lors du chargement des APIs:', error);
                return;
            }

            this.providers = data.map(config => ({
                id: config.id,
                name: config.provider === 'mapbox' ? 'Mapbox' : 'Google Maps',
                provider: config.provider,
                apiKey: config.api_key,
                isActive: config.is_active,
                dailyLimit: config.daily_limit,
                currentUsage: config.current_usage,
                priority: config.priority,
                status: config.status,
                errorCount: config.error_count,
                lastErrorAt: config.last_error_at
            }));

            // Sélectionner le fournisseur principal
            this.currentProvider = this.providers.find(p => p.priority === 1 && p.status === 'active') || null;

            if (!this.currentProvider && this.providers.length > 0) {
                // Basculer vers le backup si le principal n'est pas disponible
                await this.performFailover('primary_unavailable');
            }

        } catch (error) {
            console.error('Erreur d\'initialisation des APIs:', error);
            await this.logAlert('api_error', 'Échec d\'initialisation des APIs cartographiques', 'critical');
        }
    }

    /**
     * Obtient un itinéraire entre deux points
     */
    async getRoute(
        origin: LocationCoordinates,
        destination: LocationCoordinates,
        options: { vehicleType?: string; avoidTolls?: boolean } = {}
    ): Promise<RouteResponse> {
        if (!this.currentProvider) {
            await this.initializeProviders();
            if (!this.currentProvider) {
                throw new Error('Aucun fournisseur d\'API disponible');
            }
        }

        try {
            let response: RouteResponse;

            if (this.currentProvider.provider === 'mapbox') {
                response = await this.getMapboxRoute(origin, destination, options);
            } else {
                response = await this.getGoogleMapsRoute(origin, destination, options);
            }

            // Incrémenter l'usage
            await this.incrementUsage(this.currentProvider.id);

            return response;

        } catch (error) {
            console.error(`Erreur avec ${this.currentProvider.name}:`, error);

            // Tenter le basculement automatique
            if (!this.failoverInProgress) {
                await this.performFailover('api_error');
                // Réessayer avec le nouveau fournisseur
                return this.getRoute(origin, destination, options);
            }

            throw error;
        }
    }

    /**
     * Obtient un itinéraire via Mapbox
     */
    private async getMapboxRoute(
        origin: LocationCoordinates,
        destination: LocationCoordinates,
        options: any
    ): Promise<RouteResponse> {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

        const params = new URLSearchParams({
            access_token: this.currentProvider!.apiKey,
            geometries: 'geojson',
            steps: 'true',
            overview: 'full'
        });

        const response = await fetch(`${url}?${params}`);

        if (!response.ok) {
            if (response.status === 401) {
                await this.handleApiError('token_expired', 'Token Mapbox expiré');
            } else if (response.status === 429) {
                await this.handleApiError('limit_reached', 'Limite Mapbox atteinte');
            }
            throw new Error(`Erreur Mapbox: ${response.status}`);
        }

        const data = await response.json();
        const route = data.routes[0];

        return {
            distance: Math.round(route.distance / 1000 * 100) / 100, // Convertir en km
            duration: Math.round(route.duration / 60), // Convertir en minutes
            polyline: this.encodePolyline(route.geometry.coordinates),
            steps: route.legs[0].steps.map((step: any) => ({
                instruction: step.maneuver.instruction,
                distance: Math.round(step.distance),
                duration: Math.round(step.duration / 60),
                coordinates: step.maneuver.location as [number, number]
            })),
            provider: 'mapbox'
        };
    }

    /**
     * Obtient un itinéraire via Google Maps
     */
    private async getGoogleMapsRoute(
        origin: LocationCoordinates,
        destination: LocationCoordinates,
        options: any
    ): Promise<RouteResponse> {
        const url = 'https://maps.googleapis.com/maps/api/directions/json';

        const params = new URLSearchParams({
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            key: this.currentProvider!.apiKey,
            mode: 'driving',
            alternatives: 'false'
        });

        const response = await fetch(`${url}?${params}`);

        if (!response.ok) {
            if (response.status === 403) {
                await this.handleApiError('token_expired', 'Clé Google Maps invalide');
            } else if (response.status === 429) {
                await this.handleApiError('limit_reached', 'Limite Google Maps atteinte');
            }
            throw new Error(`Erreur Google Maps: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(`Erreur Google Maps: ${data.status}`);
        }

        const route = data.routes[0];
        const leg = route.legs[0];

        return {
            distance: Math.round(leg.distance.value / 1000 * 100) / 100,
            duration: Math.round(leg.duration.value / 60),
            polyline: route.overview_polyline.points,
            steps: leg.steps.map((step: any) => ({
                instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Supprimer HTML
                distance: step.distance.value,
                duration: Math.round(step.duration.value / 60),
                coordinates: [step.start_location.lng, step.start_location.lat] as [number, number]
            })),
            provider: 'google_maps'
        };
    }

    /**
     * Géocode une adresse en coordonnées
     */
    async geocodeAddress(address: string): Promise<GeocodeResult[]> {
        if (!this.currentProvider) {
            await this.initializeProviders();
        }

        try {
            if (this.currentProvider?.provider === 'mapbox') {
                return await this.mapboxGeocode(address);
            } else {
                return await this.googleMapsGeocode(address);
            }
        } catch (error) {
            if (!this.failoverInProgress) {
                await this.performFailover('api_error');
                return this.geocodeAddress(address);
            }
            throw error;
        }
    }

    /**
     * Géocode via Mapbox
     */
    private async mapboxGeocode(address: string): Promise<GeocodeResult[]> {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
        const params = new URLSearchParams({
            access_token: this.currentProvider!.apiKey,
            country: 'SN', // Sénégal
            limit: '5'
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error(`Erreur géocodage Mapbox: ${response.status}`);

        const data = await response.json();

        return data.features.map((feature: any) => ({
            address: feature.place_name,
            coordinates: {
                longitude: feature.center[0],
                latitude: feature.center[1]
            },
            placeId: feature.id
        }));
    }

    /**
     * Géocode via Google Maps
     */
    private async googleMapsGeocode(address: string): Promise<GeocodeResult[]> {
        const url = 'https://maps.googleapis.com/maps/api/geocode/json';
        const params = new URLSearchParams({
            address: address,
            key: this.currentProvider!.apiKey,
            region: 'SN' // Sénégal
        });

        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error(`Erreur géocodage Google: ${response.status}`);

        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(`Erreur géocodage: ${data.status}`);
        }

        return data.results.map((result: any) => ({
            address: result.formatted_address,
            coordinates: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng
            },
            placeId: result.place_id
        }));
    }

    /**
     * Effectue le basculement automatique vers un autre fournisseur
     */
    private async performFailover(reason: string): Promise<void> {
        if (this.failoverInProgress) return;

        this.failoverInProgress = true;

        try {
            // Marquer le fournisseur actuel comme défaillant
            if (this.currentProvider) {
                await this.updateProviderStatus(this.currentProvider.id, 'error');
            }

            // Trouver le prochain fournisseur disponible
            const nextProvider = this.providers.find(p =>
                p.id !== this.currentProvider?.id &&
                p.status === 'active' &&
                p.currentUsage < p.dailyLimit
            );

            if (nextProvider) {
                this.currentProvider = nextProvider;
                await this.logAlert(
                    'failover_activated',
                    `Basculement automatique vers ${nextProvider.name} (raison: ${reason})`,
                    'high'
                );

                console.log(`🔄 Basculement automatique vers ${nextProvider.name}`);
            } else {
                await this.logAlert(
                    'api_error',
                    'Aucun fournisseur d\'API disponible pour le basculement',
                    'critical'
                );
                throw new Error('Aucun fournisseur d\'API disponible');
            }
        } finally {
            this.failoverInProgress = false;
        }
    }

    /**
     * Gère les erreurs d'API
     */
    private async handleApiError(type: string, message: string): Promise<void> {
        if (this.currentProvider) {
            await this.updateProviderStatus(this.currentProvider.id, type as any);
            await this.logAlert(type as any, message, 'high');
        }
    }

    /**
     * Met à jour le statut d'un fournisseur
     */
    private async updateProviderStatus(providerId: string, status: string): Promise<void> {
        try {
            await supabase
                .from('map_api_config')
                .update({
                    status,
                    error_count: status === 'error' ? supabase.rpc('increment_error_count', { provider_id: providerId }) : 0,
                    last_error_at: status === 'error' ? new Date().toISOString() : null
                })
                .eq('id', providerId);
        } catch (error) {
            console.error('Erreur mise à jour statut fournisseur:', error);
        }
    }

    /**
     * Incrémente l'usage d'un fournisseur
     */
    private async incrementUsage(providerId: string): Promise<void> {
        try {
            await supabase.rpc('increment_api_usage', { provider_id: providerId });

            // Vérifier si la limite est atteinte
            const { data } = await supabase
                .from('map_api_config')
                .select('current_usage, daily_limit')
                .eq('id', providerId)
                .single();

            if (data && data.current_usage >= data.daily_limit * 0.9) {
                await this.logAlert(
                    'usage_warning',
                    `Limite d'usage à 90% pour ${this.currentProvider?.name}`,
                    'medium'
                );
            }
        } catch (error) {
            console.error('Erreur incrémentation usage:', error);
        }
    }

    /**
     * Enregistre une alerte dans le système
     */
    private async logAlert(
        type: 'usage_warning' | 'limit_reached' | 'api_error' | 'token_expired' | 'failover_activated',
        message: string,
        severity: 'low' | 'medium' | 'high' | 'critical'
    ): Promise<void> {
        try {
            await supabase
                .from('api_alerts')
                .insert({
                    provider: this.currentProvider?.provider || 'unknown',
                    alert_type: type,
                    message,
                    severity,
                    metadata: {
                        provider_id: this.currentProvider?.id,
                        timestamp: new Date().toISOString()
                    }
                });
        } catch (error) {
            console.error('Erreur enregistrement alerte:', error);
        }
    }

    /**
     * Encode une polyline (format Google Maps)
     */
    private encodePolyline(coordinates: number[][]): string {
        // Implémentation simplifiée de l'encodage polyline
        // En production, utiliser une bibliothèque dédiée comme @mapbox/polyline
        return coordinates.map(coord => `${coord[1]},${coord[0]}`).join('|');
    }

    /**
     * Obtient le fournisseur actuel
     */
    getCurrentProvider(): MapProvider | null {
        return this.currentProvider;
    }

    /**
     * Obtient tous les fournisseurs
     */
    getAllProviders(): MapProvider[] {
        return this.providers;
    }

    /**
     * Force le rechargement des fournisseurs
     */
    async reloadProviders(): Promise<void> {
        await this.initializeProviders();
    }
}

// Instance singleton
export const mapService = new MapService();

// Fonctions utilitaires exportées
export const calculateDistance = (
    point1: LocationCoordinates,
    point2: LocationCoordinates
): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // Arrondi à 2 décimales
};

export const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
};

export const formatDistance = (km: number): string => {
    if (km < 1) {
        return `${Math.round(km * 1000)}m`;
    }
    return `${km}km`;
};
