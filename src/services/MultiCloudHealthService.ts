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
  private readonly MAX_HISTORY = 60; // 1 heure à 1 check/min

  static getInstance(): MultiCloudHealthService {
    if (!this.instance) this.instance = new MultiCloudHealthService();
    return this.instance;
  }

  async checkAll(): Promise<MultiCloudReport> {
    const [supabaseChecks, awsChecks, gcpChecks, firebaseChecks] = await Promise.all([
      this.checkSupabase(),
      this.checkAWS(),
      this.checkGoogleCloud(),
      this.checkFirebase()
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
    return Promise.all([
      this.checkSupabaseDB(),
      this.checkSupabaseAuth(),
      this.checkSupabaseRealtime(),
      this.checkSupabaseEdgeFunctions()
    ]);
  }

  private async checkSupabaseDB(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'PostgreSQL Database', 'degraded', rt, error.message);
      return this.makeCheck('supabase', 'PostgreSQL Database', rt > 1000 ? 'degraded' : 'operational', rt, `${rt}ms`);
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
      return this.makeCheck('supabase', 'Auth Service', 'operational', rt, `${rt}ms`);
    } catch (e) {
      return this.makeCheck('supabase', 'Auth Service', 'outage', Date.now() - start, String(e));
    }
  }

  private async checkSupabaseRealtime(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const channel = supabase.channel('health-test');
      const rt = Date.now() - start;
      supabase.removeChannel(channel);
      return this.makeCheck('supabase', 'Realtime', 'operational', rt, `${rt}ms`);
    } catch (e) {
      return this.makeCheck('supabase', 'Realtime', 'degraded', Date.now() - start, String(e));
    }
  }

  private async checkSupabaseEdgeFunctions(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('google-cloud-test', {
        method: 'POST',
        body: { healthCheck: true }
      });
      const rt = Date.now() - start;
      return this.makeCheck('supabase', 'Edge Functions', rt > 2000 ? 'degraded' : 'operational', rt, `${rt}ms`);
    } catch (e) {
      return this.makeCheck('supabase', 'Edge Functions', 'degraded', Date.now() - start, 'Non accessible');
    }
  }

  // ==================== AWS ====================
  private async checkAWS(): Promise<CloudServiceCheck[]> {
    return Promise.all([
      this.checkAWSBackend(),
      this.checkAWSCognito()
    ]);
  }

  private async checkAWSBackend(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${backendConfig.baseUrl}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      const rt = Date.now() - start;
      if (!response.ok) return this.makeCheck('aws', 'Lambda Backend (api.224solution.net)', 'degraded', rt, `HTTP ${response.status}`);
      return this.makeCheck('aws', 'Lambda Backend (api.224solution.net)', rt > 2000 ? 'degraded' : 'operational', rt, `${rt}ms`);
    } catch (e: any) {
      const rt = Date.now() - start;
      if (e?.name === 'AbortError') return this.makeCheck('aws', 'Lambda Backend (api.224solution.net)', 'degraded', rt, 'Timeout (>5s)');
      return this.makeCheck('aws', 'Lambda Backend (api.224solution.net)', 'outage', rt, e?.message || 'Non accessible');
    }
  }

  private async checkAWSCognito(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      // Vérifier la disponibilité via le backend
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${backendConfig.baseUrl}/api/cognito/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'health-check' }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const rt = Date.now() - start;
      // 401 = Cognito accessible mais token invalide = service OK
      if (response.status === 401 || response.ok) {
        return this.makeCheck('aws', 'Cognito Auth', 'operational', rt, `${rt}ms`);
      }
      return this.makeCheck('aws', 'Cognito Auth', 'degraded', rt, `HTTP ${response.status}`);
    } catch (e: any) {
      return this.makeCheck('aws', 'Cognito Auth', 'unknown', Date.now() - start, 'Via backend');
    }
  }

  // ==================== GOOGLE CLOUD ====================
  private async checkGoogleCloud(): Promise<CloudServiceCheck[]> {
    return Promise.all([
      this.checkGCSStorage(),
      this.checkCloudFunctions()
    ]);
  }

  private async checkGCSStorage(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('gcs-signed-url', {
        method: 'OPTIONS'
      });
      const rt = Date.now() - start;
      return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', rt > 3000 ? 'degraded' : 'operational', rt, `${rt}ms`);
    } catch (e) {
      return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', 'unknown', Date.now() - start, 'Via Edge Function');
    }
  }

  private async checkCloudFunctions(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('google-cloud-test');
      const rt = Date.now() - start;
      if (error) return this.makeCheck('google_cloud', 'Cloud Functions', 'degraded', rt, error.message);
      if (data?.status === 'success') return this.makeCheck('google_cloud', 'Cloud Functions', 'operational', rt, `${rt}ms`);
      return this.makeCheck('google_cloud', 'Cloud Functions', 'degraded', rt, data?.error || 'Config manquante');
    } catch (e) {
      return this.makeCheck('google_cloud', 'Cloud Functions', 'outage', Date.now() - start, String(e));
    }
  }

  // ==================== FIREBASE ====================
  private async checkFirebase(): Promise<CloudServiceCheck[]> {
    return [await this.checkFirebaseMessaging()];
  }

  private async checkFirebaseMessaging(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      // Vérifier si Firebase est initialisé
      const firebaseApp = (window as any).__firebaseApp;
      const rt = Date.now() - start;
      if (firebaseApp) {
        return this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'operational', rt, 'Initialisé');
      }
      // Vérifier si le SW est enregistré
      const regs = await navigator.serviceWorker?.getRegistrations();
      const hasFCM = regs?.some(r => r.active?.scriptURL.includes('firebase'));
      return this.makeCheck('firebase', 'Cloud Messaging (FCM)', hasFCM ? 'operational' : 'unknown', Date.now() - start, hasFCM ? 'SW actif' : 'Non initialisé');
    } catch (e) {
      return this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'unknown', Date.now() - start, 'Non vérifié');
    }
  }

  // ==================== HELPERS ====================
  private makeCheck(provider: CloudProvider, service: string, status: ServiceStatus, responseTime: number, message: string): CloudServiceCheck {
    return { provider, service, status, responseTime, message, lastChecked: new Date().toISOString() };
  }

  private aggregateStatus(checks: CloudServiceCheck[]): ServiceStatus {
    if (checks.some(c => c.status === 'outage')) return 'outage';
    if (checks.some(c => c.status === 'degraded')) return 'degraded';
    if (checks.every(c => c.status === 'operational')) return 'operational';
    return 'unknown';
  }
}

export const multiCloudHealth = MultiCloudHealthService.getInstance();
