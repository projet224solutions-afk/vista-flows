/**
 * PARTAGE DE POSITION CLIENT — 224Solutions Taxi-Moto
 *
 * Permet au client de partager sa position GPS en temps réel.
 * Le chauffeur n'a qu'à saisir l'ID du client (ou ouvrir le lien) dans son
 * interface "Suivre un client" pour voir la position exacte en direct.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Share2, Copy, Check, Radio, Link2, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useShareMyLocation } from '@/hooks/useLiveLocation';
import { buildShareLink } from '@/lib/liveLocation';

interface ShareLocationButtonProps {
  userId: string | undefined;
  userName?: string;
  /** Variante d'affichage du bouton déclencheur. */
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * Renvoie un identifiant de partage utilisable même si l'utilisateur n'est pas
 * (encore) connecté : on retombe sur un jeton persistant stocké localement.
 * Ainsi l'ID et le lien ne sont jamais vides.
 */
function resolveShareId(userId: string | undefined): string {
  if (userId) return userId;
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

  // ID de partage robuste (réel si connecté, sinon jeton persistant)
  const shareId = useMemo(() => resolveShareId(userId), [userId]);

  const { sharing, lastPosition, error, start, stop } = useShareMyLocation(shareId, userName);

  const shareLink = buildShareLink(shareId);

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
  );
}

export default ShareLocationButton;
