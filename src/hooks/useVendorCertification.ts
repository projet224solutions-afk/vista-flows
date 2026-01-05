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

      // Récupérer la vraie certification depuis vendor_certifications
      const { data: certification, error: certError } = await supabase
        .from('vendor_certifications')
        .select('*')
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (certError && certError.code !== 'PGRST116') {
        console.warn('Could not fetch vendor certification:', certError);
        setError(certError);
        setCertification(null);
        setLoading(false);
        return;
      }

      // Si pas de certification trouvée (PGRST116 = not found), c'est OK
      if (certification) {
        setCertification({
          id: certification.id,
          vendor_id: certification.vendor_id,
          status: certification.status as VendorCertificationStatus,
          verified_at: certification.verified_at,
          kyc_verified_at: certification.kyc_verified_at,
          kyc_status: certification.kyc_status,
          last_status_change: certification.last_status_change,
          internal_notes: certification.internal_notes,
          rejection_reason: certification.rejection_reason,
          created_at: certification.created_at,
          updated_at: certification.updated_at
        });
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
