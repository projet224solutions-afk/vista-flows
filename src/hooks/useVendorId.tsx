import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook centralisé pour récupérer le vendor_id
 * Utilisé par tous les composants vendeur pour charger leurs données
 */
export function useVendorId() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendorId = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        setVendorId(data?.id || null);
      } catch (err: any) {
        console.error('Erreur récupération vendor_id:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorId();
  }, [user?.id]);

  return { vendorId, loading, error };
}
