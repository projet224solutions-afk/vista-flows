/**
 * HOOK USE OFFLINE STATUS - 224SOLUTIONS
 * Détection réseau unifiée via /healthz.json
 * Uses shared cache to prevent network flooding on mobile
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { checkNetworkHealth } from '@/lib/networkHealth';

export type NetworkStatus = 'online' | 'offline' | 'checking';

export interface OfflineStatusState {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  offlineDuration: number;
  connectionType: string | null;
  effectiveType: string | null;
}

interface UseOfflineStatusOptions {
  pingUrl?: string;
  pingInterval?: number;
  onOnline?: () => void;
  onOffline?: () => void;
  enablePing?: boolean;
  showToasts?: boolean;
}

/** Minimum 60s between pings to avoid flooding on mobile */
const MIN_PING_INTERVAL = 60_000;

export function useOfflineStatus(options: UseOfflineStatusOptions = {}) {
  const {
    pingInterval: rawPingInterval = 60_000,
    onOnline,
    onOffline,
    enablePing = true,
    showToasts = true,
  } = options;

  // Enforce minimum interval
  const pingInterval = Math.max(rawPingInterval, MIN_PING_INTERVAL);

  const [state, setState] = useState<OfflineStatusState>(() => ({
    status: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    lastOnlineAt: typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null,
    lastOfflineAt: null,
    offlineDuration: 0,
    connectionType: null,
    effectiveType: null,
  }));

  const lastStatusRef = useRef(state.status);
  const offlineStartRef = useRef<Date | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onOnlineRef = useRef(onOnline);
  const onOfflineRef = useRef(onOffline);
  const showToastsRef = useRef(showToasts);
  onOnlineRef.current = onOnline;
  onOfflineRef.current = onOffline;
  showToastsRef.current = showToasts;

  const getConnectionInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return { connectionType: null, effectiveType: null };
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    return connection
      ? { connectionType: connection.type || null, effectiveType: connection.effectiveType || null }
      : { connectionType: null, effectiveType: null };
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!enablePing) return navigator.onLine;
    // Don't force — shared cache will deduplicate
    const result = await checkNetworkHealth({ timeoutMs: 3000, retries: 1 });
    return result.ok;
  }, [enablePing]);

  const updateStatus = useCallback(async (navigatorOnline: boolean) => {
    if (!navigatorOnline) {
      const now = new Date();
      if (lastStatusRef.current !== 'offline') {
        offlineStartRef.current = now;
        if (showToastsRef.current) {
          toast.warning('Mode hors ligne', {
            description: 'Vos données seront synchronisées au retour de la connexion',
            duration: 5000,
          });
        }
        onOfflineRef.current?.();
      }
      lastStatusRef.current = 'offline';
      const { connectionType, effectiveType } = getConnectionInfo();
      setState(prev => ({
        ...prev, status: 'offline', isOnline: false, isOffline: true,
        lastOfflineAt: prev.lastOfflineAt || now,
        offlineDuration: offlineStartRef.current ? Math.floor((now.getTime() - offlineStartRef.current.getTime()) / 1000) : 0,
        connectionType, effectiveType,
      }));
      return;
    }

    const isReallyOnline = await checkConnection();
    const { connectionType, effectiveType } = getConnectionInfo();
    const now = new Date();

    if (isReallyOnline) {
      if (lastStatusRef.current === 'offline') {
        const dur = offlineStartRef.current ? Math.floor((now.getTime() - offlineStartRef.current.getTime()) / 1000) : 0;
        if (showToastsRef.current) {
          toast.success('Connexion rétablie', {
            description: dur > 60 ? `Hors ligne pendant ${Math.floor(dur / 60)} min` : 'Synchronisation...',
            duration: 4000,
          });
        }
        offlineStartRef.current = null;
        onOnlineRef.current?.();
      }
      lastStatusRef.current = 'online';
      setState(prev => ({
        ...prev, status: 'online', isOnline: true, isOffline: false,
        lastOnlineAt: now, offlineDuration: 0, connectionType, effectiveType,
      }));
    } else {
      if (lastStatusRef.current !== 'offline') {
        offlineStartRef.current = now;
        onOfflineRef.current?.();
      }
      lastStatusRef.current = 'offline';
      setState(prev => ({
        ...prev, status: 'offline', isOnline: false, isOffline: true,
        lastOfflineAt: prev.lastOfflineAt || now, connectionType, effectiveType,
      }));
    }
  }, [checkConnection, getConnectionInfo]);

  const checkNow = useCallback(async () => {
    await updateStatus(navigator.onLine);
  }, [updateStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => void updateStatus(true);
    const handleOffline = () => void updateStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Single initial check
    void updateStatus(navigator.onLine);

    // Polling only when enabled — at enforced minimum interval
    if (enablePing) {
      pingIntervalRef.current = setInterval(() => void updateStatus(navigator.onLine), pingInterval);
    }

    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const handleConnectionChange = () => void updateStatus(navigator.onLine);
    connection?.addEventListener?.('change', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      connection?.removeEventListener?.('change', handleConnectionChange);
    };
  }, [enablePing, pingInterval, updateStatus]);

  return {
    ...state,
    checkNow,
    canSync: state.isOnline,
    isSlowConnection: state.effectiveType === 'slow-2g' || state.effectiveType === '2g',
  };
}

export default useOfflineStatus;
