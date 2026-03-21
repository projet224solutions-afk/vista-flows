/**
 * MULTI-CLOUD HEALTH CHECK SERVICE
 * 224Solutions - Surveillance temps réel de tous les services cloud
 * Supabase | AWS | Google Cloud | Firebase
 */

import { supabase } from '@/integrations/supabase/client';
import { backendConfig } from '@/config/backend';

export type CloudProvider = 'supabase' | 'aws' | 'google_cloud' | 'firebase';
export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface CloudServiceCheck {
  provider: CloudProvider;
  service: string;
  status: ServiceStatus;
  responseTime: number;
  message: string;
  lastChecked: string;
  details?: Record<string, any>;
}

export interface MultiCloudReport {
  overall: ServiceStatus;
  providers: Record<CloudProvider, {
    status: ServiceStatus;
    services: CloudServiceCheck[];
    avgResponseTime: number;
  }>;
  timestamp: string;
  totalChecks: number;
  healthyChecks: number;
  uptimePercent: number;
}

class MultiCloudHealthService {
  private static instance: MultiCloudHealthService;
  private lastReport: MultiCloudReport | null = null;
  private checkHistory: MultiCloudReport[] = [];
  private readonly MAX_HISTORY = 60;

  static getInstance(): MultiCloudHealthService {
    if (!this.instance) this.instance = new MultiCloudHealthService();
    return this.instance;
  }

  async checkAll(): Promise<MultiCloudReport> {
    const [supabaseChecks, awsChecks, gcpChecks, firebaseChecks] = await Promise.all([
      this.checkSupabase().catch(() => [this.makeCheck('supabase', 'Service', 'outage', 0, 'Erreur vérification')]),
      this.checkAWS().catch(() => [this.makeCheck('aws', 'Service', 'outage', 0, 'Erreur vérification')]),
      this.checkGoogleCloud().catch(() => [this.makeCheck('google_cloud', 'Service', 'outage', 0, 'Erreur vérification')]),
      this.checkFirebase().catch(() => [this.makeCheck('firebase', 'Service', 'unknown', 0, 'Erreur vérification')])
    ]);

    const allChecks = [...supabaseChecks, ...awsChecks, ...gcpChecks, ...firebaseChecks];
    const totalChecks = allChecks.length;
    const healthyChecks = allChecks.filter(c => c.status === 'operational').length;

    const providerReport = (checks: CloudServiceCheck[]) => ({
      status: this.aggregateStatus(checks),
      services: checks,
      avgResponseTime: checks.length > 0 
        ? Math.round(checks.reduce((s, c) => s + c.responseTime, 0) / checks.length)
        : 0
    });

    const report: MultiCloudReport = {
      overall: this.aggregateStatus(allChecks),
      providers: {
        supabase: providerReport(supabaseChecks),
        aws: providerReport(awsChecks),
        google_cloud: providerReport(gcpChecks),
        firebase: providerReport(firebaseChecks)
      },
      timestamp: new Date().toISOString(),
      totalChecks,
      healthyChecks,
      uptimePercent: totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 100) : 0
    };

    this.lastReport = report;
    this.checkHistory.push(report);
    if (this.checkHistory.length > this.MAX_HISTORY) this.checkHistory.shift();

    return report;
  }

  getLastReport(): MultiCloudReport | null {
    return this.lastReport;
  }

  getHistory(): MultiCloudReport[] {
    return [...this.checkHistory];
  }

  // ==================== SUPABASE ====================
  private async checkSupabase(): Promise<CloudServiceCheck[]> {
    const results = await Promise.allSettled([
      this.checkSupabaseDB(),
      this.checkSupabaseAuth(),
      this.checkSupabaseRealtime(),
      this.checkSupabaseEdgeFunctions()
    ]);
    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const names = ['PostgreSQL Database', 'Auth Service', 'Realtime', 'Edge Functions'];
      return this.makeCheck('supabase', names[i], 'outage', 0, 'Erreur check');
    });
  }

  private async checkSupabaseDB(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'PostgreSQL Database', 'degraded', rt, error.message);
      return this.makeCheck('supabase', 'PostgreSQL Database', rt > 1000 ? 'degraded' : 'operational', rt, `Latence ${rt}ms`);
    } catch (e) {
      return this.makeCheck('supabase', 'PostgreSQL Database', 'outage', Date.now() - start, String(e));
    }
  }

  private async checkSupabaseAuth(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.auth.getSession();
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'Auth Service', 'degraded', rt, error.message);
      return this.makeCheck('supabase', 'Auth Service', 'operational', rt, `Latence ${rt}ms`);
    } catch (e) {
      return this.makeCheck('supabase', 'Auth Service', 'outage', Date.now() - start, String(e));
    }
  }

  private async checkSupabaseRealtime(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const channel = supabase.channel('health-test-' + Date.now());
      const rt = Date.now() - start;
      supabase.removeChannel(channel);
      return this.makeCheck('supabase', 'Realtime WebSocket', 'operational', rt, `Latence ${rt}ms`);
    } catch (e) {
      return this.makeCheck('supabase', 'Realtime WebSocket', 'degraded', Date.now() - start, String(e));
    }
  }

  private async checkSupabaseEdgeFunctions(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const { error } = await supabase.functions.invoke('google-cloud-test', {
        method: 'POST',
        body: { healthCheck: true }
      });
      clearTimeout(timeout);
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'Edge Functions', 'degraded', rt, error.message || 'Erreur');
      return this.makeCheck('supabase', 'Edge Functions', rt > 3000 ? 'degraded' : 'operational', rt, `Latence ${rt}ms`);
    } catch (e) {
      return this.makeCheck('supabase', 'Edge Functions', 'degraded', Date.now() - start, 'Timeout ou non accessible');
    }
  }

  // ==================== AWS (via Edge Function proxy - no CORS) ====================
  private async checkAWS(): Promise<CloudServiceCheck[]> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('cloud-health-proxy', {
        body: {}
      });
      const rt = Date.now() - start;

      if (error || !data?.results) {
        return [
          this.makeCheck('aws', 'Lambda Backend', 'degraded', rt, 'Proxy health check échoué'),
          this.makeCheck('aws', 'Cognito Auth', 'degraded', rt, 'Proxy health check échoué')
        ];
      }

      const results: CloudServiceCheck[] = [];
      const backend = data.results['aws-backend'];
      if (backend) {
        results.push(this.makeCheck('aws', 'Lambda Backend', backend.status, backend.responseTime, backend.message));
      }
      const cognito = data.results['aws-cognito'];
      if (cognito) {
        results.push(this.makeCheck('aws', 'Cognito Auth', cognito.status, cognito.responseTime, cognito.message));
      }
      return results.length > 0 ? results : [
        this.makeCheck('aws', 'Lambda Backend', 'unknown', rt, 'Pas de données'),
        this.makeCheck('aws', 'Cognito Auth', 'unknown', rt, 'Pas de données')
      ];
    } catch (e) {
      const rt = Date.now() - start;
      return [
        this.makeCheck('aws', 'Lambda Backend', 'degraded', rt, 'Erreur proxy'),
        this.makeCheck('aws', 'Cognito Auth', 'degraded', rt, 'Erreur proxy')
      ];
    }
  }

  // ==================== GOOGLE CLOUD ====================
  private async checkGoogleCloud(): Promise<CloudServiceCheck[]> {
    const results = await Promise.allSettled([
      this.checkGCSStorage(),
      this.checkCloudFunctions()
    ]);
    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const names = ['Cloud Storage (GCS)', 'Cloud Functions'];
      return this.makeCheck('google_cloud', names[i], 'outage', 0, 'Erreur check');
    });
  }

  private async checkGCSStorage(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('gcs-signed-url', {
        method: 'POST',
        body: { healthCheck: true }
      });
      const rt = Date.now() - start;
      if (error) return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', 'degraded', rt, error.message || 'Erreur');
      return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', rt > 3000 ? 'degraded' : 'operational', rt, `Latence ${rt}ms`);
    } catch (e) {
      return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', 'unknown', Date.now() - start, 'Via Edge Function');
    }
  }

  private async checkCloudFunctions(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('google-cloud-test');
      const rt = Date.now() - start;
      if (error) return this.makeCheck('google_cloud', 'Cloud Functions', 'degraded', rt, error.message || 'Erreur');
      if (data?.status === 'success') return this.makeCheck('google_cloud', 'Cloud Functions', 'operational', rt, `Latence ${rt}ms`);
      return this.makeCheck('google_cloud', 'Cloud Functions', 'degraded', rt, data?.error || 'Config manquante');
    } catch (e) {
      return this.makeCheck('google_cloud', 'Cloud Functions', 'outage', Date.now() - start, String(e));
    }
  }

  // ==================== FIREBASE ====================
  private async checkFirebase(): Promise<CloudServiceCheck[]> {
    const results = await Promise.allSettled([
      this.checkFirebaseMessaging()
    ]);
    return results.map(r => {
      if (r.status === 'fulfilled') return r.value;
      return this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'unknown', 0, 'Erreur check');
    });
  }

  private async checkFirebaseMessaging(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const firebaseApp = (window as any).__firebaseApp;
      const rt = Date.now() - start;
      if (firebaseApp) {
        return this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'operational', rt, 'App Firebase initialisée');
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker?.getRegistrations();
        const hasFCM = regs?.some(r => r.active?.scriptURL.includes('firebase'));
        return this.makeCheck('firebase', 'Cloud Messaging (FCM)', hasFCM ? 'operational' : 'unknown', Date.now() - start, hasFCM ? 'SW Firebase actif' : 'Non initialisé côté client');
      }
      return this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'unknown', rt, 'ServiceWorker non supporté');
    } catch (e) {
      return this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'unknown', Date.now() - start, 'Non vérifié');
    }
  }

  // ==================== HELPERS ====================
  private makeCheck(provider: CloudProvider, service: string, status: ServiceStatus, responseTime: number, message: string): CloudServiceCheck {
    return { provider, service, status, responseTime, message, lastChecked: new Date().toISOString() };
  }

  private aggregateStatus(checks: CloudServiceCheck[]): ServiceStatus {
    if (checks.length === 0) return 'unknown';
    if (checks.some(c => c.status === 'outage')) return 'outage';
    if (checks.some(c => c.status === 'degraded')) return 'degraded';
    if (checks.every(c => c.status === 'operational')) return 'operational';
    return 'unknown';
  }
}

export const multiCloudHealth = MultiCloudHealthService.getInstance();
