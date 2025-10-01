/**
 * HOOKS REACT POUR LE SYSTÈME DE SÉCURITÉ - 224SOLUTIONS
 * Hooks optimisés pour la gestion de la sécurité dans les composants React
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    securityService,
    SecurityStats,
    SecurityEvent,
    SecurityIncident,
    SystemAlert,
    ThreatAnalysis
} from '@/services/securityService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// =====================================================
// HOOK PRINCIPAL DE SÉCURITÉ
// =====================================================

export function useSecurity() {
    const [stats, setStats] = useState<SecurityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const loadStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const securityStats = await securityService.getSecurityStats();
            setStats(securityStats);
        } catch (err) {
            setError('Erreur lors du chargement des statistiques de sécurité');
            console.error('Erreur stats sécurité:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();

        // Actualiser toutes les 30 secondes
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [loadStats]);

    const logEvent = useCallback(async (event: Omit<SecurityEvent, 'id' | 'created_at'>) => {
        try {
            await securityService.logSecurityEvent({
                ...event,
                user_id: user?.id
            });
            // Recharger les stats après un nouvel événement
            loadStats();
        } catch (err) {
            console.error('Erreur log événement sécurité:', err);
        }
    }, [user?.id, loadStats]);

    const blockIP = useCallback(async (
        ipAddress: string,
        reason: string,
        duration: 'temporary' | 'permanent' = 'temporary',
        durationHours: number = 24
    ) => {
        try {
            const success = await securityService.blockIP(ipAddress, reason, duration, durationHours);
            if (success) {
                toast.success(`IP ${ipAddress} bloquée avec succès`);
                loadStats();
            } else {
                toast.error('Erreur lors du blocage de l\'IP');
            }
            return success;
        } catch (err) {
            toast.error('Erreur lors du blocage de l\'IP');
            console.error('Erreur blocage IP:', err);
            return false;
        }
    }, [loadStats]);

    const analyzeThreat = useCallback(async (ipAddress: string): Promise<ThreatAnalysis | null> => {
        try {
            return await securityService.analyzeThreat(ipAddress);
        } catch (err) {
            console.error('Erreur analyse menace:', err);
            return null;
        }
    }, []);

    return {
        stats,
        loading,
        error,
        logEvent,
        blockIP,
        analyzeThreat,
        refreshStats: loadStats
    };
}

// =====================================================
// HOOK POUR LES ALERTES SYSTÈME
// =====================================================

export function useSecurityAlerts() {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadAlerts = useCallback(async () => {
        try {
            setLoading(true);
            const activeAlerts = await securityService.getActiveAlerts();
            setAlerts(activeAlerts);
            setUnreadCount(activeAlerts.filter(a => a.status === 'active').length);
        } catch (err) {
            console.error('Erreur chargement alertes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAlerts();

        // Callback pour les nouvelles alertes en temps réel
        const handleNewAlert = (alert: SystemAlert) => {
            setAlerts(prev => [alert, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Toast notification selon la priorité
            const toastOptions = {
                duration: alert.priority === 'urgent' ? 10000 : 5000
            };

            switch (alert.priority) {
                case 'urgent':
                    toast.error(`🚨 ${alert.title}`, toastOptions);
                    break;
                case 'high':
                    toast.warning(`⚠️ ${alert.title}`, toastOptions);
                    break;
                default:
                    toast.info(`ℹ️ ${alert.title}`, toastOptions);
            }
        };

        securityService.onNewAlert(handleNewAlert);

        return () => {
            securityService.removeAlertCallback(handleNewAlert);
        };
    }, [loadAlerts]);

    const acknowledgeAlert = useCallback(async (alertId: string) => {
        try {
            const { user } = useAuth();
            const success = await securityService.acknowledgeAlert(alertId, user?.id || '');
            if (success) {
                setAlerts(prev => prev.map(alert =>
                    alert.id === alertId
                        ? { ...alert, status: 'acknowledged' as const }
                        : alert
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
                toast.success('Alerte acquittée');
            }
            return success;
        } catch (err) {
            toast.error('Erreur lors de l\'acquittement');
            console.error('Erreur acquittement alerte:', err);
            return false;
        }
    }, []);

    const createAlert = useCallback(async (alert: Omit<SystemAlert, 'id'>) => {
        try {
            const newAlert = await securityService.createAlert(alert);
            if (newAlert) {
                toast.success('Alerte créée avec succès');
                loadAlerts();
            }
            return newAlert;
        } catch (err) {
            toast.error('Erreur lors de la création de l\'alerte');
            console.error('Erreur création alerte:', err);
            return null;
        }
    }, [loadAlerts]);

    return {
        alerts,
        loading,
        unreadCount,
        acknowledgeAlert,
        createAlert,
        refreshAlerts: loadAlerts
    };
}

// =====================================================
// HOOK POUR LES INCIDENTS DE SÉCURITÉ
// =====================================================

export function useSecurityIncidents() {
    const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
    const [loading, setLoading] = useState(true);

    const loadIncidents = useCallback(async () => {
        try {
            setLoading(true);
            const activeIncidents = await securityService.getActiveIncidents();
            setIncidents(activeIncidents);
        } catch (err) {
            console.error('Erreur chargement incidents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadIncidents();
    }, [loadIncidents]);

    const createIncident = useCallback(async (incident: Omit<SecurityIncident, 'id' | 'incident_id'>) => {
        try {
            const newIncident = await securityService.createIncident(incident);
            if (newIncident) {
                setIncidents(prev => [newIncident, ...prev]);
                toast.success('Incident créé avec succès');
            }
            return newIncident;
        } catch (err) {
            toast.error('Erreur lors de la création de l\'incident');
            console.error('Erreur création incident:', err);
            return null;
        }
    }, []);

    return {
        incidents,
        loading,
        createIncident,
        refreshIncidents: loadIncidents
    };
}

// =====================================================
// HOOK POUR LE MONITORING TEMPS RÉEL
// =====================================================

export function useRealTimeMonitoring() {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const eventBuffer = useRef<SecurityEvent[]>([]);
    const maxEvents = 100; // Limite pour éviter la surcharge mémoire

    useEffect(() => {
        setIsConnected(true);

        // Simuler la réception d'événements temps réel
        // En production, ceci serait connecté au service de monitoring
        const interval = setInterval(() => {
            // Vérifier s'il y a de nouveaux événements dans le buffer
            if (eventBuffer.current.length > 0) {
                setEvents(prev => {
                    const newEvents = [...eventBuffer.current, ...prev].slice(0, maxEvents);
                    eventBuffer.current = [];
                    return newEvents;
                });
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            setIsConnected(false);
        };
    }, []);

    const addEvent = useCallback((event: SecurityEvent) => {
        eventBuffer.current.unshift(event);
    }, []);

    const clearEvents = useCallback(() => {
        setEvents([]);
        eventBuffer.current = [];
    }, []);

    return {
        events,
        isConnected,
        addEvent,
        clearEvents
    };
}

// =====================================================
// HOOK POUR L'ANALYSE DE SÉCURITÉ
// =====================================================

export function useSecurityAnalysis() {
    const [analysisData, setAnalysisData] = useState<{
        threatTrends: any[];
        topThreats: any[];
        securityScore: number;
        recommendations: string[];
    } | null>(null);
    const [loading, setLoading] = useState(false);

    const runAnalysis = useCallback(async () => {
        try {
            setLoading(true);

            // Simuler une analyse de sécurité
            // En production, ceci ferait des requêtes complexes à la base de données
            const mockAnalysis = {
                threatTrends: [
                    { date: '2024-01-01', threats: 12 },
                    { date: '2024-01-02', threats: 8 },
                    { date: '2024-01-03', threats: 15 },
                    { date: '2024-01-04', threats: 6 },
                    { date: '2024-01-05', threats: 10 }
                ],
                topThreats: [
                    { type: 'Failed Login Attempts', count: 45, severity: 'medium' },
                    { type: 'Suspicious API Calls', count: 23, severity: 'high' },
                    { type: 'Unusual Transaction Patterns', count: 12, severity: 'low' },
                    { type: 'Blocked IP Attempts', count: 8, severity: 'high' }
                ],
                securityScore: 78,
                recommendations: [
                    'Activer l\'authentification multi-facteurs pour tous les comptes admin',
                    'Mettre à jour les règles de détection de fraude',
                    'Réviser les permissions d\'accès aux données sensibles',
                    'Programmer un audit de sécurité complet'
                ]
            };

            // Simuler un délai d'analyse
            await new Promise(resolve => setTimeout(resolve, 2000));

            setAnalysisData(mockAnalysis);
        } catch (err) {
            console.error('Erreur analyse sécurité:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        analysisData,
        loading,
        runAnalysis
    };
}

// =====================================================
// HOOK POUR LA PROTECTION EN TEMPS RÉEL
// =====================================================

export function useRealTimeProtection() {
    const [protectionStatus, setProtectionStatus] = useState({
        firewall: true,
        antiDDoS: true,
        fraudDetection: true,
        apiMonitoring: true,
        realTimeScanning: true
    });
    const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');

    useEffect(() => {
        // Simuler le monitoring de protection en temps réel
        const interval = setInterval(() => {
            // Logique de mise à jour du niveau de menace
            const random = Math.random();
            if (random > 0.95) setThreatLevel('critical');
            else if (random > 0.85) setThreatLevel('high');
            else if (random > 0.7) setThreatLevel('medium');
            else setThreatLevel('low');
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const toggleProtection = useCallback((service: keyof typeof protectionStatus) => {
        setProtectionStatus(prev => ({
            ...prev,
            [service]: !prev[service]
        }));
    }, []);

    return {
        protectionStatus,
        threatLevel,
        toggleProtection
    };
}

// =====================================================
// HOOK POUR LES LOGS D'AUDIT
// =====================================================

export function useSecurityAudit() {
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: '24h',
        severity: 'all',
        module: 'all',
        user: 'all'
    });

    const loadAuditLogs = useCallback(async () => {
        try {
            setLoading(true);

            // Simuler le chargement des logs d'audit
            const mockLogs = Array.from({ length: 50 }, (_, i) => ({
                id: `audit-${i}`,
                timestamp: new Date(Date.now() - i * 60000).toISOString(),
                user: `user-${Math.floor(Math.random() * 10)}`,
                action: ['login', 'logout', 'data_access', 'permission_change', 'system_config'][Math.floor(Math.random() * 5)],
                resource: ['user_profile', 'payment_data', 'api_keys', 'security_settings'][Math.floor(Math.random() * 4)],
                ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
                severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                details: 'Action performed successfully'
            }));

            setAuditLogs(mockLogs);
        } catch (err) {
            console.error('Erreur chargement logs audit:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadAuditLogs();
    }, [loadAuditLogs]);

    const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const exportLogs = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
        try {
            // Simuler l'export des logs
            const data = auditLogs.map(log => ({
                Timestamp: log.timestamp,
                User: log.user,
                Action: log.action,
                Resource: log.resource,
                IP: log.ip_address,
                Severity: log.severity,
                Details: log.details
            }));

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `security-audit-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else if (format === 'csv') {
                const csv = [
                    Object.keys(data[0]).join(','),
                    ...data.map(row => Object.values(row).join(','))
                ].join('\n');

                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `security-audit-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }

            toast.success(`Logs exportés en ${format.toUpperCase()}`);
        } catch (err) {
            toast.error('Erreur lors de l\'export');
            console.error('Erreur export logs:', err);
        }
    }, [auditLogs]);

    return {
        auditLogs,
        loading,
        filters,
        updateFilters,
        exportLogs,
        refreshLogs: loadAuditLogs
    };
}
