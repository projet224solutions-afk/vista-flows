/**
 * SERVICE PAIEMENT LIVRAISON - 224SOLUTIONS
 * Support de 5 méthodes: wallet, cash, mobile_money, card, paypal
 * Avec idempotence et audit trail
 */

import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethod {
  type: 'wallet' | 'mobile_money' | 'card' | 'cash' | 'paypal';
  details?: any;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

export class DeliveryPaymentService {
  /**
   * Payer une livraison avec le Wallet (idempotent via deliveryId)
   */
  static async payWithWallet(
    deliveryId: string,
    amount: number,
    customerId: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier si déjà payé (idempotence)
      const { data: existingDelivery } = await supabase
        .from('deliveries')
        .select('payment_status, payment_method')
        .eq('id', deliveryId)
        .single();

      if (existingDelivery?.payment_status === 'paid') {
        console.log('[Payment] Delivery already paid, returning success (idempotent)');
        return {
          success: true,
          transaction_id: deliveryId
        };
      }

      // Vérifier le solde du wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', customerId)
        .single();

      if (walletError || !wallet) {
        throw new Error('Wallet introuvable');
      }

      if (wallet.balance < amount) {
        return {
          success: false,
          error: 'Solde insuffisant'
        };
      }

      // Appeler l'edge function pour le paiement
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'pay',
          userId: customerId,
          amount: amount,
          description: `Paiement livraison ${deliveryId}`,
          metadata: { deliveryId }
        }
      });

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Erreur lors du paiement'
        };
      }

      // Mettre à jour le statut de paiement de la livraison
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          payment_status: 'paid',
          payment_method: 'wallet'
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      // Log audit trail
      await this.logPayment(deliveryId, customerId, amount, 'wallet', 'success');

      return {
        success: true,
        transaction_id: data.transactionId
      };
    } catch (error: any) {
      console.error('[DeliveryPayment] Wallet payment error:', error);
      await this.logPayment(deliveryId, customerId, amount, 'wallet', 'failed', error.message);
      return {
        success: false,
        error: error.message || 'Erreur lors du paiement'
      };
    }
  }

  /**
   * Payer en espèces (cash)
   */
  static async payWithCash(
    deliveryId: string,
    amount: number,
    customerId: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier idempotence
      const { data: existingDelivery } = await supabase
        .from('deliveries')
        .select('payment_status')
        .eq('id', deliveryId)
        .single();

      if (existingDelivery?.payment_status === 'paid') {
        return { success: true, transaction_id: deliveryId };
      }

      // Mettre à jour le statut (cash sera collecté à la livraison)
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          payment_status: 'pending',
          payment_method: 'cash'
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      await this.logPayment(deliveryId, customerId, amount, 'cash', 'pending');

      return {
        success: true,
        transaction_id: `cash-${deliveryId}`
      };
    } catch (error: any) {
      console.error('[DeliveryPayment] Cash payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Payer avec Mobile Money (Orange, MTN, Moov)
   */
  static async payWithMobileMoney(
    deliveryId: string,
    amount: number,
    customerId: string,
    phoneNumber: string,
    provider: 'orange' | 'mtn' | 'moov'
  ): Promise<PaymentResult> {
    try {
      // Vérifier idempotence
      const { data: existingDelivery } = await supabase
        .from('deliveries')
        .select('payment_status')
        .eq('id', deliveryId)
        .single();

      if (existingDelivery?.payment_status === 'paid') {
        return { success: true, transaction_id: deliveryId };
      }

      // Validation numéro de téléphone
      if (!/^(224)?\d{9}$/.test(phoneNumber)) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide (format: 622123456 ou 224622123456)'
        };
      }

      // TODO: Intégrer l'API du provider (Orange Money, MTN, Moov)
      // Pour l'instant, on simule le paiement
      console.log(`[MobileMoney] Processing ${provider} payment for ${phoneNumber}`);

      // Mettre à jour le statut
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          payment_status: 'paid',
          payment_method: 'mobile_money'
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      await this.logPayment(deliveryId, customerId, amount, 'mobile_money', 'success', `Provider: ${provider}`);

      return {
        success: true,
        transaction_id: `mm-${provider}-${deliveryId}`
      };
    } catch (error: any) {
      console.error('[DeliveryPayment] Mobile Money payment error:', error);
      await this.logPayment(deliveryId, customerId, amount, 'mobile_money', 'failed', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Payer avec carte bancaire (Stripe)
   */
  static async payWithCard(
    deliveryId: string,
    amount: number,
    customerId: string,
    cardToken: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier idempotence
      const { data: existingDelivery } = await supabase
        .from('deliveries')
        .select('payment_status')
        .eq('id', deliveryId)
        .single();

      if (existingDelivery?.payment_status === 'paid') {
        return { success: true, transaction_id: deliveryId };
      }

      // Validation basique du token
      if (!cardToken || cardToken.length < 10) {
        return {
          success: false,
          error: 'Token de carte invalide'
        };
      }

      // TODO: Intégrer Stripe SDK
      console.log('[Card] Processing card payment with token:', cardToken.substring(0, 10) + '...');

      // Mettre à jour le statut
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          payment_status: 'paid',
          payment_method: 'card'
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      await this.logPayment(deliveryId, customerId, amount, 'card', 'success');

      return {
        success: true,
        transaction_id: `card-${deliveryId}`
      };
    } catch (error: any) {
      console.error('[DeliveryPayment] Card payment error:', error);
      await this.logPayment(deliveryId, customerId, amount, 'card', 'failed', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Payer avec PayPal
   */
  static async payWithPayPal(
    deliveryId: string,
    amount: number,
    customerId: string,
    paypalEmail: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier idempotence
      const { data: existingDelivery } = await supabase
        .from('deliveries')
        .select('payment_status')
        .eq('id', deliveryId)
        .single();

      if (existingDelivery?.payment_status === 'paid') {
        return { success: true, transaction_id: deliveryId };
      }

      // Validation email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paypalEmail)) {
        return {
          success: false,
          error: 'Email PayPal invalide'
        };
      }

      // TODO: Intégrer PayPal SDK
      console.log('[PayPal] Processing payment for:', paypalEmail);

      // Mettre à jour le statut
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          payment_status: 'paid',
          payment_method: 'paypal'
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      await this.logPayment(deliveryId, customerId, amount, 'paypal', 'success');

      return {
        success: true,
        transaction_id: `paypal-${deliveryId}`
      };
    } catch (error: any) {
      console.error('[DeliveryPayment] PayPal payment error:', error);
      await this.logPayment(deliveryId, customerId, amount, 'paypal', 'failed', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logger les transactions pour audit trail
   */
  private static async logPayment(
    deliveryId: string,
    userId: string,
    amount: number,
    method: string,
    status: 'success' | 'failed' | 'pending',
    notes?: string
  ): Promise<void> {
    try {
      await supabase.from('wallet_logs').insert({
        user_id: userId,
        amount: amount,
        type: 'payment',
        description: `Delivery payment ${deliveryId} via ${method} - ${status}`,
        metadata: {
          deliveryId,
          paymentMethod: method,
          status,
          notes
        }
      });
    } catch (error) {
      console.error('[DeliveryPayment] Failed to log payment:', error);
    }
  }
}
