/**
 * Service de génération de badges taxi-moto avec QR code
 * Génère des badges digitaux avec photo, infos du conducteur et QR code de vérification
 */

import { db } from "../db.js";
import { taxiMotoBadges, profiles } from "../../shared/schema.js";
import { eq, and, or, desc } from "drizzle-orm";

export interface DriverInfo {
  id: string;
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
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  verificationUrl: string;
}

export class BadgeGeneratorService {
  /**
   * Génère un numéro de badge unique
   */
  private static generateBadgeNumber(driverId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    const prefix = driverId.substr(0, 3).toUpperCase();
    return `BADGE-${prefix}-${timestamp}-${random}`;
  }

  /**
   * Génère les données QR code pour le badge
   */
  private static generateQRData(badge: any, driver: DriverInfo): string {
    const data = {
      type: 'TAXI_MOTO_BADGE',
      badgeId: badge.id,
      badgeNumber: badge.badgeNumber,
      driverId: driver.id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      vehicleType: driver.vehicleType,
      syndicateName: driver.syndicateName || '',
      issuedDate: badge.issuedAt.toISOString(),
      expiryDate: badge.expiresAt.toISOString(),
      verificationUrl: `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/verify-badge/${badge.id}`
    };

    return JSON.stringify(data);
  }

  /**
   * Crée un nouveau badge pour un conducteur
   */
  static async createBadge(driver: DriverInfo): Promise<Badge> {
    const badgeNumber = this.generateBadgeNumber(driver.id);
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const [result] = await db.insert(taxiMotoBadges).values({
      badgeNumber,
      driverId: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      vehicleType: driver.vehicleType,
      syndicateId: driver.syndicateId,
      syndicateName: driver.syndicateName,
      photoUrl: driver.photoUrl,
      licenseNumber: driver.licenseNumber,
      city: driver.city,
      status: 'active',
      expiresAt,
      qrCodeData: ''
    }).returning();

    const qrData = this.generateQRData(result, driver);

    await db.update(taxiMotoBadges)
      .set({ qrCodeData: qrData })
      .where(eq(taxiMotoBadges.id, result.id));

    const verificationUrl = `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/verify-badge/${result.id}`;

    return {
      id: result.id,
      driverId: result.driverId,
      badgeNumber: result.badgeNumber,
      qrData,
      issuedDate: result.issuedAt!.toISOString(),
      expiryDate: result.expiresAt.toISOString(),
      isActive: result.status === 'active',
      status: result.status as 'active' | 'expired' | 'suspended' | 'revoked',
      verificationUrl
    };
  }

  /**
   * Vérifie un badge avec son QR code ou numéro
   */
  static async verifyBadge(badgeNumberOrQRData: string): Promise<{
    isValid: boolean;
    badge?: Badge;
    driver?: DriverInfo;
    reason?: string;
  }> {
    try {
      let badge: any = null;

      if (badgeNumberOrQRData.startsWith('{')) {
        const badgeData = JSON.parse(badgeNumberOrQRData);
        
        if (badgeData.type !== 'TAXI_MOTO_BADGE') {
          return { isValid: false, reason: 'Type de badge invalide' };
        }

        [badge] = await db.select()
          .from(taxiMotoBadges)
          .where(eq(taxiMotoBadges.badgeNumber, badgeData.badgeNumber));
      } else {
        [badge] = await db.select()
          .from(taxiMotoBadges)
          .where(eq(taxiMotoBadges.badgeNumber, badgeNumberOrQRData));
      }

      if (!badge) {
        return { isValid: false, reason: 'Badge non trouvé' };
      }

      if (badge.status === 'revoked') {
        return { isValid: false, reason: 'Badge révoqué' };
      }

      if (badge.status === 'suspended') {
        return { isValid: false, reason: 'Badge suspendu' };
      }

      const expiryDate = new Date(badge.expiresAt);
      if (expiryDate < new Date()) {
        if (badge.status === 'active') {
          await db.update(taxiMotoBadges)
            .set({ status: 'expired' })
            .where(eq(taxiMotoBadges.id, badge.id));
        }
        return { isValid: false, reason: 'Badge expiré' };
      }

      const verificationUrl = `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/verify-badge/${badge.id}`;

      return {
        isValid: true,
        badge: {
          id: badge.id,
          driverId: badge.driverId,
          badgeNumber: badge.badgeNumber,
          qrData: badge.qrCodeData,
          issuedDate: badge.issuedAt!.toISOString(),
          expiryDate: badge.expiresAt.toISOString(),
          isActive: badge.status === 'active',
          status: badge.status,
          verificationUrl
        },
        driver: {
          id: badge.driverId,
          firstName: badge.firstName,
          lastName: badge.lastName,
          phone: badge.phone,
          vehicleNumber: badge.vehicleNumber,
          vehicleType: badge.vehicleType,
          syndicateId: badge.syndicateId || undefined,
          syndicateName: badge.syndicateName || undefined,
          photoUrl: badge.photoUrl || undefined,
          licenseNumber: badge.licenseNumber || undefined,
          city: badge.city || undefined
        }
      };
      
    } catch (error) {
      console.error('Badge verification error:', error);
      return {
        isValid: false,
        reason: 'Erreur de vérification'
      };
    }
  }

  /**
   * Désactive un badge
   */
  static async deactivateBadge(badgeId: string, reason: 'suspended' | 'revoked' = 'suspended'): Promise<boolean> {
    try {
      await db.update(taxiMotoBadges)
        .set({ status: reason })
        .where(eq(taxiMotoBadges.id, badgeId));
      return true;
    } catch (error) {
      console.error('Badge deactivation error:', error);
      return false;
    }
  }

  /**
   * Renouvelle un badge expiré
   */
  static async renewBadge(badgeId: string, driver: DriverInfo): Promise<Badge> {
    const [oldBadge] = await db.select()
      .from(taxiMotoBadges)
      .where(eq(taxiMotoBadges.id, badgeId));

    if (oldBadge && oldBadge.status !== 'revoked') {
      await db.update(taxiMotoBadges)
        .set({ status: 'expired' })
        .where(eq(taxiMotoBadges.id, badgeId));
    }

    const badgeNumber = this.generateBadgeNumber(driver.id);
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const [result] = await db.insert(taxiMotoBadges).values({
      badgeNumber,
      driverId: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      vehicleType: driver.vehicleType,
      syndicateId: driver.syndicateId,
      syndicateName: driver.syndicateName,
      photoUrl: driver.photoUrl,
      licenseNumber: driver.licenseNumber,
      city: driver.city,
      status: 'active',
      expiresAt,
      renewedFrom: badgeId,
      qrCodeData: ''
    }).returning();

    const qrData = this.generateQRData(result, driver);

    await db.update(taxiMotoBadges)
      .set({ qrCodeData: qrData })
      .where(eq(taxiMotoBadges.id, result.id));

    const verificationUrl = `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/verify-badge/${result.id}`;

    return {
      id: result.id,
      driverId: result.driverId,
      badgeNumber: result.badgeNumber,
      qrData,
      issuedDate: result.issuedAt!.toISOString(),
      expiryDate: result.expiresAt.toISOString(),
      isActive: true,
      status: 'active',
      verificationUrl
    };
  }

  /**
   * Récupère tous les badges d'un conducteur
   */
  static async getDriverBadges(driverId: string): Promise<Badge[]> {
    const badges = await db.select()
      .from(taxiMotoBadges)
      .where(eq(taxiMotoBadges.driverId, driverId))
      .orderBy(desc(taxiMotoBadges.issuedAt));

    return badges.map(badge => ({
      id: badge.id,
      driverId: badge.driverId,
      badgeNumber: badge.badgeNumber,
      qrData: badge.qrCodeData,
      issuedDate: badge.issuedAt!.toISOString(),
      expiryDate: badge.expiresAt.toISOString(),
      isActive: badge.status === 'active',
      status: badge.status as 'active' | 'expired' | 'suspended' | 'revoked',
      verificationUrl: `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}/verify-badge/${badge.id}`
    }));
  }

  /**
   * Génère un badge SVG pour affichage/impression
   */
  static generateBadgeSVG(badge: Badge, driver: DriverInfo): string {
    const qrSize = 150;
    const badgeWidth = 350;
    const badgeHeight = 500;

    return `
      <svg width="${badgeWidth}" height="${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="${badgeWidth}" height="${badgeHeight}" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
        
        <!-- Header -->
        <rect width="${badgeWidth}" height="60" fill="#2563eb"/>
        <text x="${badgeWidth/2}" y="35" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="bold">
          TAXI-MOTO BADGE
        </text>
        
        <!-- Photo placeholder -->
        <rect x="100" y="80" width="150" height="150" fill="#e5e7eb" stroke="#9ca3af" stroke-width="1"/>
        <text x="175" y="160" text-anchor="middle" fill="#6b7280" font-size="12">PHOTO</text>
        
        <!-- Driver Info -->
        <text x="20" y="260" fill="#1f2937" font-size="14" font-weight="bold">
          ${driver.firstName} ${driver.lastName}
        </text>
        <text x="20" y="285" fill="#4b5563" font-size="12">
          ${driver.phone}
        </text>
        <text x="20" y="310" fill="#4b5563" font-size="12">
          Véhicule: ${driver.vehicleNumber}
        </text>
        <text x="20" y="335" fill="#4b5563" font-size="12">
          Type: ${driver.vehicleType}
        </text>
        ${driver.syndicateName ? `
        <text x="20" y="360" fill="#4b5563" font-size="12">
          Syndicat: ${driver.syndicateName}
        </text>
        ` : ''}
        
        <!-- Badge Number -->
        <text x="20" y="390" fill="#6b7280" font-size="10">
          Badge: ${badge.badgeNumber}
        </text>
        
        <!-- QR Code placeholder -->
        <rect x="${(badgeWidth-qrSize)/2}" y="${badgeHeight-qrSize-20}" width="${qrSize}" height="${qrSize}" fill="#000000"/>
        <text x="${badgeWidth/2}" y="${badgeHeight-5}" text-anchor="middle" fill="#6b7280" font-size="9">
          Scannez pour vérifier
        </text>
      </svg>
    `;
  }
}
