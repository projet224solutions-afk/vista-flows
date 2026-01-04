/**
 * HOOK: useVendorCertification
 * Hook pour récupérer et gérer le statut de certification d'un vendeur
 * 224SOLUTIONS
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VendorCertification, VendorCertificationStatus } from '@/types/vendorCertification';

interface UseVendorCertificationResult {
  certification: VendorCertification | null;
  loading: boolean;
  error: Error | null;
  isCertified: boolean;
  refetch: () => Promise<void>;
}

export function useVendorCertification(vendorId: string | undefined): UseVendorCertificationResult {
  const [certification, setCertification] = useState<VendorCertification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCertification = async () => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('vendor_certifications')
        .select('*')
        .eq('vendor_id', vendorId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setCertification(data || null);
    } catch (err) {
      console.error('Error fetching vendor certification:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertification();

    // Subscribe to real-time updates
    if (vendorId) {
      const subscription = supabase
        .channel(`vendor_certification_${vendorId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'vendor_certifications',
            filter: `vendor_id=eq.${vendorId}`
          },
          (payload) => {
            console.log('Certification updated:', payload);
            if (payload.eventType === 'DELETE') {
              setCertification(null);
            } else {
              setCertification(payload.new as VendorCertification);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [vendorId]);

  const isCertified = certification?.status === 'CERTIFIE';

  return {
    certification,
    loading,
    error,
    isCertified,
    refetch: fetchCertification
  };
}

/**
 * Hook pour demander une certification (vendeur uniquement)
 */
export function useRequestCertification() {
  const [requesting, setRequesting] = useState(false);

  const requestCertification = async () => {
    try {
      setRequesting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Vérifier si certification existe déjà
      const { data: existing } = await supabase
        .from('vendor_certifications')
        .select('id, status')
        .eq('vendor_id', user.id)
        .single();

      if (existing) {
        if (existing.status === 'EN_ATTENTE') {
          throw new Error('Demande déjà en attente');
        }
        if (existing.status === 'CERTIFIE') {
          throw new Error('Déjà certifié');
        }

        // Update to EN_ATTENTE
        const { error: updateError } = await supabase
          .from('vendor_certifications')
          .update({ 
            status: 'EN_ATTENTE',
            requested_at: new Date().toISOString()
          })
          .eq('vendor_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('vendor_certifications')
          .insert({
            vendor_id: user.id,
            status: 'EN_ATTENTE'
          });

        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.error('Error requesting certification:', err);
      throw err;
    } finally {
      setRequesting(false);
    }
  };

  return {
    requestCertification,
    requesting
  };
}
