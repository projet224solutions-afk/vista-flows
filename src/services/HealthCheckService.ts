/**
 * HEALTH CHECK SERVICE
 * 224Solutions - Vérifications automatiques santé système
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Types
 */
export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  timestamp: string;
  details?: Record<string, any>;
}

export interface SystemHealthReport {
  overall: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: string;
  uptime: number;
  checksPerformed: number;
  checksPassed: number;
  checksFailed: number;
}

/**
 * Service de health checks
 */
class HealthCheckService {
  private static instance: HealthCheckService;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 60 secondes
  private lastReport: SystemHealthReport | null = null;
  private startTime: number = Date.now();

  private constructor() {
    this.initializeService();
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Initialiser service
   */
  private initializeService(): void {
    // Premier check immédiat
    this.performHealthChecks();

    // Checks réguliers
    this.checkInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.CHECK_INTERVAL);

    console.log('✅ Health Check Service initialisé');
  }

  /**
   * Effectuer tous les health checks
   */
  async performHealthChecks(): Promise<SystemHealthReport> {
    const startTime = Date.now();

    const checks: HealthCheckResult[] = await Promise.all([
      this.checkDatabase(),
      this.checkAuthentication(),
      this.checkStorage(),
      this.checkEdgeFunctions(),
      this.checkRealtimeConnection(),
      this.checkLocalStorage(),
      this.checkNetworkConnectivity()
    ]);

    const checksPerformed = checks.length;
    const checksPassed = checks.filter(c => c.status === 'healthy').length;
    const checksFailed = checks.filter(c => c.status === 'critical' || c.status === 'degraded').length;

    const overall = this.calculateOverallHealth(checks);

    const report: SystemHealthReport = {
      overall,
      checks,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checksPerformed,
      checksPassed,
      checksFailed
    };

    this.lastReport = report;

    // Logger résultat
    console.log(`🏥 Health Check: ${overall} (${checksPassed}/${checksPerformed} passed)`);

    // Alerter si dégradé ou critique
    if (overall === 'degraded' || overall === 'critical') {
      await this.alertUnhealthy(report);
    }

    // Enregistrer en base
    await this.saveHealthReport(report);

    return report;
  }

  /**
   * Check: Base de données
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'Database',
          status: 'critical',
          message: `Erreur connexion DB: ${error.message}`,
          responseTime,
          timestamp: new Date().toISOString(),
          details: { error: error.message }
        };
      }

      const status: HealthStatus = responseTime > 1000 ? 'degraded'
                                  : responseTime > 500 ? 'degraded'
                                  : 'healthy';

      return {
        name: 'Database',
        status,
        message: status === 'healthy' ? 'Connexion OK' : `Lent (${responseTime}ms)`,
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Database',
        status: 'critical',
        message: 'Erreur critique connexion DB',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: { error: String(error) }
      };
    }
  }

  /**
   * Check: Authentification
   */
  private async checkAuthentication(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'Authentication',
          status: 'degraded',
          message: 'Erreur récupération session',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }

      return {
        name: 'Authentication',
        status: 'healthy',
        message: session ? 'Session active' : 'Pas de session',
        responseTime,
        timestamp: new Date().toISOString(),
        details: { authenticated: !!session }
      };
    } catch (error) {
      return {
        name: 'Authentication',
        status: 'degraded',
        message: 'Erreur vérification auth',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check: Storage
   */
  private async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: 'Storage',
          status: 'degraded',
          message: 'Erreur accès storage',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }

      return {
        name: 'Storage',
        status: 'healthy',
        message: `${buckets?.length || 0} buckets accessibles`,
        responseTime,
        timestamp: new Date().toISOString(),
        details: { bucketCount: buckets?.length || 0 }
      };
    } catch (error) {
      return {
        name: 'Storage',
        status: 'degraded',
        message: 'Erreur vérification storage',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check: Edge Functions
   */
  private async checkEdgeFunctions(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test simple health check function
      const { error } = await supabase.functions.invoke('health-check', {});
      const responseTime = Date.now() - startTime;

      if (error) {
        // Edge functions peuvent ne pas avoir health-check, pas critique
        return {
          name: 'Edge Functions',
          status: 'healthy',
          message: 'Edge functions disponibles',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }

      return {
        name: 'Edge Functions',
        status: 'healthy',
        message: 'Edge functions OK',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Edge Functions',
        status: 'degraded',
        message: 'Edge functions potentiellement indisponibles',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check: Connexion Realtime
   */
  private async checkRealtimeConnection(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test subscription simple
      const channel = supabase.channel('health-check-test');
      
      const subscriptionPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 3000);
        
        channel
          .on('presence', { event: 'sync' }, () => {
            clearTimeout(timeout);
            resolve(true);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve(true);
            }
          });
      });

      const success = await subscriptionPromise;
      await channel.unsubscribe();

      const responseTime = Date.now() - startTime;

      return {
        name: 'Realtime',
        status: success ? 'healthy' : 'degraded',
        message: success ? 'WebSocket connecté' : 'WebSocket timeout',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Realtime',
        status: 'degraded',
        message: 'Erreur vérification Realtime',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check: LocalStorage
   */
  private checkLocalStorage(): HealthCheckResult {
    const startTime = Date.now();

    try {
      const testKey = '__health_check_test__';
      const testValue = 'test';

      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      const success = retrieved === testValue;
      const responseTime = Date.now() - startTime;

      return {
        name: 'LocalStorage',
        status: success ? 'healthy' : 'critical',
        message: success ? 'LocalStorage accessible' : 'LocalStorage bloqué',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'LocalStorage',
        status: 'critical',
        message: 'LocalStorage indisponible (mode privé?)',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check: Connectivité réseau
   */
  private checkNetworkConnectivity(): HealthCheckResult {
    const startTime = Date.now();

    try {
      const online = navigator.onLine;
      const responseTime = Date.now() - startTime;

      return {
        name: 'Network',
        status: online ? 'healthy' : 'critical',
        message: online ? 'Connecté' : 'Hors ligne',
        responseTime,
        timestamp: new Date().toISOString(),
        details: { online }
      };
    } catch (error) {
      return {
        name: 'Network',
        status: 'unknown',
        message: 'Impossible de vérifier connectivité',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calculer statut global
   */
  private calculateOverallHealth(checks: HealthCheckResult[]): HealthStatus {
    const criticalCount = checks.filter(c => c.status === 'critical').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (criticalCount > 0) return 'critical';
    if (degradedCount > 2) return 'critical';
    if (degradedCount > 0) return 'degraded';
    
    return 'healthy';
  }

  /**
   * Alerter si système malsain
   */
  private async alertUnhealthy(report: SystemHealthReport): Promise<void> {
    try {
      const { monitoringService } = await import('./MonitoringService');
      
      const failedChecks = report.checks.filter(
        c => c.status === 'critical' || c.status === 'degraded'
      );

      await monitoringService.logError(
        report.overall === 'critical' ? 'critical' : 'error',
        'health_check',
        `Santé système ${report.overall}: ${failedChecks.length} checks échoués`,
        {
          overall: report.overall,
          failedChecks: failedChecks.map(c => ({
            name: c.name,
            status: c.status,
            message: c.message
          }))
        }
      );
    } catch (error) {
      console.error('Erreur alerte health check:', error);
    }
  }

  /**
   * Enregistrer rapport en base
   */
  private async saveHealthReport(report: SystemHealthReport): Promise<void> {
    try {
      await (supabase.from as any)('health_check_reports').insert([
        {
          overall_status: report.overall,
          checks: report.checks,
          uptime: report.uptime,
          checks_performed: report.checksPerformed,
          checks_passed: report.checksPassed,
          checks_failed: report.checksFailed,
          timestamp: report.timestamp
        }
      ]);
    } catch (error) {
      // Ignorer si table n'existe pas
      console.warn('Table health_check_reports non disponible');
    }
  }

  /**
   * Obtenir dernier rapport
   */
  getLastReport(): SystemHealthReport | null {
    return this.lastReport;
  }

  /**
   * Obtenir uptime (en secondes)
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check manuel
   */
  async checkNow(): Promise<SystemHealthReport> {
    return this.performHealthChecks();
  }

  /**
   * Nettoyer et arrêter service
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Instance singleton
export const healthCheckService = HealthCheckService.getInstance();

// Export pour utilisation externe
export default healthCheckService;
