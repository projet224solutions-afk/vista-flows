// 🛡️ Hook pour Security Operations
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface SecurityIncident {
  id: string;
  incident_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  title: string;
  description?: string;
  source_ip?: string;
  target_service?: string;
  affected_users?: string[];
  indicators?: any;
  timeline?: any;
  assigned_to?: string;
  created_at: string;
  detected_at: string;
  contained_at?: string;
  resolved_at?: string;
  closed_at?: string;
  metadata?: any;
}

export interface SecurityAlert {
  id: string;
  incident_id?: string;
  alert_type: string;
  severity: string;
  message: string;
  source?: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  auto_action_taken?: string;
  created_at: string;
  metadata?: any;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_by_system: boolean;
  incident_id?: string;
  expires_at?: string;
  created_at: string;
  is_active: boolean;
}

export interface SecurityStats {
  open_incidents: number;
  incidents_24h: number;
  pending_alerts: number;
  active_blocks: number;
  critical_incidents: number;
  avg_mttr_minutes: number;
  active_keys: number;
  keys_need_rotation: number;
}

export const useSecurityOps = (autoLoad = true) => {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données de sécurité
  const loadSecurityData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les incidents
      const { data: incidentsData, error: incidentsError } = await supabase
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (incidentsError) throw incidentsError;
      setIncidents(incidentsData || []);

      // Charger les alertes
      const { data: alertsData, error: alertsError } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Charger les IPs bloquées
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_ips')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (blockedError) throw blockedError;
      setBlockedIPs(blockedData || []);

      // Charger les stats
      const { data: statsData, error: statsError } = await supabase
        .from('security_stats')
        .select('*')
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;
      setStats(statsData);

    } catch (err: any) {
      console.error('Error loading security data:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des données de sécurité');
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer un incident
  const createIncident = useCallback(async (
    incidentType: string,
    severity: string,
    title: string,
    description: string,
    sourceIp?: string,
    targetService?: string,
    autoActions = true
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('security-incident-response', {
        body: {
          action: 'create',
          incidentType,
          severity,
          title,
          description,
          sourceIp,
          targetService,
          autoActions
        }
      });

      if (error) throw error;

      toast.success('Incident créé avec succès');
      await loadSecurityData();
      return data.incidentId;
    } catch (err: any) {
      console.error('Error creating incident:', err);
      toast.error('Erreur lors de la création de l\'incident');
      throw err;
    }
  }, [loadSecurityData]);

  // Contenir un incident
  const containIncident = useCallback(async (incidentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('security-incident-response', {
        body: { action: 'contain', incidentId }
      });

      if (error) throw error;

      toast.success('Incident contenu');
      await loadSecurityData();
    } catch (err: any) {
      console.error('Error containing incident:', err);
      toast.error('Erreur lors du confinement de l\'incident');
    }
  }, [loadSecurityData]);

  // Résoudre un incident
  const resolveIncident = useCallback(async (incidentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('security-incident-response', {
        body: { action: 'resolve', incidentId }
      });

      if (error) throw error;

      toast.success('Incident résolu');
      await loadSecurityData();
    } catch (err: any) {
      console.error('Error resolving incident:', err);
      toast.error('Erreur lors de la résolution de l\'incident');
    }
  }, [loadSecurityData]);

  // Bloquer une IP
  const blockIP = useCallback(async (
    ipAddress: string,
    reason: string,
    incidentId?: string,
    expiresHours = 24
  ) => {
    try {
      const { error } = await supabase.functions.invoke('security-block-ip', {
        body: { action: 'block', ipAddress, reason, incidentId, expiresHours }
      });

      if (error) throw error;

      toast.success(`IP ${ipAddress} bloquée`);
      await loadSecurityData();
    } catch (err: any) {
      console.error('Error blocking IP:', err);
      toast.error('Erreur lors du blocage de l\'IP');
    }
  }, [loadSecurityData]);

  // Débloquer une IP
  const unblockIP = useCallback(async (ipAddress: string) => {
    try {
      const { error } = await supabase.functions.invoke('security-block-ip', {
        body: { action: 'unblock', ipAddress }
      });

      if (error) throw error;

      toast.success(`IP ${ipAddress} débloquée`);
      await loadSecurityData();
    } catch (err: any) {
      console.error('Error unblocking IP:', err);
      toast.error('Erreur lors du déblocage de l\'IP');
    }
  }, [loadSecurityData]);

  // Reconnaître une alerte
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alerte reconnue');
      await loadSecurityData();
    } catch (err: any) {
      console.error('Error acknowledging alert:', err);
      toast.error('Erreur lors de la reconnaissance de l\'alerte');
    }
  }, [loadSecurityData]);

  // Détecter les anomalies
  const detectAnomaly = useCallback(async (
    type: 'brute_force' | 'rate_limit' | 'geo_anomaly' | 'behavior',
    params: any
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('security-detect-anomaly', {
        body: { type, ...params }
      });

      if (error) throw error;

      if (data.anomalyDetected) {
        toast.warning(`Anomalie détectée: ${type}`);
        await loadSecurityData();
      }

      return data;
    } catch (err: any) {
      console.error('Error detecting anomaly:', err);
      toast.error('Erreur lors de la détection d\'anomalie');
    }
  }, [loadSecurityData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!autoLoad) return;

    loadSecurityData();

    // Subscribe to alerts
    const alertsSubscription = supabase
      .channel('security_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_alerts' }, () => {
        loadSecurityData();
      })
      .subscribe();

    // Subscribe to incidents
    const incidentsSubscription = supabase
      .channel('security_incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_incidents' }, () => {
        loadSecurityData();
      })
      .subscribe();

    return () => {
      alertsSubscription.unsubscribe();
      incidentsSubscription.unsubscribe();
    };
  }, [autoLoad, loadSecurityData]);

  return {
    incidents,
    alerts,
    blockedIPs,
    stats,
    loading,
    error,
    loadSecurityData,
    createIncident,
    containIncident,
    resolveIncident,
    blockIP,
    unblockIP,
    acknowledgeAlert,
    detectAnomaly
  };
};
