/**
 * VENDOR CERTIFICATION TYPES
 * Types TypeScript pour le système de certification vendeur
 * 224SOLUTIONS
 */

export type VendorCertificationStatus = 
  | 'NON_CERTIFIE'
  | 'EN_ATTENTE'
  | 'CERTIFIE'
  | 'SUSPENDU';

export interface VendorCertification {
  id: string;
  vendor_id: string;
  status: VendorCertificationStatus;
  
  // Vérification
  verified_by: string | null;
  verified_at: string | null;
  
  // Historique
  requested_at: string;
  last_status_change: string;
  
  // Notes
  internal_notes: string | null;
  rejection_reason: string | null;
  
  // Score paiement (extension future)
  payment_score: number;
  successful_transactions: number;
  failed_transactions: number;
  total_revenue: number;
  
  // Métadonnées
  created_at: string;
  updated_at: string;
}

export interface CertifiedVendor {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: VendorCertificationStatus;
  verified_at: string | null;
  payment_score: number;
  successful_transactions: number;
  total_revenue: number;
}

export interface VerifyVendorRequest {
  vendor_id: string;
  action: 'CERTIFY' | 'SUSPEND' | 'REJECT' | 'REQUEST_INFO';
  internal_notes?: string;
  rejection_reason?: string;
}

export interface VerifyVendorResponse {
  success: boolean;
  message: string;
  certification: VendorCertification;
  action: string;
  verified_by: string;
  vendor_name: string;
}

// Helper functions
export const getCertificationStatusLabel = (status: VendorCertificationStatus): string => {
  switch (status) {
    case 'NON_CERTIFIE':
      return 'Non certifié';
    case 'EN_ATTENTE':
      return 'En attente';
    case 'CERTIFIE':
      return 'Certifié';
    case 'SUSPENDU':
      return 'Suspendu';
    default:
      return 'Inconnu';
  }
};

export const getCertificationStatusColor = (status: VendorCertificationStatus): string => {
  switch (status) {
    case 'NON_CERTIFIE':
      return 'gray';
    case 'EN_ATTENTE':
      return 'yellow';
    case 'CERTIFIE':
      return 'green';
    case 'SUSPENDU':
      return 'red';
    default:
      return 'gray';
  }
};

export const isCertified = (status: VendorCertificationStatus): boolean => {
  return status === 'CERTIFIE';
};
