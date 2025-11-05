/**
 * Hook pour gérer le profil et le statut du driver (livreur/taxi)
 * Connecté à la base de données Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  vehicle_type: 'bicycle' | 'moto' | 'car' | 'truck';
  vehicle_number: string | null;
  is_online: boolean;
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
  earnings_total: number;
  current_location: { lat: number; lng: number } | null;
}

interface DriverStats {
  totalEarnings: number;
  totalDeliveries: number;
  rating: number;
  todayEarnings: number;
  todayDeliveries: number;
}

export function useDriver() {
  const { user, profile } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [stats, setStats] = useState<DriverStats>({
    totalEarnings: 0,
    totalDeliveries: 0,
    rating: 5.0,
    todayEarnings: 0,
    todayDeliveries: 0
  });
  const [loading, setLoading] = useState(true);

  // Charger le profil du driver
  const loadDriver = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setDriver(data);
        
        // Charger les stats
        await loadStats(data.id);
      } else {
        // Créer un profil driver si n'existe pas
        await createDriverProfile();
      }
    } catch (error) {
      console.error('Erreur chargement driver:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Créer le profil driver
  const createDriverProfile = async () => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          user_id: user.id,
          full_name: `${profile.first_name} ${profile.last_name}`.trim(),
          email: user.email,
          vehicle_type: profile.role === 'taxi' ? 'moto' : 'bicycle',
          is_online: false,
          is_verified: false,
          rating: 5.0,
          total_deliveries: 0,
          earnings_total: 0
        })
        .select()
        .single();

      if (error) throw error;
      setDriver(data);
      toast.success('Profil driver créé avec succès');
    } catch (error) {
      console.error('Erreur création profil driver:', error);
      toast.error('Erreur lors de la création du profil');
    }
  };

  // Charger les statistiques
  const loadStats = async (driverId: string) => {
    try {
      // Stats totales
      const { data: allDeliveries } = await supabase
        .from('deliveries')
        .select('delivery_fee, driver_earning, status')
        .eq('driver_id', driverId)
        .eq('status', 'delivered');

      // Stats du jour
      const today = new Date().toISOString().split('T')[0];
      const { data: todayDeliveries } = await supabase
        .from('deliveries')
        .select('delivery_fee, driver_earning')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .gte('completed_at', `${today}T00:00:00`);

      const totalEarnings = allDeliveries?.reduce((sum, d) => sum + (d.driver_earning || 0), 0) || 0;
      const todayEarnings = todayDeliveries?.reduce((sum, d) => sum + (d.driver_earning || 0), 0) || 0;

      setStats({
        totalEarnings,
        totalDeliveries: allDeliveries?.length || 0,
        rating: driver?.rating || 5.0,
        todayEarnings,
        todayDeliveries: todayDeliveries?.length || 0
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // Passer en ligne
  const goOnline = async () => {
    if (!driver) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_online: true })
        .eq('id', driver.id);

      if (error) throw error;

      setDriver({ ...driver, is_online: true });
      toast.success('Vous êtes maintenant en ligne');
    } catch (error) {
      console.error('Erreur passage en ligne:', error);
      toast.error('Erreur lors du passage en ligne');
    }
  };

  // Passer hors ligne
  const goOffline = async () => {
    if (!driver) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_online: false })
        .eq('id', driver.id);

      if (error) throw error;

      setDriver({ ...driver, is_online: false });
      toast.success('Vous êtes maintenant hors ligne');
    } catch (error) {
      console.error('Erreur passage hors ligne:', error);
      toast.error('Erreur lors du passage hors ligne');
    }
  };

  // Mettre en pause
  const pause = async () => {
    await goOffline();
  };

  // Mettre à jour la position
  const updateLocation = async (location: { lat: number; lng: number }) => {
    if (!driver) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          current_location: location,
          last_location: location
        })
        .eq('id', driver.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur mise à jour position:', error);
    }
  };

  // Uploader une preuve de livraison
  const uploadProof = async (deliveryId: string, photoFile: File, signature: string) => {
    try {
      // Upload photo
      const fileName = `${deliveryId}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('delivery_proofs')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('delivery_proofs')
        .getPublicUrl(fileName);

      // Update delivery
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          proof_photo_url: publicUrl,
          client_signature: signature
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      toast.success('Preuve de livraison enregistrée');
      return { photoUrl: publicUrl, signature };
    } catch (error) {
      console.error('Erreur upload preuve:', error);
      toast.error('Erreur lors de l\'upload de la preuve');
      throw error;
    }
  };

  useEffect(() => {
    loadDriver();
  }, [loadDriver]);

  return {
    driver,
    stats,
    loading,
    goOnline,
    goOffline,
    pause,
    updateLocation,
    uploadProof,
    refresh: loadDriver
  };
}
