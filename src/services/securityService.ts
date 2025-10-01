/**
 * SERVICE DE SÉCURITÉ ET MONITORING - 224SOLUTIONS
 * Gestion complète de la sécurité, monitoring temps réel, détection de menaces
 */

import { supabase } from "@/integrations/supabase/client";

// =====================================================
// TYPES ET INTERFACES
// =====================================================

export interface SecurityEvent {
    id?: string;
    event_type: 'login_attempt' | 'api_call' | 'transaction' | 'system_error' | 'attack_detected' | 'suspicious_activity';
    severity_level: 'info' | 'warning' | 'critical' | 'emergency';
    source_module: 'auth' | 'taxi_moto' | 'syndicate' | 'marketplace' | 'payment' | 'api';
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    event_data: Record<string, any>;
    threat_level?: number;
    status?: 'active' | 'resolved' | 'investigating';
    auto_response_taken?: boolean;
    created_at?: string;
}

export interface SecurityIncident {
    id?: string;
    incident_id: string;
    title: string;
    description: string;
    incident_type: 'attack' | 'breach' | 'fraud' | 'system_failure' | 'unauthorized_access';
    severity: 'low' | 'medium' | 'high' | 'critical';
    affected_modules: string[];
    affected_users: string[];
    detection_method: 'automatic' | 'manual' | 'user_report' | 'ai_analysis';
    response_actions: any[];
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    assigned_to?: string;
}

export interface SystemAlert {
    id?: string;
    alert_id: string;
    title: string;
    message: string;
    alert_type: 'security' | 'performance' | 'api_limit' | 'system_error' | 'fraud';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    target_users: string[];
    channels: ('email' | 'push' | 'sms' | 'dashboard')[];
    status: 'active' | 'acknowledged' | 'resolved';
    metadata?: Record<string, any>;
}

export interface SecurityStats {
    totalEvents: number;
    criticalEvents: number;
    blockedIPs: number;
    activeIncidents: number;
    resolvedIncidents: number;
    apiCallsToday: number;
    threatScore: number;
    systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface ThreatAnalysis {
    ip_address: string;
    threat_score: number;
    risk_factors: string[];
    recent_activity: SecurityEvent[];
    recommendation: 'allow' | 'monitor' | 'block' | 'investigate';
}

// =====================================================
// CLASSE PRINCIPALE DU SERVICE DE SÉCURITÉ
// =====================================================

export class SecurityService {
    private static instance: SecurityService;
    private realTimeSubscription: any = null;
    private alertCallbacks: ((alert: SystemAlert) => void)[] = [];

    constructor() {
        this.initializeRealTimeMonitoring();
    }

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }

    // =====================================================
    // MONITORING TEMPS RÉEL
    // =====================================================

    /**
     * Initialise le monitoring temps réel via Supabase Realtime
     */
    private initializeRealTimeMonitoring() {
        this.realTimeSubscription = supabase
            .channel('security_monitoring')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'security_monitoring' },
                (payload) => this.handleSecurityEvent(payload.new as SecurityEvent)
            )
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'system_alerts' },
                (payload) => this.handleNewAlert(payload.new as SystemAlert)
            )
            .subscribe();
    }

    /**
     * Gère les nouveaux événements de sécurité en temps réel
     */
    private handleSecurityEvent(event: SecurityEvent) {
        console.log('🔒 Nouvel événement de sécurité:', event);

        // Analyse automatique de la menace
        if (event.threat_level && event.threat_level >= 7) {
            this.triggerAutomaticResponse(event);
        }

        // Notification temps réel si critique
        if (event.severity_level === 'critical' || event.severity_level === 'emergency') {
            this.createAlert({
                alert_id: `ALT-${Date.now()}`,
                title: `Événement critique détecté`,
                message: `${event.event_type} dans ${event.source_module}`,
                alert_type: 'security',
                priority: 'urgent',
                target_users: [],
                channels: ['dashboard', 'email'],
                status: 'active'
            });
        }
    }

    /**
     * Gère les nouvelles alertes système
     */
    private handleNewAlert(alert: SystemAlert) {
        console.log('🚨 Nouvelle alerte système:', alert);
        this.alertCallbacks.forEach(callback => callback(alert));
    }

    /**
     * Enregistre un événement de sécurité
     */
    async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<SecurityEvent | null> {
        try {
            // Calculer le score de menace
            const threatScore = await this.calculateThreatScore(
                event.event_type,
                event.ip_address,
                event.user_id
            );

            const { data, error } = await supabase
                .from('security_monitoring')
                .insert({
                    ...event,
                    threat_level: threatScore,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de l\'événement de sécurité:', error);
            return null;
        }
    }

    /**
     * Calcule le score de menace pour un événement
     */
    private async calculateThreatScore(
        eventType: string,
        ipAddress?: string,
        userId?: string
    ): Promise<number> {
        try {
            const { data, error } = await supabase
                .rpc('calculate_threat_score', {
                    event_type: eventType,
                    ip_address: ipAddress,
                    user_id: userId
                });

            if (error) throw error;
            return data || 1;
        } catch (error) {
            console.error('Erreur calcul score de menace:', error);
            return 1;
        }
    }

    // =====================================================
    // GESTION DES INCIDENTS
    // =====================================================

    /**
     * Crée un nouvel incident de sécurité
     */
    async createIncident(incident: Omit<SecurityIncident, 'id' | 'incident_id'>): Promise<SecurityIncident | null> {
        try {
            const { data, error } = await supabase
                .rpc('generate_security_id', { prefix: 'INC' });

            if (error) throw error;

            const { data: newIncident, error: insertError } = await supabase
                .from('security_incidents')
                .insert({
                    ...incident,
                    incident_id: data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) throw insertError;
            return newIncident;
        } catch (error) {
            console.error('Erreur création incident:', error);
            return null;
        }
    }

    /**
     * Récupère tous les incidents actifs
     */
    async getActiveIncidents(): Promise<SecurityIncident[]> {
        try {
            const { data, error } = await supabase
                .from('security_incidents')
                .select('*')
                .in('status', ['open', 'investigating'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur récupération incidents:', error);
            return [];
        }
    }

    // =====================================================
    // SYSTÈME D'ALERTES
    // =====================================================

    /**
     * Crée une nouvelle alerte système
     */
    async createAlert(alert: Omit<SystemAlert, 'id'>): Promise<SystemAlert | null> {
        try {
            const { data, error } = await supabase
                .from('system_alerts')
                .insert({
                    ...alert,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur création alerte:', error);
            return null;
        }
    }

    /**
     * Récupère les alertes actives
     */
    async getActiveAlerts(): Promise<SystemAlert[]> {
        try {
            const { data, error } = await supabase
                .from('system_alerts')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur récupération alertes:', error);
            return [];
        }
    }

    /**
     * Marque une alerte comme acquittée
     */
    async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('system_alerts')
                .update({
                    status: 'acknowledged',
                    acknowledged_at: new Date().toISOString(),
                    acknowledged_by: userId
                })
                .eq('id', alertId);

            return !error;
        } catch (error) {
            console.error('Erreur acquittement alerte:', error);
            return false;
        }
    }

    // =====================================================
    // BLOCAGE D'IPs
    // =====================================================

    /**
     * Bloque une adresse IP
     */
    async blockIP(
        ipAddress: string,
        reason: string,
        duration: 'temporary' | 'permanent' = 'temporary',
        durationHours: number = 24
    ): Promise<boolean> {
        try {
            const expiresAt = duration === 'permanent'
                ? null
                : new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

            const { error } = await supabase
                .from('blocked_ips')
                .insert({
                    ip_address: ipAddress,
                    reason,
                    blocked_by: 'manual',
                    block_type: duration,
                    expires_at: expiresAt,
                    threat_score: 8,
                    created_at: new Date().toISOString()
                });

            if (!error) {
                // Créer une alerte
                await this.createAlert({
                    alert_id: `ALT-${Date.now()}`,
                    title: 'Adresse IP bloquée',
                    message: `L'adresse IP ${ipAddress} a été bloquée. Raison: ${reason}`,
                    alert_type: 'security',
                    priority: 'medium',
                    target_users: [],
                    channels: ['dashboard'],
                    status: 'active'
                });
            }

            return !error;
        } catch (error) {
            console.error('Erreur blocage IP:', error);
            return false;
        }
    }

    /**
     * Vérifie si une IP est bloquée
     */
    async isIPBlocked(ipAddress: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('blocked_ips')
                .select('id, expires_at')
                .eq('ip_address', ipAddress)
                .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
                .limit(1);

            if (error) throw error;
            return (data && data.length > 0) || false;
        } catch (error) {
            console.error('Erreur vérification IP bloquée:', error);
            return false;
        }
    }

    // =====================================================
    // ANALYSE DE MENACES
    // =====================================================

    /**
     * Analyse une adresse IP pour détecter les menaces
     */
    async analyzeThreat(ipAddress: string): Promise<ThreatAnalysis> {
        try {
            // Récupérer l'activité récente de cette IP
            const { data: recentActivity, error } = await supabase
                .from('security_monitoring')
                .select('*')
                .eq('ip_address', ipAddress)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const events = recentActivity || [];
            const threatScore = this.calculateThreatScoreFromEvents(events);
            const riskFactors = this.identifyRiskFactors(events);
            const recommendation = this.getRecommendation(threatScore, riskFactors);

            return {
                ip_address: ipAddress,
                threat_score: threatScore,
                risk_factors: riskFactors,
                recent_activity: events,
                recommendation
            };
        } catch (error) {
            console.error('Erreur analyse de menace:', error);
            return {
                ip_address: ipAddress,
                threat_score: 0,
                risk_factors: [],
                recent_activity: [],
                recommendation: 'allow'
            };
        }
    }

    private calculateThreatScoreFromEvents(events: SecurityEvent[]): number {
        if (events.length === 0) return 0;

        const scores = events.map(e => e.threat_level || 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const maxScore = Math.max(...scores);
        const frequency = events.length;

        // Score composite basé sur moyenne, maximum et fréquence
        return Math.min(10, Math.round((avgScore * 0.4) + (maxScore * 0.4) + (frequency * 0.2)));
    }

    private identifyRiskFactors(events: SecurityEvent[]): string[] {
        const factors: string[] = [];

        const failedLogins = events.filter(e => e.event_type === 'login_attempt' && !e.event_data.success).length;
        const suspiciousActivity = events.filter(e => e.event_type === 'suspicious_activity').length;
        const highThreatEvents = events.filter(e => (e.threat_level || 0) >= 7).length;

        if (failedLogins >= 3) factors.push(`${failedLogins} tentatives de connexion échouées`);
        if (suspiciousActivity > 0) factors.push(`${suspiciousActivity} activités suspectes détectées`);
        if (highThreatEvents > 0) factors.push(`${highThreatEvents} événements à haut risque`);
        if (events.length >= 15) factors.push('Activité très fréquente (possible bot)');

        return factors;
    }

    private getRecommendation(threatScore: number, riskFactors: string[]): 'allow' | 'monitor' | 'block' | 'investigate' {
        if (threatScore >= 8 || riskFactors.length >= 3) return 'block';
        if (threatScore >= 6 || riskFactors.length >= 2) return 'investigate';
        if (threatScore >= 3 || riskFactors.length >= 1) return 'monitor';
        return 'allow';
    }

    // =====================================================
    // RÉPONSES AUTOMATIQUES
    // =====================================================

    /**
     * Déclenche une réponse automatique à un événement de sécurité
     */
    private async triggerAutomaticResponse(event: SecurityEvent) {
        try {
            // Récupérer les règles de réponse automatique
            const { data: rules, error } = await supabase
                .from('automated_responses')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;

            for (const rule of rules || []) {
                if (this.matchesRule(event, rule)) {
                    await this.executeAutomaticAction(rule, event);
                }
            }
        } catch (error) {
            console.error('Erreur réponse automatique:', error);
        }
    }

    private matchesRule(event: SecurityEvent, rule: any): boolean {
        // Logique de correspondance des règles (simplifiée)
        if (rule.trigger_event === event.event_type) {
            const conditions = rule.condition_rules;
            if (conditions.threshold && event.threat_level && event.threat_level >= conditions.threshold) {
                return true;
            }
        }
        return false;
    }

    private async executeAutomaticAction(rule: any, event: SecurityEvent) {
        const action = rule.action_type;
        const config = rule.action_config;

        switch (action) {
            case 'block_ip':
                if (event.ip_address) {
                    await this.blockIP(
                        event.ip_address,
                        `Blocage automatique: ${event.event_type}`,
                        'temporary',
                        config.duration_hours || 24
                    );
                }
                break;

            case 'send_alert':
                await this.createAlert({
                    alert_id: `ALT-${Date.now()}`,
                    title: `Action automatique déclenchée`,
                    message: `Réponse automatique à: ${event.event_type}`,
                    alert_type: 'security',
                    priority: config.priority || 'medium',
                    target_users: [],
                    channels: config.channels || ['dashboard'],
                    status: 'active'
                });
                break;

            case 'disable_user':
                // Logique pour désactiver un utilisateur
                console.log('Désactivation utilisateur:', event.user_id);
                break;
        }

        // Mettre à jour le compteur d'exécution
        await supabase
            .from('automated_responses')
            .update({
                execution_count: rule.execution_count + 1,
                last_executed: new Date().toISOString()
            })
            .eq('id', rule.id);
    }

    // =====================================================
    // STATISTIQUES ET REPORTING
    // =====================================================

    /**
     * Récupère les statistiques de sécurité
     */
    async getSecurityStats(): Promise<SecurityStats> {
        try {
            const [
                eventsResult,
                criticalEventsResult,
                blockedIPsResult,
                incidentsResult,
                apiCallsResult
            ] = await Promise.all([
                supabase.from('security_monitoring').select('id', { count: 'exact', head: true }),
                supabase.from('security_monitoring').select('id', { count: 'exact', head: true }).eq('severity_level', 'critical'),
                supabase.from('blocked_ips').select('id', { count: 'exact', head: true }),
                supabase.from('security_incidents').select('id, status', { count: 'exact' }),
                supabase.from('api_monitoring').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            ]);

            const incidents = incidentsResult.data || [];
            const activeIncidents = incidents.filter((i: any) => ['open', 'investigating'].includes(i.status)).length;
            const resolvedIncidents = incidents.filter((i: any) => ['resolved', 'closed'].includes(i.status)).length;

            // Calculer le score de menace global
            const threatScore = await this.calculateGlobalThreatScore();

            // Déterminer la santé du système
            const systemHealth = this.determineSystemHealth(
                criticalEventsResult.count || 0,
                activeIncidents,
                threatScore
            );

            return {
                totalEvents: eventsResult.count || 0,
                criticalEvents: criticalEventsResult.count || 0,
                blockedIPs: blockedIPsResult.count || 0,
                activeIncidents,
                resolvedIncidents,
                apiCallsToday: apiCallsResult.count || 0,
                threatScore,
                systemHealth
            };
        } catch (error) {
            console.error('Erreur récupération stats sécurité:', error);
            return {
                totalEvents: 0,
                criticalEvents: 0,
                blockedIPs: 0,
                activeIncidents: 0,
                resolvedIncidents: 0,
                apiCallsToday: 0,
                threatScore: 0,
                systemHealth: 'good'
            };
        }
    }

    private async calculateGlobalThreatScore(): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('security_monitoring')
                .select('threat_level')
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .not('threat_level', 'is', null);

            if (error) throw error;

            const scores = (data || []).map(d => d.threat_level);
            if (scores.length === 0) return 0;

            return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        } catch (error) {
            return 0;
        }
    }

    private determineSystemHealth(
        criticalEvents: number,
        activeIncidents: number,
        threatScore: number
    ): 'excellent' | 'good' | 'warning' | 'critical' {
        if (criticalEvents >= 5 || activeIncidents >= 3 || threatScore >= 8) return 'critical';
        if (criticalEvents >= 2 || activeIncidents >= 1 || threatScore >= 5) return 'warning';
        if (criticalEvents === 0 && activeIncidents === 0 && threatScore <= 2) return 'excellent';
        return 'good';
    }

    // =====================================================
    // GESTION DES CALLBACKS
    // =====================================================

    /**
     * Ajoute un callback pour les nouvelles alertes
     */
    onNewAlert(callback: (alert: SystemAlert) => void) {
        this.alertCallbacks.push(callback);
    }

    /**
     * Supprime un callback
     */
    removeAlertCallback(callback: (alert: SystemAlert) => void) {
        const index = this.alertCallbacks.indexOf(callback);
        if (index > -1) {
            this.alertCallbacks.splice(index, 1);
        }
    }

    /**
     * Nettoie les ressources
     */
    cleanup() {
        if (this.realTimeSubscription) {
            this.realTimeSubscription.unsubscribe();
        }
        this.alertCallbacks = [];
    }
}

// Instance singleton
export const securityService = SecurityService.getInstance();
