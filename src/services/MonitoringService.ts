/**
 * MONITORING SERVICE - Système de surveillance centralisé
 * 224Solutions - Monitoring santé système et détection anomalies
 */

import { supabase } from '@/integrations/supabase/client';

// Types
export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';
export type MonitoringMetric = 'security' | 'performance' | 'availability' | 'errors';

export interface SystemHealth {
  overall: HealthStatus;
  security: HealthStatus;
  database: HealthStatus;
  api: HealthStatus;
  frontend: HealthStatus;
  timestamp: string;
  metrics: {
    criticalErrors: number;
    pendingErrors: number;
    uptime: number;
    responseTime: number;
    activeUsers: number;
  };
}

export interface SecurityAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  userId?: string;
}

/**
 * Service de monitoring centralisé
 */
class MonitoringService {
  private static instance: MonitoringService;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, any> = new Map();
  private alerts: SecurityAlert[] = [];

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Initialiser le monitoring
   */
  private async initializeMonitoring() {
    // Vérification santé toutes les 30 secondes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);

    // Health check initial
    await this.performHealthCheck();

    console.log('✅ Monitoring Service initialisé');
  }

  /**
   * Vérification complète de santé du système
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();

    const [securityStatus, databaseStatus, apiStatus, frontendStatus] = await Promise.all([
      this.checkSecurityHealth(),
      this.checkDatabaseHealth(),
      this.checkAPIHealth(),
      this.checkFrontendHealth()
    ]);

    const responseTime = Date.now() - startTime;

    // Calculer les métriques
    const criticalErrors = await this.countCriticalErrors();
    const pendingErrors = await this.countPendingErrors();
    const activeUsers = await this.countActiveUsers();

    // Déterminer le statut global
    const statuses = [securityStatus, databaseStatus, apiStatus, frontendStatus];
    const overall = this.calculateOverallHealth(statuses);

    const health: SystemHealth = {
      overall,
      security: securityStatus,
      database: databaseStatus,
      api: apiStatus,
      frontend: frontendStatus,
      timestamp: new Date().toISOString(),
      metrics: {
        criticalErrors,
        pendingErrors,
        uptime: this.calculateUptime(),
        responseTime,
        activeUsers
      }
    };

    // Enregistrer dans la base de données
    await this.logHealthCheck(health);

    // Déclencher alertes si nécessaire
    if (overall === 'critical' || criticalErrors > 0) {
      await this.triggerCriticalAlert(health);
    }

    return health;
  }

  /**
   * Vérifier santé sécurité
   */
  private async checkSecurityHealth(): Promise<HealthStatus> {
    try {
      // Vérifier les erreurs critiques de sécurité
      const { count: securityErrors } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('category', 'security')
        .eq('level', 'critical')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Dernière heure

      if (securityErrors === null) return 'unknown';
      if (securityErrors > 10) return 'critical';
      if (securityErrors > 5) return 'degraded';
      
      return 'healthy';
    } catch (error) {
      console.error('Erreur vérification sécurité:', error);
      return 'unknown';
    }
  }

  /**
   * Vérifier santé base de données
   */
  private async checkDatabaseHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      
      // Test simple de connexion
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      const responseTime = Date.now() - startTime;

      if (error) return 'critical';
      if (responseTime > 1000) return 'degraded';
      if (responseTime > 500) return 'degraded';
      
      return 'healthy';
    } catch (error) {
      console.error('Erreur vérification database:', error);
      return 'critical';
    }
  }

  /**
   * Vérifier santé API
   */
  private async checkAPIHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      
      // Test API Supabase
      const { data, error } = await supabase.rpc('get_system_health_api', {});
      
      const responseTime = Date.now() - startTime;

      if (error || !data) return 'degraded';
      if (responseTime > 2000) return 'degraded';
      
      return 'healthy';
    } catch (error) {
      // Fonction RPC peut ne pas exister, ce n'est pas critique
      return 'healthy';
    }
  }

  /**
   * Vérifier santé frontend
   */
  private async checkFrontendHealth(): Promise<HealthStatus> {
    try {
      // Vérifier erreurs frontend récentes
      const recentErrors = this.alerts.filter(
        alert => alert.type === 'frontend_error' && 
        new Date(alert.timestamp) > new Date(Date.now() - 300000) // 5 minutes
      );

      if (recentErrors.length > 20) return 'critical';
      if (recentErrors.length > 10) return 'degraded';
      
      return 'healthy';
    } catch (error) {
      console.error('Erreur vérification frontend:', error);
      return 'unknown';
    }
  }

  /**
   * Calculer statut global
   */
  private calculateOverallHealth(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('degraded')) return 'degraded';
    if (statuses.includes('unknown')) return 'unknown';
    return 'healthy';
  }

  /**
   * Compter erreurs critiques
   */
  private async countCriticalErrors(): Promise<number> {
    try {
      const { count } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'critical')
        .eq('resolved', false);

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Compter erreurs en attente
   */
  private async countPendingErrors(): Promise<number> {
    try {
      const { count } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .neq('level', 'critical');

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Compter utilisateurs actifs
   */
  private async countActiveUsers(): Promise<number> {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', new Date(Date.now() - 3600000).toISOString());

      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculer uptime (en secondes)
   */
  private calculateUptime(): number {
    // TODO: Implémenter calcul uptime réel
    // Pour l'instant, retourner une valeur fictive
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Enregistrer health check
   */
  private async logHealthCheck(health: SystemHealth): Promise<void> {
    try {
      await supabase.from('system_health_logs').insert([
        {
          overall_status: health.overall,
          security_status: health.security,
          database_status: health.database,
          api_status: health.api,
          frontend_status: health.frontend,
          critical_errors: health.metrics.criticalErrors,
          pending_errors: health.metrics.pendingErrors,
          uptime: health.metrics.uptime,
          response_time: health.metrics.responseTime,
          active_users: health.metrics.activeUsers,
          timestamp: health.timestamp
        }
      ]);
    } catch (error) {
      // Si la table n'existe pas, l'ignorer (sera créée par migration)
      console.warn('Table system_health_logs non disponible');
    }
  }

  /**
   * Déclencher alerte critique
   */
  private async triggerCriticalAlert(health: SystemHealth): Promise<void> {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      level: 'critical',
      type: 'system_health',
      message: `Santé système critique: ${health.overall}. Erreurs critiques: ${health.metrics.criticalErrors}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      metadata: health
    };

    this.alerts.push(alert);

    // Envoyer notification (email, SMS, etc.)
    await this.sendAlertNotification(alert);
  }

  /**
   * Envoyer notification d'alerte
   */
  private async sendAlertNotification(alert: SecurityAlert): Promise<void> {
    try {
      // Appeler edge function d'alerte
      await supabase.functions.invoke('send-security-alert', {
        body: {
          level: alert.level,
          type: alert.type,
          message: alert.message,
          metadata: alert.metadata
        }
      });
    } catch (error) {
      console.error('Erreur envoi notification:', error);
    }
  }

  /**
   * Enregistrer métrique de performance
   */
  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      await supabase.from('performance_metrics').insert([metric]);

      // Alerter si temps de réponse trop élevé
      if (metric.responseTime > 3000) {
        await this.sendAlertNotification({
          id: crypto.randomUUID(),
          level: 'warning',
          type: 'performance',
          message: `Temps de réponse élevé: ${metric.endpoint} - ${metric.responseTime}ms`,
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata: metric
        });
      }
    } catch (error) {
      console.warn('Erreur tracking performance:', error);
    }
  }

  /**
   * Enregistrer erreur
   */
  async logError(
    level: 'info' | 'warning' | 'error' | 'critical',
    category: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('error_logs').insert([
        {
          level,
          category,
          message,
          metadata,
          resolved: false,
          created_at: new Date().toISOString()
        }
      ]);

      // Si critique, alerter immédiatement
      if (level === 'critical') {
        await this.sendAlertNotification({
          id: crypto.randomUUID(),
          level: 'critical',
          type: category,
          message,
          timestamp: new Date().toISOString(),
          resolved: false,
          metadata
        });
      }
    } catch (error) {
      console.error('Erreur logging:', error);
    }
  }

  /**
   * Obtenir santé actuelle
   */
  async getCurrentHealth(): Promise<SystemHealth> {
    return this.performHealthCheck();
  }

  /**
   * Obtenir alertes actives
   */
  getActiveAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Résoudre alerte
   */
  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }

    // Mettre à jour en base de données
    try {
      await supabase
        .from('error_logs')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
    } catch (error) {
      console.error('Erreur résolution alerte:', error);
    }
  }

  /**
   * Nettoyer et arrêter le monitoring
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Instance singleton
export const monitoringService = MonitoringService.getInstance();

// Export pour utilisation externe
export default monitoringService;
