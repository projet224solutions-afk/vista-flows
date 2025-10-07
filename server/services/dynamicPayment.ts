/**
 * Service de génération de liens de paiement dynamiques
 * Permet aux livreurs/taxis de créer des liens de paiement à la volée
 */

export interface PaymentLink {
  id: string;
  linkId: string;
  createdBy: string; // ID du livreur/taxi
  createdByType: 'delivery' | 'taxi_moto';
  amount: number;
  currency: string;
  description: string;
  customerPhone?: string;
  customerName?: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  paymentUrl: string;
  qrData: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
}

export interface CreatePaymentLinkData {
  createdBy: string;
  createdByType: 'delivery' | 'taxi_moto';
  amount: number;
  currency?: string;
  description: string;
  customerPhone?: string;
  customerName?: string;
  expiryMinutes?: number; // Default: 60 minutes
}

export class DynamicPaymentService {
  /**
   * Génère un ID de lien unique
   */
  private static generateLinkId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  /**
   * Crée un lien de paiement dynamique
   */
  static async createPaymentLink(data: CreatePaymentLinkData): Promise<PaymentLink> {
    const linkId = this.generateLinkId();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const expiryMinutes = data.expiryMinutes || 60;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
    const paymentUrl = `${baseUrl}/pay/${linkId}`;

    const qrData = JSON.stringify({
      type: 'PAYMENT_LINK',
      linkId,
      amount: data.amount,
      currency: data.currency || 'GNF',
      description: data.description,
      createdBy: data.createdBy,
      paymentUrl,
      expiresAt: expiresAt.toISOString()
    });

    const paymentLink: PaymentLink = {
      id,
      linkId,
      createdBy: data.createdBy,
      createdByType: data.createdByType,
      amount: data.amount,
      currency: data.currency || 'GNF',
      description: data.description,
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      status: 'pending',
      paymentUrl,
      qrData,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    };

    return paymentLink;
  }

  /**
   * Vérifie et récupère un lien de paiement
   */
  static async getPaymentLink(linkId: string): Promise<PaymentLink | null> {
    // TODO: Récupérer depuis la DB
    return null;
  }

  /**
   * Vérifie si un lien est expiré
   */
  static isExpired(link: PaymentLink): boolean {
    return new Date(link.expiresAt) < new Date();
  }

  /**
   * Traite le paiement d'un lien
   */
  static async processPayment(
    linkId: string,
    paymentData: {
      paymentMethod: 'mobile_money' | 'card' | 'wallet';
      customerInfo?: {
        name: string;
        phone: string;
        email?: string;
      };
    }
  ): Promise<{
    success: boolean;
    message: string;
    transactionId?: string;
  }> {
    // TODO: Implémenter la logique de paiement
    // 1. Vérifier que le lien existe et n'est pas expiré
    // 2. Appeler le processeur de paiement approprié
    // 3. Mettre à jour le statut du lien
    // 4. Envoyer la notification au créateur
    
    return {
      success: true,
      message: 'Payment processed successfully',
      transactionId: `TXN-${Date.now()}`
    };
  }

  /**
   * Annule un lien de paiement
   */
  static async cancelPaymentLink(linkId: string, userId: string): Promise<boolean> {
    // TODO: Vérifier que l'utilisateur est le créateur
    // TODO: Mettre à jour le statut en DB
    return true;
  }

  /**
   * Récupère les liens de paiement créés par un utilisateur
   */
  static async getUserPaymentLinks(userId: string, status?: PaymentLink['status']): Promise<PaymentLink[]> {
    // TODO: Récupérer depuis la DB avec filtre optionnel sur le statut
    return [];
  }

  /**
   * Obtient les statistiques de paiements pour un utilisateur
   */
  static async getPaymentStats(userId: string): Promise<{
    totalLinks: number;
    totalPaid: number;
    totalAmount: number;
    pendingAmount: number;
    currency: string;
  }> {
    // TODO: Calculer depuis la DB
    return {
      totalLinks: 0,
      totalPaid: 0,
      totalAmount: 0,
      pendingAmount: 0,
      currency: 'GNF'
    };
  }

  /**
   * Envoie une notification au créateur quand le paiement est effectué
   */
  private static async notifyCreator(link: PaymentLink): Promise<void> {
    // TODO: Implémenter la notification (SMS/Push/Email)
    console.log(`📲 Notification sent to ${link.createdBy}: Payment received for ${link.amount} ${link.currency}`);
  }

  /**
   * Nettoie les liens expirés (à exécuter périodiquement)
   */
  static async cleanExpiredLinks(): Promise<number> {
    // TODO: Supprimer ou archiver les liens expirés de plus de 30 jours
    return 0;
  }
}
