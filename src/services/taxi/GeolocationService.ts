/**
 * SERVICE DE GÉOLOCALISATION - 224SOLUTIONS
 * Utilise les Edge Functions avec Google Maps API
 */

import { supabase } from "@/integrations/supabase/client";

export interface GeocodingResult {
  address: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface RouteResult {
  distance: number; // en mètres
  duration: number; // en secondes
  distanceText: string;
  durationText: string;
  startAddress: string;
  endAddress: string;
  polyline: string;
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

export class GeolocationService {
  /**
   * Convertir une adresse en coordonnées GPS
   */
  static async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      console.log('🗺️ Geocoding address:', address);
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          address,
          type: 'geocode'
        }
      });

      if (error) {
        console.error('Geocoding error:', error);
        return null;
      }

      if (data?.status !== 'OK' || !data?.results?.[0]) {
        console.error('No results found');
        return null;
      }

      const result = data.results[0];
      return {
        address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Convertir des coordonnées GPS en adresse
   */
  static async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      console.log('🗺️ Reverse geocoding:', lat, lng);
      
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: {
          lat,
          lng,
          type: 'reverse'
        }
      });

      if (error) {
        console.error('Reverse geocoding error:', error);
        return null;
      }

      if (data?.status !== 'OK' || !data?.results?.[0]) {
        console.error('No results found');
        return null;
      }

      return data.results[0].formatted_address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Calculer un itinéraire entre deux points
   */
  static async calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'driving' | 'walking' | 'bicycling' = 'driving'
  ): Promise<RouteResult | null> {
    try {
      console.log('🗺️ Calculating route:', origin, destination);
      
      const { data, error } = await supabase.functions.invoke('calculate-route', {
        body: {
          origin,
          destination,
          mode
        }
      });

      if (error) {
        console.error('Route calculation error:', error);
        return null;
      }

      return data as RouteResult;
    } catch (error) {
      console.error('Route calculation error:', error);
      return null;
    }
  }

  /**
   * Calculer la distance entre deux points (formule haversine)
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Rayon de la terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  /**
   * Ouvrir la navigation native (Google Maps)
   */
  static openNativeNavigation(
    destination: { lat: number; lng: number },
    origin?: { lat: number; lng: number }
  ): void {
    const destStr = `${destination.lat},${destination.lng}`;
    const originStr = origin ? `${origin.lat},${origin.lng}` : '';
    
    // URL pour Google Maps
    const url = originStr
      ? `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=driving`;
    
    window.open(url, '_blank');
  }

  /**
   * Obtenir la position actuelle de l'utilisateur
   */
  static async getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting position:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }
}
