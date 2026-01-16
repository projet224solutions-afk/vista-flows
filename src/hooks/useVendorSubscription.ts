import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { SubscriptionService, ActiveSubscription, Plan } from '@/services/subscriptionService';
import { toast } from 'sonner';

export function useVendorSubscription() {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // ✅ Optimisation: Utiliser uniquement les IDs (primitives) pour éviter rechargements
    if (user?.id && profile?.role === 'vendeur') {
      loadSubscriptionData();
    } else if (!user?.id) {
      setLoading(false);
    }
  }, [user?.id, profile?.role]); // ✅ Dépendances stables

  const loadSubscriptionData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [subData, plansData] = await Promise.all([
        SubscriptionService.getActiveSubscription(user.id),
        SubscriptionService.getPlans()
      ]);

      setSubscription(subData);
      setPlans(plansData);
      setHasAccess(!!subData && subData.status === 'active');
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
      // Ne plus afficher de toast pour éviter les notifications intempestives
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
    if (!subscription || !subscription.current_period_end) return true;
    return subscription.status === 'expired' || new Date(subscription.current_period_end) < new Date();
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
    refresh: loadSubscriptionData
  };
}
