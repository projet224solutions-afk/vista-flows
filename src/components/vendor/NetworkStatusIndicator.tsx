/**
 * INDICATEUR DE STATUT RÉSEAU AMÉLIORÉ
 * Composant pour afficher le statut de connexion avec cache info
 * 224SOLUTIONS - Interface Vendeur
 */

import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Database, RefreshCw } from "lucide-react";

export default function NetworkStatusIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);
    const [lastCheck, setLastCheck] = useState<Date | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Vérifier les données en attente périodiquement
        const checkPendingData = async () => {
            try {
                const dbRequest = indexedDB.open('224Solutions-OfflineDB', 3);
                dbRequest.onsuccess = () => {
                    const db = dbRequest.result;
                    if (db.objectStoreNames.contains('events')) {
                        const tx = db.transaction('events', 'readonly');
                        const store = tx.objectStore('events');
                        const index = store.index('by-status');
                        const countRequest = index.count('pending');
                        countRequest.onsuccess = () => {
                            setPendingSync(countRequest.result);
                            setLastCheck(new Date());
                        };
                    }
                    db.close();
                };
            } catch (e) {
                // Ignorer
            }
        };

        checkPendingData();
        const interval = setInterval(checkPendingData, 30000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const getStatusColor = () => {
        if (!isOnline) return 'bg-red-500';
        if (pendingSync > 0) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatusText = () => {
        if (!isOnline) return 'Hors ligne';
        if (pendingSync > 0) return `${pendingSync} en attente`;
        return 'En ligne';
    };

    const getIcon = () => {
        if (!isOnline) return <WifiOff className="w-3 h-3" />;
        if (pendingSync > 0) return <RefreshCw className="w-3 h-3 animate-spin" />;
        return <Wifi className="w-3 h-3" />;
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge
                        className={`${getStatusColor()} text-white text-xs px-2 py-1 flex items-center gap-1 cursor-help`}
                        variant="default"
                    >
                        {getIcon()}
                        <span className="hidden sm:inline">{getStatusText()}</span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                            {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                            <span className="font-medium">{isOnline ? 'Connecté' : 'Hors ligne'}</span>
                        </div>
                        {pendingSync > 0 && (
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-yellow-500" />
                                <span>{pendingSync} opération(s) en attente</span>
                            </div>
                        )}
                        {lastCheck && (
                            <div className="text-muted-foreground">
                                Vérifié: {lastCheck.toLocaleTimeString()}
                            </div>
                        )}
                        {!isOnline && (
                            <div className="text-orange-600 mt-1">
                                ⚠️ Les données seront synchronisées à la reconnexion
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
