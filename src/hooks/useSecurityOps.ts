// 🛡️ Hook pour Security Operations (VERSION SIMPLIFIÉE)
import { useState, useCallback } from 'react';

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

export function useSecurityOps() {
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
    setLoading(false);
  }, []);

  const loadSecurityData = loadData;
  const acknowledgeAlert = async (alertId: string) => true;
  const createIncident = async (data: any) => null;
  const containIncident = async (id: string) => true;
  const resolveIncident = async (id: string) => true;
  const blockIP = async (ip: string, reason: string) => true;
  const unblockIP = async (id: string) => true;
  const detectAnomaly = async (data?: any) => null;

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
