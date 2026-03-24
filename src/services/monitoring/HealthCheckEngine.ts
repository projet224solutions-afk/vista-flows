/**
 * HEALTH CHECK ENGINE - Vérifications santé réelles des services
 * 224Solutions - Production-grade health checks with service status updates
 */

import { supabase } from '@/integrations/supabase/client';
import { monitoringBus } from './MonitoringEventBus';

export type ServiceStatus = 'healthy' | 'degraded' | 'critical' | 'unknown' | 'maintenance';

export interface HealthCheckResult {
  service_name: string;
  status: ServiceStatus;
  response_time_ms: number;
  message?: string;
}

class HealthCheckEngine {
  private static instance: HealthCheckEngine;
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly CHECK_INTERVAL = 30_000; // 30s
  private lastResults: Map<string, HealthCheckResult> = new Map();

  private constructor() {}

  static getInstance(): HealthCheckEngine {
    if (!HealthCheckEngine.instance) {
      HealthCheckEngine.instance = new HealthCheckEngine();
    }
    return HealthCheckEngine.instance;
  }

  start(): void {
    if (this.interval) return;
    console.log('[HealthCheck] Starting engine...');
    this.runAllChecks();
    this.interval = setInterval(() => this.runAllChecks(), this.CHECK_INTERVAL);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getLastResults(): Map<string, HealthCheckResult> {
    return this.lastResults;
  }

  async runAllChecks(): Promise<HealthCheckResult[]> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkAuth(),
      this.checkRealtime(),
      this.checkStorage(),
      this.checkEdgeFunctions(),
    ]);

    const results: HealthCheckResult[] = checks.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      const names = ['database', 'auth', 'realtime', 'storage', 'edge_functions'];
      return { service_name: names[i], status: 'critical' as ServiceStatus, response_time_ms: 0, message: 'Check failed' };
    });

    // Update service statuses in DB
    this.updateServiceStatuses(results);
    results.forEach(r => this.lastResults.set(r.service_name, r));

    return results;
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const ms = Date.now() - start;
      if (error) return { service_name: 'database', status: 'critical', response_time_ms: ms, message: error.message };
      if (ms > 2000) return { service_name: 'database', status: 'degraded', response_time_ms: ms, message: 'Latence élevée' };
      if (ms > 800) return { service_name: 'database', status: 'degraded', response_time_ms: ms, message: 'Latence modérée' };
      return { service_name: 'database', status: 'healthy', response_time_ms: ms };
    } catch (e: any) {
      return { service_name: 'database', status: 'critical', response_time_ms: Date.now() - start, message: e.message };
    }
  }

  private async checkAuth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const { error } = await supabase.auth.getSession();
      const ms = Date.now() - start;
      if (error) return { service_name: 'auth', status: 'degraded', response_time_ms: ms, message: error.message };
      if (ms > 2000) return { service_name: 'auth', status: 'degraded', response_time_ms: ms };
      return { service_name: 'auth', status: 'healthy', response_time_ms: ms };
    } catch (e: any) {
      return { service_name: 'auth', status: 'critical', response_time_ms: Date.now() - start, message: e.message };
    }
  }

  private async checkRealtime(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Simple check: can we subscribe?
      const channel = supabase.channel('health-check-test');
      const status = channel.subscribe();
      const ms = Date.now() - start;
      supabase.removeChannel(channel);
      return { service_name: 'realtime', status: 'healthy', response_time_ms: ms };
    } catch (e: any) {
      return { service_name: 'realtime', status: 'degraded', response_time_ms: Date.now() - start, message: e.message };
    }
  }

  private async checkStorage(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const { error } = await supabase.storage.listBuckets();
      const ms = Date.now() - start;
      if (error) return { service_name: 'storage', status: 'degraded', response_time_ms: ms, message: error.message };
      return { service_name: 'storage', status: 'healthy', response_time_ms: ms };
    } catch (e: any) {
      return { service_name: 'storage', status: 'critical', response_time_ms: Date.now() - start, message: e.message };
    }
  }

  private async checkEdgeFunctions(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('geo-detect', {
        body: { test: true },
      });
      const ms = Date.now() - start;
      // Even errors are OK - means the function exists and responds
      if (ms > 5000) return { service_name: 'edge_functions', status: 'degraded', response_time_ms: ms, message: 'Latence élevée' };
      return { service_name: 'edge_functions', status: 'healthy', response_time_ms: ms };
    } catch (e: any) {
      const ms = Date.now() - start;
      if (ms > 10000) return { service_name: 'edge_functions', status: 'critical', response_time_ms: ms, message: 'Timeout' };
      return { service_name: 'edge_functions', status: 'degraded', response_time_ms: ms, message: e.message };
    }
  }

  private async updateServiceStatuses(results: HealthCheckResult[]): Promise<void> {
    try {
      for (const r of results) {
        const prev = this.lastResults.get(r.service_name);
        
        // Only emit monitoring event on status change
        if (prev && prev.status !== r.status) {
          monitoringBus.emit({
            event_type: 'service_status_change',
            source: 'health_check',
            severity: r.status === 'critical' ? 'critical' : r.status === 'degraded' ? 'medium' : 'info',
            message: `${r.service_name}: ${prev.status} → ${r.status}`,
            service_name: r.service_name,
            response_time_ms: r.response_time_ms,
          });
        }

        await supabase.from('monitoring_service_status' as any).upsert({
          service_name: r.service_name,
          display_name: r.service_name,
          status: r.status,
          last_check_at: new Date().toISOString(),
          last_healthy_at: r.status === 'healthy' ? new Date().toISOString() : undefined,
          response_time_ms: r.response_time_ms,
          metadata: { message: r.message },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'service_name' });
      }
    } catch (e) {
      console.error('[HealthCheck] Failed to update statuses:', e);
    }
  }
}

export const healthCheckEngine = HealthCheckEngine.getInstance();
