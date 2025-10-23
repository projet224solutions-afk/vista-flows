/**
 * INDICATEUR DE STATUT RÉSEAU
 * Composant simple pour afficher le statut de connexion
 * 224SOLUTIONS - Interface Vendeur
 */

import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkStatusIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <Badge
            className={`${isOnline ? 'bg-green-500' : 'bg-red-500'} text-white text-xs px-2 py-1 flex items-center gap-1`}
            variant="default"
        >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? "En ligne" : "Hors ligne"}
        </Badge>
    );
}
