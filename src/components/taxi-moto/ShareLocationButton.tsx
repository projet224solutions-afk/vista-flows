/**
 * PARTAGE DE POSITION CLIENT — 224Solutions Taxi-Moto
 *
 * Permet au client de partager sa position GPS en temps réel.
 * Le chauffeur n'a qu'à saisir l'ID du client (ou ouvrir le lien) dans son
 * interface "Suivre un client" pour voir la position exacte en direct.
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Share2, Copy, Check, Radio, Link2, Square, Car } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useShareMyLocation } from '@/hooks/useLiveLocation';
import { buildShareLink, type SharedProfile } from '@/lib/liveLocation';
import { TaxiArrivalTracking } from './TaxiArrivalTracking';

interface ShareLocationButtonProps {
  userId: string | undefined;
  userName?: string;
  /** Variante d'affichage du bouton déclencheur. */
  variant?: 'default' | 'compact';
  className?: string;
}

/** Jeton de secours persistant si l'utilisateur n'est pas connecté. */
function guestToken(): string {
  try {
    let token = localStorage.getItem('taxi_share_token');
    if (!token) {
      token =
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      localStorage.setItem('taxi_share_token', token);
    }
    return token;
  } catch {
    return `guest-${Date.now()}`;
  }
}

export function ShareLocationButton({
  userId,
  userName,
  variant = 'default',
  className,
}: ShareLocationButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'id' | 'link' | null>(null);

  // ID de partage = le custom_id du client (ex: CLT0005), celui qu'il voit
  // partout dans l'app et que le chauffeur saisira. On le lit sur SA propre
  // ligne user_ids (autorisé par la RLS). Replis : UUID auth, puis jeton invité.
  const [shareId, setShareId] = useState<string>(() => (userId ? '' : guestToken()));

  // Fiche partagée au chauffeur (nom, tél, adresse, photo, ou infos boutique)
  const [sharedProfile, setSharedProfile] = useState<SharedProfile | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        if (!cancelled) setShareId(guestToken());
        return;
      }
      try {
        const { data } = await supabase
          .from('user_ids')
          .select('custom_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (!cancelled) setShareId(data?.custom_id || userId);
      } catch {
        if (!cancelled) setShareId(userId);
      }

      // Charger la fiche du client + sa boutique éventuelle (lecture de SES propres données)
      try {
        const [{ data: prof }, { data: vendor }] = await Promise.all([
          supabase.from('profiles')
            .select('first_name, last_name, full_name, phone, avatar_url, city, country, custom_id')
            .eq('id', userId).maybeSingle(),
          supabase.from('vendors')
            .select('business_name, address, city, neighborhood, phone, logo_url')
            .eq('user_id', userId).maybeSingle(),
        ]);
        if (cancelled) return;
        const fullName = (prof?.full_name
          || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim()
          || userName || 'Client');
        const isShop = !!vendor;
        setSharedProfile({
          name: fullName,
          phone: vendor?.phone || prof?.phone || undefined,
          address: isShop
            ? [vendor?.address, vendor?.neighborhood, vendor?.city].filter(Boolean).join(', ') || undefined
            : [prof?.city, prof?.country].filter(Boolean).join(', ') || undefined,
          photo: vendor?.logo_url || prof?.avatar_url || undefined,
          customId: prof?.custom_id || undefined,
          isShop,
          shopName: vendor?.business_name || undefined,
        });
      } catch { /* fiche optionnelle */ }
    })();
    return () => { cancelled = true; };
  }, [userId, userName]);

  const { sharing, lastPosition, error, start, stop, taxiEnroute, driverPosition, respondToTaxi } =
    useShareMyLocation(shareId, userName, sharedProfile);

  // Modale de confirmation bloquante (le chauffeur a localisé le client)
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Suivi d'arrivée du taxi (ouvert APRÈS confirmation de la position)
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const enrouteNotifiedRef = useRef(false);

  // Quand le chauffeur localise le client → notification + demande de confirmation BLOQUANTE
  useEffect(() => {
    if (!taxiEnroute || enrouteNotifiedRef.current) return;
    enrouteNotifiedRef.current = true;

    const who = taxiEnroute.driverName ? `${taxiEnroute.driverName}` : 'Votre taxi';
    // Notification navigateur (si autorisée)
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🚕 Confirmez votre position', { body: `${who} vous a localisé. Confirmez pour suivre son arrivée.` });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((p) => {
            if (p === 'granted') new Notification('🚕 Confirmez votre position', { body: `${who} vous a localisé.` });
          });
        }
      }
    } catch { /* notifications indisponibles */ }

    // Ouvre la modale de confirmation BLOQUANTE (ferme le dialogue de partage)
    setOpen(false);
    setConfirmOpen(true);
  }, [taxiEnroute]);

  // Réarme la confirmation si le partage est relancé
  useEffect(() => {
    if (!sharing) enrouteNotifiedRef.current = false;
  }, [sharing]);

  // Le client confirme sa position → on prévient le chauffeur et on ouvre le suivi.
  // On ferme d'abord la modale de confirmation PUIS on ouvre le suivi (léger délai)
  // pour éviter que deux dialogues basculent au même instant (overlay résiduel Radix).
  const handleConfirmPosition = () => {
    respondToTaxi(true);
    setConfirmOpen(false);
    setTimeout(() => setArrivalOpen(true), 180);
  };

  // Le client annule → on prévient le chauffeur et on arrête le partage
  const handleCancelPosition = () => {
    respondToTaxi(false);
    setConfirmOpen(false);
    stop();
    toast.info('Suivi annulé', { description: 'Vous avez annulé le partage de votre position.' });
  };

  const shareLink = shareId ? buildShareLink(shareId) : '';

  const copy = async (value: string, kind: 'id' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === 'id' ? 'ID copié' : 'Lien copié');
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma position en direct — 224Solutions',
          text: 'Suivez ma position en temps réel pour me récupérer :',
          url: shareLink,
        });
      } catch {
        /* annulé par l'utilisateur */
      }
    } else {
      copy(shareLink, 'link');
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={sharing ? 'default' : 'outline'}
          size={variant === 'compact' ? 'sm' : 'default'}
          className={className}
        >
          {sharing ? (
            <>
              <Radio className="w-4 h-4 mr-2 animate-pulse text-green-300" />
              Position partagée
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              Partager ma position
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Partager ma position
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Partagez votre position en direct avec le chauffeur. Il pourra vous
            localiser en saisissant votre <strong>ID</strong> ou en ouvrant votre{' '}
            <strong>lien</strong> dans son interface.
          </p>

          {/* État du partage */}
          <div
            className={`rounded-lg border p-3 flex items-center gap-3 ${
              sharing
                ? 'bg-green-50 border-green-200'
                : 'bg-muted/40 border-border'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                sharing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {sharing ? 'Partage actif' : 'Partage inactif'}
              </p>
              <p className="text-xs text-muted-foreground">
                {sharing && lastPosition
                  ? `Position : ${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)}`
                  : 'Activez le partage pour diffuser votre position'}
              </p>
            </div>
            {sharing && (
              <Badge variant="default" className="bg-green-500 text-xs">
                EN DIRECT
              </Badge>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {/* Identifiant à communiquer */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Votre ID (à donner au chauffeur)
            </label>
            <div className="flex gap-2">
              <code className="flex-1 text-xs font-mono bg-muted rounded px-3 py-2 truncate">
                {shareId || '—'}
              </code>
              <Button
                variant="outline"
                size="icon"
                disabled={!shareId}
                onClick={() => shareId && copy(shareId, 'id')}
                title="Copier l'ID"
              >
                {copied === 'id' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Lien de partage */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Lien de suivi
            </label>
            <div className="flex gap-2">
              <code className="flex-1 text-xs font-mono bg-muted rounded px-3 py-2 truncate">
                {shareLink || '—'}
              </code>
              <Button
                variant="outline"
                size="icon"
                disabled={!shareLink}
                onClick={() => shareLink && copy(shareLink, 'link')}
                title="Copier le lien"
              >
                {copied === 'link' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            {!sharing ? (
              <Button onClick={start} disabled={!shareId} className="w-full">
                <Radio className="w-4 h-4 mr-2" />
                Démarrer le partage en direct
              </Button>
            ) : (
              <Button onClick={stop} variant="destructive" className="w-full">
                <Square className="w-4 h-4 mr-2" />
                Arrêter le partage
              </Button>
            )}

            <Button
              onClick={nativeShare}
              variant="outline"
              disabled={!shareLink}
              className="w-full"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Envoyer le lien
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modale de confirmation BLOQUANTE — le client doit confirmer sa position ou annuler */}
    <Dialog open={confirmOpen} onOpenChange={() => { /* bloquant : pas de fermeture libre */ }}>
      <DialogContent
        className="max-w-sm [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Confirmez votre position
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {taxiEnroute?.driverName ? `${taxiEnroute.driverName}` : 'Votre taxi'} vous a localisé.
            Confirmez votre position pour suivre l'arrivée de votre taxi en temps réel.
          </p>
          {lastPosition && (
            <div className="text-xs font-mono bg-muted rounded p-2 text-center">
              📍 {lastPosition.lat.toFixed(5)}, {lastPosition.lng.toFixed(5)}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={handleConfirmPosition} className="w-full">
              <Check className="w-4 h-4 mr-2" />
              Confirmer ma position
            </Button>
            <Button onClick={handleCancelPosition} variant="outline" className="w-full">
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Suivi d'arrivée du taxi — s'ouvre APRÈS confirmation de la position */}
    <TaxiArrivalTracking
      open={arrivalOpen}
      onOpenChange={setArrivalOpen}
      clientPos={lastPosition}
      driverPos={driverPosition}
      driverName={taxiEnroute?.driverName}
    />
    </>
  );
}

export default ShareLocationButton;
