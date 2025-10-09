// Service de gestion des cartes (Maps) pour 224Solutions
// Intégration Mapbox API pour géolocalisation et routing

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Route {
  distance: number;
  duration: number;
  coordinates: Location[];
}

export interface GeocodeResult {
  address: string;
  coordinates: Location;
}

class MapService {
  private mapboxToken: string;

  constructor() {
    this.mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
  }

  // Calculer la distance entre deux points (formule de Haversine)
  calculateDistance(point1: Location, point2: Location): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.latitude)) * Math.cos(this.toRad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Obtenir la position actuelle de l'utilisateur
  async getCurrentPosition(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
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
        }
      );
    });
  }

  // Calculer un itinéraire avec Mapbox Directions API
  async calculateRoute(start: Location, end: Location): Promise<Route> {
    if (!this.mapboxToken) {
      console.warn('Mapbox token missing, using fallback calculation');
      const distance = this.calculateDistance(start, end);
      const duration = distance * 3; // Estimation: 3 minutes par km
      
      return {
        distance,
        duration,
        coordinates: [start, end]
      };
    }

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&access_token=${this.mapboxToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Mapbox Directions API error');
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Convertir les coordonnées GeoJSON en format Location
        const coordinates: Location[] = route.geometry.coordinates.map((coord: number[]) => ({
          longitude: coord[0],
          latitude: coord[1]
        }));

        return {
          distance: route.distance / 1000, // Convertir mètres en km
          duration: route.duration / 60,   // Convertir secondes en minutes
          coordinates
        };
      }

      throw new Error('No routes found');
    } catch (error) {
      console.error('Mapbox routing error:', error);
      
      // Fallback to simple calculation
      const distance = this.calculateDistance(start, end);
      const duration = distance * 3;
      
      return {
        distance,
        duration,
        coordinates: [start, end]
      };
    }
  }

  // Géocode une adresse avec Mapbox Geocoding API
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    if (!this.mapboxToken) {
      console.warn('Mapbox token missing, returning empty geocoding result');
      return [{
        address: address,
        coordinates: { latitude: 0, longitude: 0 }
      }];
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.mapboxToken}&limit=5`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Mapbox Geocoding API error');
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features.map((feature: any) => ({
          address: feature.place_name,
          coordinates: {
            latitude: feature.center[1],
            longitude: feature.center[0]
          }
        }));
      }

      return [];
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      return [{
        address: address,
        coordinates: { latitude: 0, longitude: 0 }
      }];
    }
  }

  // Géocode inverse (coordonnées -> adresse)
  async reverseGeocode(location: Location): Promise<string> {
    if (!this.mapboxToken) {
      return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.longitude},${location.latitude}.json?access_token=${this.mapboxToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Mapbox Reverse Geocoding API error');
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }

      return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Mapbox reverse geocoding error:', error);
      return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }
  }

  // Obtenir un itinéraire (alias de calculateRoute)
  async getRoute(origin: Location, destination: Location): Promise<Route> {
    return this.calculateRoute(origin, destination);
  }

  // Vérifier si Mapbox est configuré
  isMapboxConfigured(): boolean {
    return !!this.mapboxToken;
  }
}

export const mapService = new MapService();
