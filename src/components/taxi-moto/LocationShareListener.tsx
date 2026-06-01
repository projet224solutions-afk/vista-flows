/**
 * LocationShareListener — Écouteur GLOBAL de demandes de localisation.
 *
 * Monté une fois pour tout utilisateur connecté. Dès qu'un chauffeur saisit
 * l'ID de l'utilisateur et envoie une demande, affiche une modale BLOQUANTE
 * « Un chauffeur souhaite vous localiser — Partager ma position ? ».
 * Sur confirmation : démarre le partage GPS et ouvre le suivi d'arrivée du taxi.
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Car, Check, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useShareRequestResponder } from '@/hooks/useShareRequestResponder';
import { TaxiArrivalTracking } from './TaxiArrivalTracking';

export function LocationShareListener() {
  const { user, profile } = useAuth();
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile?.last_name || ''}`.trim()
    : undefined;

  const { request, lastPosition, driverPosition, taxiEnroute, error, accept, decline } =
    useShareRequestResponder(user?.id, displayName);

  const [arrivalOpen, setArrivalOpen] = useState(false);

  // Surfacer une erreur GPS (sinon le partage reste muet après acceptation)
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Notification navigateur quand une demande arrive
  useEffect(() => {
    if (!request) return;
    const who = request.driverName || 'Un chauffeur';
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('🚕 Demande de localisation', { body: `${who} souhaite vous localiser.` });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((p) => {
            if (p === 'granted') new Notification('🚕 Demande de localisation', { body: `${who} souhaite vous localiser.` });
          });
        }
      }
    } catch { /* notifications indisponibles */ }
  }, [request]);

  // Ouvre le suivi d'arrivée quand le taxi se met en route
  useEffect(() => {
    if (taxiEnroute) setArrivalOpen(true);
  }, [taxiEnroute]);

  // Ne rien rendre si l'utilisateur n'est pas connecté
  if (!user) return null;

  const handleAccept = () => {
    accept();
    setArrivalOpen(true);
  };

  const handleDecline = () => {
    decline();
    setArrivalOpen(false);
    toast.info('Demande de localisation refusée');
  };

  return (
    <>
      {/* Modale BLOQUANTE de demande de partage */}
      <Dialog open={!!request} onOpenChange={() => { /* bloquant */ }}>
        <DialogContent
          className="max-w-sm [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Demande de localisation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm">
                <strong>{request?.driverName || 'Un chauffeur'}</strong> souhaite vous localiser.
                Partagez votre position pour qu'il vienne vous récupérer.
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Confirmez pour partager votre position en temps réel, ou annulez.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleAccept} className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Confirmer et partager ma position
              </Button>
              <Button onClick={handleDecline} variant="outline" className="w-full">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suivi d'arrivée du taxi (après acceptation) */}
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

export default LocationShareListener;
