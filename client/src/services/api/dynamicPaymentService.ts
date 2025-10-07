import { apiRequest } from "@/lib/queryClient";

export interface PaymentLink {
  id: string;
  linkId: string;
  createdBy: string;
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
  expiryMinutes?: number;
}

export interface PaymentStats {
  totalLinks: number;
  totalPaid: number;
  totalAmount: number;
  pendingAmount: number;
  currency: string;
}

export class DynamicPaymentApiService {
  /**
   * Crée un lien de paiement dynamique
   */
  static async createPaymentLink(data: CreatePaymentLinkData): Promise<PaymentLink> {
    const response = await apiRequest('/api/payment-links/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  }

  /**
   * Récupère un lien de paiement par son ID
   */
  static async getPaymentLink(linkId: string): Promise<PaymentLink> {
    const response = await apiRequest(`/api/payment-links/${linkId}`);
    return response.data;
  }

  /**
   * Traite un paiement
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
    const response = await apiRequest(`/api/payment-links/${linkId}/pay`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
    return response.data;
  }

  /**
   * Annule un lien de paiement
   */
  static async cancelPaymentLink(linkId: string): Promise<void> {
    await apiRequest(`/api/payment-links/${linkId}/cancel`, {
      method: 'POST'
    });
  }

  /**
   * Récupère les liens de paiement d'un utilisateur
   */
  static async getUserPaymentLinks(
    userId: string,
    status?: 'pending' | 'paid' | 'expired' | 'cancelled'
  ): Promise<PaymentLink[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiRequest(`/api/payment-links/user/${userId}${params}`);
    return response.data;
  }

  /**
   * Récupère les statistiques de paiements
   */
  static async getPaymentStats(userId: string): Promise<PaymentStats> {
    const response = await apiRequest(`/api/payment-links/user/${userId}/stats`);
    return response.data;
  }
}
