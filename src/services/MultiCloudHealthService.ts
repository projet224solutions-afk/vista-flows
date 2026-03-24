/**
 * UNIFIED MULTI-CLOUD HEALTH CHECK SERVICE
 * 224Solutions - Real production monitoring for all cloud providers
 * Supabase | AWS | Google Cloud | Firebase
 * Persists to monitoring_providers + monitoring_services + monitoring_incidents
 */

import { supabase } from '@/integrations/supabase/client';
import { monitoringBus } from './monitoring/MonitoringEventBus';

export type CloudProvider = 'supabase' | 'aws' | 'google_cloud' | 'firebase';
export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface CloudServiceCheck {
  provider: CloudProvider;
  service: string;
  serviceName: string; // DB key like 'supabase_database'
  status: ServiceStatus;
  responseTime: number;
  message: string;
  lastChecked: string;
  isRealCheck: boolean; // transparency: was this a real probe?
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
  private isRunning = false;
  private providerIdCache: Record<string, string> = {};
  private serviceIdCache: Record<string, string> = {};

  static getInstance(): MultiCloudHealthService {
    if (!this.instance) this.instance = new MultiCloudHealthService();
    return this.instance;
  }

  async checkAll(): Promise<MultiCloudReport> {
    if (this.isRunning) return this.lastReport || this.emptyReport();
    this.isRunning = true;

    try {
      if (Object.keys(this.providerIdCache).length === 0) await this.loadIdCaches();

      const [supabaseChecks, awsChecks, gcpChecks, firebaseChecks] = await Promise.allSettled([
        this.checkSupabase(), this.checkAWS(), this.checkGoogleCloud(), this.checkFirebase()
      ]).then(results => results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const providers: CloudProvider[] = ['supabase', 'aws', 'google_cloud', 'firebase'];
        return [this.makeCheck(providers[i], 'Service', `${providers[i]}_error`, 'outage', 0, 'Check failed', false)];
      }));

      const allChecks = [...supabaseChecks, ...awsChecks, ...gcpChecks, ...firebaseChecks];
      const totalChecks = allChecks.length;
      const healthyChecks = allChecks.filter(c => c.status === 'operational' || c.status === 'unknown').length;

      const providerReport = (checks: CloudServiceCheck[]) => ({
        status: this.aggregateStatus(checks),
        services: checks,
        avgResponseTime: checks.length > 0 ? Math.round(checks.reduce((s, c) => s + c.responseTime, 0) / checks.length) : 0
      });

      const report: MultiCloudReport = {
        overall: this.aggregateStatus(allChecks),
        providers: {
          supabase: providerReport(supabaseChecks),
          aws: providerReport(awsChecks),
          google_cloud: providerReport(gcpChecks),
          firebase: providerReport(firebaseChecks)
        },
        timestamp: new Date().toISOString(), totalChecks, healthyChecks,
        uptimePercent: totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 100) : 0
      };

      this.lastReport = report;
      this.checkHistory.push(report);
      if (this.checkHistory.length > this.MAX_HISTORY) this.checkHistory.shift();

      this.persistReal(report, allChecks);

      return report;
    } finally {
      this.isRunning = false;
    }
  }

  getLastReport(): MultiCloudReport | null { return this.lastReport; }
  getHistory(): MultiCloudReport[] { return [...this.checkHistory]; }

  // ==================== LOAD ID CACHES ====================
  private async loadIdCaches(): Promise<void> {
    try {
      const { data: providers } = await supabase.from('monitoring_providers' as any).select('id, name');
      if (providers) for (const p of providers as any[]) this.providerIdCache[p.name] = p.id;
      const { data: services } = await supabase.from('monitoring_services' as any).select('id, name');
      if (services) for (const s of services as any[]) this.serviceIdCache[s.name] = s.id;
    } catch (e) {
      console.error('[MultiCloudHealth] Failed to load ID caches:', e);
    }
  }

  // ==================== PERSIST TO REAL DB ====================
  private async persistReal(report: MultiCloudReport, allChecks: CloudServiceCheck[]): Promise<void> {
    const now = new Date().toISOString();
    try {
      // Update monitoring_providers
      for (const [provName, provData] of Object.entries(report.providers)) {
        const pid = this.providerIdCache[provName];
        if (!pid) continue;
        const dbSt = provData.status === 'operational' ? 'healthy' : provData.status === 'degraded' ? 'degraded' : provData.status === 'outage' ? 'down' : 'unknown';
        await supabase.from('monitoring_providers' as any).update({ status: dbSt, latency: provData.avgResponseTime, last_check: now, updated_at: now }).eq('id', pid);
      }
      // Update monitoring_services + create incidents
      for (const check of allChecks) {
        const sid = this.serviceIdCache[check.serviceName];
        if (!sid) continue;
        const dbSt = check.status === 'operational' ? 'healthy' : check.status === 'degraded' ? 'degraded' : check.status === 'outage' ? 'down' : 'unknown';
        await supabase.from('monitoring_services' as any).update({
          status: dbSt, latency: check.responseTime, last_check: now,
          last_healthy_at: check.status === 'operational' ? now : undefined,
          metadata: { message: check.message, is_real_check: check.isRealCheck }, updated_at: now,
        }).eq('id', sid);
        if (check.status === 'outage') {
          await supabase.from('monitoring_incidents' as any).upsert({
            provider_id: this.providerIdCache[check.provider] || null, service_id: sid,
            severity: 'critical', status: 'open', title: `${check.service} en panne`,
            message: check.message, dedupe_key: `incident_${check.serviceName}`, last_seen_at: now,
            metadata: { provider: check.provider, response_time: check.responseTime },
          }, { onConflict: 'dedupe_key' });
        }
        if (check.status === 'outage' || check.status === 'degraded') {
          monitoringBus.emit({ event_type: 'service_status_change', source: 'multi_cloud_health',
            severity: check.status === 'outage' ? 'critical' : 'medium',
            message: `${check.service} (${check.provider}): ${check.status} - ${check.message}`,
            service_name: check.serviceName, response_time_ms: check.responseTime,
            metadata: { provider: check.provider, is_real: check.isRealCheck },
          });
        }
      }
      // Legacy compat: monitoring_service_status
      for (const check of allChecks) {
        const statusMap: Record<ServiceStatus, string> = { operational: 'healthy', degraded: 'degraded', outage: 'critical', unknown: 'unknown' };
        await supabase.from('monitoring_service_status' as any).upsert({
          service_name: check.serviceName, display_name: check.service, provider: check.provider,
          status: statusMap[check.status], last_check_at: now,
          last_healthy_at: check.status === 'operational' ? now : undefined,
          response_time_ms: check.responseTime,
          metadata: { message: check.message, is_real_check: check.isRealCheck }, updated_at: now,
        }, { onConflict: 'service_name' });
      }
    } catch (e) {
      console.error('[MultiCloudHealth] DB persist error:', e);
    }
  }

  // ==================== SUPABASE (ALL REAL) ====================
  private async checkSupabase(): Promise<CloudServiceCheck[]> {
    const results = await Promise.allSettled([
      this.checkSupabaseDB(), this.checkSupabaseAuth(), this.checkSupabaseRealtime(),
      this.checkSupabaseEdgeFunctions(), this.checkSupabaseStorage(),
    ]);
    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const names = ['PostgreSQL Database', 'Auth Service', 'Realtime WebSocket', 'Edge Functions', 'Storage'];
      const keys = ['supabase_database', 'supabase_auth', 'supabase_realtime', 'supabase_edge_functions', 'supabase_storage'];
      return this.makeCheck('supabase', names[i], keys[i], 'outage', 0, 'Check exception', true);
    });
  }

  private async checkSupabaseDB(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'PostgreSQL Database', 'supabase_database', 'degraded', rt, error.message, true);
      return this.makeCheck('supabase', 'PostgreSQL Database', 'supabase_database', rt > 2000 ? 'degraded' : 'operational', rt, `${rt}ms`, true);
    } catch (e) {
      return this.makeCheck('supabase', 'PostgreSQL Database', 'supabase_database', 'outage', Date.now() - start, String(e), true);
    }
  }

  private async checkSupabaseAuth(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.auth.getSession();
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'Auth Service', 'supabase_auth', 'degraded', rt, error.message, true);
      return this.makeCheck('supabase', 'Auth Service', 'supabase_auth', rt > 2000 ? 'degraded' : 'operational', rt, `${rt}ms`, true);
    } catch (e) {
      return this.makeCheck('supabase', 'Auth Service', 'supabase_auth', 'outage', Date.now() - start, String(e), true);
    }
  }

  private async checkSupabaseRealtime(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const channel = supabase.channel('health-test-' + Date.now());
      const rt = Date.now() - start;
      supabase.removeChannel(channel);
      return this.makeCheck('supabase', 'Realtime WebSocket', 'supabase_realtime', 'operational', rt, `${rt}ms`, true);
    } catch (e) {
      return this.makeCheck('supabase', 'Realtime WebSocket', 'supabase_realtime', 'degraded', Date.now() - start, String(e), true);
    }
  }

  private async checkSupabaseEdgeFunctions(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('geo-detect', { body: { test: true } });
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'Edge Functions', 'supabase_edge_functions', 'degraded', rt, error.message || 'Erreur', true);
      return this.makeCheck('supabase', 'Edge Functions', 'supabase_edge_functions', rt > 5000 ? 'degraded' : 'operational', rt, `${rt}ms`, true);
    } catch (e) {
      return this.makeCheck('supabase', 'Edge Functions', 'supabase_edge_functions', 'degraded', Date.now() - start, 'Timeout', true);
    }
  }

  private async checkSupabaseStorage(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.storage.listBuckets();
      const rt = Date.now() - start;
      if (error) return this.makeCheck('supabase', 'Storage', 'supabase_storage', 'degraded', rt, error.message, true);
      return this.makeCheck('supabase', 'Storage', 'supabase_storage', rt > 3000 ? 'degraded' : 'operational', rt, `${rt}ms`, true);
    } catch (e) {
      return this.makeCheck('supabase', 'Storage', 'supabase_storage', 'outage', Date.now() - start, String(e), true);
    }
  }

  // ==================== AWS ====================
  private async checkAWS(): Promise<CloudServiceCheck[]> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('cloud-health-proxy', { body: {} });
      const rt = Date.now() - start;
      if (error || !data?.results) {
        return [
          this.makeCheck('aws', 'Lambda Backend', 'aws_lambda', 'degraded', rt, 'Proxy échoué', true),
          this.makeCheck('aws', 'Cognito Auth', 'aws_cognito', 'degraded', rt, 'Proxy échoué', true)
        ];
      }

      const results: CloudServiceCheck[] = [];
      const backend = data.results['aws-backend'];
      if (backend) {
        results.push(this.makeCheck('aws', 'Lambda Backend', 'aws_lambda', backend.status, backend.responseTime, backend.message, true));
      }
      const cognito = data.results['aws-cognito'];
      if (cognito) {
        results.push(this.makeCheck('aws', 'Cognito Auth', 'aws_cognito', cognito.status, cognito.responseTime, cognito.message, true));
      }
      return results.length > 0 ? results : [
        this.makeCheck('aws', 'Lambda Backend', 'aws_lambda', 'unknown', rt, 'Pas de données', true),
        this.makeCheck('aws', 'Cognito Auth', 'aws_cognito', 'unknown', rt, 'Pas de données', true)
      ];
    } catch (e) {
      const rt = Date.now() - start;
      return [
        this.makeCheck('aws', 'Lambda Backend', 'aws_lambda', 'degraded', rt, 'Erreur proxy', true),
        this.makeCheck('aws', 'Cognito Auth', 'aws_cognito', 'degraded', rt, 'Erreur proxy', true)
      ];
    }
  }

  // ==================== GOOGLE CLOUD ====================
  private async checkGoogleCloud(): Promise<CloudServiceCheck[]> {
    const results = await Promise.allSettled([this.checkGCSStorage(), this.checkCloudFunctions()]);
    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const names = ['Cloud Storage (GCS)', 'Cloud Functions'];
      const keys = ['gcp_storage', 'gcp_functions'];
      return this.makeCheck('google_cloud', names[i], keys[i], 'outage', 0, 'Check exception', true);
    });
  }

  private async checkGCSStorage(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('gcs-signed-url', { method: 'POST', body: { healthCheck: true } });
      const rt = Date.now() - start;
      if (error) return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', 'gcp_storage', 'degraded', rt, error.message||'Erreur', true);
      return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', 'gcp_storage', rt > 5000 ? 'degraded' : 'operational', rt, `${rt}ms`, true);
    } catch (e) {
      return this.makeCheck('google_cloud', 'Cloud Storage (GCS)', 'gcp_storage', 'unknown', Date.now() - start, 'Erreur check', true);
    }
  }

  private async checkCloudFunctions(): Promise<CloudServiceCheck> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('google-cloud-test');
      const rt = Date.now() - start;
      if (error) return this.makeCheck('google_cloud', 'Cloud Functions', 'gcp_functions', 'degraded', rt, error.message||'Erreur', true);
      if (data?.status === 'success') return this.makeCheck('google_cloud', 'Cloud Functions', 'gcp_functions', 'operational', rt, `${rt}ms`, true);
      return this.makeCheck('google_cloud', 'Cloud Functions', 'gcp_functions', 'degraded', rt, data?.error || 'Config manquante', true);
    } catch (e) {
      return this.makeCheck('google_cloud', 'Cloud Functions', 'gcp_functions', 'outage', Date.now() - start, String(e), true);
    }
  }

  // ==================== FIREBASE ====================
  private async checkFirebase(): Promise<CloudServiceCheck[]> {
    const start = Date.now();
    try {
      const firebaseApp = (window as any).__firebaseApp;
      const rt = Date.now() - start;
      if (firebaseApp) return [this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'firebase_fcm', 'operational', rt, 'SDK initialisé', true)];
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker?.getRegistrations();
        if (regs?.some(r => r.active?.scriptURL.includes('firebase')))
          return [this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'firebase_fcm', 'operational', Date.now() - start, 'SW FCM actif', true)];
      }
      return [this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'firebase_fcm', 'unknown', rt, 'SDK non initialisé', false)];
    } catch (e) {
      return [this.makeCheck('firebase', 'Cloud Messaging (FCM)', 'firebase_fcm', 'unknown', Date.now() - start, 'Vérification impossible', false)];
    }
  }

  // ==================== HELPERS ====================
  private makeCheck(provider: CloudProvider, service: string, serviceName: string, status: ServiceStatus, responseTime: number, message: string, isRealCheck: boolean): CloudServiceCheck {
    return { provider, service, serviceName, status, responseTime, message, lastChecked: new Date().toISOString(), isRealCheck };
  }

  private aggregateStatus(checks: CloudServiceCheck[]): ServiceStatus {
    if (checks.length === 0) return 'unknown';
    const known = checks.filter(c => c.status !== 'unknown');
    if (known.length === 0) return 'operational';
    if (known.some(c => c.status === 'outage')) return 'outage';
    if (known.some(c => c.status === 'degraded')) return 'degraded';
    return 'operational';
  }

  private emptyReport(): MultiCloudReport {
    const e = { status: 'unknown' as ServiceStatus, services: [], avgResponseTime: 0 };
    return { overall: 'unknown', providers: { supabase: e, aws: e, google_cloud: e, firebase: e }, timestamp: new Date().toISOString(), totalChecks: 0, healthyChecks: 0, uptimePercent: 0 };
  }
}

export const multiCloudHealth = MultiCloudHealthService.getInstance();
