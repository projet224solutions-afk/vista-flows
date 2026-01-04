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

/**
 * Hook principal pour récupérer le statut de certification d'un vendeur
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

      // Vérifier la table vendors pour le statut de vérification
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, created_at, updated_at')
        .eq('user_id', vendorId)
        .maybeSingle();

      if (vendorError) {
        console.warn('Could not fetch vendor:', vendorError);
        setCertification(null);
        setLoading(false);
        return;
      }

      if (vendor) {
        const now = new Date().toISOString();
        // Simuler une certification basée sur les données du vendeur
        const cert: VendorCertification = {
          id: vendor.id,
          vendor_id: vendorId,
          status: 'NON_CERTIFIE' as VendorCertificationStatus,
          verified_at: null,
          kyc_verified_at: null,
          kyc_status: 'pending',
          last_status_change: vendor.updated_at || now,
          internal_notes: null,
          rejection_reason: null,
          created_at: vendor.created_at || now,
          updated_at: vendor.updated_at || now
        };
        setCertification(cert);
      } else {
        setCertification(null);
      }
    } catch (err) {
      console.error('Error fetching vendor certification:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertification();
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

// Re-export types for convenience
export type { VendorCertification, VendorCertificationStatus };
