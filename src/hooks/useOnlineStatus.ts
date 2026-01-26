/**
 * Hook pour détecter et gérer le statut de connexion (online/offline)
 * 
 * @example
 * const { isOnline, lastOnline, wasOffline } = useOnlineStatus();
 * 
 * if (!isOnline) {
 *   return <OfflineBanner />;
 * }
 */

import { useState, useEffect, useCallback } from 'react';

interface OnlineStatus {
  /** true si connecté à internet */
  isOnline: boolean;
  /** Timestamp de la dernière connexion */
  lastOnline: Date | null;
  /** true si l'utilisateur était offline depuis le dernier render */
  wasOffline: boolean;
  /** Dernière erreur de connexion */
  lastError: string | null;
  /** Durée hors ligne en secondes */
  offlineDuration: number;
  /** Forcer une vérification */
  checkConnection: () => Promise<boolean>;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(
    isOnline ? new Date() : null
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [offlineStart, setOfflineStart] = useState<Date | null>(null);
  const [offlineDuration, setOfflineDuration] = useState<number>(0);

  // Vérifier la connexion réelle (pas juste navigator.onLine)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Essayer de fetch un petit fichier pour vérifier la connexion réelle
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/favicon.png', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        setIsOnline(true);
        setLastOnline(new Date());
        setLastError(null);
        return true;
      }
      
      setLastError('Serveur inaccessible');
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setLastError(errorMessage);
      
      // Si c'est une erreur réseau, on est probablement offline
      if (errorMessage.includes('abort') || errorMessage.includes('network')) {
        setIsOnline(false);
      }
      
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network] Connexion rétablie');
      setIsOnline(true);
      setLastOnline(new Date());
      setWasOffline(true);
      setLastError(null);
      
      // Calculer la durée offline
      if (offlineStart) {
        const duration = Math.floor((Date.now() - offlineStart.getTime()) / 1000);
        setOfflineDuration(duration);
        setOfflineStart(null);
        
        // Notification si offline depuis plus de 30 secondes
        if (duration > 30 && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Connexion rétablie', {
            body: `Vous étiez hors ligne pendant ${formatDuration(duration)}`,
            icon: '/icon-192.png',
            tag: 'connection-restored'
          });
        }
      }
    };

    const handleOffline = () => {
      console.log('[Network] Connexion perdue');
      setIsOnline(false);
      setOfflineStart(new Date());
      setLastError('Connexion perdue');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérification périodique de la connexion (toutes les 30 secondes si offline)
    let interval: NodeJS.Timeout;
    
    if (!isOnline) {
      interval = setInterval(() => {
        checkConnection();
      }, 30000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (interval) clearInterval(interval);
    };
  }, [isOnline, offlineStart, checkConnection]);

  // Reset wasOffline après un certain temps
  useEffect(() => {
    if (wasOffline) {
      const timeout = setTimeout(() => setWasOffline(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [wasOffline]);

  return {
    isOnline,
    lastOnline,
    wasOffline,
    lastError,
    offlineDuration,
    checkConnection
  };
}

// Formater la durée
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? 's' : ''}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} heure${hours > 1 ? 's' : ''}`;
}

export default useOnlineStatus;
