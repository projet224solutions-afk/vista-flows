/**
 * SERVICE DE GÉOLOCALISATION DES UTILISATEURS
 * Récupère la position GPS des vendeurs et clients par leur ID
 */

import { supabase } from '@/integrations/supabase/client';

export interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  phone?: string;
}

export class UserGeolocService {
  /**
   * Récupère la position d'un utilisateur par son ID
   */
  static async getUserLocation(userId: string): Promise<UserLocation | null> {
    try {
      console.log('[UserGeolocService] Getting location for user:', userId);

      // Chercher dans les profils avec dernière position
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Chercher les dernières coordonnées GPS dans delivery_tracking
      const { data: trackingData } = await supabase
        .from('delivery_tracking')
        .select('latitude, longitude')
        .eq('driver_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (trackingData && trackingData.latitude && trackingData.longitude) {
        return {
          userId,
          latitude: trackingData.latitude,
          longitude: trackingData.longitude,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          phone: profile.phone || ''
        };
      }

      // Si pas de position, retourner Conakry par défaut
      return {
        userId,
        latitude: 9.5091,
        longitude: -13.7122,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        phone: profile.phone || '',
        address: 'Conakry, Guinée (position approximative)'
      };
    } catch (error) {
      console.error('[UserGeolocService] Error getting user location:', error);
      return null;
    }
  }

  /**
   * Récupère les informations d'un vendeur par son ID
   */
  static async getVendorInfo(vendorId: string): Promise<UserLocation | null> {
    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('user_id')
        .eq('id', vendorId)
        .single();

      if (error) throw error;

      return await this.getUserLocation(vendor.user_id);
    } catch (error) {
      console.error('[UserGeolocService] Error getting vendor info:', error);
      return null;
    }
  }

  /**
   * Calcule la distance entre deux positions
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
