/**
 * HOOK DE SYNCHRONISATION OFFLINE
 * Gestion automatique de la synchronisation des données hors-ligne
 * 224SOLUTIONS - Interface Vendeur
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import offlineDB from '@/lib/offlineDB';

const SYNC_INTERVAL = 30000; // 30 secondes
const MAX_BATCH_SIZE = 10;

export const useOfflineSync = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState({
        total: 0,
        pending: 0,
        synced: 0,
        failed: 0
    });
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncErrors, setSyncErrors] = useState([]);

    const syncIntervalRef = useRef(null);
    const isInitialized = useRef(false);

    /**
     * Met à jour les statistiques de synchronisation
     */
    const updateSyncStats = useCallback(async () => {
        try {
            const stats = await offlineDB.getEventStats();
            setSyncStats(stats);
        } catch (error) {
            console.error('Erreur mise à jour stats sync:', error);
        }
    }, []);

    /**
     * Synchronise un événement avec le serveur
     */
    const syncEvent = useCallback(async (event) => {
        try {
            const response = await fetch('/api/sync/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    events: [event]
                })
            });

            if (!response.ok) {
                throw new Error(`Erreur serveur: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                await offlineDB.markEventAsSynced(event.client_event_id);
                return { success: true, event };
            } else {
                throw new Error(result.error || 'Erreur de synchronisation');
            }
        } catch (error) {
            console.error('Erreur sync événement:', error);
            await offlineDB.markEventAsFailed(event.client_event_id, error.message);
            return { success: false, error: error.message, event };
        }
    }, []);

    /**
     * Synchronise un fichier avec le serveur
     */
    const syncFile = useCallback(async (fileData) => {
        try {
            const formData = new FormData();
            formData.append('file', fileData.data);
            formData.append('event_id', fileData.event_id);
            formData.append('file_id', fileData.id);

            const response = await fetch('/api/sync/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Erreur upload: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                await offlineDB.deleteStoredFile(fileData.id);
                return { success: true, fileData };
            } else {
                throw new Error(result.error || 'Erreur d\'upload');
            }
        } catch (error) {
            console.error('Erreur sync fichier:', error);
            return { success: false, error: error.message, fileData };
        }
    }, []);

    /**
     * Synchronise tous les événements en attente
     */
    const syncAllPendingEvents = useCallback(async () => {
        if (!isOnline || isSyncing) {
            return;
        }

        setIsSyncing(true);
        setSyncErrors([]);

        try {
            // Récupérer les événements en attente
            const pendingEvents = await offlineDB.getPendingEvents();

            if (pendingEvents.length === 0) {
                setIsSyncing(false);
                return;
            }

            console.log(`🔄 Synchronisation de ${pendingEvents.length} événements...`);

            // Traiter par batch
            const batches = [];
            for (let i = 0; i < pendingEvents.length; i += MAX_BATCH_SIZE) {
                batches.push(pendingEvents.slice(i, i + MAX_BATCH_SIZE));
            }

            let syncedCount = 0;
            let failedCount = 0;
            const errors = [];

            for (const batch of batches) {
                try {
                    const response = await fetch('/api/sync/batch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: JSON.stringify({
                            events: batch
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Erreur serveur: ${response.status}`);
                    }

                    const result = await response.json();

                    if (result.success) {
                        // Marquer tous les événements du batch comme synchronisés
                        for (const event of batch) {
                            await offlineDB.markEventAsSynced(event.client_event_id);
                            syncedCount++;
                        }
                    } else {
                        throw new Error(result.error || 'Erreur de synchronisation batch');
                    }
                } catch (error) {
                    console.error('Erreur sync batch:', error);
                    errors.push(error.message);

                    // Marquer les événements du batch comme échoués
                    for (const event of batch) {
                        await offlineDB.markEventAsFailed(event.client_event_id, error.message);
                        failedCount++;
                    }
                }
            }

            // Synchroniser les fichiers
            try {
                const storedFiles = await offlineDB.db.getAll('offline_files');
                for (const fileData of storedFiles) {
                    const result = await syncFile(fileData);
                    if (result.success) {
                        syncedCount++;
                    } else {
                        failedCount++;
                        errors.push(`Fichier ${fileData.name}: ${result.error}`);
                    }
                }
            } catch (error) {
                console.error('Erreur sync fichiers:', error);
            }

            // Mettre à jour les statistiques
            await updateSyncStats();
            setLastSyncTime(new Date().toISOString());

            // Afficher les résultats
            if (syncedCount > 0) {
                toast.success(`✅ Synchronisation réussie`, {
                    description: `${syncedCount} éléments synchronisés`
                });
            }

            if (failedCount > 0) {
                setSyncErrors(errors);
                toast.error(`⚠️ ${failedCount} éléments non synchronisés`, {
                    description: 'Vérifiez votre connexion et réessayez'
                });
            }

            // Nettoyer les anciens événements synchronisés
            await offlineDB.cleanupSyncedEvents();

        } catch (error) {
            console.error('Erreur synchronisation générale:', error);
            toast.error('❌ Erreur de synchronisation', {
                description: error.message
            });
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing, syncEvent, syncFile, updateSyncStats]);

    /**
     * Force la synchronisation manuelle
     */
    const forceSync = useCallback(async () => {
        if (!isOnline) {
            toast.error('❌ Pas de connexion Internet', {
                description: 'Vérifiez votre connexion et réessayez'
            });
            return;
        }

        await syncAllPendingEvents();
    }, [isOnline, syncAllPendingEvents]);

    /**
     * Stocke un événement hors-ligne
     */
    const storeOfflineEvent = useCallback(async (eventData) => {
        try {
            const eventId = await offlineDB.storeEvent(eventData);
            await updateSyncStats();

            // Si en ligne, essayer de synchroniser immédiatement
            if (isOnline) {
                setTimeout(() => syncAllPendingEvents(), 1000);
            }

            return eventId;
        } catch (error) {
            console.error('Erreur stockage événement offline:', error);
            throw error;
        }
    }, [isOnline, updateSyncStats, syncAllPendingEvents]);

    /**
     * Stocke un fichier hors-ligne
     */
    const storeOfflineFile = useCallback(async (file, eventId) => {
        try {
            const fileId = await offlineDB.storeFile(file, eventId);
            return fileId;
        } catch (error) {
            console.error('Erreur stockage fichier offline:', error);
            throw error;
        }
    }, []);

    /**
     * Écoute les changements de statut de connexion
     */
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('🌐 Connexion rétablie', {
                description: 'Synchronisation automatique en cours...'
            });
            // Délai pour laisser le temps à la connexion de se stabiliser
            setTimeout(() => syncAllPendingEvents(), 2000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.info('📡 Mode hors-ligne', {
                description: 'Vos données seront synchronisées à la reconnexion'
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncAllPendingEvents]);

    /**
     * Initialise la synchronisation automatique
     */
    useEffect(() => {
        if (!isInitialized.current) {
            isInitialized.current = true;
            updateSyncStats();

            // Synchronisation automatique périodique
            if (isOnline) {
                syncIntervalRef.current = setInterval(() => {
                    if (isOnline && !isSyncing) {
                        syncAllPendingEvents();
                    }
                }, SYNC_INTERVAL);
            }
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [isOnline, isSyncing, updateSyncStats, syncAllPendingEvents]);

    /**
     * Nettoie les erreurs de synchronisation
     */
    const clearSyncErrors = useCallback(() => {
        setSyncErrors([]);
    }, []);

    /**
     * Récupère l'historique de synchronisation
     */
    const getSyncHistory = useCallback(async () => {
        try {
            const allEvents = await offlineDB.db.getAll('offline_events');
            return allEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (error) {
            console.error('Erreur récupération historique:', error);
            return [];
        }
    }, []);

    return {
        // État de la connexion
        isOnline,
        isSyncing,

        // Statistiques
        syncStats,
        lastSyncTime,
        syncErrors,

        // Actions
        forceSync,
        storeOfflineEvent,
        storeOfflineFile,
        clearSyncErrors,
        getSyncHistory,
        updateSyncStats,

        // Utilitaires
        hasPendingEvents: syncStats.pending > 0,
        hasFailedEvents: syncStats.failed > 0
    };
};

export default useOfflineSync;
