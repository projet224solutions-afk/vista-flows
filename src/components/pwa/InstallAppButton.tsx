/**
 * =====================================================
 * COMPOSANT: InstallAppButton
 * =====================================================
 *
 * Bouton d'installation PWA uniquement (pas de téléchargement APK externe).
 * - Installation directe via le navigateur
 * - Guide l'utilisateur si le prompt n'est pas disponible
 */

import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle2, Share, MoreVertical } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobile);
    setIsIOS(ios);
  }, []);

  const handleInstallClick = () => {
    setConfirmOpen(true);
  };

  const runInstall = async () => {
    setIsInstalling(true);
    try {
      // 0) En preview Lovable: activer le SW (nécessaire pour que Chrome propose l'installation)
      //    Sans ça, `beforeinstallprompt` ne se déclenche jamais et on reste bloqué sur les instructions.
      const isLovablePreview = window.location.hostname.includes('lovableproject.com');
      const pwaPreviewEnabled = window.localStorage.getItem('enable_pwa_preview') === '1';
      if (!isInstallable && isLovablePreview && !pwaPreviewEnabled) {
        window.localStorage.setItem('enable_pwa_preview', '1');
        const url = new URL(window.location.href);
        url.searchParams.set('pwa', '1');
        toast.info('Activation de l’installation…', {
          description: "On recharge la page pour activer le mode PWA (une seule fois).",
          duration: 4000,
        });
        window.location.replace(url.toString());
        return;
      }

      // 1) Essayer l'installation PWA native
      if (isInstallable) {
        const success = await promptInstall();
        if (success) {
          toast.success('Application installée !', {
            description: "224Solutions est maintenant sur votre écran d'accueil.",
          });
          setConfirmOpen(false);
          return;
        }
      }

      // 2) Pas de prompt disponible - afficher les instructions manuelles
      setConfirmOpen(false);
      
      if (isIOS) {
        toast.info('Installation sur iPhone/iPad', {
          description: "Appuyez sur le bouton Partager (↑) puis 'Sur l'écran d'accueil'.",
          duration: 8000,
        });
      } else if (isMobile) {
        toast.info('Installation sur Android', {
          description: "Ouvrez le menu (⋮) puis 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.",
          duration: 8000,
        });
      } else {
        toast.info('Installation sur ordinateur', {
          description: "Cliquez sur l'icône d'installation dans la barre d'adresse ou le menu du navigateur.",
          duration: 8000,
        });
      }
    } finally {
      setIsInstalling(false);
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

  const getInstallInstructions = () => {
    if (isInstallable) {
      return "L'installation démarrera automatiquement.";
    }
    if (isIOS) {
      return (
        <span className="flex flex-col gap-2 text-left">
          <span className="font-medium">Sur iPhone/iPad :</span>
          <span>1. Appuyez sur <Share className="inline w-4 h-4" /> (Partager)</span>
          <span>2. Faites défiler et appuyez sur "Sur l'écran d'accueil"</span>
          <span>3. Appuyez sur "Ajouter"</span>
        </span>
      );
    }
    if (isMobile) {
      return (
        <span className="flex flex-col gap-2 text-left">
          <span className="font-medium">Sur Android :</span>
          <span>1. Appuyez sur <MoreVertical className="inline w-4 h-4" /> (menu)</span>
          <span>2. Appuyez sur "Installer l'application" ou "Ajouter à l'écran d'accueil"</span>
        </span>
      );
    }
    return "Cliquez sur l'icône d'installation dans la barre d'adresse.";
  };

  const ConfirmDialog = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Installer 224Solutions
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Installez l'application pour un accès rapide depuis votre écran d'accueil.</p>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {getInstallInstructions()}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isInstalling}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={runInstall} disabled={isInstalling}>
            {isInstalling ? 'Installation…' : isInstallable ? 'Installer maintenant' : 'Compris'}
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
