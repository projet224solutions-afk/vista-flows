import { apiRequest } from "@/lib/queryClient";

export interface DriverInfo {
  driverId: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: 'moto_economique' | 'moto_rapide' | 'moto_premium';
  syndicateId?: string;
  syndicateName?: string;
  photoUrl?: string;
  licenseNumber?: string;
  city?: string;
}

export interface Badge {
  id: string;
  driverId: string;
  badgeNumber: string;
  qrData: string;
  issuedDate: string;
  expiryDate: string;
  isActive: boolean;
  verificationUrl: string;
}

export interface BadgeVerificationResult {
  isValid: boolean;
  badge?: Badge;
  driver?: DriverInfo;
  reason?: string;
}

export class BadgeService {
  /**
   * Crée un nouveau badge pour un conducteur taxi-moto
   */
  static async createBadge(driverInfo: DriverInfo): Promise<Badge> {
    const response = await apiRequest('/api/badges/create', {
      method: 'POST',
      body: JSON.stringify(driverInfo)
    });
    return response.data;
  }

  /**
   * Vérifie un badge via QR code ou numéro
   */
  static async verifyBadge(badgeData: string): Promise<BadgeVerificationResult> {
    const response = await apiRequest('/api/badges/verify', {
      method: 'POST',
      body: JSON.stringify({ badgeData })
    });
    return response.data;
  }

  /**
   * Désactive un badge
   */
  static async deactivateBadge(badgeId: string): Promise<void> {
    await apiRequest(`/api/badges/${badgeId}/deactivate`, {
      method: 'POST'
    });
  }

  /**
   * Renouvelle un badge expiré
   */
  static async renewBadge(badgeId: string, driverInfo: DriverInfo): Promise<Badge> {
    const response = await apiRequest(`/api/badges/${badgeId}/renew`, {
      method: 'POST',
      body: JSON.stringify(driverInfo)
    });
    return response.data;
  }

  /**
   * Obtient le SVG du badge pour affichage/impression
   */
  static async getBadgeSVG(badgeId: string): Promise<string> {
    const response = await apiRequest(`/api/badges/${badgeId}/svg`);
    return response.data;
  }
}
