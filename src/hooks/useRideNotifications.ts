/**
 * HOOK DE NOTIFICATIONS TEMPS RÉEL
 * Gère les notifications de courses via Supabase Realtime
 * 224Solutions - Taxi-Moto System
 */

import { useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RideNotification {
  type: 'ride_accepted' | 'driver_arriving' | 'ride_started' | 'ride_completed' | 'ride_cancelled' | 'driver_location_update';
  rideId: string;
  message: string;
  data?: any;
}

export function useRideNotifications(userId: string | undefined, onNotification?: (notification: RideNotification) => void) {

  const handleRideUpdate = useCallback((payload: any) => {
    if (!payload.new) return;

    const ride = payload.new;
    let notification: RideNotification | null = null;

    // Déterminer le type de notification selon le statut
    if (payload.eventType === 'UPDATE') {
      switch (ride.status) {
        case 'accepted':
          notification = {
            type: 'ride_accepted',
            rideId: ride.id,
            message: '🚗 Un conducteur a accepté votre course !',
            data: ride
          };
          toast.success('🚗 Un conducteur a accepté votre course !', {
            description: 'Il arrive dans quelques minutes'
          });
          break;

        case 'driver_arriving':
          notification = {
            type: 'driver_arriving',
            rideId: ride.id,
            message: '🏃 Le conducteur est en route vers vous',
            data: ride
          };
          toast.info('🏃 Le conducteur est en route', {
            description: 'Il sera bientôt là'
          });
          break;

        case 'picked_up':
        case 'in_progress':
          notification = {
            type: 'ride_started',
            rideId: ride.id,
            message: '✅ Course démarrée !',
            data: ride
          };
          toast.success('✅ Course démarrée !', {
            description: 'Bon voyage !'
          });
          break;

        case 'completed':
          notification = {
            type: 'ride_completed',
            rideId: ride.id,
            message: '🎉 Course terminée !',
            data: ride
          };
          toast.success('🎉 Course terminée !', {
            description: 'Merci d\'avoir utilisé 224Solutions'
          });
          break;

        case 'cancelled':
          notification = {
            type: 'ride_cancelled',
            rideId: ride.id,
            message: '❌ Course annulée',
            data: ride
          };
          toast.error('❌ Course annulée', {
            description: 'Vous pouvez en réserver une nouvelle'
          });
          break;
      }
    }

    // Appeler le callback si fourni
    if (notification && onNotification) {
      onNotification(notification);
    }
  }, [onNotification]);

  const handleDriverLocationUpdate = useCallback((payload: any) => {
    if (!payload.new) return;

    const tracking = payload.new;

    // Notification silencieuse pour la mise à jour de position
    const notification: RideNotification = {
      type: 'driver_location_update',
      rideId: tracking.ride_id,
      message: 'Position du conducteur mise à jour',
      data: {
        latitude: tracking.latitude,
        longitude: tracking.longitude,
        timestamp: tracking.created_at
      }
    };

    if (onNotification) {
      onNotification(notification);
    }
  }, [onNotification]);

  useEffect(() => {
    if (!userId) return;

    console.log('[RideNotifications] Setting up realtime subscriptions for user:', userId);

    // Écouter les mises à jour de courses
    const tripsChannel = supabase
      .channel(`user_rides_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'taxi_trips',
          filter: `customer_id=eq.${userId}`
        },
        handleRideUpdate
      )
      .subscribe((status) => {
        console.log('[RideNotifications] Trips subscription status:', status);
      });

    // Écouter les mises à jour de position des conducteurs
    const trackingChannel = supabase
      .channel(`user_tracking_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taxi_ride_tracking'
        },
        handleDriverLocationUpdate
      )
      .subscribe((status) => {
        console.log('[RideNotifications] Tracking subscription status:', status);
      });

    return () => {
      console.log('[RideNotifications] Cleaning up subscriptions');
      tripsChannel.unsubscribe();
      trackingChannel.unsubscribe();
    };
  }, [userId, handleRideUpdate, handleDriverLocationUpdate]);

  return {
    // Ce hook gère automatiquement les notifications, pas besoin de retourner quoi que ce soit
  };
}
