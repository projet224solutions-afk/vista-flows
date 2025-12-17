/**
 * CINETPAY SERVICE
 * Service pour l'intégration des paiements CinetPay (Orange Money, MTN Money, Moov Money)
 * 224Solutions - Payment System
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Configuration CinetPay depuis les variables d'environnement
const CINETPAY_CONFIG = {
  apiKey: import.meta.env.VITE_CINETPAY_API_KEY || '',
  siteId: import.meta.env.VITE_CINETPAY_SITE_ID || '',
  mode: import.meta.env.VITE_CINETPAY_MODE || 'sandbox',
  apiUrl: 'https://api-checkout.cinetpay.com/v2/payment',
  checkUrl: 'https://api-checkout.cinetpay.com/v2/payment/check',
  notifyUrl: import.meta.env.VITE_CINETPAY_NOTIFY_URL || '',
  returnUrl: import.meta.env.VITE_CINETPAY_RETURN_URL || '',
  cancelUrl: import.meta.env.VITE_CINETPAY_CANCEL_URL || '',
};

// Interface pour la requête de paiement
export interface CinetPayPaymentRequest {
  amount: number;
  currency: string;
  transactionId: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl?: string;
  cancelUrl?: string;
  notifyUrl?: string;
  metadata?: Record<string, any>;
}

// Interface pour la réponse de paiement
export interface CinetPayPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Service CinetPay pour gérer les paiements mobile money
 */
export class CinetPayService {
  /**
   * Valider la configuration CinetPay
   * @private
   */
  private static validateConfig(): { valid: boolean; error?: string } {
    if (!CINETPAY_CONFIG.apiKey) {
      return {
        valid: false,
        error: 'VITE_CINETPAY_API_KEY non configuré. Vérifiez votre fichier .env',
      };
    }

    if (!CINETPAY_CONFIG.siteId) {
      return {
        valid: false,
        error: 'VITE_CINETPAY_SITE_ID non configuré. Vérifiez votre fichier .env',
      };
    }

    return { valid: true };
  }

  /**
   * Initier un paiement CinetPay
   * @param request Détails de la requête de paiement
   * @returns Résultat avec URL de paiement si succès
   */
  static async initiatePayment(
    request: CinetPayPaymentRequest
  ): Promise<CinetPayPaymentResponse> {
    console.log('🚀 CinetPayService.initiatePayment appelé:', {
      amount: request.amount,
      currency: request.currency,
      transactionId: request.transactionId,
    });

    // Validation de la configuration
    const configValidation = this.validateConfig();
    if (!configValidation.valid) {
      console.error('❌ Configuration CinetPay invalide:', configValidation.error);
      toast.error(`Configuration invalide: ${configValidation.error}`);
      return {
        success: false,
        error: configValidation.error,
      };
    }

    // Validation des paramètres de la requête
    if (!request.amount || request.amount <= 0) {
      const error = 'Le montant doit être supérieur à 0';
      console.error('❌', error);
      toast.error(error);
      return { success: false, error };
    }

    if (!request.transactionId) {
      const error = 'Transaction ID manquant';
      console.error('❌', error);
      toast.error(error);
      return { success: false, error };
    }

    try {
      // Préparer les données de paiement pour CinetPay
      const paymentData = {
        apikey: CINETPAY_CONFIG.apiKey,
        site_id: CINETPAY_CONFIG.siteId,
        transaction_id: request.transactionId,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        customer_name: request.customerName,
        customer_surname: request.customerName.split(' ')[1] || request.customerName,
        customer_email: request.customerEmail,
        customer_phone_number: request.customerPhone,
        customer_address: 'Guinée',
        customer_city: 'Conakry',
        customer_country: 'GN',
        customer_state: 'GN',
        customer_zip_code: '00000',
        notify_url: request.notifyUrl || CINETPAY_CONFIG.notifyUrl,
        return_url: request.returnUrl || CINETPAY_CONFIG.returnUrl,
        cancel_url: request.cancelUrl || CINETPAY_CONFIG.cancelUrl,
        channels: 'ALL', // Orange Money, MTN Money, Moov Money
        metadata: JSON.stringify(request.metadata || {}),
        lang: 'fr',
      };

      console.log('📤 Envoi requête à CinetPay API...');
      console.log('URL:', CINETPAY_CONFIG.apiUrl);
      console.log('Site ID:', CINETPAY_CONFIG.siteId);
      console.log('Mode:', CINETPAY_CONFIG.mode);

      // Appel à l'API CinetPay
      const response = await fetch(CINETPAY_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      console.log('📥 Réponse CinetPay:', response.status, response.statusText);

      // Gestion spécifique de l'erreur 624 (Configuration invalide)
      if (response.status === 624) {
        const error = 'Configuration CinetPay invalide (erreur 624). Vérifiez vos clés API et Site ID.';
        console.error('🔴 Erreur CinetPay 624:', error);
        toast.error(error);
        return {
          success: false,
          error,
        };
      }

      const responseText = await response.text();
      console.log('📄 Réponse texte:', responseText.substring(0, 500));

      // Vérifier si la réponse contient l'erreur 624 dans le texte
      if (responseText.includes('624') || responseText.includes('UNKNOWN_ERROR')) {
        const error = 'Configuration CinetPay invalide (code 624). Vérifiez vos credentials dans .env';
        console.error('🔴 Erreur détectée dans réponse:', error);
        toast.error(error);
        return {
          success: false,
          error,
        };
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON:', parseError);
        toast.error('Erreur de communication avec CinetPay');
        return {
          success: false,
          error: 'Réponse invalide de CinetPay',
        };
      }

      console.log('📊 Données parsées:', data);

      // Vérifier le succès de la requête
      if (data.code === '201' && data.data?.payment_url) {
        console.log('✅ Paiement initié avec succès');
        console.log('🔗 URL de paiement:', data.data.payment_url);

        // Enregistrer la transaction dans Supabase
        await this.recordTransaction({
          transactionId: request.transactionId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          paymentUrl: data.data.payment_url,
          paymentToken: data.data.payment_token,
          customerEmail: request.customerEmail,
          customerPhone: request.customerPhone,
          customerName: request.customerName,
          metadata: request.metadata,
        });

        toast.success('Redirection vers CinetPay...');

        return {
          success: true,
          paymentUrl: data.data.payment_url,
          transactionId: request.transactionId,
        };
      } else {
        // Erreur retournée par CinetPay
        const errorMessage = data.message || data.description || 'Erreur lors de l\'initiation du paiement';
        console.error('❌ Erreur CinetPay:', errorMessage);
        console.error('Code:', data.code);
        toast.error(`Erreur CinetPay: ${errorMessage}`);

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      console.error('❌ Erreur réseau ou serveur:', error);
      toast.error('Erreur de connexion. Vérifiez votre réseau.');
      return {
        success: false,
        error: error.message || 'Erreur réseau',
      };
    }
  }

  /**
   * Enregistrer une transaction dans Supabase
   * @private
   */
  private static async recordTransaction(data: {
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    paymentUrl: string;
    paymentToken: string;
    customerEmail: string;
    customerPhone: string;
    customerName: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('cinetpay_transactions').insert({
        transaction_id: data.transactionId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        payment_url: data.paymentUrl,
        payment_token: data.paymentToken,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        customer_name: data.customerName,
        metadata: data.metadata || {},
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('❌ Erreur enregistrement transaction:', error);
        // Ne pas bloquer le paiement si l'enregistrement échoue
      } else {
        console.log('✅ Transaction enregistrée dans Supabase');
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement transaction:', error);
      // Ne pas bloquer le paiement si l'enregistrement échoue
    }
  }

  /**
   * Vérifier le statut d'une transaction
   * @param transactionId ID de la transaction à vérifier
   * @returns Statut de la transaction
   */
  static async checkTransactionStatus(transactionId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    console.log('🔍 Vérification statut transaction:', transactionId);

    // Validation de la configuration
    const configValidation = this.validateConfig();
    if (!configValidation.valid) {
      return {
        success: false,
        error: configValidation.error,
      };
    }

    try {
      const response = await fetch(CINETPAY_CONFIG.checkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: CINETPAY_CONFIG.apiKey,
          site_id: CINETPAY_CONFIG.siteId,
          transaction_id: transactionId,
        }),
      });

      const data = await response.json();

      if (data.code === '00') {
        // Transaction réussie
        console.log('✅ Transaction confirmée:', data);
        return {
          success: true,
          status: 'completed',
        };
      } else if (data.code === '600') {
        // Transaction échouée
        console.log('❌ Transaction échouée:', data);
        return {
          success: true,
          status: 'failed',
        };
      } else {
        // Transaction en attente
        console.log('⏳ Transaction en attente:', data);
        return {
          success: true,
          status: 'pending',
        };
      }
    } catch (error: any) {
      console.error('❌ Erreur vérification statut:', error);
      return {
        success: false,
        error: error.message || 'Erreur réseau',
      };
    }
  }
}
