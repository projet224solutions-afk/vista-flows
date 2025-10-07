/**
 * INDICATEUR DE STATUT RÉSEAU
 * Composant pour afficher le statut de connexion
 * 224SOLUTIONS - Interface Vendeur
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function NetworkStatusIndicator() {
    const { isOnline, isSyncing, syncStats } = useOfflineSync();

    const getStatusColor = () => {
        if (isSyncing) return "bg-blue-500";
        if (!isOnline) return "bg-red-500";
        if (syncStats.pending > 0) return "bg-yellow-500";
        return "bg-green-500";
    };

    const getStatusText = () => {
        if (isSyncing) return "Sync...";
        if (!isOnline) return "Hors ligne";
        if (syncStats.pending > 0) return `${syncStats.pending} en attente`;
        return "En ligne";
    };

    const getStatusIcon = () => {
        if (isSyncing) {
            return <RefreshCw className="w-3 h-3 animate-spin" />;
        }
        return isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />;
    };

    return (
        <Badge
            className={`${getStatusColor()} text-white text-xs px-2 py-1 flex items-center gap-1`}
            variant="default"
        >
            {getStatusIcon()}
            {getStatusText()}
        </Badge>
    );
}
