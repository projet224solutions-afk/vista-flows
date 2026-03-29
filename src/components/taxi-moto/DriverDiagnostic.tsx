/**
 * COMPOSANT DIAGNOSTIC - TAXI MOTO
 * Affiche l'état de la connexion Realtime et du profil conducteur
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, AlertCircle, Wifi } from "lucide-react";

interface DriverDiagnosticProps {
  driverId: string | null;
  isOnline: boolean;
  hasAccess: boolean;
  userId: string | undefined;
}

export function DriverDiagnostic({ driverId, isOnline, hasAccess, userId }: DriverDiagnosticProps) {
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected');
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [testChannel, setTestChannel] = useState<any>(null);

  useEffect(() => {
    if (!driverId || !isOnline) return;

    console.log('🔬 [Diagnostic] Création channel de test');

    // Canal de test pour vérifier la connexion
    const channel = supabase
      .channel(`diagnostic-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taxi_trips',
          filter: `status=eq.requested`
        },
        (payload) => {
          console.log('🔬 [Diagnostic] Événement reçu:', payload);
          setLastNotification({
            timestamp: new Date().toLocaleTimeString(),
            data: payload.new
          });
        }
      )
      .subscribe((status) => {
        console.log('🔬 [Diagnostic] Status:', status);
        setRealtimeStatus(status);
      });

    setTestChannel(channel);

    return () => {
      console.log('🔬 [Diagnostic] Nettoyage');
      supabase.removeChannel(channel);
    };
  }, [driverId, isOnline]);

  const statusColor = {
    'SUBSCRIBED': 'bg-green-500',
    'CHANNEL_ERROR': 'bg-red-500',
    'TIMED_OUT': 'bg-orange-500',
    'CLOSED': 'bg-gray-500',
    'disconnected': 'bg-gray-400'
  }[realtimeStatus] || 'bg-gray-400';

  const statusIcon = {
    'SUBSCRIBED': <CheckCircle className="h-4 w-4" />,
    'CHANNEL_ERROR': <XCircle className="h-4 w-4" />,
    'TIMED_OUT': <AlertCircle className="h-4 w-4" />,
  }[realtimeStatus] || <Wifi className="h-4 w-4" />;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          🔬 Diagnostic Conducteur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span>User ID:</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {userId ? `${userId.substring(0, 8)}...` : 'N/A'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span>Driver ID:</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {driverId ? `${driverId.substring(0, 8)}...` : '❌ Non défini'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span>En ligne:</span>
          <Badge variant={isOnline ? "default" : "secondary"}>
            {isOnline ? '✅ OUI' : '❌ NON'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span>Abonnement:</span>
          <Badge variant={hasAccess ? "default" : "destructive"}>
            {hasAccess ? '✅ Actif' : '❌ Inactif'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span>Realtime:</span>
          <Badge className={`${statusColor} text-white flex items-center gap-1`}>
            {statusIcon}
            {realtimeStatus}
          </Badge>
        </div>

        {lastNotification && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200">
            <div className="font-semibold text-green-700 dark:text-green-300">
              ✅ Dernière notification:
            </div>
            <div className="text-[10px] text-green-600 dark:text-green-400 mt-1">
              {lastNotification.timestamp}
            </div>
            <div className="text-[10px] text-green-600 dark:text-green-400">
              Course: {lastNotification.data?.ride_code || 'N/A'}
            </div>
          </div>
        )}

        {realtimeStatus === 'SUBSCRIBED' && !lastNotification && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 text-[10px] text-blue-700 dark:text-blue-300">
            ✅ Connecté et en attente de courses
          </div>
        )}

        {realtimeStatus === 'CHANNEL_ERROR' && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 text-[10px] text-red-700 dark:text-red-300">
            ❌ Erreur de connexion Realtime. Rechargez la page.
          </div>
        )}

        {!driverId && (
          <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950 rounded border border-orange-200 text-[10px] text-orange-700 dark:text-orange-300">
            ⚠️ Driver ID non défini. Vérifiez votre profil.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
