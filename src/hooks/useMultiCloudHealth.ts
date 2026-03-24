/**
 * Hook pour le monitoring multi-cloud temps réel
 * Combines polling health checks with Supabase Realtime for service status
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { multiCloudHealth, type MultiCloudReport } from '@/services/MultiCloudHealthService';

interface RealtimeServiceStatus {
  service_name: string;
  display_name: string;
  provider: string;
  status: string;
  response_time_ms: number | null;
  last_check_at: string | null;
  metadata: Record<string, any>;
}

export function useMultiCloudHealth(autoRefreshMs = 30000) {
  const [report, setReport] = useState<MultiCloudReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dbServices, setDbServices] = useState<RealtimeServiceStatus[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setIsChecking(true);
    try {
      const r = await multiCloudHealth.checkAll();
      setReport(r);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('[MultiCloudHealth] Error:', e);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Load DB service statuses
  const loadDbServices = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('monitoring_service_status' as any)
        .select('*')
        .order('service_name');
      if (data) setDbServices(data as unknown as RealtimeServiceStatus[]);
    } catch (e) {
      console.error('[MultiCloudHealth] DB load error:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
    loadDbServices();

    if (autoRefreshMs > 0) {
      intervalRef.current = setInterval(refresh, autoRefreshMs);
    }

    // Realtime subscription for instant status changes
    const channel = supabase
      .channel('multicloud-service-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'monitoring_service_status',
      }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updated = payload.new as RealtimeServiceStatus;
          setDbServices(prev => {
            const exists = prev.find(s => s.service_name === updated.service_name);
            if (exists) return prev.map(s => s.service_name === updated.service_name ? updated : s);
            return [...prev, updated];
          });
          setLastUpdate(new Date());
        }
      })
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [refresh, autoRefreshMs, loadDbServices]);

  return { 
    report, 
    isChecking, 
    refresh, 
    history: multiCloudHealth.getHistory(),
    dbServices,
    lastUpdate,
  };
}
