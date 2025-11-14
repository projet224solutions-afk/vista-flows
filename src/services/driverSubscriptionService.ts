import { supabase } from '@/integrations/supabase/client';

export interface DriverSubscription {
  id: string;
  user_id: string;
  type: 'taxi' | 'livreur';
  price: number;
  status: 'active' | 'expired' | 'pending' | 'suspended';
  start_date: string;
  end_date: string;
  payment_method: 'wallet' | 'mobile_money' | 'card';
  transaction_id?: string;
  days_remaining?: number;
  metadata?: any;
}

export interface DriverSubscriptionConfig {
  id: string;
  subscription_type: 'taxi' | 'livreur' | 'both';
  price: number;
  duration_days: number;
  is_active: boolean;
}

export interface SubscriptionRevenue {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  transaction_id?: string;
  created_at: string;
}

export class DriverSubscriptionService {
  // Obtenir la configuration de l'abonnement
  static async getConfig(): Promise<DriverSubscriptionConfig | null> {
    const { data, error } = await supabase
      .from('driver_subscription_config')
      .select('*')
      .eq('subscription_type', 'both')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Erreur récupération config:', error);
      return null;
    }
    return data as DriverSubscriptionConfig;
  }

  // Mettre à jour le prix (Admin seulement)
  static async updatePrice(newPrice: number): Promise<boolean> {
    const { error } = await supabase
      .from('driver_subscription_config')
      .update({ price: newPrice, updated_at: new Date().toISOString() })
      .eq('subscription_type', 'both');

    if (error) {
      console.error('Erreur mise à jour prix:', error);
      return false;
    }
    return true;
  }

  // Vérifier si l'utilisateur a un abonnement actif
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('has_active_driver_subscription', { p_user_id: userId });

    if (error) {
      console.error('Erreur vérification abonnement:', error);
      return false;
    }
    return data || false;
  }

  // Obtenir l'abonnement actif de l'utilisateur
  static async getActiveSubscription(userId: string): Promise<DriverSubscription | null> {
    const { data, error } = await supabase
      .rpc('get_active_driver_subscription', { p_user_id: userId });

    if (error) {
      console.error('Erreur récupération abonnement:', error);
      return null;
    }
    if (data && data.length > 0) {
      return { ...data[0], user_id: userId } as DriverSubscription;
    }
    return null;
  }

  // S'abonner ou renouveler (via Wallet)
  static async subscribeWithWallet(
    userId: string,
    userType: 'taxi' | 'livreur'
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      // Vérifier le solde du wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (walletError || !walletData) {
        return { success: false, error: 'Wallet non trouvé' };
      }

      // Récupérer le prix
      const config = await this.getConfig();
      if (!config) {
        return { success: false, error: 'Configuration non disponible' };
      }

      if (walletData.balance < config.price) {
        return { success: false, error: 'Solde insuffisant' };
      }

      // Créer une transaction d'abonnement
      const transactionId = `SUB-${Date.now()}-${userId.substring(0, 8)}`;

      // Débiter le wallet
      const { error: debitError } = await supabase
        .from('wallets')
        .update({ 
          balance: walletData.balance - config.price,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (debitError) {
        return { success: false, error: 'Erreur débit wallet' };
      }

      // Enregistrer la transaction dans enhanced_transactions
      await supabase.from('enhanced_transactions').insert({
        sender_id: userId,
        receiver_id: userId, // Système
        amount: config.price,
        currency: 'GNF',
        method: 'wallet',
        status: 'completed',
        metadata: { 
          type: 'subscription',
          subscription_type: userType, 
          transaction_id: transactionId,
          description: `Abonnement ${userType === 'taxi' ? 'Taxi Moto' : 'Livreur'} - 30 jours`
        }
      });

      // Créer l'abonnement via RPC
      const { data: subscriptionId, error: subError } = await supabase
        .rpc('subscribe_driver', {
          p_user_id: userId,
          p_type: userType,
          p_payment_method: 'wallet',
          p_transaction_id: transactionId
        });

      if (subError) {
        console.error('Erreur création abonnement:', subError);
        // Tenter de recréditer le wallet en cas d'erreur
        await supabase
          .from('wallets')
          .update({ balance: walletData.balance })
          .eq('user_id', userId);
        return { success: false, error: 'Erreur création abonnement' };
      }

      return { success: true, subscriptionId };
    } catch (error) {
      console.error('Erreur abonnement wallet:', error);
      return { success: false, error: 'Erreur système' };
    }
  }

  // Obtenir tous les abonnements (Admin)
  static async getAllSubscriptions(
    status?: string,
    limit: number = 50
  ): Promise<DriverSubscription[]> {
    let query = supabase
      .from('driver_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur récupération abonnements:', error);
      return [];
    }
    return (data || []) as DriverSubscription[];
  }

  // Obtenir les revenus d'abonnement (Admin)
  static async getRevenues(
    startDate?: string,
    endDate?: string
  ): Promise<SubscriptionRevenue[]> {
    let query = supabase
      .from('driver_subscription_revenues')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur récupération revenus:', error);
      return [];
    }
    return data || [];
  }

  // Suspendre un abonnement (Admin)
  static async suspendSubscription(subscriptionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('driver_subscriptions')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Erreur suspension abonnement:', error);
      return false;
    }
    return true;
  }

  // Réactiver un abonnement (Admin)
  static async reactivateSubscription(subscriptionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('driver_subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);

    if (error) {
      console.error('Erreur réactivation abonnement:', error);
      return false;
    }
    return true;
  }

  // Marquer les abonnements expirés (Cron / Admin)
  static async markExpiredSubscriptions(): Promise<number> {
    const { data, error } = await supabase
      .rpc('mark_expired_driver_subscriptions');

    if (error) {
      console.error('Erreur marquage expirés:', error);
      return 0;
    }
    return data || 0;
  }

  // Statistiques pour le dashboard Admin
  static async getStatistics(): Promise<{
    total_active: number;
    total_expired: number;
    total_revenue: number;
    revenue_this_month: number;
    active_taxi: number;
    active_livreur: number;
  }> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: total_active },
      { count: total_expired },
      { data: revenues },
      { data: revenuesMonth },
      { count: active_taxi },
      { count: active_livreur }
    ] = await Promise.all([
      supabase.from('driver_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('driver_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
      supabase.from('driver_subscription_revenues').select('amount'),
      supabase.from('driver_subscription_revenues').select('amount').gte('created_at', firstDayOfMonth),
      supabase.from('driver_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('type', 'taxi'),
      supabase.from('driver_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('type', 'livreur')
    ]);

    const total_revenue = revenues?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    const revenue_this_month = revenuesMonth?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

    return {
      total_active: total_active || 0,
      total_expired: total_expired || 0,
      total_revenue,
      revenue_this_month,
      active_taxi: active_taxi || 0,
      active_livreur: active_livreur || 0
    };
  }
}
