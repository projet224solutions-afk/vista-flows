/**
 * USER TRACKER - 224SOLUTIONS
 * Composant pour tracker la position d'un utilisateur en temps réel
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Navigation, Clock, User, Radio, Store, Phone, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTrackLocation } from "@/hooks/useLiveLocation";
import { extractUserId, formatElapsed, type SharedProfile } from "@/lib/liveLocation";

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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

interface UserTrackerProps {
  /** Nom du chauffeur, transmis au client dans la notification "taxi en route". */
  driverName?: string;
}

export function UserTracker({ driverName }: UserTrackerProps = {}) {
  const [userId, setUserId] = useState('');
  const [trackedUser, setTrackedUser] = useState<TrackedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  // Le chauffeur a vu la fiche du client et confirmé la localisation
  const [localizationConfirmed, setLocalizationConfirmed] = useState(false);
  // Fiche du client chargée DIRECTEMENT par le chauffeur (profils publics, fiable)
  const [localProfile, setLocalProfile] = useState<SharedProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Position GPS du chauffeur (origine de l'itinéraire vers le client)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Suivi de la position partagée. On s'abonne pour recevoir la fiche + la position,
  // mais on ne notifie le client (taxi_enroute) qu'APRÈS confirmation de la fiche.
  const live = useTrackLocation(isTracking ? trackedUser?.id ?? null : null, {
    announceAsTaxi: true,
    notifyClient: localizationConfirmed,
    driverName,
    driverPosition: myLocation,
  });

  // La position en direct (broadcast) prime sur la dernière position connue en base
  const displayLat = live.position?.lat ?? trackedUser?.lastLat;
  const displayLng = live.position?.lng ?? trackedUser?.lastLng;
  const isLive = !!live.position;

  // Évite de rouvrir la navigation externe à chaque mise à jour de position
  const navOpenedRef = useRef(false);

  // Suivre la position du chauffeur tant que le tracking est actif
  useEffect(() => {
    if (!isTracking || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* GPS chauffeur indisponible : itinéraire centré sur le client */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  // Réinitialiser le garde d'ouverture quand on relance/arrête un suivi
  useEffect(() => {
    if (!isTracking) navOpenedRef.current = false;
  }, [isTracking]);

  // Feedback : le client a confirmé ou refusé le partage de sa position
  useEffect(() => {
    if (live.clientResponse === 'confirmed') {
      toast.success('✅ Le client a confirmé sa position');
    } else if (live.clientResponse === 'declined') {
      toast.warning('Le client a annulé le partage de sa position');
    }
  }, [live.clientResponse]);

  const hasClientPosition = displayLat !== undefined && displayLng !== undefined;

  // Carte d'itinéraire intégrée (s'ouvre automatiquement dès la localisation)
  const embedSrc = hasClientPosition
    ? (myLocation
        ? `https://maps.google.com/maps?saddr=${myLocation.lat},${myLocation.lng}&daddr=${displayLat},${displayLng}&output=embed`
        : `https://maps.google.com/maps?q=${displayLat},${displayLng}&z=16&output=embed`)
    : null;

  // Lien de navigation GPS turn-by-turn (application Google Maps)
  const navUrl = hasClientPosition
    ? (myLocation
        ? `https://www.google.com/maps/dir/?api=1&origin=${myLocation.lat},${myLocation.lng}&destination=${displayLat},${displayLng}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${displayLat},${displayLng}&travelmode=driving`)
    : null;

  // Ouvre automatiquement la navigation GPS une seule fois dès que le client est localisé
  useEffect(() => {
    if (isTracking && hasClientPosition && navUrl && !navOpenedRef.current) {
      navOpenedRef.current = true;
      try {
        window.open(navUrl, '_blank', 'noopener');
      } catch { /* popup bloquée : l'itinéraire reste visible dans la carte intégrée */ }
    }
  }, [isTracking, hasClientPosition, navUrl]);

  /**
   * Rechercher et charger les données d'un utilisateur
   */
  /**
   * Charge directement la fiche du client (profil public + boutique éventuelle)
   * à partir de l'ID saisi — fiable, sans dépendre de la diffusion du client.
   */
  const loadClientProfile = async (rawId: string) => {
    setLocalProfile(null);
    const isUuid = UUID_RE.test(rawId);
    const sel = 'id, first_name, last_name, full_name, phone, avatar_url, city, country, custom_id';
    let prof: any = null;
    try {
      const query = isUuid
        ? supabase.from('profiles').select(sel).eq('id', rawId)
        : supabase.from('profiles').select(sel).ilike('custom_id', rawId);
      const { data } = await query.maybeSingle();
      prof = data;
    } catch { /* profil non lisible → on retombera sur la diffusion du client */ }

    if (!prof) return;

    let vendor: any = null;
    try {
      const { data } = await supabase
        .from('vendors')
        .select('business_name, address, city, neighborhood, phone, logo_url')
        .eq('user_id', prof.id)
        .maybeSingle();
      vendor = data;
    } catch { /* pas de boutique */ }

    const isShop = !!vendor;
    setLocalProfile({
      name: prof.full_name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Client',
      phone: vendor?.phone || prof.phone || undefined,
      address: isShop
        ? [vendor?.address, vendor?.neighborhood, vendor?.city].filter(Boolean).join(', ') || undefined
        : [prof.city, prof.country].filter(Boolean).join(', ') || undefined,
      photo: vendor?.logo_url || prof.avatar_url || undefined,
      customId: prof.custom_id || undefined,
      isShop,
      shopName: vendor?.business_name || undefined,
    });
  };

  const trackUser = async () => {
    // Accepte un ID brut, un UUID collé ou un lien …/track/<id>
    const raw = extractUserId(userId);
    if (!raw) {
      toast.error('Veuillez saisir un ID ou un lien de suivi');
      return;
    }

    // Le canal de partage est keyé par l'identifiant que le client diffuse
    // (son custom_id type CLT0005, ou son UUID). On l'utilise tel quel.
    const id = raw;
    setLocalizationConfirmed(false); // on doit d'abord revoir la fiche du client
    setProfileLoading(true);
    void loadClientProfile(id);      // tente une lecture directe (cas UUID)
    setLoading(true);
    try {
      console.log('🔍 Recherche utilisateur:', id);

      // 1. Vérifier si c'est un chauffeur taxi
      const { data: driverData, error: _driverError } = await supabase
        .from('taxi_drivers')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();

      if (driverData) {
        console.log('✅ Chauffeur trouvé:', driverData);

        // Charger le profil pour le nom
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', id)
          .single();

        setTrackedUser({
          id,
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
      const { data: profileData, error: _profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileData) {
        console.log('✅ Utilisateur trouvé:', profileData);
        setTrackedUser({
          id,
          firstName: profileData.first_name,
          lastName: profileData.last_name,
          phone: profileData.phone
        });
        setIsTracking(true);
        toast.success('👤 Client trouvé — en attente de sa position partagée');
        return;
      }

      // 3. Profil introuvable mais on peut quand même suivre la position
      //    partagée en direct (le client a peut-être juste donné son ID/lien).
      setTrackedUser({ id });
      setIsTracking(true);
      toast.success('📡 Suivi de la position en direct activé');

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
    setLocalizationConfirmed(false);
    setLocalProfile(null);
    setUserId('');
    toast.info('⏸️ Tracking arrêté');
  };

  // Fiche affichée : priorité à la lecture directe (UUID), repli sur la diffusion du client
  const clientProfile = localProfile || live.clientProfile;

  // Stoppe le "Chargement…" dès que la fiche arrive, ou après un délai de garde
  useEffect(() => {
    if (clientProfile) { setProfileLoading(false); return; }
    if (!isTracking) return;
    const t = setTimeout(() => setProfileLoading(false), 8000);
    return () => clearTimeout(t);
  }, [clientProfile, isTracking]);

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
    if (!navUrl) {
      toast.error('Position GPS non disponible');
      return;
    }
    window.open(navUrl, '_blank', 'noopener');
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
                placeholder="ID du client ou lien de suivi"
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
                {loading ? 'Recherche...' : 'Suivre'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Collez l'ID ou le lien que le client vous a communiqué pour voir sa position en temps réel
            </p>
          </div>
        )}

        {/* Étape 1 : fiche du client/boutique à confirmer AVANT la localisation */}
        {isTracking && !localizationConfirmed && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                {clientProfile?.isShop
                  ? <Store className="w-5 h-5 text-primary" />
                  : <User className="w-5 h-5 text-primary" />}
                {clientProfile?.isShop ? 'Boutique à localiser' : 'Client à localiser'}
              </h3>
              <Button variant="ghost" size="sm" onClick={stopTracking} className="text-red-600 hover:bg-red-50">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!clientProfile && profileLoading ? (
              <div className="bg-muted/40 border rounded-lg p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement de la fiche du client…
              </div>
            ) : !clientProfile ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center text-sm text-amber-700">
                Profil non disponible pour cet identifiant.<br />
                Vous pouvez tout de même confirmer pour localiser le client.
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex items-center gap-3">
                  {clientProfile.photo ? (
                    <img src={clientProfile.photo} alt="" className="w-14 h-14 rounded-full object-cover border" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      {clientProfile.isShop
                        ? <Store className="w-6 h-6 text-primary" />
                        : <User className="w-6 h-6 text-primary" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {clientProfile.shopName || clientProfile.name || 'Client'}
                    </p>
                    {clientProfile.isShop && clientProfile.name && (
                      <p className="text-xs text-muted-foreground truncate">Gérant : {clientProfile.name}</p>
                    )}
                    {clientProfile.customId && (
                      <p className="text-[11px] font-mono text-muted-foreground">ID : {clientProfile.customId}</p>
                    )}
                    {clientProfile.isShop && (
                      <Badge variant="outline" className="mt-1 text-[10px]">🏪 Boutique</Badge>
                    )}
                  </div>
                </div>
                {clientProfile.phone && (
                  <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${clientProfile.phone}`} className="font-medium">{clientProfile.phone}</a>
                  </div>
                )}
                {clientProfile.address && (
                  <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>{clientProfile.address}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Vérifiez les informations puis confirmez pour démarrer la localisation en temps réel.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setLocalizationConfirmed(true)} className="w-full">
                <Navigation className="w-4 h-4 mr-2" />
                Confirmer la localisation
              </Button>
              <Button variant="outline" onClick={stopTracking} className="w-full">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Étape 2 : suivi en temps réel (après confirmation de la fiche) */}
        {trackedUser && isTracking && localizationConfirmed && (
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
            {displayLat !== undefined && displayLng !== undefined ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-900 flex items-center gap-2">
                    📍 Position GPS
                    {isLive && (
                      <Badge variant="default" className="bg-green-500 text-[10px] h-4 px-1.5">
                        EN DIRECT
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <Clock className="w-3 h-3" />
                    {isLive ? formatElapsed(live.position?.ts) : formatLastSeen(trackedUser.lastSeen)}
                  </div>
                </div>

                {/* Itinéraire : la navigation s'ouvre automatiquement dès la localisation */}
                {embedSrc && (
                  <div className="rounded-lg overflow-hidden border border-green-200 aspect-video bg-white">
                    <iframe
                      title="Itinéraire vers le client"
                      width="100%"
                      height="100%"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={embedSrc}
                    />
                  </div>
                )}

                <div className="text-xs font-mono text-green-800 bg-white/50 p-2 rounded border border-green-100">
                  Lat: {displayLat.toFixed(6)}<br />
                  Lng: {displayLng.toFixed(6)}
                  {isLive && live.position?.accuracy ? (
                    <><br />Précision: ±{Math.round(live.position.accuracy)} m</>
                  ) : null}
                  {!myLocation && (
                    <><br /><span className="text-amber-600">Activez votre GPS pour afficher l'itinéraire complet</span></>
                  )}
                </div>

                <Button
                  onClick={openInMaps}
                  className="w-full"
                  size="sm"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {myLocation ? "Démarrer la navigation GPS" : "Ouvrir dans Google Maps"}
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <p className="text-sm text-yellow-800">
                  ⏳ En attente de la position partagée
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Demandez au client d'appuyer sur « Partager ma position » puis « Démarrer le partage ».
                </p>
              </div>
            )}

            {/* Indicateur de tracking actif */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <p className="text-xs text-blue-800 font-medium flex items-center justify-center gap-2">
                <Radio className="w-3 h-3 animate-pulse" />
                {live.connected ? 'Connecté — suivi en temps réel actif' : 'Connexion au canal de suivi…'}
                {live.sharerStopped && ' (partage arrêté par le client)'}
              </p>
            </div>
          </div>
        )}
    </div>
  );
}
