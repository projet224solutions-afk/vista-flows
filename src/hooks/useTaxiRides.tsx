/**
 * Hook pour gérer les courses taxi-moto
 * Connecté à la base de données Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface TaxiRide {
  id: string;
  customer_id: string;
  driver_id?: string;
  pickup_address: any;
  dropoff_address: any;
  status: 'pending' | 'accepted' | 'driver_arriving' | 'in_progress' | 'completed' | 'cancelled';
  estimated_price: number;
  final_price?: number;
  distance_km?: number;
  estimated_duration_minutes?: number;
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  driver_notes?: string;
  customer_rating?: number;
  driver_rating?: number;
}

export function useTaxiRides() {
  const { user } = useAuth();
  const [currentRide, setCurrentRide] = useState<TaxiRide | null>(null);
  const [rideHistory, setRideHistory] = useState<TaxiRide[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger la course en cours
  const loadCurrentRide = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['accepted', 'driver_arriving', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentRide(data);
    } catch (error) {
      console.error('Erreur chargement course en cours:', error);
    }
  }, [user]);

  // Charger l'historique des courses
  const loadRideHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .eq('driver_id', user.id)
        .in('status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRideHistory(data || []);
    } catch (error) {
      console.error('Erreur chargement historique courses:', error);
    }
  }, [user]);

  // Accepter une course
  const acceptRide = useCallback(async (rideId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .update({
          driver_id: user.id,
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', rideId)
        .select()
        .single();

      if (error) throw error;

      setCurrentRide(data);
      toast.success('Course acceptée !');
      
      return data;
    } catch (error: any) {
      console.error('Erreur acceptation course:', error);
      toast.error('Erreur lors de l\'acceptation');
      throw error;
    }
  }, [user]);

  // Démarrer une course
  const startRide = useCallback(async (rideId: string) => {
    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', rideId)
        .select()
        .single();

      if (error) throw error;

      setCurrentRide(data);
      toast.success('Course démarrée !');
      
      return data;
    } catch (error: any) {
      console.error('Erreur démarrage course:', error);
      toast.error('Erreur lors du démarrage');
      throw error;
    }
  }, []);

  // Compléter une course
  const completeRide = useCallback(async (rideId: string, finalPrice: number) => {
    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          final_price: finalPrice
        })
        .eq('id', rideId)
        .select()
        .single();

      if (error) throw error;

      setCurrentRide(null);
      await loadRideHistory();
      toast.success('Course terminée !');
      
      return data;
    } catch (error: any) {
      console.error('Erreur completion course:', error);
      toast.error('Erreur lors de la finalisation');
      throw error;
    }
  }, [loadRideHistory]);

  // Annuler une course
  const cancelRide = useCallback(async (rideId: string, reason: string) => {
    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason,
          driver_id: null
        })
        .eq('id', rideId)
        .select()
        .single();

      if (error) throw error;

      setCurrentRide(null);
      toast.success('Course annulée');
      
      return data;
    } catch (error: any) {
      console.error('Erreur annulation course:', error);
      toast.error('Erreur lors de l\'annulation');
      throw error;
    }
  }, []);

  // Tracker la position
  const trackPosition = useCallback(async (
    rideId: string,
    latitude: number,
    longitude: number
  ) => {
    try {
      const { error } = await supabase
        .from('taxi_tracking')
        .insert({
          trip_id: rideId,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur tracking position:', error);
    }
  }, []);

  // Traiter le paiement
  const processPayment = useCallback(async (rideId: string) => {
    console.log('Traitement paiement pour course:', rideId);
  }, []);

  // Charger au montage
  useEffect(() => {
    if (user) {
      loadCurrentRide();
      loadRideHistory();
    }
  }, [user, loadCurrentRide, loadRideHistory]);

  return {
    currentRide,
    rideHistory,
    loading,
    acceptRide,
    startRide,
    completeRide,
    cancelRide,
    trackPosition,
    processPayment,
    loadCurrentRide,
    loadRideHistory
  };
}
