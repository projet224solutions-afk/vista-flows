/**
 * HOOK SÉCURITÉ MOTOS - NOTIFICATIONS TEMPS RÉEL
 * Gestion des notifications et synchronisation
 * 224Solutions - Module de sécurité intelligent
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SecurityNotification {
    id: string;
    title: string;
    body: string;
    type: 'moto_alert' | 'vol_detected' | 'resolution' | 'security_alert';
    target_bureau_origin?: string;
    target_bureau_detection?: string;
    target_pdg: boolean;
    metadata: Record<string, unknown>;
    read_at?: string;
    created_at: string;
}

interface MotoSecurityStats {
    total_alertes: number;
    alertes_en_cours: number;
    alertes_resolues: number;
    faux_positifs: number;
    motos_uniques_signalées: number;
    temps_moyen_resolution_heures: number;
}

export function useMotoSecurity(bureauId?: string, isPDG: boolean = false) {
    const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
    const [stats, setStats] = useState<MotoSecurityStats | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Charger les notifications initiales
    const loadNotifications = useCallback(async () => {
        try {
            let query = supabase
                .from('security_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (bureauId) {
                query = query.or(`target_bureau_origin.eq.${bureauId},target_bureau_detection.eq.${bureauId}`);
            }

            if (isPDG) {
                query = query.eq('target_pdg', true);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Erreur chargement notifications:', error);
                return;
            }

            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.read_at).length || 0);

        } catch (error) {
            console.error('❌ Erreur notifications:', error);
        }
    }, [bureauId, isPDG]);

    // Charger les statistiques
    const loadStats = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (bureauId) params.append('bureau_id', bureauId);

            const response = await fetch(`/api/moto-security/stats?${params}`);
            const result = await response.json();

            if (result.success) {
                setStats(result.global_stats);
            }
        } catch (error) {
            console.error('❌ Erreur chargement stats:', error);
        }
    }, [bureauId]);

    // Marquer une notification comme lue
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('security_notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', notificationId);

            if (error) {
                console.error('❌ Erreur marquage lu:', error);
                return;
            }

            setNotifications(prev => 
                prev.map(n => 
                    n.id === notificationId 
                        ? { ...n, read_at: new Date().toISOString() }
                        : n
                )
            );

            setUnreadCount(prev => Math.max(0, prev - 1));

        } catch (error) {
            console.error('❌ Erreur marquage lu:', error);
        }
    }, []);

    // Marquer toutes les notifications comme lues
    const markAllAsRead = useCallback(async () => {
        try {
            const { error } = await supabase
                .from('security_notifications')
                .update({ read_at: new Date().toISOString() })
                .is('read_at', null);

            if (error) {
                console.error('❌ Erreur marquage toutes lues:', error);
                return;
            }

            setNotifications(prev => 
                prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);

        } catch (error) {
            console.error('❌ Erreur marquage toutes lues:', error);
        }
    }, []);

    // Configurer la synchronisation temps réel
    useEffect(() => {
        let subscription: unknown = null;

        const setupRealtimeSync = async () => {
            try {
                // Charger les données initiales
                await loadNotifications();
                await loadStats();

                // Configurer l'écoute des nouvelles notifications
                subscription = supabase
                    .channel('security-notifications')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'security_notifications'
                        },
                        (payload) => {
                            console.log('🔔 Nouvelle notification sécurité:', payload);
                            handleNewNotification(payload.new as SecurityNotification);
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'moto_alertes'
                        },
                        (payload) => {
                            console.log('🔄 Mise à jour alerte moto:', payload);
                            // Recharger les stats quand une alerte change
                            loadStats();
                        }
                    )
                    .subscribe((status) => {
                        console.log('📡 Statut notifications sécurité:', status);
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
    }, [loadNotifications, loadStats]);

    // Gérer une nouvelle notification
    const handleNewNotification = useCallback((notification: SecurityNotification) => {
        // Vérifier si la notification nous concerne
        const isRelevant = 
            (bureauId && (notification.target_bureau_origin === bureauId || notification.target_bureau_detection === bureauId)) ||
            (isPDG && notification.target_pdg);

        if (!isRelevant) return;

        // Ajouter à la liste
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Afficher une notification toast
        const getToastConfig = () => {
            switch (notification.type) {
                case 'vol_detected':
                    return {
                        title: '🚨 Moto volée détectée',
                        description: notification.body,
                        action: {
                            label: 'Voir détails',
                            onClick: () => {
                                // Ouvrir l'interface des alertes
                                window.dispatchEvent(new CustomEvent('open-security-alerts'));
                            }
                        }
                    };
                case 'security_alert':
                    return {
                        title: '🔍 Alerte sécurité',
                        description: notification.body,
                        action: {
                            label: 'Voir',
                            onClick: () => {
                                window.dispatchEvent(new CustomEvent('open-security-alerts'));
                            }
                        }
                    };
                case 'resolution':
                    return {
                        title: '✅ Moto retrouvée',
                        description: notification.body
                    };
                default:
                    return {
                        title: notification.title,
                        description: notification.body
                    };
            }
        };

        const toastConfig = getToastConfig();
        toast(toastConfig.title, {
            description: toastConfig.description,
            duration: 10000,
            action: toastConfig.action
        });

    }, [bureauId, isPDG]);

    // Forcer une synchronisation
    const forceSync = useCallback(async () => {
        try {
            await loadNotifications();
            await loadStats();
            toast.success('🔄 Données de sécurité actualisées');
        } catch (error) {
            console.error('❌ Erreur sync forcée:', error);
            toast.error('❌ Erreur de synchronisation');
        }
    }, [loadNotifications, loadStats]);

    return {
        notifications,
        stats,
        isConnected,
        unreadCount,
        markAsRead,
        markAllAsRead,
        forceSync,
        loadNotifications,
        loadStats
    };
}
