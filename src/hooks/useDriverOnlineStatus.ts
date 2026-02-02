import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TaxiMotoService } from '@/services/taxi/TaxiMotoService';
import { useTaxiErrorBoundary } from './useTaxiErrorBoundary';
import type { Profile } from '@/hooks/useAuth';

interface UseDriverOnlineStatusProps {
  driverId: string | null;
  profile: Profile | null;
  hasAccess: boolean;
  getCurrentLocation: () => Promise<any>;
  startLocationTracking: () => void;
  loadPendingRides: () => void;
  stopWatching: () => void; // Fixed: no parameter needed
  setRideRequests: (requests: any[]) => void;
}

export function useDriverOnlineStatus({
  driverId,
  profile,
  hasAccess,
  getCurrentLocation,
  startLocationTracking,
  loadPendingRides,
  stopWatching,
  setRideRequests
}: UseDriverOnlineStatusProps) {
  const [isOnline, setIsOnline] = useState(false);
  const { capture } = useTaxiErrorBoundary();

  const toggleOnlineStatus = useCallback(async () => {
    const next = !isOnline;
    
    if (!driverId) {
      toast.error('Profil conducteur non trouvé');
      return;
    }

    // KYC gating
    if (next && profile?.kyc_status !== 'verified') {
      capture('permission', 'KYC requis pour être en ligne');
      toast.error('KYC requis avant de passer en ligne');
      return;
    }

    // Vérifier l'abonnement
    if (next && !hasAccess) {
      toast.error('⚠️ Abonnement requis', {
        description: 'Vous devez avoir un abonnement actif pour recevoir des courses'
      });
      return;
    }

    if (next) {
      toast.loading('📍 Recherche GPS en cours...', { id: 'gps-loading' });
      
      try {
        // Toujours demander une nouvelle position GPS
        console.log('📍 [GPS] Demande de position...');
        const position = await getCurrentLocation();
        
        console.log('📍 [GPS] Position reçue:', position);
        
        if (!position || typeof position.latitude !== 'number' || typeof position.longitude !== 'number') {
          throw new Error('Position GPS non disponible - coordonnées invalides');
        }
        
        toast.dismiss('gps-loading');
        
        console.log('📍 [GPS] Mise à jour statut conducteur avec position:', position.latitude, position.longitude);
        
        await TaxiMotoService.updateDriverStatus(
          driverId,
          true,
          true,
          position.latitude,
          position.longitude
        );

        setIsOnline(true);
        toast.success('🟢 Vous êtes maintenant en ligne', {
          description: `GPS: ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`
        });
        
        startLocationTracking();
        loadPendingRides();
        
      } catch (error: any) {
        // Si l'update DB du statut échoue, on ne doit pas afficher une erreur "GPS".
        const msg = error?.message || '';

        if (
          msg.includes('Mise à jour statut échouée') ||
          msg.toLowerCase().includes('statut') ||
          msg.toLowerCase().includes('introuvable')
        ) {
          capture('network', 'Erreur DB lors de la mise en ligne', error);
          toast.dismiss('gps-loading');
          toast.error('Impossible de passer en ligne', {
            description: 'Erreur serveur lors de la mise à jour du statut. Veuillez réessayer.',
            duration: 6000,
          });
          return;
        }

        capture('gps', 'Erreur GPS lors de la mise en ligne', error);
        toast.dismiss('gps-loading');

        console.error('📍 [GPS] Erreur:', error);

        const errorMessage = error?.message || 'Erreur GPS inconnue';
        toast.error(`⚠️ ${errorMessage}`, {
          description:
            "• Vérifiez que le GPS est activé\n• Autorisez l'accès à la localisation\n• Réessayez dans un endroit dégagé",
          duration: 6000,
        });
        return;
      }
    } else {
      // PASSER HORS LIGNE
      try {
        console.log('🔴 [Offline] Arrêt du suivi GPS...');
        stopWatching(); // Fixed: call without parameter
        
        console.log('🔴 [Offline] Mise à jour statut DB...');
        await TaxiMotoService.updateDriverStatus(
          driverId,
          false,
          false,
          undefined,
          undefined
        );

        setIsOnline(false);
        toast.info('🔴 Vous êtes maintenant hors ligne');
        setRideRequests([]);
        console.log('🔴 [Offline] Déconnexion réussie');
      } catch (error) {
        capture('network', 'Erreur lors du changement de statut', error);
        toast.error('Erreur lors du changement de statut');
        console.error('🔴 [Offline] Erreur:', error);
      }
    }
  }, [
    isOnline,
    driverId,
    profile,
    hasAccess,
    getCurrentLocation,
    startLocationTracking,
    loadPendingRides,
    stopWatching,
    setRideRequests,
    capture
  ]);

  return {
    isOnline,
    setIsOnline,
    toggleOnlineStatus
  };
}
