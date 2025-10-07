/**
 * Service de génération de badges taxi-moto avec QR code
 * Génère des badges digitaux avec photo, infos du conducteur et QR code de vérification
 */

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
  private static generateQRData(badge: Badge, driver: DriverInfo): string {
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
      issuedDate: badge.issuedDate,
      expiryDate: badge.expiryDate,
      verificationUrl: badge.verificationUrl
    };

    return JSON.stringify(data);
  }

  /**
   * Crée un nouveau badge pour un conducteur
   */
  static async createBadge(driver: DriverInfo): Promise<Badge> {
    const badgeId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const badgeNumber = this.generateBadgeNumber(driver.id);
    const issuedDate = new Date().toISOString();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Valide 1 an

    const verificationUrl = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/verify-badge/${badgeId}`;

    const badge: Badge = {
      id: badgeId,
      driverId: driver.id,
      badgeNumber,
      qrData: '', // Sera rempli après
      issuedDate,
      expiryDate: expiryDate.toISOString(),
      isActive: true,
      verificationUrl
    };

    // Générer les données QR après création du badge
    badge.qrData = this.generateQRData(badge, driver);

    return badge;
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
      // Si c'est un JSON, c'est les données QR
      let badgeData: any;
      
      if (badgeNumberOrQRData.startsWith('{')) {
        badgeData = JSON.parse(badgeNumberOrQRData);
        
        // Vérifier que c'est bien un badge taxi-moto
        if (badgeData.type !== 'TAXI_MOTO_BADGE') {
          return {
            isValid: false,
            reason: 'Type de badge invalide'
          };
        }
        
        // Vérifier l'expiration
        const expiryDate = new Date(badgeData.expiryDate);
        if (expiryDate < new Date()) {
          return {
            isValid: false,
            reason: 'Badge expiré'
          };
        }

        return {
          isValid: true,
          badge: {
            id: badgeData.badgeId,
            driverId: badgeData.driverId,
            badgeNumber: badgeData.badgeNumber,
            qrData: badgeNumberOrQRData,
            issuedDate: badgeData.issuedDate,
            expiryDate: badgeData.expiryDate,
            isActive: true,
            verificationUrl: badgeData.verificationUrl
          },
          driver: {
            id: badgeData.driverId,
            firstName: badgeData.driverName.split(' ')[0],
            lastName: badgeData.driverName.split(' ').slice(1).join(' '),
            phone: badgeData.phone,
            vehicleNumber: badgeData.vehicleNumber,
            vehicleType: badgeData.vehicleType,
            syndicateName: badgeData.syndicateName
          }
        };
      }

      // Sinon c'est un numéro de badge
      // TODO: Implémenter la recherche en base de données
      return {
        isValid: false,
        reason: 'Badge non trouvé'
      };
      
    } catch (error) {
      return {
        isValid: false,
        reason: 'Erreur de vérification'
      };
    }
  }

  /**
   * Désactive un badge
   */
  static async deactivateBadge(badgeId: string): Promise<boolean> {
    // TODO: Implémenter la mise à jour en base de données
    return true;
  }

  /**
   * Renouvelle un badge expiré
   */
  static async renewBadge(badgeId: string, driver: DriverInfo): Promise<Badge> {
    return this.createBadge(driver);
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
