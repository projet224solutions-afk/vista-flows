/**
 * SERVICE DE MONITORING DE PERFORMANCE
 * Surveille les métriques clés pour assurer la scalabilité
 * Similaire à CloudWatch (AWS) et Cloud Monitoring (GCP)
 */

import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetric {
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  tags?: Record<string, string>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  response_time_avg: number;
  error_rate: number;
  active_users: number;
  transaction_throughput: number;
  cache_hit_rate: number;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private flushInterval: number | null = null;

  /**
   * Enregistre une métrique de performance
   */
  track(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      tags: {
        ...metric.tags,
        timestamp: new Date().toISOString(),
        environment: import.meta.env.MODE
      }
    });

    // Flush automatique si trop de métriques en mémoire
    if (this.metrics.length >= 100) {
      this.flush();
    }
  }

  /**
   * Envoie les métriques accumulées au serveur
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await supabase
        .from('performance_metrics' as any)
        .insert(metricsToSend.map(m => ({
          metric_name: m.metric_name,
          metric_value: m.metric_value,
          metric_unit: m.metric_unit,
          tags: m.tags,
          created_at: new Date().toISOString()
        })));
    } catch (error) {
      console.error('Failed to send metrics:', error);
      // Remettre les métriques dans la file si échec
      this.metrics.push(...metricsToSend);
    }
  }

  /**
   * Mesure le temps d'exécution d'une fonction
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      this.track({
        metric_name: `${name}.duration`,
        metric_value: duration,
        metric_unit: 'ms',
        tags: {
          ...tags,
          success: success.toString()
        }
      });
    }
  }

  /**
   * Enregistre un temps de chargement de page
   */
  trackPageLoad(pageName: string): void {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    this.track({
      metric_name: 'page.load_time',
      metric_value: navigation.loadEventEnd - navigation.fetchStart,
      metric_unit: 'ms',
      tags: { page: pageName }
    });

    this.track({
      metric_name: 'page.dom_ready',
      metric_value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      metric_unit: 'ms',
      tags: { page: pageName }
    });
  }

  /**
   * Enregistre une erreur
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.track({
      metric_name: 'error.count',
      metric_value: 1,
      metric_unit: 'count',
      tags: {
        error_name: error.name,
        error_message: error.message,
        ...context
      }
    });
  }

  /**
   * Enregistre un appel API
   */
  trackAPICall(endpoint: string, duration: number, status: number): void {
    this.track({
      metric_name: 'api.call_duration',
      metric_value: duration,
      metric_unit: 'ms',
      tags: {
        endpoint,
        status: status.toString(),
        success: (status >= 200 && status < 300).toString()
      }
    });
  }

  /**
   * Récupère la santé du système
   */
  async getSystemHealth(): Promise<SystemHealth | null> {
    // TODO: Implémenter quand la fonction RPC sera créée
    return {
      status: 'healthy',
      response_time_avg: 150,
      error_rate: 0.01,
      active_users: 0,
      transaction_throughput: 0,
      cache_hit_rate: 0.85
    };
  }

  /**
   * Démarre le flush automatique des métriques
   */
  startAutoFlush(intervalMs: number = 30000): void {
    if (this.flushInterval) return;

    this.flushInterval = window.setInterval(() => {
      this.flush();
    }, intervalMs);
  }

  /**
   * Arrête le flush automatique
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Surveille les Web Vitals (Core Web Vitals)
   */
  trackWebVitals(): void {
    if (typeof window === 'undefined') return;

    // LCP (Largest Contentful Paint)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      this.track({
        metric_name: 'web_vitals.lcp',
        metric_value: lastEntry.renderTime || lastEntry.loadTime,
        metric_unit: 'ms'
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        this.track({
          metric_name: 'web_vitals.fid',
          metric_value: entry.processingStart - entry.startTime,
          metric_unit: 'ms'
        });
      });
    }).observe({ entryTypes: ['first-input'] });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          this.track({
            metric_name: 'web_vitals.cls',
            metric_value: clsValue,
            metric_unit: 'score'
          });
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

export const performanceMonitoring = new PerformanceMonitoringService();

// Démarrer le monitoring automatique
if (typeof window !== 'undefined') {
  performanceMonitoring.startAutoFlush();
  performanceMonitoring.trackWebVitals();
  
  // Nettoyer lors du déchargement
  window.addEventListener('beforeunload', () => {
    performanceMonitoring.flush();
    performanceMonitoring.stopAutoFlush();
  });
}
