/**
 * Sync Progress Indicator - Indicateur de progression de synchronisation
 * 224SOLUTIONS - Mode Offline AvancÃ©
 */

import React from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface SyncProgressIndicatorProps {
  total: number;
  synced: number;
  failed: number;
  pending: number;
  className?: string;
  showDetails?: boolean;
}

export function SyncProgressIndicator({
  total,
  synced,
  failed,
  pending,
  className,
  showDetails = true
}: SyncProgressIndicatorProps) {
  const isSyncing = pending > 0;
  const progressPercentage = total > 0 ? Math.round((synced / total) * 100) : 0;

  if (total === 0 && !isSyncing) return null;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* En-tÃªte */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="font-medium text-sm">Synchronisation en cours</span>
            </>
          ) : failed > 0 ? (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-sm">Synchronisation terminÃ©e (avec erreurs)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-primary-orange-500" />
              <span className="font-medium text-sm">Synchronisation terminÃ©e</span>
            </>
          )}
        </div>

        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {synced}/{total}
        </span>
      </div>

      {/* Barre de progression */}
      <Progress value={progressPercentage} className="mb-3" />

      {/* DÃ©tails */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-primary-orange-600 dark:text-primary-orange-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{synced} SynchronisÃ©{synced > 1 ? 's' : ''}</span>
          </div>

          {pending > 0 && (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{pending} En attente</span>
            </div>
          )}

          {failed > 0 && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>{failed} Ã‰chouÃ©{failed > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Indicateur compact de sync (pour header/toolbar)
 */
export function CompactSyncIndicator({
  pending,
  className
}: {
  pending: number;
  className?: string;
}) {
  if (pending === 0) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
          'bg-primary-orange-100 text-primary-orange-700 dark:bg-primary-orange-900/30 dark:text-primary-orange-400',
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3" />
        <span>Tout est synchronisÃ©</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        className
      )}
    >
      <RefreshCw className="w-3 h-3 animate-spin" />
      <span>{pending} en attente</span>
    </div>
  );
}

/**
 * Toast de sync avec progression
 */
export function SyncToast({
  entity,
  progress,
  total,
  status
}: {
  entity: string;
  progress: number;
  total: number;
  status: 'syncing' | 'success' | 'error';
}) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {status === 'syncing' && <Loader2 className="w-4 h-4 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="w-4 h-4 text-primary-orange-500" />}
        {status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}

        <span className="font-medium">
          {status === 'syncing' && `Synchronisation ${entity}...`}
          {status === 'success' && `${entity} synchronisÃ©`}
          {status === 'error' && `Erreur sync ${entity}`}
        </span>
      </div>

      {status === 'syncing' && (
        <>
          <Progress value={percentage} className="h-1" />
          <p className="text-xs text-gray-500">
            {progress} sur {total} ({percentage}%)
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Liste dÃ©taillÃ©e des items en cours de sync
 */
export function SyncDetailsList({
  items,
  className
}: {
  items: Array<{
    id: string;
    entity: string;
    status: 'pending' | 'syncing' | 'success' | 'error';
    retryCount?: number;
  }>;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-primary-orange-500" />
        <p>Aucune synchronisation en attente</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            {item.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
            {item.status === 'syncing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-primary-orange-500" />}
            {item.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}

            <div>
              <p className="text-sm font-medium">{item.entity}</p>
              {item.retryCount !== undefined && item.retryCount > 0 && (
                <p className="text-xs text-gray-500">
                  Tentative {item.retryCount}
                </p>
              )}
            </div>
          </div>

          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  );
}

/**
 * Badge de statut
 */
function StatusBadge({ status }: { status: 'pending' | 'syncing' | 'success' | 'error' }) {
  const variants = {
    pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    syncing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    success: 'bg-primary-orange-100 text-primary-orange-700 dark:bg-primary-orange-900/30 dark:text-primary-orange-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const labels = {
    pending: 'En attente',
    syncing: 'En cours',
    success: 'SynchronisÃ©',
    error: 'Ã‰chec'
  };

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', variants[status])}>
      {labels[status]}
    </span>
  );
}

export default SyncProgressIndicator;
