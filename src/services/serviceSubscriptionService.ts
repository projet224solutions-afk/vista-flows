import { supabase } from '@/lib/supabaseClient';

export interface ServicePlan {
  id: string;
  service_type_id: string | null;
  name: string;
  display_name: string;
  description: string | null;
  monthly_price_gnf: number;
  yearly_price_gnf: number | null;
  yearly_discount_percentage: number | null;
  features: string[];
  max_bookings_per_month: number | null;
  max_products: number | null;
  max_staff: number | null;
  priority_listing: boolean;
  analytics_access: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
  custom_branding: boolean;
  api_access: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceSubscription {
  id: string;
  professional_service_id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'past_due' | 'trialing';
  billing_cycle: 'monthly' | 'yearly' | 'lifetime' | 'custom';
  price_paid_gnf: number;
  payment_method: string;
  payment_transaction_id: string | null;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  auto_renew: boolean;
  cancelled_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ActiveServiceSubscription {
  subscription_id: string | null;
  plan_id: string;
  plan_name: string;
  plan_display_name: string;
  status: string;
  current_period_end: string | null;
  auto_renew: boolean;
  price_paid: number;
  max_bookings: number | null;
  max_products: number | null;
  max_staff: number | null;
  priority_listing: boolean;
  analytics_access: boolean;
  features: string[];
}

export interface ServiceSubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  total_revenue: number;
  monthly_revenue: number;
  subscriptions_by_plan: Record<string, number>;
  subscriptions_by_status: Record<string, number>;
}

export interface ServicePriceHistory {
  id: string;
  plan_id: string;
  old_price: number;
  new_price: number;
  changed_by: string | null;
  reason: string | null;
  changed_at: string;
}

export class ServiceSubscriptionService {
  /**
   * Récupérer tous les plans de services disponibles
   */
  static async getPlans(): Promise<ServicePlan[]> {
    try {
      const { data, error } = await supabase
        .from('service_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('❌ Erreur récupération plans services:', error);
        return [];
      }

      return (data || []).map(plan => {
        const features = plan.features;
        return {
          ...plan,
          features: Array.isArray(features) 
            ? (features as string[])
            : (typeof features === 'string' ? JSON.parse(features) : [])
        };
      }) as ServicePlan[];
    } catch (error) {
      console.error('❌ Exception récupération plans services:', error);
      return [];
    }
  }

  /**
   * Récupérer l'abonnement actif d'un service professionnel
   */
  static async getServiceSubscription(serviceId: string): Promise<ActiveServiceSubscription | null> {
    try {
      const { data, error } = await supabase.rpc('get_service_subscription', {
        p_service_id: serviceId,
      });

      if (error) {
        console.error('❌ Erreur récupération abonnement service:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      const subscription = data[0] as any;
      const features = subscription.features;
      return {
        ...subscription,
        features: Array.isArray(features) 
          ? features as string[]
          : (typeof features === 'string' ? JSON.parse(features) : [])
      } as ActiveServiceSubscription;
    } catch (error) {
      console.error('❌ Exception récupération abonnement service:', error);
      return null;
    }
  }

  /**
   * Enregistrer un paiement d'abonnement de service
   */
  static async recordSubscriptionPayment(params: {
    userId: string;
    serviceId: string;
    planId: string;
    pricePaid: number;
    paymentMethod?: string;
    paymentTransactionId?: string;
    billingCycle?: string;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('record_service_subscription_payment', {
        p_user_id: params.userId,
        p_service_id: params.serviceId,
        p_plan_id: params.planId,
        p_price_paid: params.pricePaid,
        p_payment_method: params.paymentMethod || 'wallet',
        p_payment_transaction_id: params.paymentTransactionId || null,
        p_billing_cycle: params.billingCycle || 'monthly',
      });

      if (error) {
        console.error('❌ Erreur enregistrement paiement service:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('❌ Exception enregistrement paiement service:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des abonnements de services
   */
  static async getStats(): Promise<ServiceSubscriptionStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_service_subscription_stats');

      if (error) {
        console.error('❌ Erreur stats abonnements services:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          total_subscriptions: 0,
          active_subscriptions: 0,
          expired_subscriptions: 0,
          total_revenue: 0,
          monthly_revenue: 0,
          subscriptions_by_plan: {},
          subscriptions_by_status: {}
        };
      }

      return data[0] as ServiceSubscriptionStats;
    } catch (error) {
      console.error('❌ Exception stats abonnements services:', error);
      return null;
    }
  }

  /**
   * Obtenir tous les abonnements (admin)
   */
  static async getAllSubscriptions(limit = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('service_subscriptions')
        .select(`
          *,
          service_plans (name, display_name),
          professional_services (business_name, service_type_id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erreur récupération abonnements services:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception récupération abonnements services:', error);
      return [];
    }
  }

  /**
   * Changer le prix d'un plan
   */
  static async changePlanPrice(
    planId: string,
    newPrice: number,
    adminUserId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // Récupérer l'ancien prix
      const { data: plan, error: planError } = await supabase
        .from('service_plans')
        .select('monthly_price_gnf')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Enregistrer l'historique
      const { error: historyError } = await supabase
        .from('service_plan_price_history')
        .insert({
          plan_id: planId,
          old_price: plan.monthly_price_gnf,
          new_price: newPrice,
          changed_by: adminUserId,
          reason: reason || null
        });

      if (historyError) throw historyError;

      // Mettre à jour le prix
      const { error: updateError } = await supabase
        .from('service_plans')
        .update({ 
          monthly_price_gnf: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('❌ Erreur changement prix plan service:', error);
      return false;
    }
  }

  /**
   * Récupérer l'historique des prix
   */
  static async getPriceHistory(planId?: string): Promise<ServicePriceHistory[]> {
    try {
      let query = supabase
        .from('service_plan_price_history')
        .select('*')
        .order('changed_at', { ascending: false });

      if (planId) {
        query = query.eq('plan_id', planId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur historique prix services:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception historique prix services:', error);
      return [];
    }
  }

  /**
   * Annuler un abonnement
   */
  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_subscriptions')
        .update({ 
          status: 'cancelled',
          auto_renew: false,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        console.error('❌ Erreur annulation abonnement service:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception annulation abonnement service:', error);
      return false;
    }
  }

  /**
   * Marquer les abonnements expirés
   */
  static async markExpiredSubscriptions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('service_subscriptions')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .lt('current_period_end', new Date().toISOString())
        .select();

      if (error) {
        console.error('❌ Erreur marquage expirés:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('❌ Exception marquage expirés:', error);
      return 0;
    }
  }

  /**
   * Offrir un abonnement gratuit
   */
  static async offerFreeSubscription(
    serviceId: string,
    userId: string,
    planId: string,
    days: number
  ): Promise<boolean> {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      // Annuler les anciens abonnements
      await supabase
        .from('service_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('professional_service_id', serviceId)
        .eq('status', 'active');

      // Créer le nouvel abonnement gratuit
      const { error } = await supabase
        .from('service_subscriptions')
        .insert({
          professional_service_id: serviceId,
          user_id: userId,
          plan_id: planId,
          status: 'active',
          billing_cycle: 'custom',
          price_paid_gnf: 0,
          payment_method: 'free_gift',
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: endDate.toISOString(),
          auto_renew: false
        });

      if (error) {
        console.error('❌ Erreur offre abonnement gratuit:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception offre abonnement gratuit:', error);
      return false;
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
   * Calculer les jours restants
   */
  static getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}
