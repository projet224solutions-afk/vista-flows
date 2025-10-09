/**
 * HOOK SYNCHRONISATION TEMPS RÉEL
 * Gestion de la synchronisation entre PDG et bureaux syndicats
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface RealtimeStats {
    totalBureaus: number;
    activeBureaus: number;
    totalMembers: number;
    totalRevenue: number;
    activeSOS: number;
    lastUpdate: string;
}

export interface BureauUpdate {
    bureauId: string;
    bureauCode: string;
    updateType: 'member_added' | 'revenue_update' | 'sos_alert' | 'status_change';
    data: any;
    timestamp: string;
}

export function useRealtimeSync(bureauId?: string) {
    const [stats, setStats] = useState<RealtimeStats>({
        totalBureaus: 0,
        activeBureaus: 0,
        totalMembers: 0,
        totalRevenue: 0,
        activeSOS: 0,
        lastUpdate: new Date().toISOString()
    });

    const [updates, setUpdates] = useState<BureauUpdate[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

    // Charger les statistiques initiales
    const loadInitialStats = useCallback(async () => {
        try {
            // Charger les statistiques globales
            const { data: bureaus, error: bureausError } = await supabase
                .from('syndicate_bureaus')
                .select('id, status, total_members, total_cotisations');

            if (bureausError) {
                console.error('❌ Erreur chargement bureaux:', bureausError);
                return;
            }

            // Charger les alertes SOS actives
            const { data: sosAlerts, error: sosError } = await supabase
                .from('syndicate_sos_alerts')
                .select('id, status')
                .eq('status', 'active');

            if (sosError) {
                console.error('❌ Erreur chargement SOS:', sosError);
            }

            const totalBureaus = bureaus.length;
            const activeBureaus = bureaus.filter(b => b.status === 'active').length;
            const totalMembers = bureaus.reduce((sum, b) => sum + (b.total_members || 0), 0);
            const totalRevenue = bureaus.reduce((sum, b) => sum + (b.total_cotisations || 0), 0);
            const activeSOS = sosAlerts?.length || 0;

            setStats({
                totalBureaus,
                activeBureaus,
                totalMembers,
                totalRevenue,
                activeSOS,
                lastUpdate: new Date().toISOString()
            });

            setLastSyncTime(new Date());
        } catch (error) {
            console.error('❌ Erreur chargement stats:', error);
        }
    }, []);

    // Gérer les mises à jour des bureaux
    const handleBureauUpdate = useCallback((payload: any) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        // Mettre à jour les statistiques
        loadInitialStats();

        // Ajouter l'update à la liste
        const update: BureauUpdate = {
            bureauId: newRecord?.id || oldRecord?.id,
            bureauCode: newRecord?.bureau_code || oldRecord?.bureau_code,
            updateType: 'status_change',
            data: { new: newRecord, old: oldRecord },
            timestamp: new Date().toISOString()
        };

        setUpdates(prev => [update, ...prev.slice(0, 9)]); // Garder les 10 derniers

        // Notification toast
        if (eventType === 'INSERT') {
            toast.success('✅ Nouveau bureau créé', {
                description: `${newRecord.bureau_code} - ${newRecord.prefecture}`
            });
        } else if (eventType === 'UPDATE') {
            toast.info('🔄 Bureau mis à jour', {
                description: `${newRecord.bureau_code}`
            });
        }
    }, [loadInitialStats]);

    // Gérer les mises à jour des membres
    const handleMemberUpdate = useCallback((payload: any) => {
        const { eventType, new: newRecord } = payload;

        // Mettre à jour les statistiques
        loadInitialStats();

        // Ajouter l'update à la liste
        const update: BureauUpdate = {
            bureauId: newRecord.bureau_id,
            bureauCode: 'N/A', // À récupérer si nécessaire
            updateType: 'member_added',
            data: newRecord,
            timestamp: new Date().toISOString()
        };

        setUpdates(prev => [update, ...prev.slice(0, 9)]);

        // Notification toast
        if (eventType === 'INSERT') {
            toast.success('👤 Nouveau membre ajouté', {
                description: `${newRecord.name} - ${newRecord.vehicle_serial}`
            });
        }
    }, [loadInitialStats]);

    // Gérer les mises à jour SOS
    const handleSOSUpdate = useCallback((payload: any) => {
        const { eventType, new: newRecord } = payload;

        // Mettre à jour les statistiques
        loadInitialStats();

        // Ajouter l'update à la liste
        const update: BureauUpdate = {
            bureauId: newRecord.bureau_id,
            bureauCode: 'N/A',
            updateType: 'sos_alert',
            data: newRecord,
            timestamp: new Date().toISOString()
        };

        setUpdates(prev => [update, ...prev.slice(0, 9)]);

        // Notification toast pour les alertes SOS
        if (eventType === 'INSERT' && newRecord.status === 'active') {
            toast.error('🚨 ALERTE SOS', {
                description: `${newRecord.member_name} - ${newRecord.vehicle_serial}`,
                duration: 10000
            });
        }
    }, [loadInitialStats]);

    // Configurer la synchronisation temps réel
    useEffect(() => {
        let subscription: any = null;

        const setupRealtimeSync = async () => {
            try {
                // Charger les stats initiales
                await loadInitialStats();

                // Configurer l'écoute des changements sur les bureaux
                subscription = supabase
                    .channel('bureau-updates')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'syndicate_bureaus'
                        },
                        (payload) => {
                            console.log('🔄 Mise à jour bureau reçue:', payload);
                            handleBureauUpdate(payload);
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'syndicate_members'
                        },
                        (payload) => {
                            console.log('🔄 Mise à jour membre reçue:', payload);
                            handleMemberUpdate(payload);
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'syndicate_sos_alerts'
                        },
                        (payload) => {
                            console.log('🔄 Mise à jour SOS reçue:', payload);
                            handleSOSUpdate(payload);
                        }
                    )
                    .subscribe((status) => {
                        console.log('📡 Statut synchronisation:', status);
                        setIsConnected(status === 'SUBSCRIBED');
                    });

            } catch (error) {
                console.error('❌ Erreur configuration sync:', error);
            }
        };

        setupRealtimeSync();

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [loadInitialStats, handleBureauUpdate, handleMemberUpdate, handleSOSUpdate]);

    // Forcer une synchronisation manuelle
    const forceSync = useCallback(async () => {
        try {
            await loadInitialStats();
            toast.success('🔄 Synchronisation forcée', {
                description: 'Données mises à jour'
            });
        } catch (error) {
            console.error('❌ Erreur sync forcée:', error);
            toast.error('❌ Erreur de synchronisation');
        }
    }, [loadInitialStats]);

    // Nettoyer les anciennes mises à jour
    const clearUpdates = useCallback(() => {
        setUpdates([]);
    }, []);

    return {
        stats,
        updates,
        isConnected,
        lastSyncTime,
        forceSync,
        clearUpdates,
        loadInitialStats
    };
}
