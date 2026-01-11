/**
 * BANNIÈRE OFFLINE VENDEUR
 * S'affiche automatiquement quand l'utilisateur passe en mode hors-ligne
 * 224SOLUTIONS
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Database, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface OfflineBannerProps {
  showSyncInfo?: boolean;
}

export default function OfflineBanner({ showSyncInfo = true }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDismissed, setIsDismissed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Connexion rétablie !', {
        description: 'Synchronisation automatique en cours...'
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsDismissed(false); // Réafficher la bannière
      toast.info('📡 Mode hors-ligne activé', {
        description: 'Vos données seront synchronisées à la reconnexion'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier les données en attente (IndexedDB)
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
              setPendingCount(countRequest.result);
            };
          }
          db.close();
        };
      } catch (e) {
        // Ignorer les erreurs IndexedDB
      }
    };

    if (!isOnline) {
      checkPendingData();
      const interval = setInterval(checkPendingData, 10000);
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  // Ne rien afficher si en ligne ou si fermé
  if (isOnline || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 shadow-lg">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Mode Hors-Ligne</p>
              <p className="text-sm text-white/90">
                {showSyncInfo && pendingCount > 0 
                  ? `${pendingCount} opération(s) en attente de synchronisation`
                  : 'Vos données seront synchronisées à la reconnexion'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showSyncInfo && pendingCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
                <Database className="w-4 h-4" />
                <span>{pendingCount}</span>
              </div>
            )}
            
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.location.reload()}
              className="bg-white text-orange-600 hover:bg-white/90"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Réessayer
            </Button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-white/20 rounded"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
