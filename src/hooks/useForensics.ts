import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ForensicSnapshot {
  id: string;
  snapshot_type: string;
  incident_id?: string;
  storage_path: string;
  snapshot_hash?: string;
  metadata?: any;
  created_at: string;
}

export interface IncidentTimeline {
  id: string;
  incident_id: string;
  event_type: string;
  timestamp: string;
  description: string;
  actor?: string;
  source?: string;
  metadata?: any;
}

export interface BehaviorAnalysis {
  user_id: string;
  anomaly_score: number;
  patterns: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface ForensicReport {
  id: string;
  incident_id: string;
  report_type: string;
  generated_at: string;
  report_data: any;
  file_path?: string;
}

export const useForensics = () => {
  const [loading, setLoading] = useState(false);
  const [snapshots, setSnapshots] = useState<ForensicSnapshot[]>([]);
  const [timeline, setTimeline] = useState<IncidentTimeline[]>([]);

  const createSnapshot = async (incidentId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-forensics', {
        body: {
          action: 'create_snapshot',
          incidentId,
          snapshotType: 'system_state'
        }
      });

      if (error) throw error;

      toast.success('Snapshot forensique créé avec succès');
      await loadSnapshots();
      return data;
    } catch (error: any) {
      toast.error('Erreur lors de la création du snapshot: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('security_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSnapshots((data as any) || []);
    } catch (error: any) {
      console.error('Error loading snapshots:', error);
    }
  };

  const analyzeBehavior = async (userId?: string, timeRange?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-forensics', {
        body: {
          action: 'analyze_behavior',
          userId,
          timeRange: timeRange || '24h'
        }
      });

      if (error) throw error;
      return data as BehaviorAnalysis;
    } catch (error: any) {
      toast.error('Erreur lors de l\'analyse comportementale: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const correlateEvents = async (incidentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-forensics', {
        body: {
          action: 'correlate_events',
          incidentId
        }
      });

      if (error) throw error;
      toast.success('Événements corrélés avec succès');
      return data;
    } catch (error: any) {
      toast.error('Erreur lors de la corrélation: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const reconstructTimeline = async (incidentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-forensics', {
        body: {
          action: 'reconstruct_timeline',
          incidentId
        }
      });

      if (error) throw error;
      setTimeline(data.timeline || []);
      toast.success('Timeline reconstruite avec succès');
      return data;
    } catch (error: any) {
      toast.error('Erreur lors de la reconstruction: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateForensicReport = async (incidentId: string, reportType: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-forensics', {
        body: {
          action: 'generate_report',
          incidentId,
          reportType
        }
      });

      if (error) throw error;
      toast.success('Rapport forensique généré avec succès');
      return data;
    } catch (error: any) {
      toast.error('Erreur lors de la génération du rapport: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportToSIEM = async (data: any, siemType: string) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('security-forensics', {
        body: {
          action: 'export_to_siem',
          data,
          siemType
        }
      });

      if (error) throw error;
      toast.success(`Export vers ${siemType} réussi`);
      return result;
    } catch (error: any) {
      toast.error('Erreur lors de l\'export SIEM: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLogs = async (filters?: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-forensics', {
        body: {
          action: 'export_logs',
          filters
        }
      });

      if (error) throw error;
      
      // Create download link
      const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Logs exportés avec succès');
      return data;
    } catch (error: any) {
      toast.error('Erreur lors de l\'export des logs: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    snapshots,
    timeline,
    createSnapshot,
    loadSnapshots,
    analyzeBehavior,
    correlateEvents,
    reconstructTimeline,
    generateForensicReport,
    exportToSIEM,
    exportAuditLogs
  };
};
