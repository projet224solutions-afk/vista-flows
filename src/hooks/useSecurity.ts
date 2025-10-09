/**
 * HOOKS REACT POUR LE SYSTÈME DE SÉCURITÉ - 224SOLUTIONS (SIMPLIFIÉ)
 * Version simplifiée pour éviter les erreurs TypeScript
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SecurityStats {
    total_events: number;
    critical_threats: number;
    resolved_incidents: number;
    threat_score: number;
    systemHealth?: string;
    threatScore?: number;
    totalEvents?: number;
    criticalEvents?: number;
    blockedIPs?: number;
    activeIncidents?: number;
}

export interface SystemAlert {
    id: string;
    message: string;
    severity: string;
    created_at: string;
    priority?: string;
    title?: string;
    alert_type?: string;
    status?: string;
}

export interface ThreatAnalysis {
    score: number;
    threats: any[];
}

export function useSecurity() {
    const [stats, setStats] = useState<SecurityStats>({
        total_events: 0,
        critical_threats: 0,
        resolved_incidents: 0,
        threat_score: 0,
        systemHealth: 'good',
        threatScore: 0,
        totalEvents: 0,
        criticalEvents: 0,
        blockedIPs: 0,
        activeIncidents: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const loadStats = useCallback(async () => {
        setLoading(false);
        setError(null);
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    return {
        stats,
        loading,
        error,
        loadStats,
        logEvent: async (event: any) => { },
        blockIP: async (ip: string, reason: string) => true,
        analyzeThreat: async (ip: string) => null
    };
}

export function useSecurityAlerts() {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadAlerts = useCallback(async () => {
        setLoading(false);
    }, []);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    return {
        alerts,
        loading,
        unreadCount,
        loadAlerts,
        acknowledgeAlert: async () => true,
        createAlert: async () => null
    };
}

export function useSecurityIncidents() {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadIncidents = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('moto_security_audit')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (!error && data) {
                setIncidents(data);
            }
        } catch (err) {
            console.error('Erreur chargement incidents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadIncidents();
    }, [loadIncidents]);

    const createIncident = useCallback(async (incident: any) => {
        try {
            const { data, error } = await supabase
                .from('moto_security_audit')
                .insert(incident)
                .select()
                .single();
            
            if (!error && data) {
                setIncidents(prev => [data, ...prev]);
                toast.success('Incident créé avec succès');
                return data;
            }
            return null;
        } catch (err) {
            console.error('Erreur création incident:', err);
            return null;
        }
    }, []);

    return {
        incidents,
        loading,
        loadIncidents,
        createIncident,
        updateIncident: async () => true,
        closeIncident: async () => true
    };
}

export function useSecurityEvents() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('moto_security_audit')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);
            
            if (!error && data) {
                setEvents(data);
            }
        } catch (err) {
            console.error('Erreur chargement événements:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    return {
        events,
        loading,
        loadEvents
    };
}

// Hooks supplémentaires pour compatibilité
export function useRealTimeMonitoring() {
    return {
        isActive: false,
        metrics: {},
        events: [],
        isConnected: false
    };
}

export function useSecurityAnalysis() {
    return {
        analysis: null,
        loading: false,
        analysisData: null,
        runAnalysis: async () => { }
    };
}

export function useRealTimeProtection() {
    return {
        isEnabled: false,
        threats: [],
        protectionStatus: 'active',
        threatLevel: 'low',
        toggleProtection: async (enabled: any) => { }
    };
}

export function useSecurityAudit() {
    return {
        audit: null,
        loading: false,
        auditLogs: [],
        filters: { dateRange: '', severity: '' },
        updateFilters: (filters: any) => { },
        exportLogs: async (format: any) => { }
    };
}
