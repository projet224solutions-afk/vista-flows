/**
 * HOOK USE OFFLINE STATUS - 224SOLUTIONS
 * Gestion du statut réseau avec détection fine et synchronisation automatique
 *
 * Fonctionnalités:
 * - Détection du statut online/offline
 * - Ping de vérification de connexion réelle (pas juste navigator.onLine)
 * - Déclenchement automatique de la synchronisation au retour en ligne
 * - Événements pour les composants qui doivent réagir aux changements
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export type NetworkStatus = 'online' | 'offline' | 'checking';

export interface OfflineStatusState {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  offlineDuration: number; // en secondes
  connectionType: string | null;
  effectiveType: string | null; // 'slow-2g', '2g', '3g', '4g'
}

interface UseOfflineStatusOptions {
  pingUrl?: string;
  pingInterval?: number; // en ms
  onOnline?: () => void;
  onOffline?: () => void;
  enablePing?: boolean;
  showToasts?: boolean;
}

const DEFAULT_PING_URL = 'https://www.google.com/generate_204';
const DEFAULT_PING_INTERVAL = 30000; // 30 secondes

export function useOfflineStatus(options: UseOfflineStatusOptions = {}) {
  const {
    pingUrl = DEFAULT_PING_URL,
    pingInterval = DEFAULT_PING_INTERVAL,
    onOnline,
    onOffline,
    enablePing = false,
    showToasts = true
  } = options;

  const [state, setState] = useState<OfflineStatusState>(() => ({
    status: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    lastOnlineAt: typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null,
    lastOfflineAt: null,
    offlineDuration: 0,
    connectionType: null,
    effectiveType: null
  }));

  const lastStatusRef = useRef(state.status);
  const offlineStartRef = useRef<Date | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Obtenir les infos de connexion si disponibles
  const getConnectionInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return { connectionType: null, effectiveType: null };

    // NetworkInformation API (non-standard, mais supporté par Chrome/Edge)
    const nav = navigator as Record<string, unknown>;
    const connection = (nav.connection || nav.mozConnection || nav.webkitConnection) as {
      type?: string;
      effectiveType?: string;
    } | undefined;

    if (connection) {
      return {
        connectionType: connection.type || null,
        effectiveType: connection.effectiveType || null
      };
    }

    return { connectionType: null, effectiveType: null };
  }, []);

  // Vérifier la connexion avec un ping réel
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!enablePing) {
      return navigator.onLine;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(pingUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }, [enablePing, pingUrl]);

  // Mettre à jour le statut
  const updateStatus = useCallback(async (navigatorOnline: boolean) => {
    setState(prev => ({ ...prev, status: 'checking' }));

    // Si navigator dit offline, c'est définitif
    if (!navigatorOnline) {
      const now = new Date();
      if (lastStatusRef.current !== 'offline') {
        offlineStartRef.current = now;

        if (showToasts) {
          toast.warning('Mode hors ligne', {
            description: 'Vos données seront synchronisées au retour de la connexion',
            duration: 5000
          });
        }

        onOffline?.();
      }

      lastStatusRef.current = 'offline';

      const { connectionType, effectiveType } = getConnectionInfo();

      setState(prev => ({
        ...prev,
        status: 'offline',
        isOnline: false,
        isOffline: true,
        lastOfflineAt: prev.lastOfflineAt || now,
        offlineDuration: offlineStartRef.current
          ? Math.floor((now.getTime() - offlineStartRef.current.getTime()) / 1000)
          : 0,
        connectionType,
        effectiveType
      }));

      return;
    }

    // Navigator dit online, vérifier avec un ping si activé
    const isReallyOnline = await checkConnection();
    const { connectionType, effectiveType } = getConnectionInfo();
    const now = new Date();

    if (isReallyOnline) {
      if (lastStatusRef.current === 'offline') {
        const offlineDuration = offlineStartRef.current
          ? Math.floor((now.getTime() - offlineStartRef.current.getTime()) / 1000)
          : 0;

        if (showToasts) {
          toast.success('Connexion rétablie', {
            description: offlineDuration > 60
              ? `Hors ligne pendant ${Math.floor(offlineDuration / 60)} min. Synchronisation en cours...`
              : 'Synchronisation en cours...',
            duration: 4000
          });
        }

        offlineStartRef.current = null;
        onOnline?.();
      }

      lastStatusRef.current = 'online';

      setState(prev => ({
        ...prev,
        status: 'online',
        isOnline: true,
        isOffline: false,
        lastOnlineAt: now,
        offlineDuration: 0,
        connectionType,
        effectiveType
      }));
    } else {
      // Navigator dit online mais le ping échoue
      if (lastStatusRef.current !== 'offline') {
        offlineStartRef.current = now;
        onOffline?.();
      }

      lastStatusRef.current = 'offline';

      setState(prev => ({
        ...prev,
        status: 'offline',
        isOnline: false,
        isOffline: true,
        lastOfflineAt: prev.lastOfflineAt || now,
        connectionType,
        effectiveType
      }));
    }
  }, [checkConnection, getConnectionInfo, onOffline, onOnline, showToasts]);

  // Forcer une vérification manuelle
  const checkNow = useCallback(async () => {
    await updateStatus(navigator.onLine);
  }, [updateStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handlers pour les événements online/offline
    const handleOnline = () => updateStatus(true);
    const handleOffline = () => updateStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérification initiale
    updateStatus(navigator.onLine);

    // Ping périodique si activé
    if (enablePing) {
      pingIntervalRef.current = setInterval(() => {
        updateStatus(navigator.onLine);
      }, pingInterval);
    }

    // Écouter les changements de connexion
    const nav = navigator as Record<string, unknown>;
    const connection = (nav.connection || nav.mozConnection || nav.webkitConnection) as {
      addEventListener?: (event: string, handler: () => void) => void;
      removeEventListener?: (event: string, handler: () => void) => void;
    } | undefined;

    const handleConnectionChange = () => updateStatus(navigator.onLine);

    if (connection?.addEventListener) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      if (connection?.removeEventListener) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [enablePing, pingInterval, updateStatus]);

  return {
    ...state,
    checkNow,
    // Helpers pratiques
    canSync: state.isOnline,
    isSlowConnection: state.effectiveType === 'slow-2g' || state.effectiveType === '2g'
  };
}

export default useOfflineStatus;
