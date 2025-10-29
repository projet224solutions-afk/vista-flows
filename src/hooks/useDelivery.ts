/**
 * HOOK DELIVERY - 224SOLUTIONS
 * Hook React pour gérer l'état et les opérations de livraison
 */

import { useState, useEffect, useCallback } from 'react';
import { DeliveryService, type NearbyDelivery, type TrackingPoint } from '@/services/delivery/DeliveryService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Delivery = Database['public']['Tables']['deliveries']['Row'];

export function useDelivery() {
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<Delivery[]>([]);
  const [nearbyDeliveries, setNearbyDeliveries] = useState<NearbyDelivery[]>([]);
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger la livraison en cours
   */
  const loadCurrentDelivery = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error: err } = await supabase
        .from('deliveries')
        .select('*')
        .eq('driver_id', user.user.id)
        .in('status', ['picked_up', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err) throw err;
      setCurrentDelivery(data as Delivery);

      // S'abonner aux mises à jour si une livraison est en cours
      if (data) {
        const unsubscribe = DeliveryService.subscribeToDelivery(data.id, (updatedDelivery) => {
          setCurrentDelivery(updatedDelivery as Delivery);
        });
        return unsubscribe;
      }
    } catch (err) {
      console.error('[useDelivery] Error loading current delivery:', err);
      setError(err instanceof Error ? err.message : 'Error loading current delivery');
    }
  }, []);

  /**
   * Charger l'historique des livraisons
   */
  const loadDeliveryHistory = useCallback(async (limit: number = 50) => {
    try {
      setLoading(true);
      const deliveries = await DeliveryService.getDriverDeliveries(limit);
      setDeliveryHistory(deliveries);
    } catch (err) {
      console.error('[useDelivery] Error loading delivery history:', err);
      setError(err instanceof Error ? err.message : 'Error loading delivery history');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Trouver les livraisons à proximité
   */
  const findNearbyDeliveries = useCallback(async (lat: number, lng: number, radiusKm: number = 10) => {
    try {
      setLoading(true);
      const deliveries = await DeliveryService.findNearbyDeliveries(lat, lng, radiusKm);
      setNearbyDeliveries(deliveries);
      return deliveries;
    } catch (err) {
      console.error('[useDelivery] Error finding nearby deliveries:', err);
      setError(err instanceof Error ? err.message : 'Error finding nearby deliveries');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Accepter une livraison
   */
  const acceptDelivery = useCallback(async (deliveryId: string) => {
    try {
      setLoading(true);
      const delivery = await DeliveryService.acceptDelivery(deliveryId);
      setCurrentDelivery(delivery);
      toast.success('Livraison acceptée avec succès!');
      return delivery;
    } catch (err) {
      console.error('[useDelivery] Error accepting delivery:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'acceptation';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Démarrer une livraison
   */
  const startDelivery = useCallback(async (deliveryId: string) => {
    try {
      setLoading(true);
      await DeliveryService.startDelivery(deliveryId);
      toast.success('Livraison démarrée!');
    } catch (err) {
      console.error('[useDelivery] Error starting delivery:', err);
      toast.error('Erreur lors du démarrage');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Compléter une livraison
   */
  const completeDelivery = useCallback(async (deliveryId: string) => {
    try {
      setLoading(true);
      await DeliveryService.completeDelivery(deliveryId);
      setCurrentDelivery(null);
      toast.success('Livraison terminée!');
      await loadDeliveryHistory();
    } catch (err) {
      console.error('[useDelivery] Error completing delivery:', err);
      toast.error('Erreur lors de la complétion');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDeliveryHistory]);

  /**
   * Annuler une livraison
   */
  const cancelDelivery = useCallback(async (deliveryId: string, reason: string) => {
    try {
      setLoading(true);
      await DeliveryService.cancelDelivery(deliveryId, reason);
      setCurrentDelivery(null);
      toast.success('Livraison annulée');
    } catch (err) {
      console.error('[useDelivery] Error cancelling delivery:', err);
      toast.error('Erreur lors de l\'annulation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Charger les points de tracking
   */
  const loadTracking = useCallback(async (deliveryId: string) => {
    try {
      const points = await DeliveryService.getDeliveryTracking(deliveryId);
      setTrackingPoints(points);
      return points;
    } catch (err) {
      console.error('[useDelivery] Error loading tracking:', err);
      return [];
    }
  }, []);

  /**
   * S'abonner au tracking en temps réel
   */
  const subscribeToTracking = useCallback((deliveryId: string) => {
    const unsubscribe = DeliveryService.subscribeToTracking(deliveryId, (point) => {
      setTrackingPoints((prev) => [...prev, point]);
    });
    return unsubscribe;
  }, []);

  /**
   * Enregistrer la position
   */
  const trackPosition = useCallback(async (
    deliveryId: string,
    lat: number,
    lng: number,
    speed?: number,
    heading?: number,
    accuracy?: number
  ) => {
    try {
      await DeliveryService.trackPosition(deliveryId, lat, lng, speed, heading, accuracy);
    } catch (err) {
      console.error('[useDelivery] Error tracking position:', err);
    }
  }, []);

  /**
   * Traiter le paiement
   */
  const processPayment = useCallback(async (
    deliveryId: string,
    paymentMethod: string
  ) => {
    try {
      setLoading(true);
      const result = await DeliveryService.processPayment(deliveryId, paymentMethod);
      
      if (result.success) {
        toast.success('Paiement effectué avec succès!');
        await loadDeliveryHistory();
        setCurrentDelivery(null);
      } else {
        toast.error(result.error || 'Erreur lors du paiement');
      }
      
      return result;
    } catch (err) {
      console.error('[useDelivery] Error processing payment:', err);
      toast.error('Erreur lors du paiement');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadDeliveryHistory]);

  // Charger la livraison en cours au montage
  useEffect(() => {
    loadCurrentDelivery();
    loadDeliveryHistory();
  }, [loadCurrentDelivery, loadDeliveryHistory]);

  return {
    currentDelivery,
    deliveryHistory,
    nearbyDeliveries,
    trackingPoints,
    loading,
    error,
    findNearbyDeliveries,
    acceptDelivery,
    startDelivery,
    completeDelivery,
    cancelDelivery,
    loadTracking,
    subscribeToTracking,
    trackPosition,
    processPayment,
    loadDeliveryHistory,
    loadCurrentDelivery
  };
}
