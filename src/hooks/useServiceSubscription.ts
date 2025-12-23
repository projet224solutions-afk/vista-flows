import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  ServiceSubscriptionService, 
  ServicePlan, 
  ActiveServiceSubscription 
} from '@/services/serviceSubscriptionService';

interface UseServiceSubscriptionProps {
  serviceId?: string;
}

export function useServiceSubscription({ serviceId }: UseServiceSubscriptionProps = {}) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ActiveServiceSubscription | null>(null);
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger les plans
      const plansData = await ServiceSubscriptionService.getPlans();
      setPlans(plansData);

      // Charger l'abonnement si un serviceId est fourni
      if (serviceId) {
        const subData = await ServiceSubscriptionService.getServiceSubscription(serviceId);
        setSubscription(subData);
      }
    } catch (error) {
      console.error('Erreur chargement données abonnement service:', error);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const subscribe = async (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    if (!user || !serviceId) {
      throw new Error('Utilisateur ou service non défini');
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plan non trouvé');
    }

    const price = billingCycle === 'yearly' 
      ? (plan.yearly_price_gnf || plan.monthly_price_gnf * 12) 
      : plan.monthly_price_gnf;

    const subscriptionId = await ServiceSubscriptionService.recordSubscriptionPayment({
      userId: user.id,
      serviceId,
      planId,
      pricePaid: price,
      billingCycle
    });

    if (subscriptionId) {
      await loadData();
    }

    return subscriptionId;
  };

  const cancel = async () => {
    if (!subscription?.subscription_id) {
      throw new Error('Aucun abonnement actif');
    }

    const success = await ServiceSubscriptionService.cancelSubscription(subscription.subscription_id);
    if (success) {
      await loadData();
    }

    return success;
  };

  const isActive = subscription?.status === 'active';
  const isExpired = subscription?.status === 'expired' || subscription?.status === 'cancelled';
  const isPremium = subscription?.plan_name === 'premium' || subscription?.plan_name === 'pro';

  const daysRemaining = subscription?.current_period_end 
    ? ServiceSubscriptionService.getDaysRemaining(subscription.current_period_end)
    : 0;

  const isExpiringSoon = isActive && daysRemaining <= 7 && daysRemaining > 0;

  const canAccessFeature = (feature: string): boolean => {
    if (!subscription) return false;
    
    switch (feature) {
      case 'analytics':
        return subscription.analytics_access;
      case 'priority_listing':
        return subscription.priority_listing;
      case 'unlimited_bookings':
        return subscription.max_bookings === null;
      case 'unlimited_products':
        return subscription.max_products === null;
      case 'unlimited_staff':
        return subscription.max_staff === null;
      default:
        return subscription.features?.includes(feature) || false;
    }
  };

  return {
    subscription,
    plans,
    loading,
    isActive,
    isExpired,
    isPremium,
    isExpiringSoon,
    daysRemaining,
    subscribe,
    cancel,
    canAccessFeature,
    refresh: loadData,
    formatAmount: ServiceSubscriptionService.formatAmount
  };
}
