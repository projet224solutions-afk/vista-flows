import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Plan } from '@/services/subscriptionService';

export interface VendorSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  plan_name: string;
  plan_display_name: string;
  price_paid: number;
  auto_renew: boolean;
}

export function useVendorSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<VendorSubscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSubscriptionData();
    } else {
      setLoading(false);
      setSubscription(null);
      setHasAccess(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Requête directe pour récupérer l'abonnement actif avec le plan
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          status,
          current_period_end,
          price_paid_gnf,
          auto_renew,
          plans!inner(name, display_name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.error('❌ Erreur récupération abonnement:', subError);
      }

      if (subData) {
        const planInfo = subData.plans as any;
        const vendorSub: VendorSubscription = {
          id: subData.id,
          user_id: subData.user_id,
          plan_id: subData.plan_id,
          status: subData.status,
          current_period_end: subData.current_period_end,
          plan_name: planInfo?.name || 'unknown',
          plan_display_name: planInfo?.display_name || 'Inconnu',
          price_paid: subData.price_paid_gnf || 0,
          auto_renew: subData.auto_renew || false,
        };
        setSubscription(vendorSub);
        setHasAccess(vendorSub.status === 'active');
        console.log('✅ Abonnement chargé:', vendorSub);
      } else {
        setSubscription(null);
        setHasAccess(false);
        console.log('ℹ️ Aucun abonnement actif trouvé');
      }

      // Charger les plans
      const { data: plansData } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      setPlans((plansData || []) as Plan[]);

    } catch (error) {
      console.error('❌ Erreur chargement abonnement:', error);
    } finally {
      setLoading(false);
    }
  };

  const isExpiringSoon = () => {
    if (!subscription || !subscription.current_period_end) return false;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    const daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 7 && daysRemaining > 0;
  };

  const isExpired = () => {
    // Pas d'abonnement = plan gratuit, PAS expiré (jamais souscrit)
    if (!subscription || !subscription.current_period_end) return false;
    return subscription.status !== 'active' || new Date(subscription.current_period_end) < new Date();
  };

  const getDaysRemaining = () => {
    if (!subscription || !subscription.current_period_end) return 0;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    const days = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getExpiryDate = () => {
    if (!subscription || !subscription.current_period_end) return null;
    return new Date(subscription.current_period_end);
  };

  const formatPrice = () => {
    if (!subscription) return '0';
    return subscription.price_paid.toLocaleString('fr-FR');
  };

  return {
    subscription,
    plans,
    loading,
    hasAccess,
    isExpiringSoon: isExpiringSoon(),
    isExpired: isExpired(),
    daysRemaining: getDaysRemaining(),
    expiryDate: getExpiryDate(),
    priceFormatted: formatPrice(),
    refresh: loadSubscriptionData,
  };
}
