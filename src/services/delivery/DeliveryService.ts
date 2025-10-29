/**
 * SERVICE DELIVERY - 224SOLUTIONS
 * Service centralisé pour gérer les opérations de livraison
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Delivery = Database['public']['Tables']['deliveries']['Row'];

export interface NearbyDelivery {
  id: string;
  pickup_address: string;
  delivery_address: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
  distance_km: number;
  delivery_fee: number;
  status: string;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  created_at: string;
}

export interface TrackingPoint {
  id: string;
  delivery_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
}

export class DeliveryService {
  /**
   * Trouver les livraisons disponibles à proximité
   */
  static async findNearbyDeliveries(lat: number, lng: number, radiusKm: number = 10): Promise<NearbyDelivery[]> {
    try {
      console.log('[DeliveryService] Finding nearby deliveries:', { lat, lng, radiusKm });

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Filtrer par distance (approximation simple)
      const nearby = (data || []).filter((delivery: any) => {
        if (!delivery.pickup_lat || !delivery.pickup_lng) return false;
        const distance = this.calculateDistance(lat, lng, delivery.pickup_lat, delivery.pickup_lng);
        return distance <= radiusKm;
      });

      return nearby as unknown as NearbyDelivery[];
    } catch (error) {
      console.error('[DeliveryService] Error finding nearby deliveries:', error);
      throw error;
    }
  }

  /**
   * Accepter une livraison
   */
  static async acceptDelivery(deliveryId: string): Promise<Delivery> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('deliveries')
        .update({
          driver_id: user.user.id,
          status: 'picked_up',
          accepted_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) throw error;

      // Logger l'action
      await this.logDeliveryAction(deliveryId, 'accepted', user.user.id);

      return data as Delivery;
    } catch (error) {
      console.error('[DeliveryService] Error accepting delivery:', error);
      throw error;
    }
  }

  /**
   * Démarrer une livraison
   */
  static async startDelivery(deliveryId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'in_transit',
          started_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('driver_id', user.user.id);

      if (error) throw error;

      await this.logDeliveryAction(deliveryId, 'started', user.user.id);
    } catch (error) {
      console.error('[DeliveryService] Error starting delivery:', error);
      throw error;
    }
  }

  /**
   * Compléter une livraison
   */
  static async completeDelivery(deliveryId: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'delivered',
          completed_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .eq('driver_id', user.user.id);

      if (error) throw error;

      await this.logDeliveryAction(deliveryId, 'completed', user.user.id);
    } catch (error) {
      console.error('[DeliveryService] Error completing delivery:', error);
      throw error;
    }
  }

  /**
   * Annuler une livraison
   */
  static async cancelDelivery(deliveryId: string, reason: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('deliveries')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason
        })
        .eq('id', deliveryId)
        .eq('driver_id', user.user.id);

      if (error) throw error;

      await this.logDeliveryAction(deliveryId, 'cancelled', user.user.id, { reason });
    } catch (error) {
      console.error('[DeliveryService] Error cancelling delivery:', error);
      throw error;
    }
  }

  /**
   * Enregistrer la position du livreur
   */
  static async trackPosition(
    deliveryId: string,
    lat: number,
    lng: number,
    speed?: number,
    heading?: number,
    accuracy?: number
  ): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('delivery_tracking')
        .insert({
          delivery_id: deliveryId,
          driver_id: user.user.id,
          latitude: lat,
          longitude: lng,
          speed,
          heading,
          accuracy,
          recorded_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('[DeliveryService] Error tracking position:', error);
      // Ne pas bloquer l'application si le tracking échoue
    }
  }

  /**
   * Récupérer l'historique de tracking
   */
  static async getDeliveryTracking(deliveryId: string): Promise<TrackingPoint[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return (data || []) as TrackingPoint[];
    } catch (error) {
      console.error('[DeliveryService] Error getting delivery tracking:', error);
      return [];
    }
  }

  /**
   * Récupérer les détails d'une livraison
   */
  static async getDeliveryDetails(deliveryId: string): Promise<Delivery | null> {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single();

      if (error) throw error;
      return data as Delivery;
    } catch (error) {
      console.error('[DeliveryService] Error getting delivery details:', error);
      return null;
    }
  }

  /**
   * Récupérer l'historique des livraisons du livreur
   */
  static async getDriverDeliveries(limit: number = 50): Promise<Delivery[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('driver_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as Delivery[];
    } catch (error) {
      console.error('[DeliveryService] Error getting driver deliveries:', error);
      return [];
    }
  }

  /**
   * Traiter le paiement d'une livraison
   */
  static async processPayment(
    deliveryId: string,
    paymentMethod: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('delivery-payment', {
        body: {
          deliveryId,
          paymentMethod,
          idempotencyKey: idempotencyKey || `delivery-${deliveryId}-${Date.now()}`
        }
      });

      if (error) throw error;

      return {
        success: data.success,
        transactionId: data.transactionId,
        error: data.error
      };
    } catch (error) {
      console.error('[DeliveryService] Error processing payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * S'abonner aux mises à jour d'une livraison
   */
  static subscribeToDelivery(deliveryId: string, callback: (delivery: Delivery) => void) {
    const channel = supabase
      .channel(`delivery:${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${deliveryId}`
        },
        (payload) => {
          console.log('[DeliveryService] Delivery updated:', payload);
          callback(payload.new as Delivery);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * S'abonner aux nouveaux points de tracking
   */
  static subscribeToTracking(deliveryId: string, callback: (point: TrackingPoint) => void) {
    const channel = supabase
      .channel(`delivery-tracking:${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_tracking',
          filter: `delivery_id=eq.${deliveryId}`
        },
        (payload) => {
          callback(payload.new as TrackingPoint);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  /**
   * Logger une action de livraison
   */
  private static async logDeliveryAction(
    deliveryId: string,
    action: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabase.from('delivery_logs').insert({
        delivery_id: deliveryId,
        user_id: userId,
        action,
        metadata,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('[DeliveryService] Error logging action:', error);
    }
  }
}
