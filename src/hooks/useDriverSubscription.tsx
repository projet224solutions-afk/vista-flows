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
      const loadSubscriptionData = async () => {
        try {
          setLoading(true);
          
          // Charger config d'abord
          const configData = await DriverSubscriptionService.getConfig();
          setConfig(configData);
  
          // Charger subscription avec retry en cas d'erreur
          let subData: DriverSubscription | null = null;
          let retries = 3;
          let lastError: any = null;
  
          while (retries > 0 && !subData) {
            try {
              subData = await DriverSubscriptionService.getActiveSubscription(user!.id);
              break;
            } catch (err) {
              lastError = err;
              retries--;
              if (retries > 0) {
                // Attendre avant de réessayer
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }
  
          setSubscription(subData);
          setHasAccess(!!subData && subData.status === 'active');
  
          if (!subData && lastError) {
            console.error('Impossible de charger l\'abonnement après 3 tentatives:', lastError);
            // Ne pas afficher toast si simplement aucun abonnement
            if (lastError?.message && !lastError.message.includes('No rows')) {
              toast.error('Impossible de charger l\'abonnement. Réessayez plus tard.');
            }
          }
        } catch (error: any) {
          console.error('Erreur chargement abonnement:', error);
          // Afficher message détaillé en dev
          if (import.meta.env.DEV) {
            console.error('Détails erreur:', {
              message: error?.message,
              code: error?.code,
              details: error?.details
            });
          }
          toast.error('Impossible de charger l\'abonnement');
        } finally {
          setLoading(false);
        }
      };
      loadSubscriptionData();
    } else {
      setLoading(false);
      setHasAccess(true); // Si pas driver, pas besoin d'abonnement
    }
  }, [user, isDriver]);

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
          // Recharger les données après souscription
          if (user && isDriver) {
            try {
              const configData = await DriverSubscriptionService.getConfig();
              setConfig(configData);
              const subData = await DriverSubscriptionService.getActiveSubscription(user.id);
              setSubscription(subData);
              setHasAccess(!!subData && subData.status === 'active');
            } catch (error) {
              console.error('Erreur rechargement:', error);
            }
          }
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
      } else {
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
    refresh: async () => {
      if (user && isDriver) {
        try {
          setLoading(true);
          const configData = await DriverSubscriptionService.getConfig();
          setConfig(configData);
          const subData = await DriverSubscriptionService.getActiveSubscription(user.id);
          setSubscription(subData);
          setHasAccess(!!subData && subData.status === 'active');
        } catch (error) {
          console.error('Erreur refresh:', error);
        } finally {
          setLoading(false);
        }
      }
    }
  };
}
