import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TaxiMotoService } from '@/services/taxi/TaxiMotoService';
import { useTaxiErrorBoundary } from './useTaxiErrorBoundary';
import type { Profile } from '@/hooks/useAuth';

interface UseDriverOnlineStatusProps {
  driverId: string | null;
  profile: Profile | null;
  hasAccess: boolean;
  location: any;
  getCurrentLocation: () => Promise<any>;
  startLocationTracking: () => void;
  loadPendingRides: () => void;
  stopWatching: (watchId: number) => void;
  locationWatchId: number | null;
  setLocationWatchId: (id: number | null) => void;
  setRideRequests: (requests: any[]) => void;
}

export function useDriverOnlineStatus({
  driverId,
  profile,
  hasAccess,
  location,
  getCurrentLocation,
  startLocationTracking,
  loadPendingRides,
  stopWatching,
  locationWatchId,
  setLocationWatchId,
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
      toast.loading('📍 Recherche GPS en cours... (25 secondes max)', { id: 'gps-loading' });
      
      try {
        let position = location;
        
        if (!position || (Date.now() - position.timestamp > 60000)) {
          console.log('📍 Obtention nouvelle position GPS...');
          position = await getCurrentLocation();
        } else {
          console.log('📍 Utilisation position GPS existante');
        }
        
        console.log('📍 Position GPS utilisée:', position);
        toast.dismiss('gps-loading');
        
        await TaxiMotoService.updateDriverStatus(
          driverId,
          true,
          true,
          position.latitude,
          position.longitude
        );

        setIsOnline(true);
        toast.success('🟢 Vous êtes maintenant en ligne');
        
        startLocationTracking();
        loadPendingRides();
        
      } catch (error: any) {
        capture('gps', 'Erreur GPS lors de la mise en ligne', error);
        toast.dismiss('gps-loading');
        
        const errorMessage = error?.message || 'Erreur GPS inconnue';
        toast.error(`⚠️ Erreur GPS: ${errorMessage}\n\n• Vérifiez que le GPS est activé\n• Autorisez l'accès à la localisation\n• Assurez-vous d'avoir une bonne connexion`, {
          duration: 5000
        });
        return;
      }
    } else {
      try {
        if (locationWatchId) {
          stopWatching(locationWatchId);
          setLocationWatchId(null);
        }
        
        await TaxiMotoService.updateDriverStatus(
          driverId,
          false,
          false,
          location?.latitude,
          location?.longitude
        );

        setIsOnline(false);
        toast.info('🔴 Vous êtes maintenant hors ligne');
        setRideRequests([]);
      } catch (error) {
        capture('network', 'Erreur lors du changement de statut', error);
        toast.error('Erreur lors du changement de statut');
      }
    }
  }, [
    isOnline,
    driverId,
    profile,
    hasAccess,
    location,
    getCurrentLocation,
    startLocationTracking,
    loadPendingRides,
    stopWatching,
    locationWatchId,
    setLocationWatchId,
    setRideRequests,
    capture
  ]);

  return {
    isOnline,
    setIsOnline,
    toggleOnlineStatus
  };
}
