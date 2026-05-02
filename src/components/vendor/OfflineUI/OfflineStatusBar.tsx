/**
 * Offline Status Bar - Barre de statut mode offline
 * 224SOLUTIONS - Mode Offline Avancé
 *
 * Affiche le statut online/offline et les informations de sync
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, _AlertCircle, Clock } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

interface OfflineStatusBarProps {
  className?: string;
  showDetails?: boolean;
  pendingSyncCount?: number;
  lastSyncTime?: Date;
}

export function OfflineStatusBar({
  className,
  showDetails = true,
  pendingSyncCount = 0,
  lastSyncTime
}: OfflineStatusBarProps) {
  const { isOnline, wasOffline, _lastOnline, offlineDuration } = useOnlineStatus();

  // Afficher brièvement la notification de reconnexion
  if (isOnline && wasOffline) {
    return (
      <div
        className={cn(
          'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
          'py-2 px-4 rounded-lg shadow-lg',
          'animate-in slide-in-from-top duration-300',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">Connexion rétablie</p>
              {offlineDuration > 0 && (
                <p className="text-xs opacity-90">
                  Hors ligne pendant {formatDuration(offlineDuration)}
                </p>
              )}
            </div>
          </div>
          {pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Sync en cours ({pendingSyncCount})</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Barre de statut offline
  if (!isOnline) {
    return (
      <div
        className={cn(
          'bg-gradient-to-r from-orange-500 to-red-500 text-white',
          'py-2.5 px-4 rounded-lg shadow-lg border-l-4 border-white/30',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <WifiOff className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-sm">Mode hors ligne</p>
              {showDetails && (
                <p className="text-xs opacity-90">
                  Fonctionnalités limitées - Vos données seront synchronisées automatiquement
                </p>
              )}
            </div>
          </div>

          {showDetails && pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">{pendingSyncCount} en attente</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Barre de statut online (minimaliste)
  if (!showDetails) return null;

  return (
    <div
      className={cn(
        'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
        'py-1.5 px-4 rounded-lg',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-green-500" />
          <span>En ligne</span>
        </div>

        {lastSyncTime && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-3 h-3" />
            <span>Dernière sync: {formatSyncTime(lastSyncTime)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Badge de statut compact
 */
export function OfflineStatusBadge({ className }: { className?: string }) {
  const { isOnline } = useOnlineStatus();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        isOnline
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        className
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>En ligne</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Hors ligne</span>
        </>
      )}
    </div>
  );
}

/**
 * Indicateur de sync en cours
 */
export function SyncIndicator({
  syncing,
  count,
  className
}: {
  syncing: boolean;
  count?: number;
  className?: string;
}) {
  if (!syncing) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'text-xs font-medium',
        className
      )}
    >
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      <span>Synchronisation{count ? ` (${count})` : '...'}</span>
    </div>
  );
}

/**
 * Formater la durée en texte lisible
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

/**
 * Formater l'heure de sync
 */
function formatSyncTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'à l\'instant';
  if (diffMinutes < 60) return `il y a ${diffMinutes}min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default OfflineStatusBar;
