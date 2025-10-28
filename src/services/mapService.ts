// Service de gestion des cartes (Maps) pour 224Solutions
// Utilise Mapbox pour les calculs de routes réelles

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

  // Calculer un itinéraire avec Mapbox
  async calculateRoute(start: Location, end: Location): Promise<Route> {
    try {
      const MAPBOX_TOKEN = 'pk.eyJ1IjoiMjI0c29sdXRpb25zIiwiYSI6ImNtNXA5Z3Y4czBkOW8yanM2dHhtZDk5YXgifQ.6_iU6CvxfWWFhJFwNBLy5g';
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('Aucun itinéraire trouvé');
      }

      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0]
      }));
      
      return {
        distance: route.distance / 1000, // convertir en km
        duration: Math.ceil(route.duration / 60), // convertir en minutes
        coordinates
      };
    } catch (error) {
      console.error('Erreur Mapbox, utilisation du fallback:', error);
      // Fallback: calcul simple
      const distance = this.calculateDistance(start, end);
      return {
        distance,
        duration: distance * 3,
        coordinates: [start, end]
      };
    }
  }

  // Géocode une adresse avec Mapbox
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    try {
      const MAPBOX_TOKEN = 'pk.eyJ1IjoiMjI0c29sdXRpb25zIiwiYSI6ImNtNXA5Z3Y4czBkOW8yanM2dHhtZDk5YXgifQ.6_iU6CvxfWWFhJFwNBLy5g';
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&language=fr&country=GN&limit=5`;
      
      const response = await fetch(url);
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
      console.error('Erreur géocodage Mapbox:', error);
      return [{
        address: address,
        coordinates: { latitude: 0, longitude: 0 }
      }];
    }
  }

  // Obtenir un itinéraire (alias de calculateRoute)
  async getRoute(origin: Location, destination: Location): Promise<Route> {
    return this.calculateRoute(origin, destination);
  }
}

export const mapService = new MapService();
