import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SubscriptionService, ActiveSubscription, ProductLimit } from '@/services/subscriptionService';

export function useSubscription() {
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [productLimit, setProductLimit] = useState<ProductLimit | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // ✅ Ref pour éviter les appels multiples
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  const fetchSubscriptionData = useCallback(async () => {
    // ✅ Éviter les appels multiples
    if (hasFetchedRef.current) return;
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!isMountedRef.current) return;
      
      if (!user) {
        setSubscription(null);
        setProductLimit(null);
        setUserId(null);
        return;
      }

      setUserId(user.id);
      hasFetchedRef.current = true;

      const [subscriptionData, limitData] = await Promise.all([
        SubscriptionService.getActiveSubscription(user.id),
        SubscriptionService.checkProductLimit(user.id),
      ]);

      if (!isMountedRef.current) return;

      setSubscription(subscriptionData);
      setProductLimit(limitData);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    hasFetchedRef.current = false;
    
    fetchSubscriptionData();

    // ✅ Setup realtime avec cleanup correct
    const channel = supabase
      .channel('subscription_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        () => {
          hasFetchedRef.current = false;
          fetchSubscriptionData();
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [fetchSubscriptionData]);

  const canAddProduct = (): boolean => {
    return productLimit?.can_add ?? false;
  };

  const hasFeature = (feature: keyof ActiveSubscription): boolean => {
    if (!subscription) return false;
    return subscription[feature] === true;
  };

  const isFreePlan = (): boolean => {
    return subscription?.plan_name === 'free' || !subscription;
  };

  const isPremiumPlan = (): boolean => {
    return subscription?.plan_name === 'premium';
  };

  const getDaysRemaining = (): number | null => {
    if (!subscription?.current_period_end) return null;
    return SubscriptionService.getDaysRemaining(subscription.current_period_end);
  };

  return {
    subscription,
    productLimit,
    loading,
    userId,
    canAddProduct,
    hasFeature,
    isFreePlan,
    isPremiumPlan,
    getDaysRemaining,
    refetch: () => {
      hasFetchedRef.current = false;
      return fetchSubscriptionData();
    },
  };
}
