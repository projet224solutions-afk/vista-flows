import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TaxiDriverProfile {
  id: string;
  user_id: string;
  is_online: boolean;
  status: string;
  rating: number;
  total_rides: number;
  total_earnings: number;
  last_lat?: number;
  last_lng?: number;
  last_seen?: string;
}

interface UseTaxiDriverProfileReturn {
  driverId: string | null;
  driverProfile: TaxiDriverProfile | null;
  loading: boolean;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  loadDriverProfile: () => Promise<void>;
  updateDriverLocation: (lat: number, lng: number) => Promise<void>;
}

export function useTaxiDriverProfile(userId: string | undefined): UseTaxiDriverProfileReturn {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<TaxiDriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  const loadDriverProfile = useCallback(async () => {
    if (!userId) {
      console.log('⚠️ [useTaxiDriverProfile] Pas d\'utilisateur connecté');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('🔄 [useTaxiDriverProfile] Chargement profil pour user:', userId);
    
    try {
      // 🔒 SÉCURITÉ : Vérifier si le compte est actif (non suspendu par PDG)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_active, role')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ [useTaxiDriverProfile] Erreur profil utilisateur:', profileError);
        toast.error('Impossible de vérifier votre compte');
        setLoading(false);
        return;
      }

      if (!profileData?.is_active) {
        console.error('❌ [useTaxiDriverProfile] Compte suspendu ou inactif');
        toast.error('Votre compte a été suspendu par l\'administrateur. Contactez le support.');
        setLoading(false);
        return;
      }

      console.log('✅ [useTaxiDriverProfile] Compte actif, chargement profil conducteur...');

      const { data, error } = await supabase
        .from('taxi_drivers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ [useTaxiDriverProfile] Erreur:', error);
        
        // Si pas de profil existant, essayer de créer (seulement si compte actif)
        if (error.code === 'PGRST116') {
          console.log('📝 [useTaxiDriverProfile] Création profil conducteur...');
          const { data: newDriver, error: createError } = await supabase
            .from('taxi_drivers')
            .insert({
              user_id: userId,
              is_online: false,
              status: 'offline',
              rating: 5.0,
              total_rides: 0
            })
            .select()
            .single();
          
          if (createError) {
            console.error('❌ [useTaxiDriverProfile] Erreur création:', createError);
            toast.error('Impossible de créer le profil conducteur');
          } else if (newDriver) {
            console.log('✅ [useTaxiDriverProfile] Profil conducteur créé:', newDriver.id);
            setDriverId(newDriver.id);
            setDriverProfile(newDriver as TaxiDriverProfile);
            setIsOnline(false);
          }
        } else {
          toast.error('Erreur de chargement du profil conducteur');
        }
        setLoading(false);
        return;
      }

      if (data) {
        console.log('✅ [useTaxiDriverProfile] Profil conducteur chargé:', data.id);
        setDriverId(data.id);
        setDriverProfile(data as TaxiDriverProfile);
        setIsOnline(data.is_online || false);
      } else {
        console.warn('⚠️ [useTaxiDriverProfile] Aucun profil conducteur trouvé');
        toast.error('Profil conducteur introuvable. Contactez le support.');
      }
    } catch (error) {
      console.error('❌ [useTaxiDriverProfile] Exception:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateDriverLocation = useCallback(async (lat: number, lng: number) => {
    if (!driverId) return;

    try {
      await supabase
        .from('taxi_drivers')
        .update({
          last_lat: lat,
          last_lng: lng,
          last_seen: new Date().toISOString()
        })
        .eq('id', driverId);
      
      console.log('✅ Position sauvegardée en DB');
    } catch (error) {
      console.error('❌ Erreur mise à jour position:', error);
    }
  }, [driverId]);

  // Charger le profil au montage
  useEffect(() => {
    if (userId) {
      loadDriverProfile();
    }
  }, [userId, loadDriverProfile]);

  return {
    driverId,
    driverProfile,
    loading,
    isOnline,
    setIsOnline,
    loadDriverProfile,
    updateDriverLocation
  };
}
