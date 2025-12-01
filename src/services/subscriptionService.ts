import { supabase } from '@/lib/supabaseClient';

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  monthly_price_gnf: number;
  yearly_price_gnf?: number;
  yearly_discount_percentage?: number;
  max_products: number | null;
  max_images_per_product: number | null;
  analytics_access: boolean;
  priority_support: boolean;
  featured_products: boolean;
  api_access: boolean;
  custom_branding: boolean;
  features: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  price_paid_gnf: number;
  billing_cycle: string;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing' | 'expired';
  started_at: string;
  current_period_end: string;
  auto_renew: boolean;
  payment_method: string;
  payment_transaction_id: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ActiveSubscription {
  subscription_id: string | null;
  plan_id: string;
  plan_name: string;
  plan_display_name: string;
  status: string;
  current_period_end: string | null;
  auto_renew: boolean;
  price_paid: number;
  max_products: number | null;
  max_images_per_product: number | null;
  analytics_access: boolean;
  priority_support: boolean;
  featured_products: boolean;
  api_access: boolean;
  custom_branding: boolean;
  features: string[];
}

export interface ProductLimit {
  current_count: number;
  max_products: number | null;
  plan_name: string;
  can_add: boolean;
  is_unlimited: boolean;
}

export interface PriceHistory {
  id: string;
  plan_id: string;
  old_price: number;
  new_price: number;
  changed_by: string;
  reason: string | null;
  changed_at: string;
}

export class SubscriptionService {
  /**
   * Récupérer tous les plans disponibles
   */
  static async getPlans(): Promise<Plan[]> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('❌ Erreur récupération plans:', error);
        return [];
      }

      return (data || []) as Plan[];
    } catch (error) {
      console.error('❌ Exception récupération plans:', error);
      return [];
    }
  }

  /**
   * Récupérer l'abonnement actif de l'utilisateur connecté
   */
  static async getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
    try {
      const { data, error } = await supabase.rpc('get_active_subscription', {
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Erreur récupération abonnement actif:', error);
        return null;
      }

      return data as unknown as ActiveSubscription;
    } catch (error) {
      console.error('❌ Exception récupération abonnement:', error);
      return null;
    }
  }

  /**
   * Vérifier les limites de produits de l'utilisateur
   */
  static async checkProductLimit(userId: string): Promise<ProductLimit | null> {
    try {
      const { data, error } = await supabase.rpc('check_product_limit', {
        p_user_id: userId,
      });

      if (error) {
        console.error('❌ Erreur vérification limite produits:', error);
        return null;
      }

      return data as unknown as ProductLimit;
    } catch (error) {
      console.error('❌ Exception vérification limite:', error);
      return null;
    }
  }

  /**
   * Enregistrer un paiement d'abonnement
   */
  static async recordSubscriptionPayment(params: {
    userId: string;
    planId: string;
    pricePaid: number;
    paymentMethod?: string;
    paymentTransactionId?: string;
    billingCycle?: string;
  }): Promise<string | null> {
    try {
      console.log('🔄 Appel RPC record_subscription_payment:', {
        p_user_id: params.userId,
        p_plan_id: params.planId,
        p_price_paid: params.pricePaid,
        p_payment_method: params.paymentMethod || 'wallet',
        p_billing_cycle: params.billingCycle || 'monthly'
      });

      const { data, error } = await supabase.rpc('record_subscription_payment', {
        p_user_id: params.userId,
        p_plan_id: params.planId,
        p_price_paid: params.pricePaid,
        p_payment_method: params.paymentMethod || 'wallet',
        p_payment_transaction_id: params.paymentTransactionId || null,
        p_billing_cycle: params.billingCycle || 'monthly',
      });

      if (error) {
        console.error('❌ Erreur RPC:', error);
        
        // Propager l'erreur avec un message clair
        if (error.message) {
          throw new Error(error.message);
        }
        throw new Error('Erreur lors de l\'enregistrement du paiement');
      }

      console.log('✅ Abonnement créé avec succès:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Exception enregistrement paiement:', error);
      
      // Propager l'erreur pour que le composant puisse l'afficher
      throw error;
    }
  }

  /**
   * Changer le prix d'un plan (admin uniquement)
   */
  static async changePlanPrice(
    planId: string,
    newPrice: number,
    adminUserId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('change_plan_price', {
        p_plan_id: planId,
        p_new_price: newPrice,
        p_admin_user_id: adminUserId,
        p_reason: reason || null,
      });

      if (error) {
        console.error('❌ Erreur changement prix:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('❌ Exception changement prix:', error);
      return false;
    }
  }

  /**
   * Récupérer l'historique des changements de prix
   */
  static async getPriceHistory(planId?: string): Promise<PriceHistory[]> {
    try {
      let query = supabase
        .from('plan_price_history')
        .select('*')
        .order('changed_at', { ascending: false });

      if (planId) {
        query = query.eq('plan_id', planId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur récupération historique:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception récupération historique:', error);
      return [];
    }
  }

  /**
   * Obtenir toutes les souscriptions (admin uniquement)
   */
  static async getAllSubscriptions(limit = 100): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erreur récupération souscriptions:', error);
        return [];
      }

      return (data || []) as Subscription[];
    } catch (error) {
      console.error('❌ Exception récupération souscriptions:', error);
      return [];
    }
  }

  /**
   * Annuler un abonnement
   */
  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          auto_renew: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur annulation abonnement:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('❌ Exception annulation abonnement:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques d'abonnements
   */
  static async getSubscriptionStats(): Promise<{
    total_subscriptions: number;
    active_subscriptions: number;
    total_revenue: number;
    revenue_by_plan: { [key: string]: number };
  } | null> {
    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('user_id, status, price_paid_gnf, plan_id, plans!inner(name), created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur stats abonnements:', error);
        return null;
      }

      // Garder seulement le dernier abonnement par utilisateur
      const uniqueSubscriptions = subscriptions.reduce((acc: any[], sub) => {
        const existingIndex = acc.findIndex(s => s.user_id === sub.user_id);
        
        if (existingIndex === -1) {
          acc.push(sub);
        } else {
          const existingDate = new Date(acc[existingIndex].created_at);
          const currentDate = new Date(sub.created_at);
          
          if (currentDate > existingDate) {
            acc[existingIndex] = sub;
          }
        }
        
        return acc;
      }, []);

      const stats = {
        total_subscriptions: uniqueSubscriptions.length,
        active_subscriptions: uniqueSubscriptions.filter((s) => s.status === 'active').length,
        total_revenue: uniqueSubscriptions.reduce((sum, s) => sum + s.price_paid_gnf, 0),
        revenue_by_plan: {} as { [key: string]: number },
      };

      // Calculer revenus par plan
      uniqueSubscriptions.forEach((sub: any) => {
        const planName = sub.plans?.name || 'unknown';
        if (!stats.revenue_by_plan[planName]) {
          stats.revenue_by_plan[planName] = 0;
        }
        stats.revenue_by_plan[planName] += sub.price_paid_gnf;
      });

      return stats;
    } catch (error) {
      console.error('❌ Exception stats abonnements:', error);
      return null;
    }
  }

  /**
   * Formater un montant en GNF
   */
  static formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Calculer le nombre de jours restants
   */
  static getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
