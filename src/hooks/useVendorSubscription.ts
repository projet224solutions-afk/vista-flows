import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionService, ActiveSubscription } from '@/services/subscriptionService';

export function useVendorSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSubscription() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const data = await SubscriptionService.getActiveSubscription(user.id);
        
        if (mounted) {
          setSubscription(data);
        }
      } catch (err) {
        console.error('❌ Erreur chargement abonnement:', err);
        if (mounted) {
          setError('Impossible de charger l\'abonnement');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSubscription();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return { subscription, loading, error };
}
