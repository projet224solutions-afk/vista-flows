// Service de gestion des cartes (Maps) pour 224Solutions
// Version simplifiée avec calculs de base

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

  // Calculer un itinéraire simple (simulation)
  async calculateRoute(start: Location, end: Location): Promise<Route> {
    const distance = this.calculateDistance(start, end);
    const duration = distance * 3; // Estimation: 3 minutes par km
    
    return {
      distance,
      duration,
      coordinates: [start, end]
    };
  }

  // Géocode une adresse (stub pour compatibilité)
  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    return [{
      address: address,
      coordinates: { latitude: 0, longitude: 0 }
    }];
  }

  // Obtenir un itinéraire (alias de calculateRoute)
  async getRoute(origin: Location, destination: Location): Promise<Route> {
    return this.calculateRoute(origin, destination);
  }
}

export const mapService = new MapService();
