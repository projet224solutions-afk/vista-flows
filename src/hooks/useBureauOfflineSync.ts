/**
 * HOOK DE SYNCHRONISATION OFFLINE - BUREAU SYNDICAT
 * Gestion complète du mode hors ligne pour le bureau syndicat
 * 224SOLUTIONS - Bureau Syndicat Interface
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import offlineSyncManager from '@/lib/offlineSyncManager';
import offlineDB from '@/lib/offlineDB';
import { supabase } from '@/lib/supabaseClient';

export interface BureauSyncStats {
  total: number;
  pending: number;
  synced: number;
  failed: number;
  by_type: Record<string, any>;
}

export function useBureauOfflineSync(bureauId?: string) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<BureauSyncStats>({
    total: 0,
    pending: 0,
    synced: 0,
    failed: 0,
    by_type: {}
  });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  /**
   * Met à jour les statistiques de synchronisation
   */
  const updateSyncStats = useCallback(async () => {
    try {
      const [localStats, dbStats] = await Promise.all([
        offlineSyncManager.getSyncStats('bureau'),
        offlineDB.getEventStats()
      ]);

      setSyncStats({
        total: localStats.total + dbStats.total,
        pending: localStats.pending + dbStats.pending,
        synced: localStats.synced + dbStats.synced,
        failed: localStats.failed + dbStats.failed,
        by_type: dbStats.by_type
      });
    } catch (error) {
      console.error('Erreur mise à jour stats:', error);
    }
  }, []);

  /**
   * Synchronise un événement de moto
   */
  const syncMotoEvent = async (event: any) => {
    try {
      const { data, error } = await supabase
        .from('registered_motos')
        .upsert(event.data, { onConflict: 'serial_number' });

      if (error) throw error;

      await offlineDB.markEventAsSynced(event.client_event_id);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur sync moto:', error);
      await offlineDB.markEventAsFailed(event.client_event_id, error.message);
      return { success: false, error: error.message };
    }
  };

  /**
   * Synchronise un membre du bureau
   */
  const syncMemberEvent = async (event: any) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .upsert(event.data);

      if (error) throw error;

      await offlineDB.markEventAsSynced(event.client_event_id);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur sync membre:', error);
      await offlineDB.markEventAsFailed(event.client_event_id, error.message);
      return { success: false, error: error.message };
    }
  };

  /**
   * Synchronise une alerte de sécurité
   */
  const syncSecurityAlert = async (event: any) => {
    try {
      const { data, error } = await (supabase as any)
        .from('moto_security_alerts')
        .insert(event.data);

      if (error) throw error;

      await offlineDB.markEventAsSynced(event.client_event_id);
      
      // Notifier tous les bureaux concernés
      toast.success('🚨 Alerte de sécurité synchronisée', {
        description: 'Tous les bureaux ont été notifiés'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Erreur sync alerte:', error);
      await offlineDB.markEventAsFailed(event.client_event_id, error.message);
      return { success: false, error: error.message };
    }
  };

  /**
   * Synchronise tous les événements en attente
   */
  const syncAllPendingEvents = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const errors: string[] = [];

    try {
      // 1. Synchroniser les données via offlineSyncManager
      const managerResult = await offlineSyncManager.syncAllData('bureau');
      console.log('Résultat sync manager:', managerResult);

      // 2. Synchroniser les événements via offlineDB
      const pendingEvents = await offlineDB.getPendingEvents();
      console.log('Événements en attente:', pendingEvents.length);

      for (const event of pendingEvents) {
        let result;

        switch (event.type) {
          case 'moto_registration':
            result = await syncMotoEvent(event);
            break;
          case 'member_update':
            result = await syncMemberEvent(event);
            break;
          case 'security_alert':
            result = await syncSecurityAlert(event);
            break;
          default:
            console.warn('Type d\'événement inconnu:', event.type);
            continue;
        }

        if (!result.success && result.error) {
          errors.push(`${event.type}: ${result.error}`);
        }

        // Pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 3. Nettoyer les anciennes données
      await offlineDB.cleanupSyncedEvents();
      await offlineSyncManager.cleanupSyncedData('bureau');

      // 4. Mettre à jour les stats
      await updateSyncStats();
      setLastSyncTime(new Date());

      if (errors.length > 0) {
        setSyncErrors(errors);
        toast.error(`Synchronisation partielle: ${errors.length} erreurs`);
      } else if (pendingEvents.length > 0 || managerResult.success > 0) {
        toast.success(`✅ Synchronisation réussie: ${pendingEvents.length + managerResult.success} éléments`);
      }
    } catch (error: any) {
      console.error('Erreur synchronisation globale:', error);
      toast.error('Erreur lors de la synchronisation');
      errors.push(error.message);
      setSyncErrors(errors);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updateSyncStats]);

  /**
   * Force la synchronisation manuelle
   */
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      toast.error('Impossible de synchroniser hors ligne');
      return;
    }
    
    toast.info('Synchronisation en cours...');
    await syncAllPendingEvents();
  }, [isOnline, syncAllPendingEvents]);

  /**
   * Stocke un événement hors ligne
   */
  const storeOfflineEvent = useCallback(async (
    type: string,
    data: any
  ) => {
    try {
      await offlineDB.storeEvent({
        type,
        data,
        vendor_id: bureauId,
        created_at: new Date().toISOString()
      });

      await updateSyncStats();

      if (isOnline) {
        await syncAllPendingEvents();
      } else {
        toast.info('📴 Données enregistrées localement', {
          description: 'Elles seront synchronisées à la reconnexion'
        });
      }
    } catch (error) {
      console.error('Erreur stockage événement:', error);
      toast.error('Erreur lors de l\'enregistrement local');
    }
  }, [bureauId, isOnline, updateSyncStats, syncAllPendingEvents]);

  /**
   * Efface les erreurs de synchronisation
   */
  const clearSyncErrors = useCallback(() => {
    setSyncErrors([]);
  }, []);

  /**
   * Récupère l'historique de synchronisation
   */
  const getSyncHistory = useCallback(async () => {
    return await offlineDB.getEventStats();
  }, []);

  // Initialisation
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    updateSyncStats();

    // Synchronisation périodique toutes les 2 minutes si en ligne
    syncIntervalRef.current = setInterval(() => {
      if (isOnline && !isSyncing) {
        syncAllPendingEvents();
      }
    }, 2 * 60 * 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Écouter les changements de connexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Connexion rétablie - synchronisation en cours...');
      syncAllPendingEvents();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📴 Mode hors ligne activé');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAllPendingEvents]);

  return {
    isOnline,
    isSyncing,
    syncStats,
    lastSyncTime,
    syncErrors,
    forceSync,
    storeOfflineEvent,
    clearSyncErrors,
    getSyncHistory,
    updateSyncStats,
    hasPendingEvents: syncStats.pending > 0,
    hasFailedEvents: syncStats.failed > 0
  };
}
