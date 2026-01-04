/**
 * HOOK: useVendorCertification
 * Hook pour récupérer et gérer le statut de certification d'un vendeur
 * v2.0: Certification basée sur KYC validé, pas de requête vendeur
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

/**
 * Hook principal pour récupérer le statut de certification d'un vendeur
 * 
 * @param vendorId - ID du vendeur
 * @returns Objet contenant la certification, loading, error, isCertified et refetch
 * 
 * @example
 * const { certification, isCertified, loading } = useVendorCertification(vendorId);
 * if (isCertified) {
 *   // Afficher badge certifié
 * }
 */
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
