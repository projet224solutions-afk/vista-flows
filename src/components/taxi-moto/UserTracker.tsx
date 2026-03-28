/**
 * USER TRACKER - 224SOLUTIONS
 * Composant pour tracker la position d'un utilisateur en temps réel
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, X, Navigation, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrackedUser {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  lastLat?: number;
  lastLng?: number;
  lastSeen?: string;
  isOnline?: boolean;
  status?: string;
  vehicleType?: string;
}

export function UserTracker() {
  const [userId, setUserId] = useState('');
  const [trackedUser, setTrackedUser] = useState<TrackedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  /**
   * Rechercher et charger les données d'un utilisateur
   */
  const trackUser = async () => {
    if (!userId.trim()) {
      toast.error('Veuillez saisir un ID utilisateur');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Recherche utilisateur:', userId);

      // 1. Vérifier si c'est un chauffeur taxi
      const { data: driverData, error: driverError } = await supabase
        .from('taxi_drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (driverData) {
        console.log('✅ Chauffeur trouvé:', driverData);
        
        // Charger le profil pour le nom
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', userId)
          .single();

        setTrackedUser({
          id: userId,
          firstName: profile?.first_name,
          lastName: profile?.last_name,
          phone: profile?.phone,
          lastLat: driverData.last_lat,
          lastLng: driverData.last_lng,
          lastSeen: driverData.last_seen,
          isOnline: driverData.is_online,
          status: driverData.status,
          vehicleType: driverData.vehicle_type
        });

        setIsTracking(true);
        toast.success('🎯 Utilisateur trouvé - Tracking actif');
        return;
      }

      // 2. Sinon chercher dans les profils généraux
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        console.log('✅ Utilisateur trouvé:', profileData);
        setTrackedUser({
          id: userId,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          phone: profileData.phone
        });
        setIsTracking(true);
        toast.success('👤 Utilisateur trouvé');
        return;
      }

      // Aucun utilisateur trouvé
      toast.error('❌ Utilisateur introuvable');
      console.error('Utilisateur non trouvé');

    } catch (error) {
      console.error('❌ Erreur lors du tracking:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Arrêter le tracking
   */
  const stopTracking = () => {
    setTrackedUser(null);
    setIsTracking(false);
    setUserId('');
    toast.info('⏸️ Tracking arrêté');
  };

  /**
   * S'abonner aux mises à jour en temps réel
   */
  useEffect(() => {
    if (!trackedUser?.id || !isTracking) return;

    console.log('📡 Démarrage du tracking temps réel pour:', trackedUser.id);

    // S'abonner aux changements du conducteur
    const channel = supabase
      .channel(`user-tracking-${trackedUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'taxi_drivers',
          filter: `user_id=eq.${trackedUser.id}`
        },
        (payload) => {
          console.log('📍 Position mise à jour:', payload.new);
          const updated = payload.new as any;
          setTrackedUser(prev => prev ? {
            ...prev,
            lastLat: updated.last_lat,
            lastLng: updated.last_lng,
            lastSeen: updated.last_seen,
            isOnline: updated.is_online,
            status: updated.status
          } : null);
          toast.success('📍 Position mise à jour');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackedUser?.id, isTracking]);

  /**
   * Ouvrir Google Maps avec la position
   */
  const openInMaps = () => {
    if (!trackedUser?.lastLat || !trackedUser?.lastLng) {
      toast.error('Position GPS non disponible');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${trackedUser.lastLat},${trackedUser.lastLng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /**
   * Formater la date de dernière vue
   */
  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  return (
    <div className="space-y-4">
        {/* Formulaire de recherche */}
        {!isTracking && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="ID Utilisateur (UUID)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && trackUser()}
              />
              <Button 
                onClick={trackUser} 
                disabled={loading}
                className="shrink-0"
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Recherche...' : 'Tracker'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Entrez l'ID d'un utilisateur pour voir sa position en temps réel
            </p>
          </div>
        )}

        {/* Informations de l'utilisateur tracké */}
        {trackedUser && isTracking && (
          <div className="space-y-3">
            {/* En-tête avec nom et badges */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <h3 className="font-bold text-lg">
                    {trackedUser.firstName || 'Utilisateur'} {trackedUser.lastName || ''}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono mb-2">
                  ID: {trackedUser.id}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {trackedUser.isOnline !== undefined && (
                    <Badge variant={trackedUser.isOnline ? "default" : "secondary"}>
                      {trackedUser.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
                    </Badge>
                  )}
                  {trackedUser.status && (
                    <Badge variant="outline">
                      {trackedUser.status === 'available' && '✅ Disponible'}
                      {trackedUser.status === 'on_trip' && '🚗 En course'}
                      {trackedUser.status === 'offline' && '⏸️ Hors ligne'}
                    </Badge>
                  )}
                  {trackedUser.vehicleType && (
                    <Badge variant="outline">
                      🏍️ {trackedUser.vehicleType}
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={stopTracking}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Contact */}
            {trackedUser.phone && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                <span className="text-muted-foreground">📱</span>
                <span className="font-medium">{trackedUser.phone}</span>
              </div>
            )}

            {/* Position GPS */}
            {trackedUser.lastLat && trackedUser.lastLng ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-900">
                    📍 Position GPS
                  </span>
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <Clock className="w-3 h-3" />
                    {formatLastSeen(trackedUser.lastSeen)}
                  </div>
                </div>
                
                <div className="text-xs font-mono text-green-800 bg-white/50 p-2 rounded border border-green-100">
                  Lat: {trackedUser.lastLat.toFixed(6)}<br />
                  Lng: {trackedUser.lastLng.toFixed(6)}
                </div>

                <Button 
                  onClick={openInMaps}
                  className="w-full"
                  size="sm"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Ouvrir dans Google Maps
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-sm text-yellow-800">
                  ⚠️ Position GPS non disponible
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  L'utilisateur n'a pas encore partagé sa position
                </p>
              </div>
            )}

            {/* Indicateur de tracking actif */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <p className="text-xs text-blue-800 font-medium flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                Tracking en temps réel actif
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
