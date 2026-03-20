/**
 * Hook pour le monitoring multi-cloud temps réel
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { multiCloudHealth, type MultiCloudReport } from '@/services/MultiCloudHealthService';

export function useMultiCloudHealth(autoRefreshMs = 60000) {
  const [report, setReport] = useState<MultiCloudReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setIsChecking(true);
    try {
      const r = await multiCloudHealth.checkAll();
      setReport(r);
    } catch (e) {
      console.error('[MultiCloudHealth] Error:', e);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (autoRefreshMs > 0) {
      intervalRef.current = setInterval(refresh, autoRefreshMs);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh, autoRefreshMs]);

  return { report, isChecking, refresh, history: multiCloudHealth.getHistory() };
}
