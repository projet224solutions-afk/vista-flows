/**
 * =====================================================
 * COMPOSANT: InstallAppButton
 * =====================================================
 *
 * Bouton d'installation PWA / APK.
 * - Tente d'abord l'installation PWA native
 * - Sinon, lance le téléchargement APK automatiquement sur mobile
 */

import { useState, useEffect } from 'react';
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

// URL de téléchargement APK (GitHub Releases)
const APK_URL = 'https://github.com/projet224solutions-afk/vista-flows/releases/latest/download/224solutions-android.apk';

interface InstallAppButtonProps {
  variant?: 'default' | 'compact' | 'floating';
  className?: string;
}

export function InstallAppButton({ variant = 'default', className = '' }: InstallAppButtonProps) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  const handleInstallClick = () => {
    setConfirmOpen(true);
  };

  const runInstall = async () => {
    setIsInstalling(true);
    try {
      // 1) Essayer d'abord l'installation PWA native
      if (isInstallable) {
        const success = await promptInstall();
        if (success) {
          toast.success('Application installée', {
            description: "224Solutions est maintenant disponible sur votre écran d'accueil.",
          });
          setConfirmOpen(false);
          return;
        }
      }

      // 2) Fallback: télécharger l'APK sur mobile Android
      if (isMobile) {
        toast.info('Téléchargement de l\'APK en cours…', {
          description: 'Ouvrez le fichier téléchargé pour installer l\'application.',
        });
        // Déclencher le téléchargement
        window.location.assign(APK_URL);
      } else {
        // Desktop sans PWA disponible
        toast.info('Installation via le navigateur', {
          description: "Ouvrez le menu (⋮) puis 'Installer l'application' ou utilisez le téléchargement EXE.",
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
          <AlertDialogTitle>Confirmer l'installation</AlertDialogTitle>
          <AlertDialogDescription>
            {isMobile
              ? 'Voulez-vous installer 224Solutions sur votre téléphone ?'
              : 'Voulez-vous installer 224Solutions sur cet appareil ?'}
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
