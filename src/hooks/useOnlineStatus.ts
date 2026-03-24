/**
 * Hook pour détecter et gérer le statut de connexion (online/offline)
 * Uses shared networkHealth with aggressive caching to prevent flooding
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkNetworkHealth } from '@/lib/networkHealth';

interface OnlineStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  wasOffline: boolean;
  lastError: string | null;
  offlineDuration: number;
  checkConnection: () => Promise<boolean>;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(isOnline ? new Date() : null);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [offlineDuration, setOfflineDuration] = useState<number>(0);

  const offlineStartRef = useRef<Date | null>(isOnline ? null : new Date());

  const markOffline = useCallback((reason: string) => {
    if (!offlineStartRef.current) offlineStartRef.current = new Date();
    setIsOnline(false);
    setLastError(reason);
  }, []);

  const markOnline = useCallback(() => {
    const now = new Date();
    if (offlineStartRef.current) {
      setOfflineDuration(Math.floor((now.getTime() - offlineStartRef.current.getTime()) / 1000));
      setWasOffline(true);
      offlineStartRef.current = null;
    }
    setIsOnline(true);
    setLastOnline(now);
    setLastError(null);
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    // Don't force — let the shared cache deduplicate across all hooks
    const result = await checkNetworkHealth({ timeoutMs: 3000, retries: 1 });
    if (result.ok) {
      markOnline();
      return true;
    }
    markOffline(result.reason);
    return false;
  }, [markOffline, markOnline]);

  useEffect(() => {
    const handleOnline = () => void checkConnection();
    const handleOffline = () => markOffline('browser_offline_event');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Single check on mount — no polling when online (save bandwidth)
    void checkConnection();

    // Only poll when offline to detect recovery
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!isOnline) {
      interval = setInterval(() => void checkConnection(), 30000);
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

  return { isOnline, lastOnline, wasOffline, lastError, offlineDuration, checkConnection };
}

export default useOnlineStatus;
