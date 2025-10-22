/**
 * SERVICE TAXI MOTO - 224SOLUTIONS
 * Service centralisé pour toutes les opérations Taxi Moto
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TaxiTrip = Database['public']['Tables']['taxi_trips']['Row'];

export interface NearbyDriver {
  id: string;
  driver_code: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  current_lat: number;
  current_lng: number;
  rating: number;
  total_trips: number;
  distance_km: number;
}

export type TaxiRide = TaxiTrip;

export interface FareCalculation {
  base_fare: number;
  distance_cost: number;
  time_cost: number;
  subtotal: number;
  surge_multiplier: number;
  surge_amount: number;
  total: number;
  commission: number;
  driver_earnings: number;
  currency: string;
}

export interface TrackingPoint {
  id: string;
  ride_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export class TaxiMotoService {
  /**
   * Trouver les chauffeurs à proximité
   */
  static async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm: number = 5
  ): Promise<NearbyDriver[]> {
    const { data, error } = await supabase.rpc('find_nearby_drivers' as any, {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm
    });

    if (error) {
      console.error('[TaxiMotoService] Error finding nearby drivers:', error);
      throw error;
    }

    return (data as any) || [];
  }

  /**
   * Calculer le tarif d'une course
   */
  static async calculateFare(
    distanceKm: number,
    durationMin: number,
    surgeMultiplier: number = 1.0
  ): Promise<FareCalculation> {
    const { data, error } = await supabase.rpc('calculate_taxi_fare' as any, {
      p_distance_km: distanceKm,
      p_duration_min: durationMin,
      p_surge_multiplier: surgeMultiplier
    });

    if (error) {
      console.error('[TaxiMotoService] Error calculating fare:', error);
      throw error;
    }

    return data as any;
  }

  /**
   * Créer une demande de course
   */
  static async createRide(params: {
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    dropoffAddress: string;
    distanceKm: number;
    durationMin: number;
    estimatedPrice: number;
  }): Promise<TaxiRide> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Générer un ride code
    const { data: rideCode } = await supabase.rpc('generate_taxi_code' as any, {
      p_prefix: 'TMR'
    });

    const { data, error } = await supabase
      .from('taxi_trips')
      .insert({
        ride_code: rideCode as any,
        customer_id: user.user.id,
        pickup_lat: params.pickupLat as any,
        pickup_lng: params.pickupLng as any,
        pickup_address: params.pickupAddress,
        dropoff_lat: params.dropoffLat as any,
        dropoff_lng: params.dropoffLng as any,
        dropoff_address: params.dropoffAddress,
        distance_km: params.distanceKm as any,
        duration_min: params.durationMin as any,
        estimated_price: params.estimatedPrice as any,
        status: 'requested',
        payment_status: 'pending'
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[TaxiMotoService] Error creating ride:', error);
      throw error;
    }

    // Notifier les chauffeurs à proximité
    const drivers = await this.findNearbyDrivers(params.pickupLat, params.pickupLng, 5);
    
    for (const driver of drivers.slice(0, 5)) {
      await supabase.rpc('create_taxi_notification' as any, {
        p_user_id: driver.id,
        p_ride_id: data.id,
        p_type: 'ride_request',
        p_title: 'Nouvelle course disponible',
        p_body: `Course de ${params.pickupAddress} à ${params.dropoffAddress} - ${params.estimatedPrice} GNF`,
        p_data: { distance_km: params.distanceKm, estimated_price: params.estimatedPrice }
      });
    }

    return data as TaxiRide;
  }

  /**
   * Accepter une course (chauffeur)
   */
  static async acceptRide(rideId: string, driverId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('taxi-accept-ride', {
      body: { rideId, driverId }
    });

    if (error) {
      console.error('[TaxiMotoService] Error accepting ride:', error);
      throw error;
    }
  }

  /**
   * Refuser une course (chauffeur)
   */
  static async refuseRide(rideId: string, driverId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('taxi-refuse-ride', {
      body: { rideId, driverId }
    });

    if (error) {
      console.error('[TaxiMotoService] Error refusing ride:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'une course
   */
  static async updateRideStatus(
    rideId: string,
    status: string,
    additionalData?: Partial<TaxiRide>
  ): Promise<void> {
    const updateData: any = { status, ...additionalData };

    if (status === 'started') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('taxi_trips')
      .update(updateData)
      .eq('id', rideId);

    if (error) {
      console.error('[TaxiMotoService] Error updating ride status:', error);
      throw error;
    }

    // Logger l'action
    await supabase.rpc('log_taxi_action' as any, {
      p_action_type: `ride_status_${status}`,
      p_actor_id: (await supabase.auth.getUser()).data.user?.id,
      p_actor_type: 'driver',
      p_resource_type: 'ride',
      p_resource_id: rideId,
      p_details: { status, ...additionalData }
    });
  }

  /**
   * Enregistrer un point de tracking
   */
  static async trackPosition(
    rideId: string,
    driverId: string,
    lat: number,
    lng: number,
    speed?: number,
    heading?: number,
    accuracy?: number
  ): Promise<void> {
    const { error } = await supabase
      .from('taxi_ride_tracking')
      .insert({
        ride_id: rideId,
        driver_id: driverId,
        latitude: lat as any,
        longitude: lng as any,
        timestamp: new Date().toISOString()
      } as any);

    if (error) {
      console.error('[TaxiMotoService] Error tracking position:', error);
      throw error;
    }
  }

  /**
   * Récupérer les points de tracking d'une course
   */
  static async getRideTracking(rideId: string): Promise<TrackingPoint[]> {
    const { data, error } = await supabase
      .from('taxi_ride_tracking')
      .select('*')
      .eq('ride_id', rideId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[TaxiMotoService] Error fetching tracking:', error);
      throw error;
    }

    return (data as any) || [];
  }

  /**
   * Récupérer les détails d'une course
   */
  static async getRideDetails(rideId: string): Promise<TaxiRide | null> {
    const { data, error } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('id', rideId)
      .single();

    if (error) {
      console.error('[TaxiMotoService] Error fetching ride details:', error);
      return null;
    }

    return data as TaxiRide;
  }

  /**
   * Récupérer l'historique des courses d'un client
   */
  static async getCustomerRides(limit: number = 50): Promise<TaxiRide[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('customer_id', user.user.id)
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[TaxiMotoService] Error fetching customer rides:', error);
      throw error;
    }

    return (data as TaxiRide[]) || [];
  }

  /**
   * Récupérer l'historique des courses d'un chauffeur
   */
  static async getDriverRides(driverId: string, limit: number = 50): Promise<TaxiRide[]> {
    const { data, error } = await supabase
      .from('taxi_trips')
      .select('*')
      .eq('driver_id', driverId)
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[TaxiMotoService] Error fetching driver rides:', error);
      throw error;
    }

    return (data as TaxiRide[]) || [];
  }

  /**
   * Traiter le paiement d'une course
   */
  static async processPayment(
    rideId: string,
    paymentMethod: string,
    idempotencyKey?: string
  ): Promise<any> {
    const { data, error } = await supabase.functions.invoke('taxi-payment', {
      body: {
        rideId,
        paymentMethod,
        idempotencyKey: idempotencyKey || `${rideId}-${Date.now()}`
      }
    });

    if (error) {
      console.error('[TaxiMotoService] Error processing payment:', error);
      throw error;
    }

    return data;
  }

  /**
   * Mettre à jour le statut en ligne d'un chauffeur
   */
  static async updateDriverStatus(
    driverId: string,
    isOnline: boolean,
    isAvailable: boolean,
    currentLat?: number,
    currentLng?: number
  ): Promise<void> {
    const updateData: any = {
      is_online: isOnline,
      is_available: isAvailable,
      last_location_update: new Date().toISOString()
    };

    if (currentLat && currentLng) {
      updateData.current_lat = currentLat;
      updateData.current_lng = currentLng;
    }

    const { error } = await supabase
      .from('taxi_drivers')
      .update(updateData)
      .eq('id', driverId);

    if (error) {
      console.error('[TaxiMotoService] Error updating driver status:', error);
      throw error;
    }
  }

  /**
   * S'abonner aux mises à jour d'une course
   */
  static subscribeToRide(rideId: string, callback: (ride: TaxiRide) => void) {
    const channel = supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taxi_trips',
          filter: `id=eq.${rideId}`
        },
        (payload) => {
          console.log('[TaxiMotoService] Ride updated:', payload);
          callback(payload.new as TaxiRide);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * S'abonner au tracking d'une course
   */
  static subscribeToTracking(rideId: string, callback: (point: TrackingPoint) => void) {
    const channel = supabase
      .channel(`tracking:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taxi_ride_tracking',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          console.log('[TaxiMotoService] New tracking point:', payload);
          callback(payload.new as TrackingPoint);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Détecter la fraude
   */
  static async detectFraud(userId: string, driverId?: string, rideId?: string): Promise<void> {
    await supabase.rpc('detect_taxi_fraud' as any, {
      p_user_id: userId,
      p_driver_id: driverId,
      p_ride_id: rideId
    });
  }
}
