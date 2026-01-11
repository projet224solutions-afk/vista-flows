/**
 * =====================================================
 * COMPOSANT: InstallAppButton
 * =====================================================
 *
 * Bouton d'installation PWA native depuis le navigateur.
 *
 * Notes importantes:
 * - Les navigateurs n'autorisent pas une installation 100% automatique.
 * - On peut seulement déclencher le prompt système (si disponible) suite à un geste utilisateur.
 */

import { useState } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

interface InstallAppButtonProps {
  variant?: 'default' | 'compact' | 'floating';
  className?: string;
}

export function InstallAppButton({ variant = 'default', className = '' }: InstallAppButtonProps) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = () => {
    setConfirmOpen(true);
  };

  const runInstall = async () => {
    setIsInstalling(true);
    try {
      if (!isInstallable) {
        toast.info('Installation non disponible automatiquement', {
          description: "Ouvrez le menu de votre navigateur (⋮) puis 'Installer l’application' / 'Ajouter à l’écran d’accueil'.",
        });
        return;
      }

      const success = await promptInstall();
      if (success) {
        toast.success('Application installée', {
          description: "224Solutions est maintenant disponible sur votre écran d'accueil.",
        });
      } else {
        toast.info('Installation annulée', {
          description: "Vous pouvez relancer l'installation quand vous voulez.",
        });
      }
    } finally {
      setIsInstalling(false);
      setConfirmOpen(false);
    }
  };

  // Ne pas afficher si déjà installé
  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Application installée</span>
      </div>
    );
  }

  const ConfirmDialog = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer l’installation</AlertDialogTitle>
          <AlertDialogDescription>
            Voulez-vous installer 224Solutions sur cet appareil maintenant ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isInstalling}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={runInstall} disabled={isInstalling}>
            {isInstalling ? 'Installation…' : 'Installer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Bouton flottant
  if (variant === 'floating') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg animate-pulse hover:animate-none transition-all duration-300 hover:scale-105 bg-primary text-primary-foreground ${className}`}
          aria-label="Installer l'application"
        >
          <Download className="w-5 h-5" />
          <span className="font-semibold text-sm">Installer</span>
        </button>
        {ConfirmDialog}
      </>
    );
  }

  // Bouton compact
  if (variant === 'compact') {
    return (
      <>
        <Button onClick={handleInstallClick} size="sm" className={`gap-2 ${className}`}>
          <Download className="w-4 h-4" />
          Installer
        </Button>
        {ConfirmDialog}
      </>
    );
  }

  // Bouton par défaut (carte)
  return (
    <>
      <div className={`bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 shadow-lg ${className}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Installer 224Solutions</h3>
            <p className="text-white/80 text-sm">Accès rapide depuis votre écran d'accueil</p>
          </div>
          <Button onClick={handleInstallClick} variant="secondary" className="gap-2 font-semibold">
            <Download className="w-4 h-4" />
            Installer
          </Button>
        </div>

        {/* Avantages */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-white/90 text-xs">
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">⚡</span>
            <span>Plus rapide</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">📴</span>
            <span>Hors-ligne</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">🔔</span>
            <span>Notifications</span>
          </div>
        </div>
      </div>

      {ConfirmDialog}
    </>
  );
}

export default InstallAppButton;
