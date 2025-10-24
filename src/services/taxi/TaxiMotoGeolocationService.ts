/**
 * SERVICE GÉOLOCALISATION TAXI MOTO - 224SOLUTIONS
 * Gestion de la géolocalisation et calcul des itinéraires
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance: number; // en km
  duration: number; // en minutes
  coordinates: Array<[number, number]>; // [lng, lat] pour Mapbox
}

export class TaxiMotoGeolocationService {
  private static MAPBOX_TOKEN = 'pk.eyJ1IjoiMjI0c29sdXRpb25zIiwiYSI6ImNtNXA5Z3Y4czBkOW8yanM2dHhtZDk5YXgifQ.6_iU6CvxfWWFhJFwNBLy5g';

  /**
   * Calculer la distance entre deux points (formule Haversine)
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Obtenir un itinéraire avec Mapbox Directions API
   */
  static async getRoute(
    start: Coordinates,
    end: Coordinates
  ): Promise<RouteInfo> {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&access_token=${this.MAPBOX_TOKEN}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('Aucun itinéraire trouvé');
      }

      const route = data.routes[0];
      
      return {
        distance: route.distance / 1000, // convertir en km
        duration: Math.ceil(route.duration / 60), // convertir en minutes
        coordinates: route.geometry.coordinates
      };
    } catch (error) {
      console.error('[Geolocation] Error getting route:', error);
      
      // Fallback: calcul direct
      const distance = this.calculateDistance(
        start.latitude,
        start.longitude,
        end.latitude,
        end.longitude
      );
      
      return {
        distance,
        duration: Math.ceil(distance * 3), // estimation: 20 km/h moyenne
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude]
        ]
      };
    }
  }

  /**
   * Géocodage inverse: obtenir l'adresse à partir de coordonnées
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string> {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${this.MAPBOX_TOKEN}&language=fr`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }

      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('[Geolocation] Error reverse geocoding:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }

  /**
   * Recherche d'adresse (autocomplete)
   */
  static async searchAddress(
    query: string,
    proximity?: Coordinates
  ): Promise<Array<{ id: string; name: string; coordinates: Coordinates }>> {
    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.MAPBOX_TOKEN}&language=fr&country=GN&limit=5`;
      
      if (proximity) {
        url += `&proximity=${proximity.longitude},${proximity.latitude}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.features) {
        return data.features.map((feature: any) => ({
          id: feature.id,
          name: feature.place_name,
          coordinates: {
            latitude: feature.center[1],
            longitude: feature.center[0]
          }
        }));
      }

      return [];
    } catch (error) {
      console.error('[Geolocation] Error searching address:', error);
      return [];
    }
  }

  /**
   * Obtenir la position actuelle de l'utilisateur
   */
  static getCurrentPosition(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Surveiller la position en temps réel
   */
  static watchPosition(
    onUpdate: (position: Coordinates & { heading?: number; speed?: number }) => void,
    onError?: (error: GeolocationPositionError) => void
  ): number {
    if (!navigator.geolocation) {
      throw new Error('Géolocalisation non supportée');
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        onUpdate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading ?? undefined,
          speed: position.coords.speed ?? undefined
        });
      },
      onError,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  /**
   * Arrêter la surveillance de la position
   */
  static clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  }
}
