/**
 * Hook pour détecter et gérer le statut de connexion (online/offline)
 * Uses shared networkHealth with aggressive caching to prevent flooding
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkNetworkHealth } from '@/lib/networkHealth';

interface OnlineStatus {
  isOnline: boolean;
  connectivity: 'online' | 'degraded' | 'offline';
  lastOnline: Date | null;
  wasOffline: boolean;
  lastError: string | null;
  offlineDuration: number;
  checkConnection: () => Promise<boolean>;
}

const HEALTH_TIMEOUT_MS = 4500;
const OFFLINE_CONFIRMATION_FAILURES = 2;
const OFFLINE_RECOVERY_POLL_MS = 15000;

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectivity, setConnectivity] = useState<'online' | 'degraded' | 'offline'>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(isOnline ? new Date() : null);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [offlineDuration, setOfflineDuration] = useState<number>(0);

  const offlineStartRef = useRef<Date | null>(isOnline ? null : new Date());
  const consecutiveFailuresRef = useRef(0);

  const markOffline = useCallback((reason: string) => {
    if (!offlineStartRef.current) offlineStartRef.current = new Date();
    setIsOnline(false);
    setConnectivity('offline');
    setLastError(reason);
  }, []);

  const markOnline = useCallback((nextConnectivity: 'online' | 'degraded', reason?: string) => {
    const now = new Date();
    if (offlineStartRef.current) {
      setOfflineDuration(Math.floor((now.getTime() - offlineStartRef.current.getTime()) / 1000));
      setWasOffline(true);
      offlineStartRef.current = null;
    }
    setIsOnline(true);
    setConnectivity(nextConnectivity);
    setLastOnline(now);
    setLastError(nextConnectivity === 'degraded' ? reason || 'degraded' : null);
    consecutiveFailuresRef.current = 0;
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      consecutiveFailuresRef.current = OFFLINE_CONFIRMATION_FAILURES;
      markOffline('navigator_offline');
      return false;
    }

    // Don't force by default: shared cache deduplicates all calls
    const result = await checkNetworkHealth({ timeoutMs: HEALTH_TIMEOUT_MS, retries: 1, force: !isOnline });
    if (result.connectivity !== 'offline') {
      markOnline(result.connectivity, result.reason);
      return true;
    }

    consecutiveFailuresRef.current += 1;
    setLastError(result.reason);

    // Avoid false offline on one transient failure when navigator is still online
    if (consecutiveFailuresRef.current < OFFLINE_CONFIRMATION_FAILURES) {
      console.warn('[HEALTH CHECK FAIL] transient', {
        reason: result.reason,
        failures: consecutiveFailuresRef.current,
      });
      return false;
    }

    markOffline(result.reason);
    return false;
  }, [isOnline, markOffline, markOnline]);

  useEffect(() => {
    const handleOnline = () => void checkConnection();
    const handleOffline = () => {
      consecutiveFailuresRef.current = OFFLINE_CONFIRMATION_FAILURES;
      markOffline('browser_offline_event');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Single check on mount — no polling when online (save bandwidth)
    void checkConnection();

    // Only poll when offline to detect recovery
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!isOnline) {
      interval = setInterval(() => void checkConnection(), OFFLINE_RECOVERY_POLL_MS);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [checkConnection, isOnline, markOffline]);

  useEffect(() => {
    if (wasOffline) {
      const timeout = setTimeout(() => setWasOffline(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [wasOffline]);

  return { isOnline, connectivity, lastOnline, wasOffline, lastError, offlineDuration, checkConnection };
}

export default useOnlineStatus;
