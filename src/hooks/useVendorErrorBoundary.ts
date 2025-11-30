/**
 * Hook pour gérer les erreurs de l'interface vendeur
 * Capture centralisée des erreurs produits, commandes, paiement, API
 */

import { useState, useCallback } from 'react';

export type VendorErrorType = 
  | 'product'        // Erreurs gestion produits
  | 'order'          // Erreurs commandes
  | 'payment'        // Erreurs paiement
  | 'network'        // Erreurs réseau/API
  | 'upload'         // Erreurs upload fichiers
  | 'inventory'      // Erreurs stock/inventaire
  | 'kyc'            // Vérification KYC bloquée
  | 'subscription'   // Abonnement expiré/insuffisant
  | 'permission'     // Permissions refusées
  | 'validation'     // Erreurs validation formulaire
  | 'unknown';       // Autres erreurs

interface VendorError {
  type: VendorErrorType;
  message: string;
}

export function useVendorErrorBoundary() {
  const [error, setError] = useState<VendorError | null>(null);

  const captureError = useCallback((
    type: VendorErrorType,
    message: string,
    originalError?: any
  ) => {
    console.error(`[VendorError] ${type}:`, message, originalError);
    setError({ type, message });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    captureError,
    clearError,
  };
}
