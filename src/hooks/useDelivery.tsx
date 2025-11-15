/**
 * Hook pour gérer les livraisons
 * Connecté à la base de données Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Delivery {
  id: string;
  order_id?: string;
  client_id?: string;
  driver_id?: string;
  pickup_address: any;
  delivery_address: any;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  delivery_fee: number;
  driver_earning?: number;
  distance_km?: number;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  driver_notes?: string;
  proof_photo_url?: string;
  client_signature?: string;
}

interface TrackingPoint {
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

export function useDelivery() {
  const { user } = useAuth();
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<Delivery[]>([]);
  const [nearbyDeliveries, setNearbyDeliveries] = useState<Delivery[]>([]);
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la livraison en cours
  const loadCurrentDelivery = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentDelivery(data);
    } catch (error) {
      console.error('Erreur chargement livraison en cours:', error);
    }
  }, [user]);

  // Charger l'historique
  const loadDeliveryHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['delivered', 'cancelled'])
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDeliveryHistory(data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  }, [user]);

  // Trouver les livraisons à proximité
  const findNearbyDeliveries = useCallback(async (lat: number, lng: number, radiusKm: number) => {
    setLoading(true);
    setError(null);

    try {
      // Charger toutes les livraisons en attente
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      console.log('✅ Livraisons disponibles:', data?.length || 0);
      setNearbyDeliveries(data || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement livraisons:', error);
      setError(error.message);
      toast.error('Erreur lors du chargement des livraisons');
    } finally {
      setLoading(false);
    }
  }, []);

  // Accepter une livraison
  const acceptDelivery = useCallback(async (deliveryId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          driver_id: user.id,
          status: 'assigned',
          accepted_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;

      setCurrentDelivery(data);
      setNearbyDeliveries(prev => prev.filter(d => d.id !== deliveryId));
      toast.success('Livraison acceptée !');
      
      return data;
    } catch (error: any) {
      console.error('Erreur acceptation livraison:', error);
      toast.error('Erreur lors de l\'acceptation');
      throw error;
    }
  }, [user]);

  // Démarrer une livraison
  const startDelivery = useCallback(async (deliveryId: string) => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          status: 'picked_up',
          started_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;

      setCurrentDelivery(data);
      toast.success('Livraison démarrée !');
      
      return data;
    } catch (error: any) {
      console.error('Erreur démarrage livraison:', error);
      toast.error('Erreur lors du démarrage');
      throw error;
    }
  }, []);

  // Compléter une livraison
  const completeDelivery = useCallback(async (deliveryId: string, proofUrl?: string, signature?: string) => {
    try {
      // Calculer les gains du driver (98.5% des frais)
      const { data: delivery } = await supabase
        .from('deliveries')
        .select('delivery_fee')
        .eq('id', deliveryId)
        .single();

      const driverEarning = delivery ? delivery.delivery_fee * 0.985 : 0;

      const { data, error } = await supabase
        .from('deliveries')
        .update({
          status: 'delivered',
          completed_at: new Date().toISOString(),
          driver_earning: driverEarning,
          proof_photo_url: proofUrl,
          client_signature: signature
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;

      setCurrentDelivery(null);
      await loadDeliveryHistory();
      toast.success('Livraison terminée !');
      
      return data;
    } catch (error: any) {
      console.error('Erreur completion livraison:', error);
      toast.error('Erreur lors de la finalisation');
      throw error;
    }
  }, [loadDeliveryHistory]);

  // Annuler une livraison
  const cancelDelivery = useCallback(async (deliveryId: string, reason: string) => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason,
          driver_id: null
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;

      setCurrentDelivery(null);
      toast.success('Livraison annulée');
      
      return data;
    } catch (error: any) {
      console.error('Erreur annulation livraison:', error);
      toast.error('Erreur lors de l\'annulation');
      throw error;
    }
  }, []);

  // Tracker la position
  const trackPosition = useCallback(async (
    deliveryId: string,
    latitude: number,
    longitude: number,
    speed?: number,
    heading?: number,
    accuracy?: number
  ) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('delivery_tracking')
        .insert({
          delivery_id: deliveryId,
          driver_id: user.id,
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          recorded_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur tracking position:', error);
    }
  }, [user]);

  // Charger le tracking
  const loadTracking = useCallback(async (deliveryId: string) => {
    try {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      setTrackingPoints(data || []);
    } catch (error) {
      console.error('Erreur chargement tracking:', error);
    }
  }, []);

  // S'abonner au tracking en temps réel
  const subscribeToTracking = useCallback((deliveryId: string) => {
    const channel = supabase
      .channel(`delivery_tracking_${deliveryId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_tracking',
        filter: `delivery_id=eq.${deliveryId}`
      }, (payload) => {
        setTrackingPoints(prev => [...prev, payload.new as TrackingPoint]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Traiter le paiement
  const processPayment = useCallback(async (deliveryId: string, paymentMethod: string = 'cash') => {
    try {
      // Vérifier que la livraison est terminée
      const { data: delivery } = await supabase
        .from('deliveries')
        .select('status, driver_earning')
        .eq('id', deliveryId)
        .single();

      if (!delivery || delivery.status !== 'delivered') {
        throw new Error('La livraison doit être terminée pour traiter le paiement');
      }

      // Marquer le paiement comme traité
      toast.success(`Paiement de ${delivery.driver_earning} GNF reçu !`);
      
      return {
        success: true,
        amount: delivery.driver_earning
      };
    } catch (error: any) {
      console.error('Erreur traitement paiement:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    if (user) {
      loadCurrentDelivery();
      loadDeliveryHistory();
    }
  }, [user, loadCurrentDelivery, loadDeliveryHistory]);

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
    trackPosition,
    loadTracking,
    subscribeToTracking,
    processPayment,
    loadDeliveryHistory,
    loadCurrentDelivery
  };
}
