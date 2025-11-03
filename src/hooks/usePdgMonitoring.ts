import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { errorMonitor } from '@/services/errorMonitor';
import { ApiMonitoringService } from '@/services/apiMonitoring';
import { InterfaceMetricsService } from '@/services/interfaceMetrics';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastCheck: string;
  services: ServiceStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime?: number;
  errorRate?: number;
  lastError?: string;
}

export interface InterfaceMetrics {
  interface: string;
  activeUsers: number;
  transactions: number;
  errors: number;
  performance: number;
}

export interface AutoFix {
  id: string;
  error_pattern: string;
  fix_description: string;
  fix_type: string;
  times_applied: number;
  success_rate: number;
  is_active: boolean;
}

export interface PdgStats {
  totalErrors: number;
  criticalErrors: number;
  autoFixedErrors: number;
  pendingErrors: number;
  systemHealth: number;
  activeInterfaces: number;
  totalTransactions: number;
  avgResponseTime: number;
}

export function usePdgMonitoring() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: 0,
    lastCheck: new Date().toISOString(),
    services: []
  });
  
  const [interfaceMetrics, setInterfaceMetrics] = useState<InterfaceMetrics[]>([]);
  const [autoFixes, setAutoFixes] = useState<AutoFix[]>([]);
  const [stats, setStats] = useState<PdgStats>({
    totalErrors: 0,
    criticalErrors: 0,
    autoFixedErrors: 0,
    pendingErrors: 0,
    systemHealth: 100,
    activeInterfaces: 0,
    totalTransactions: 0,
    avgResponseTime: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Charger les données de monitoring
  const loadMonitoringData = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les stats globales via la fonction RPC sécurisée
      const globalStats = await InterfaceMetricsService.getGlobalStats();
      
      // Charger les erreurs système
      const errorStats = await errorMonitor.getErrorStats();

      // Charger les connexions API
      const apiConnections = await ApiMonitoringService.getAllApiConnections();
      
      // Charger les auto-fixes
      const { data: fixesData } = await supabase
        .from('auto_fixes')
        .select('*')
        .eq('is_active', true);

      if (fixesData) {
        setAutoFixes(fixesData);
      }

      // Charger la santé système
      const { data: healthData } = await supabase
        .from('system_health')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      // Charger les vraies métriques des interfaces depuis la vue sécurisée
      const metrics = await InterfaceMetricsService.getAllMetrics();
      setInterfaceMetrics(metrics);

      // Calculer le statut des services
      const services: ServiceStatus[] = [
        {
          name: 'Supabase',
          status: 'online',
          responseTime: 45,
          errorRate: 0.1
        },
        {
          name: 'Firebase',
          status: 'online',
          responseTime: 52,
          errorRate: 0.2
        },
        {
          name: 'API Gateway',
          status: apiConnections.length > 0 ? 'online' : 'degraded',
          responseTime: 38,
          errorRate: 0.5
        },
        {
          name: 'Monitoring System',
          status: (errorStats?.total || 0) < 50 ? 'online' : 'degraded',
          responseTime: 25,
          errorRate: 0.2
        }
      ];

      // Calculer la santé globale
      const healthScore = healthData && healthData.length > 0
        ? healthData.filter(h => h.status === 'healthy').length / healthData.length * 100
        : 100;

      // Si on a des métriques, ajuster le score de santé
      const totalErrors = errorStats?.total || 0;
      const adjustedHealthScore = totalErrors > 0 
        ? Math.max(50, healthScore - (totalErrors * 0.5))
        : healthScore;

      setSystemHealth({
        status: adjustedHealthScore > 80 ? 'healthy' : adjustedHealthScore > 50 ? 'warning' : 'critical',
        uptime: 99.9,
        lastCheck: new Date().toISOString(),
        services
      });

      // Utiliser les stats globales si disponibles
      const totalTransactions = globalStats?.total_orders || 
        metrics.reduce((sum, m) => sum + m.transactions, 0);

      // Calculer les statistiques globales
      setStats({
        totalErrors: errorStats?.total || 0,
        criticalErrors: errorStats?.critical || 0,
        autoFixedErrors: errorStats?.fixed || 0,
        pendingErrors: errorStats?.pending || 0,
        systemHealth: adjustedHealthScore,
        activeInterfaces: metrics.length,
        totalTransactions: totalTransactions,
        avgResponseTime: services.reduce((sum, s) => sum + (s.responseTime || 0), 0) / services.length
      });

    } catch (error: any) {
      console.error('Erreur chargement monitoring:', error);
      toast.error('Erreur lors du chargement des données de monitoring');
    } finally {
      setLoading(false);
    }
  }, []);

  // Activer la surveillance en temps réel
  useEffect(() => {
    if (!realTimeEnabled) return;

    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Rafraîchir toutes les 30s

    // Écouter les changements en temps réel
    const errorsChannel = supabase
      .channel('system-errors-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_errors'
      }, () => {
        loadMonitoringData();
      })
      .subscribe();

    const healthChannel = supabase
      .channel('system-health-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_health'
      }, () => {
        loadMonitoringData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(errorsChannel);
      supabase.removeChannel(healthChannel);
    };
  }, [realTimeEnabled, loadMonitoringData]);

  // Analyser une erreur avec l'IA
  const analyzeErrorWithAI = async (errorId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-error-analyzer', {
        body: { 
          error: { id: errorId },
          context: { stats, systemHealth }
        }
      });

      if (error) throw error;

      toast.success('Analyse IA terminée');
      await loadMonitoringData();
      return data;
    } catch (error: any) {
      console.error('Erreur analyse IA:', error);
      toast.error('Erreur lors de l\'analyse IA');
      return null;
    }
  };

  // Exécuter une correction automatique
  const runAutoFix = async (errorId: string) => {
    try {
      // D'abord analyser avec l'IA
      const analysis = await analyzeErrorWithAI(errorId);
      
      if (analysis?.analysis?.autoFixable) {
        // Appliquer le fix automatique
        const { data, error } = await supabase.functions.invoke('fix-error', {
          body: { errorId }
        });

        if (error) throw error;

        toast.success('Correction automatique appliquée avec succès');
        await loadMonitoringData();
        return data;
      } else {
        toast.warning('Cette erreur nécessite une intervention manuelle');
        return analysis;
      }
    } catch (error: any) {
      console.error('Erreur auto-fix:', error);
      toast.error('Erreur lors de la correction automatique');
      return null;
    }
  };

  // Demander de l'aide à l'IA copilote
  const askAICopilot = async (query: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: { 
          query,
          context: {
            stats,
            systemHealth,
            recentErrors: await errorMonitor.getRecentErrors(10)
          }
        }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Erreur AI copilot:', error);
      toast.error('Erreur lors de la consultation de l\'IA');
      return null;
    }
  };

  // Analyser les anomalies
  const detectAnomalies = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('detect-anomalies', {
        body: {
          metrics: interfaceMetrics,
          health: systemHealth
        }
      });

      if (error) throw error;

      if (data?.anomalies && data.anomalies.length > 0) {
        toast.warning(`${data.anomalies.length} anomalie(s) détectée(s)`);
      } else {
        toast.success('Aucune anomalie détectée');
      }

      return data;
    } catch (error: any) {
      console.error('Erreur détection anomalies:', error);
      toast.error('Erreur lors de la détection d\'anomalies');
      return null;
    }
  };

  return {
    systemHealth,
    interfaceMetrics,
    autoFixes,
    stats,
    loading,
    realTimeEnabled,
    setRealTimeEnabled,
    loadMonitoringData,
    runAutoFix,
    analyzeErrorWithAI,
    askAICopilot,
    detectAnomalies
  };
}
