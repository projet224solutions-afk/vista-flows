/**
 * INDICATEUR DE STATUT RÉSEAU COMPACT
 * Affiche le statut de connexion et permet la sync manuelle
 * 224SOLUTIONS - Interface Vendeur
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { toast } from 'sonner';

export default function NetworkStatusIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    const checkPendingData = useCallback(async () => {
        try {
            const dbRequest = indexedDB.open('224Solutions-OfflineDB', 3);
            dbRequest.onsuccess = () => {
                const db = dbRequest.result;
                if (db.objectStoreNames.contains('events')) {
                    const tx = db.transaction('events', 'readonly');
                    const store = tx.objectStore('events');
                    const index = store.index('by-status');
                    const pendingCountRequest = index.count('pending');
                    const failedCountRequest = index.count('failed');

                    pendingCountRequest.onsuccess = () => {
                        failedCountRequest.onsuccess = () => {
                            setPendingSync((pendingCountRequest.result || 0) + (failedCountRequest.result || 0));
                        };
                    };
                }
                db.close();
            };
        } catch {
            // Ignorer
        }
    }, []);

    // Sync manuelle: marquer les events pending comme synced si on est en ligne
    const forceSyncPending = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;

        setIsSyncing(true);
        try {
            const { default: offlineDB } = await import('@/lib/offlineDB');
            const pendingEvents = await offlineDB.getPendingEvents();

            if (pendingEvents.length === 0) {
                setPendingSync(0);
                return;
            }

            // Déclencher la synchronisation via useOfflineSync en émettant un événement custom
            window.dispatchEvent(new CustomEvent('force-offline-sync'));

            // Attendre un peu puis re-vérifier
            await new Promise(resolve => setTimeout(resolve, 3000));
            await checkPendingData();

            toast.success('Synchronisation lancée');
        } catch (error) {
            console.error('Erreur sync:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, checkPendingData]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setTimeout(() => forceSyncPending(), 2000);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        checkPendingData();
        const interval = setInterval(checkPendingData, 15000);

        // Auto-sync au montage si en ligne
        if (navigator.onLine) {
            setTimeout(() => forceSyncPending(), 3000);
        }

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkPendingData, forceSyncPending]);

    // Masquer si tout va bien
    if (isOnline && pendingSync === 0 && !isSyncing) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        onClick={isOnline && pendingSync > 0 ? forceSyncPending : undefined}
                        className={`${
                            isSyncing ? 'bg-blue-500' : !isOnline ? 'bg-destructive' : 'bg-yellow-500'
                        } text-white text-[9px] leading-none px-1.5 py-0.5 flex items-center gap-0.5 ${
                            isOnline && pendingSync > 0 ? 'cursor-pointer hover:opacity-80' : 'cursor-help'
                        }`}
                        variant="default"
                    >
                        {isSyncing ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : !isOnline ? (
                            <WifiOff className="w-2.5 h-2.5" />
                        ) : (
                            <RefreshCw className="w-2.5 h-2.5" />
                        )}
                        <span>
                            {isSyncing ? 'Sync' : !isOnline ? 'Off' : pendingSync.toString()}
                        </span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            {isOnline ? (
                                <Wifi className="w-3 h-3 text-green-500" />
                            ) : (
                                <WifiOff className="w-3 h-3 text-destructive" />
                            )}
                            <span className="font-medium">{isOnline ? 'Connecté' : 'Hors ligne'}</span>
                        </div>
                        {pendingSync > 0 && (
                            <p className="text-muted-foreground">
                                {pendingSync} en attente — {isOnline ? 'Cliquez pour synchroniser' : 'Sync à la reconnexion'}
                            </p>
                        )}
                        {isSyncing && <p className="text-blue-500">Synchronisation...</p>}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}