/**
 * Types pour la certification des vendeurs
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
  verified_at: string | null;
  verified_by: string | null;
  requested_at: string | null;
  internal_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function getCertificationStatusLabel(status: VendorCertificationStatus): string {
  switch (status) {
    case 'CERTIFIE': return 'Certifié';
    case 'EN_ATTENTE': return 'En attente';
    case 'SUSPENDU': return 'Suspendu';
    case 'NON_CERTIFIE':
    default: return 'Non certifié';
  }
}
