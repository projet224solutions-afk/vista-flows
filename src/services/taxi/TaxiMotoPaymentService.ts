/**
 * SERVICE PAIEMENT TAXI MOTO - 224SOLUTIONS
 * Intégration avec le module Wallet existant
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

export class TaxiMotoPaymentService {
  /**
   * Payer une course avec le Wallet (idempotent via rideId)
   */
  static async payWithWallet(
    rideId: string,
    amount: number,
    customerId: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier si déjà payé (idempotence)
      const { data: existingRide } = await supabase
        .from('taxi_trips')
        .select('payment_status, payment_method')
        .eq('id', rideId)
        .single();

      if (existingRide?.payment_status === 'paid') {
        console.log('[Payment] Ride already paid, returning success (idempotent)');
        return {
          success: true,
          transaction_id: rideId // Use rideId as idempotency key
        };
      }

      // Vérifier le solde du wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', customerId)
        .single();

      if (walletError || !wallet) {
        return {
          success: false,
          error: 'Wallet introuvable'
        };
      }

      if (wallet.balance < amount) {
        return {
          success: false,
          error: 'Solde insuffisant'
        };
      }

      // Effectuer le paiement via l'edge function wallet-operations (avec clé idempotente)
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'taxi_payment',
          amount,
          ride_id: rideId, // Idempotency key
          idempotency_key: rideId,
          description: `Paiement course Taxi Moto #${rideId.slice(0, 8)}`
        }
      });

      if (error) {
        console.error('[Payment] Wallet payment error:', error);
        // Log audit trail
        await (supabase.from as any)('wallet_logs').insert({
          user_id: customerId,
          operation: 'taxi_payment_failed',
          amount,
          context: { ride_id: rideId, error: error.message }
        });
        
        return {
          success: false,
          error: error.message || 'Erreur de paiement'
        };
      }

      // Mettre à jour le statut de paiement de la course
      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'paid',
          payment_method: 'wallet',
          paid_at: new Date().toISOString()
        })
        .eq('id', rideId);

      // Log audit success
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_success',
        amount,
        context: { ride_id: rideId, transaction_id: data?.transaction_id }
      });

      return {
        success: true,
        transaction_id: data?.transaction_id || rideId
      };
    } catch (err: any) {
      console.error('[Payment] Error:', err);
      return {
        success: false,
        error: err.message || 'Erreur système'
      };
    }
  }

  /**
   * Payer une course avec Mobile Money (idempotent)
   */
  static async payWithMobileMoney(
    rideId: string,
    amount: number,
    customerId: string,
    phoneNumber: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier si déjà payé (idempotence)
      const { data: existingRide } = await supabase
        .from('taxi_trips')
        .select('payment_status, payment_method')
        .eq('id', rideId)
        .single();

      if (existingRide?.payment_status === 'paid') {
        console.log('[Payment] Ride already paid (Mobile Money), returning success');
        return {
          success: true,
          transaction_id: rideId
        };
      }

      // TODO: Intégrer avec Orange Money, MTN Money, Moov Money
      // Simulation pour l'instant avec validation du numéro
      if (!phoneNumber || phoneNumber.length < 8) {
        return {
          success: false,
          error: 'Numéro de téléphone invalide'
        };
      }
      
      // Mettre à jour le statut
      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'paid',
          payment_method: 'mobile_money',
          payment_reference: phoneNumber,
          paid_at: new Date().toISOString()
        })
        .eq('id', rideId);

      // Log audit
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_mobile_money',
        amount,
        context: { ride_id: rideId, phone: phoneNumber }
      });

      return {
        success: true,
        transaction_id: `MM-${Date.now()}`
      };
    } catch (err: any) {
      console.error('[Payment] Mobile Money error:', err);
      // Log échec
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_mobile_money_failed',
        amount,
        context: { ride_id: rideId, error: err.message }
      });
      return {
        success: false,
        error: err.message || 'Erreur Mobile Money'
      };
    }
  }

  /**
   * Payer une course en espèces (cash) - idempotent
   */
  static async payWithCash(
    rideId: string,
    customerId: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier si déjà payé
      const { data: existingRide } = await supabase
        .from('taxi_trips')
        .select('payment_status, payment_method')
        .eq('id', rideId)
        .single();

      if (existingRide?.payment_status === 'paid') {
        console.log('[Payment] Ride already paid (Cash), returning success');
        return {
          success: true,
          transaction_id: rideId
        };
      }

      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'paid',
          payment_method: 'cash',
          paid_at: new Date().toISOString()
        })
        .eq('id', rideId);

      // Log audit
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_cash',
        amount: 0, // Montant sera dans taxi_trips
        context: { ride_id: rideId }
      });

      return {
        success: true,
        transaction_id: `CASH-${Date.now()}`
      };
    } catch (err: any) {
      console.error('[Payment] Cash payment error:', err);
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_cash_failed',
        amount: 0,
        context: { ride_id: rideId, error: err.message }
      });
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Payer une course avec carte bancaire (idempotent)
   */
  static async payWithCard(
    rideId: string,
    amount: number,
    customerId: string,
    cardToken: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier si déjà payé
      const { data: existingRide } = await supabase
        .from('taxi_trips')
        .select('payment_status, payment_method')
        .eq('id', rideId)
        .single();

      if (existingRide?.payment_status === 'paid') {
        console.log('[Payment] Ride already paid (Card), returning success');
        return {
          success: true,
          transaction_id: rideId
        };
      }

      // TODO: Intégrer Stripe, Flutterwave, ou autre passerelle
      // Validation basique du token pour l'instant
      if (!cardToken || cardToken.length < 10) {
        return {
          success: false,
          error: 'Token de carte invalide'
        };
      }

      // Simuler le paiement carte (à remplacer par vraie intégration)
      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'paid',
          payment_method: 'card',
          payment_reference: cardToken.slice(-4), // Garder 4 derniers chiffres
          paid_at: new Date().toISOString()
        })
        .eq('id', rideId);

      // Log audit
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_card',
        amount,
        context: { ride_id: rideId, card_last4: cardToken.slice(-4) }
      });

      return {
        success: true,
        transaction_id: `CARD-${Date.now()}`
      };
    } catch (err: any) {
      console.error('[Payment] Card payment error:', err);
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_card_failed',
        amount,
        context: { ride_id: rideId, error: err.message }
      });
      return {
        success: false,
        error: err.message || 'Erreur de paiement par carte'
      };
    }
  }

  /**
   * Payer une course avec PayPal (idempotent)
   */
  static async payWithPayPal(
    rideId: string,
    amount: number,
    customerId: string,
    paypalEmail: string
  ): Promise<PaymentResult> {
    try {
      // Vérifier si déjà payé
      const { data: existingRide } = await supabase
        .from('taxi_trips')
        .select('payment_status, payment_method')
        .eq('id', rideId)
        .single();

      if (existingRide?.payment_status === 'paid') {
        console.log('[Payment] Ride already paid (PayPal), returning success');
        return {
          success: true,
          transaction_id: rideId
        };
      }

      // TODO: Intégrer PayPal SDK
      // Validation email pour l'instant
      if (!paypalEmail || !paypalEmail.includes('@')) {
        return {
          success: false,
          error: 'Email PayPal invalide'
        };
      }

      // Simuler paiement PayPal (à remplacer par vraie API PayPal)
      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'paid',
          payment_method: 'paypal',
          payment_reference: paypalEmail,
          paid_at: new Date().toISOString()
        })
        .eq('id', rideId);

      // Log audit
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_paypal',
        amount,
        context: { ride_id: rideId, paypal_email: paypalEmail }
      });

      return {
        success: true,
        transaction_id: `PAYPAL-${Date.now()}`
      };
    } catch (err: any) {
      console.error('[Payment] PayPal payment error:', err);
      await (supabase.from as any)('wallet_logs').insert({
        user_id: customerId,
        operation: 'taxi_payment_paypal_failed',
        amount,
        context: { ride_id: rideId, error: err.message }
      });
      return {
        success: false,
        error: err.message || 'Erreur de paiement PayPal'
      };
    }
  }

  /**
   * Transférer les gains au chauffeur
   */
  static async transferToDriver(
    driverId: string,
    amount: number,
    rideId: string
  ): Promise<boolean> {
    try {
      // Appeler l'edge function pour le transfert
      const { error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'driver_earning',
          recipient_id: driverId,
          amount,
          ride_id: rideId,
          description: `Gains course #${rideId.slice(0, 8)}`
        }
      });

      if (error) {
        console.error('[Payment] Transfer error:', error);
        return false;
      }

      // Mettre à jour les statistiques du chauffeur
      await supabase.rpc('increment_driver_earnings' as any, {
        p_driver_id: driverId,
        p_amount: amount
      });

      return true;
    } catch (err) {
      console.error('[Payment] Transfer error:', err);
      return false;
    }
  }

  /**
   * Obtenir l'historique des paiements
   */
  static async getPaymentHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('taxi_trips')
        .select('*')
        .or(`customer_id.eq.${userId},driver_id.eq.${userId}`)
        .eq('payment_status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[Payment] Error fetching history:', err);
      return [];
    }
  }

  /**
   * Calculer le revenu total d'un chauffeur
   */
  static async getDriverEarnings(
    driverId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ total: number; count: number }> {
    try {
      let query = supabase
        .from('taxi_trips')
        .select('driver_share')
        .eq('driver_id', driverId)
        .eq('payment_status', 'paid');

      if (startDate) {
        query = query.gte('paid_at', startDate);
      }
      if (endDate) {
        query = query.lte('paid_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.reduce((sum, trip) => sum + (trip.driver_share || 0), 0) || 0;
      const count = data?.length || 0;

      return { total, count };
    } catch (err) {
      console.error('[Payment] Error calculating earnings:', err);
      return { total: 0, count: 0 };
    }
  }

  /**
   * Calculer les revenus de la plateforme (PDG)
   */
  static async getPlatformRevenue(
    startDate?: string,
    endDate?: string
  ): Promise<{ total: number; count: number }> {
    try {
      let query = supabase
        .from('taxi_trips')
        .select('platform_fee')
        .eq('payment_status', 'paid');

      if (startDate) {
        query = query.gte('paid_at', startDate);
      }
      if (endDate) {
        query = query.lte('paid_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.reduce((sum, trip) => sum + (trip.platform_fee || 0), 0) || 0;
      const count = data?.length || 0;

      return { total, count };
    } catch (err) {
      console.error('[Payment] Error calculating platform revenue:', err);
      return { total: 0, count: 0 };
    }
  }
}
