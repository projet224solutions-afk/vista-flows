/**
 * SERVICE PAIEMENT TAXI MOTO - 224SOLUTIONS
 * Intégration avec le module Wallet existant
 */

import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethod {
  type: 'wallet' | 'mobile_money' | 'card';
  details?: any;
}

export interface PaymentResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

export class TaxiMotoPaymentService {
  /**
   * Payer une course avec le Wallet
   */
  static async payWithWallet(
    rideId: string,
    amount: number,
    customerId: string
  ): Promise<PaymentResult> {
    try {
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

      // Effectuer le paiement via l'edge function wallet-operations
      const { data, error } = await supabase.functions.invoke('wallet-operations', {
        body: {
          operation: 'taxi_payment',
          amount,
          ride_id: rideId,
          description: `Paiement course Taxi Moto #${rideId.slice(0, 8)}`
        }
      });

      if (error) {
        console.error('[Payment] Wallet payment error:', error);
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

      return {
        success: true,
        transaction_id: data?.transaction_id
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
   * Payer une course avec Mobile Money
   */
  static async payWithMobileMoney(
    rideId: string,
    amount: number,
    phoneNumber: string
  ): Promise<PaymentResult> {
    try {
      // TODO: Intégrer avec le fournisseur Mobile Money (Orange Money, MTN, etc.)
      // Pour l'instant, simulation
      
      // Mettre à jour le statut
      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'pending',
          payment_method: 'mobile_money',
          payment_reference: phoneNumber
        })
        .eq('id', rideId);

      return {
        success: true,
        transaction_id: `MM-${Date.now()}`
      };
    } catch (err: any) {
      console.error('[Payment] Mobile Money error:', err);
      return {
        success: false,
        error: err.message || 'Erreur Mobile Money'
      };
    }
  }

  /**
   * Payer une course en espèces
   */
  static async payWithCash(rideId: string): Promise<PaymentResult> {
    try {
      await supabase
        .from('taxi_trips')
        .update({
          payment_status: 'paid',
          payment_method: 'cash',
          paid_at: new Date().toISOString()
        })
        .eq('id', rideId);

      return {
        success: true,
        transaction_id: `CASH-${Date.now()}`
      };
    } catch (err: any) {
      console.error('[Payment] Cash payment error:', err);
      return {
        success: false,
        error: err.message
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
