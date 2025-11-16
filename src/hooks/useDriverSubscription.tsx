import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { DriverSubscriptionService, DriverSubscription, DriverSubscriptionConfig } from '@/services/driverSubscriptionService';
import { toast } from 'sonner';

export function useDriverSubscription() {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState<DriverSubscription | null>(null);
  const [config, setConfig] = useState<DriverSubscriptionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Vérifier si l'utilisateur est Taxi ou Livreur
  const isDriver = profile?.role === 'taxi' || profile?.role === 'livreur';

  useEffect(() => {
    if (user && isDriver) {
      loadSubscriptionData();
    } else {
      setLoading(false);
      setHasAccess(true); // Si pas driver, pas besoin d'abonnement
    }
  }, [user, isDriver]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subData, configData] = await Promise.all([
        DriverSubscriptionService.getActiveSubscription(user!.id),
        DriverSubscriptionService.getConfig()
      ]);

      setSubscription(subData);
      setConfig(configData);
      setHasAccess(!!subData && subData.status === 'active');
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
      toast.error('Erreur de chargement des données d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (
    paymentMethod: 'wallet' | 'mobile_money' | 'card' = 'wallet',
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ) => {
    if (!user || !profile) {
      toast.error('Vous devez être connecté');
      return { success: false };
    }

    if (!isDriver) {
      toast.error('Abonnement réservé aux Taxi Moto et Livreurs');
      return { success: false };
    }

    try {
      if (paymentMethod === 'wallet') {
        const result = await DriverSubscriptionService.subscribeWithWallet(
          user.id,
          profile.role as 'taxi' | 'livreur',
          billingCycle
        );

        if (result.success) {
          toast.success('✅ Abonnement activé avec succès !');
          await loadSubscriptionData();
          return { success: true, subscriptionId: result.subscriptionId };
        } else {
          toast.error(result.error || 'Erreur lors de l\'abonnement');
          return { success: false, error: result.error };
        }
      } else {
        // TODO: Implémenter Mobile Money et Carte bancaire
        toast.error('Mode de paiement non encore disponible');
        return { success: false, error: 'Mode de paiement non disponible' };
      }
    } catch (error) {
      console.error('Erreur abonnement:', error);
      toast.error('Erreur système lors de l\'abonnement');
      return { success: false };
    }
  };

  const isExpiringSoon = () => {
    if (!subscription || !subscription.days_remaining) return false;
    return subscription.days_remaining <= 3 && subscription.days_remaining > 0;
  };

  const isExpired = () => {
    if (!subscription) return true;
    return subscription.status === 'expired' || (subscription.days_remaining || 0) <= 0;
  };

  const getDaysRemaining = () => {
    return subscription?.days_remaining || 0;
  };

  const getExpiryDate = () => {
    if (!subscription) return null;
    return new Date(subscription.end_date);
  };

  const formatPrice = () => {
    if (!config) return '0';
    return config.price.toLocaleString('fr-FR');
  };

  return {
    subscription,
    config,
    loading,
    hasAccess,
    isDriver,
    isExpiringSoon: isExpiringSoon(),
    isExpired: isExpired(),
    daysRemaining: getDaysRemaining(),
    expiryDate: getExpiryDate(),
    priceFormatted: formatPrice(),
    subscribe,
    refresh: loadSubscriptionData
  };
}
