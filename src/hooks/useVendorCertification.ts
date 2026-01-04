/**
 * HOOK: useVendorCertification
 * Hook simplifié - la table vendor_certifications n'existe pas encore
 * Retourne toujours null pour le moment
 * 224SOLUTIONS
 */

import { useState } from 'react';
import { VendorCertification } from '@/types/vendorCertification';

interface UseVendorCertificationResult {
  certification: VendorCertification | null;
  loading: boolean;
  error: Error | null;
  isCertified: boolean;
  refetch: () => Promise<void>;
}

export function useVendorCertification(vendorId: string | undefined): UseVendorCertificationResult {
  // La table vendor_certifications n'existe pas encore
  // Ce hook retourne null en attendant l'implémentation
  const [certification] = useState<VendorCertification | null>(null);
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  const refetch = async () => {
    // No-op pour le moment
  };

  return {
    certification,
    loading,
    error,
    isCertified: false,
    refetch
  };
}

/**
 * Hook pour demander une certification (placeholder)
 */
export function useRequestCertification() {
  const [requesting, setRequesting] = useState(false);

  const requestCertification = async () => {
    // Placeholder - à implémenter quand la table existera
    console.warn('La fonctionnalité de certification n\'est pas encore implémentée');
    return false;
  };

  return {
    requestCertification,
    requesting
  };
}
