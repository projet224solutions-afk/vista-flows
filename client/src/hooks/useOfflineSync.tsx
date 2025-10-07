import { useState, useEffect } from 'react';
import { OfflineSyncService } from '@/services/offlineSync';
import { useToast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initialiser le service
    OfflineSyncService.initialize();

    // Mettre à jour le statut
    const updateStatus = () => {
      const status = OfflineSyncService.getSyncStatus();
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
    };

    // Gestionnaires d'événements
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Connexion rétablie',
        description: 'Synchronisation des données en cours...',
      });
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Mode hors ligne',
        description: 'Les modifications seront synchronisées automatiquement',
        variant: 'default'
      });
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Mettre à jour toutes les 5 secondes
    const interval = setInterval(updateStatus, 5000);

    // Status initial
    updateStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      OfflineSyncService.destroy();
    };
  }, [toast]);

  const queueAction = async (
    type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'CREATE_ORDER' | 'UPDATE_ORDER' | 'UPDATE_INVENTORY',
    data: any
  ) => {
    const actionId = await OfflineSyncService.queueAction(type, data);
    setPendingCount(OfflineSyncService.getSyncStatus().pendingCount);
    return actionId;
  };

  const manualSync = async () => {
    if (!isOnline) {
      toast({
        title: 'Pas de connexion',
        description: 'Impossible de synchroniser en mode hors ligne',
        variant: 'destructive'
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await OfflineSyncService.syncPendingActions();
      
      if (result.success > 0) {
        toast({
          title: 'Synchronisation réussie',
          description: `${result.success} action(s) synchronisée(s)`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: 'Erreurs de synchronisation',
          description: `${result.failed} action(s) ont échoué`,
          variant: 'destructive'
        });
      }

      setPendingCount(result.remaining);
    } catch (error) {
      toast({
        title: 'Erreur de synchronisation',
        description: 'Une erreur est survenue',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    queueAction,
    manualSync
  };
}
