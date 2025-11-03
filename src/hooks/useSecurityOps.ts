// 🛡️ Hook pour Security Operations
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  detected_at: string;
  created_at: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  is_acknowledged: boolean;
  auto_action_taken?: string;
  created_at: string;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  blocked_at: string;
  blocked_by_system: boolean;
  created_at: string;
  expires_at?: string;
}

export interface SecurityStats {
  total_incidents: number;
  critical_incidents: number;
  open_incidents: number;
  incidents_24h: number;
  total_alerts: number;
  pending_alerts: number;
  blocked_ips: number;
  active_blocks: number;
  avg_mttr_minutes: number;
  keys_need_rotation: number;
}

export function useSecurityOps(autoLoad?: boolean) {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    total_incidents: 0,
    critical_incidents: 0,
    open_incidents: 0,
    incidents_24h: 0,
    total_alerts: 0,
    pending_alerts: 0,
    blocked_ips: 0,
    active_blocks: 0,
    avg_mttr_minutes: 0,
    keys_need_rotation: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
        .order('created_at', { ascending: false })
        .limit(50);

      if (blockedError) throw blockedError;
      setBlockedIPs(blockedData || []);

      // Charger les statistiques depuis la vue
      const { data: statsData, error: statsError } = await supabase
        .from('security_stats')
        .select('*')
        .single();

      if (statsError) {
        console.warn('Erreur stats:', statsError);
        // Calculer les stats manuellement si la vue n'existe pas
        setStats({
          total_incidents: incidentsData?.length || 0,
          critical_incidents: incidentsData?.filter(i => i.severity === 'critical').length || 0,
          open_incidents: incidentsData?.filter(i => i.status === 'open').length || 0,
          incidents_24h: incidentsData?.filter(i => {
            const created = new Date(i.created_at);
            const now = new Date();
            return (now.getTime() - created.getTime()) < 24 * 60 * 60 * 1000;
          }).length || 0,
          total_alerts: alertsData?.length || 0,
          pending_alerts: alertsData?.filter(a => !a.is_acknowledged).length || 0,
          blocked_ips: blockedData?.length || 0,
          active_blocks: blockedData?.filter(b => {
            if (!b.expires_at) return true;
            return new Date(b.expires_at) > new Date();
          }).length || 0,
          avg_mttr_minutes: 0,
          keys_need_rotation: 0,
        });
      } else {
        setStats(statsData);
      }

      toast.success('Données de sécurité chargées');
    } catch (err: any) {
      console.error('Erreur chargement données sécurité:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des données de sécurité');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);

  const loadSecurityData = loadData;

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ is_acknowledged: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, is_acknowledged: true } : a
      ));
      
      toast.success('Alerte reconnue');
      return true;
    } catch (err: any) {
      console.error('Erreur reconnaissance alerte:', err);
      toast.error('Erreur lors de la reconnaissance de l\'alerte');
      return false;
    }
  };

  const createIncident = async (data: any) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('security-incident-response', {
        body: {
          action: 'create',
          ...data
        }
      });

      if (error) throw error;

      toast.success('Incident créé avec succès');
      await loadData();
      return result;
    } catch (err: any) {
      console.error('Erreur création incident:', err);
      toast.error('Erreur lors de la création de l\'incident');
      return null;
    }
  };

  const containIncident = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('security-incident-response', {
        body: {
          action: 'contain',
          incidentId: id
        }
      });

      if (error) throw error;

      setIncidents(incidents.map(i => 
        i.id === id ? { ...i, status: 'contained' as const } : i
      ));
      
      toast.success('Incident contenu');
      return true;
    } catch (err: any) {
      console.error('Erreur containment incident:', err);
      toast.error('Erreur lors du containment de l\'incident');
      return false;
    }
  };

  const resolveIncident = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('security-incident-response', {
        body: {
          action: 'resolve',
          incidentId: id
        }
      });

      if (error) throw error;

      setIncidents(incidents.map(i => 
        i.id === id ? { ...i, status: 'resolved' as const } : i
      ));
      
      toast.success('Incident résolu');
      return true;
    } catch (err: any) {
      console.error('Erreur résolution incident:', err);
      toast.error('Erreur lors de la résolution de l\'incident');
      return false;
    }
  };

  const blockIP = async (ip: string, reason: string) => {
    try {
      const { error } = await supabase.rpc('block_ip_address', {
        p_ip_address: ip,
        p_reason: reason,
        p_duration_hours: 24,
        p_auto_block: false
      });

      if (error) throw error;

      toast.success(`IP ${ip} bloquée`);
      await loadData();
      return true;
    } catch (err: any) {
      console.error('Erreur blocage IP:', err);
      toast.error('Erreur lors du blocage de l\'IP');
      return false;
    }
  };

  const unblockIP = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_ips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBlockedIPs(blockedIPs.filter(b => b.id !== id));
      toast.success('IP débloquée');
      return true;
    } catch (err: any) {
      console.error('Erreur déblocage IP:', err);
      toast.error('Erreur lors du déblocage de l\'IP');
      return false;
    }
  };

  const detectAnomaly = async (data?: any) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('security-detect-anomaly', {
        body: data || {}
      });

      if (error) throw error;

      if (result?.detected) {
        toast.warning('Anomalie détectée !');
      } else {
        toast.success('Aucune anomalie détectée');
      }
      
      await loadData();
      return result;
    } catch (err: any) {
      console.error('Erreur détection anomalie:', err);
      toast.error('Erreur lors de la détection d\'anomalie');
      return null;
    }
  };

  return {
    incidents,
    alerts,
    blockedIPs,
    stats,
    loading,
    error,
    loadData,
    loadSecurityData,
    acknowledgeAlert,
    createIncident,
    containIncident,
    resolveIncident,
    blockIP,
    unblockIP,
    detectAnomaly,
  };
}
