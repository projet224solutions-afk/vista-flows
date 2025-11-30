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

  const isDriver = profile?.role === 'taxi' || profile?.role === 'livreur';

  const loadSubscriptionData = async () => {
    if (!user || !isDriver) return;
    try {
      setLoading(true);
      const configData = await DriverSubscriptionService.getConfig();
      setConfig(configData);

      // Retry pour la subscription
      let subData: DriverSubscription | null = null;
      let retries = 3;
      let lastError: any = null;
      while (retries > 0 && !subData) {
        try {
          subData = await DriverSubscriptionService.getActiveSubscription(user.id);
        } catch (err) {
          lastError = err;
          retries--;
          if (retries > 0) await new Promise(r => setTimeout(r, 1000));
        }
        if (subData) break;
      }

      setSubscription(subData);
      setHasAccess(!!subData && subData.status === 'active');
      if (!subData && lastError && lastError?.message && !lastError.message.includes('No rows')) {
        toast.error('Impossible de charger l\'abonnement. Réessayez plus tard.');
      }
    } catch (e: any) {
      console.error('Erreur chargement abonnement:', e);
      if (import.meta.env.DEV) {
        console.error('Détails erreur:', { message: e?.message, code: e?.code });
      } else {
        toast.error('Erreur lors du chargement de l\'abonnement');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDriver]);

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
      if (paymentMethod !== 'wallet') {
        toast.error('Mode de paiement non encore disponible');
        return { success: false, error: 'Mode de paiement non disponible' };
      }

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
        const msg = result.error || 'Erreur lors de l\'abonnement';
        if (msg.includes('Solde insuffisant')) {
          toast.error('Solde insuffisant dans votre wallet. Rechargez et réessayez.');
        } else if (msg.includes('Wallet introuvable')) {
          toast.error('Wallet introuvable. Veuillez créer/initialiser votre wallet.');
        } else if (msg.includes('Configuration non disponible')) {
          toast.error('Configuration abonnement indisponible. Réessayez plus tard.');
        } else if (msg.includes('Erreur création abonnement')) {
          toast.error('Création abonnement échouée. Aucun débit n\'a été retenu.');
        } else {
          toast.error(msg);
        }
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Erreur abonnement:', error);
      toast.error('Erreur système lors de l\'abonnement');
      return { success: false };
    }
  };

  const isExpiringSoon = subscription?.days_remaining ? (subscription.days_remaining <= 3 && subscription.days_remaining > 0) : false;
  const isExpired = !subscription || subscription.status === 'expired' || (subscription.days_remaining || 0) <= 0;
  const daysRemaining = subscription?.days_remaining || 0;
  const expiryDate = subscription ? new Date(subscription.end_date) : null;
  const priceFormatted = !config ? '0' : config.price.toLocaleString('fr-FR');

  return {
    subscription,
    config,
    loading,
    hasAccess,
    isDriver,
    isExpiringSoon,
    isExpired,
    daysRemaining,
    expiryDate,
    priceFormatted,
    subscribe,
    refresh: loadSubscriptionData
  };
}
