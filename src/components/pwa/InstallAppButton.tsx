/**
 * =====================================================
 * COMPOSANT: InstallAppButton
 * =====================================================
 *
 * Bouton d'installation PWA avec support iOS amÃ©liorÃ©.
 * - Installation directe via beforeinstallprompt (Android/Desktop)
 * - Guide visuel Ã©tape par Ã©tape pour iOS (Safari uniquement)
 * - DÃ©tection des navigateurs intÃ©grÃ©s (WebView)
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
import IOSInstallGuide from './IOSInstallGuide';

interface InstallAppButtonProps {
  variant?: 'default' | 'compact' | 'floating';
  className?: string;
}

export function InstallAppButton({ variant = 'default', className = '' }: InstallAppButtonProps) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    // DÃ©tection Mac (macOS)
    const mac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) && !ios;
    const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    // WebView / in-app browsers n'autorisent souvent pas l'installation PWA
    const inApp = /(FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|wv)/i.test(ua);
    
    // VÃ©rifier si dÃ©jÃ  en mode standalone (PWA installÃ©e)
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;

    setIsMobile(mobile);
    setIsIOS(ios);
    setIsMac(mac);
    setIsSafari(safari);
    setIsInIframe(inIframe);
    setIsInAppBrowser(inApp);
    setIsStandalone(standalone);
    setHasChecked(true);
  }, []);

  const handleInstallClick = () => {
    // Sur iOS ou Mac avec Safari, ouvrir directement le guide
    if (isIOS || (isMac && isSafari)) {
      setIosGuideOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const openForInstall = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('pwa', '1');
    // Ouvrir en contexte top-level (requis pour l'installation PWA)
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const runInstall = async () => {
    setIsInstalling(true);
    try {
      // 0) DÃ©jÃ  installÃ©
      if (isStandalone) {
        toast.success('Application dÃ©jÃ  installÃ©e !', {
          description: "224Solutions est dÃ©jÃ  sur votre Ã©cran d'accueil.",
        });
        setConfirmOpen(false);
        return;
      }

      // 1) iOS ou Mac avec Safari - Ouvrir le guide visuel
      if (isIOS || (isMac && isSafari)) {
        setConfirmOpen(false);
        
        if (isIOS && !isSafari && !isInAppBrowser) {
          toast.info('Ouvrir dans Safari', {
            description: "L'installation PWA sur iOS fonctionne uniquement avec Safari.",
            duration: 6000,
          });
        }
        
        // Afficher le guide iOS/Mac
        setIosGuideOpen(true);
        return;
      }

      // 2) L'installation PWA ne fonctionne pas dans un iframe / certains webviews
      if (isInIframe || isInAppBrowser) {
        toast.info('Ouvrir dans le navigateur pour installer', {
          description: isInAppBrowser
            ? "Ouvrez ce lien dans Chrome/Safari (les navigateurs intÃ©grÃ©s bloquent l'installation)."
            : "Ouvrez l'application dans un nouvel onglet pour installer.",
          duration: 7000,
        });
        openForInstall();
        setConfirmOpen(false);
        return;
      }

      // 3) En preview Lovable: activer le SW (nÃ©cessaire pour que Chrome propose l'installation)
      const isLovablePreview = window.location.hostname.includes('lovableproject.com');
      const pwaPreviewEnabled = window.localStorage.getItem('enable_pwa_preview') === '1';
      if (!isInstallable && isLovablePreview && !pwaPreviewEnabled) {
        window.localStorage.setItem('enable_pwa_preview', '1');
        const url = new URL(window.location.href);
        url.searchParams.set('pwa', '1');
        toast.info("Activation de l'installationâ€¦", {
          description: "On recharge la page pour activer le mode PWA (une seule fois).",
          duration: 4000,
        });
        window.location.replace(url.toString());
        return;
      }

      // 4) Essayer l'installation PWA native
      if (isInstallable) {
        const success = await promptInstall();
        if (success) {
          toast.success('Application installÃ©e !', {
            description: "224Solutions est maintenant sur votre Ã©cran d'accueil.",
          });
          setConfirmOpen(false);
          return;
        }
      }

      // 5) Pas de prompt disponible - afficher les instructions manuelles
      setConfirmOpen(false);

      if (isMobile) {
        toast.info('Installation sur Android', {
          description: "Ouvrez le menu (â‹®) puis 'Installer l'application' ou 'Ajouter Ã  l'Ã©cran d'accueil'.",
          duration: 8000,
        });
      } else {
        toast.info('Installation sur ordinateur', {
          description: "Cliquez sur l'icÃ´ne d'installation dans la barre d'adresse ou le menu du navigateur.",
          duration: 8000,
        });
      }
    } finally {
      setIsInstalling(false);
    }
  };

  // Ne pas afficher tant que la vÃ©rification n'est pas faite
  if (!hasChecked) {
    return null;
  }

  // Ne pas afficher si dÃ©jÃ  installÃ© (standalone mode)
  if (isInstalled || isStandalone) {
    // Pour le variant floating, ne rien afficher du tout
    if (variant === 'floating') {
      return null;
    }
    return (
      <div className={`flex items-center gap-2 text-primary-orange-600 ${className}`}>
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Application installÃ©e</span>
      </div>
    );
  }

  const getInstallInstructions = () => {
    if (isInIframe || isInAppBrowser) {
      return (
        <span className="flex flex-col gap-2 text-left">
          <span className="font-medium">Important :</span>
          <span>
            L'installation ne fonctionne pas dans un aperÃ§u/ navigateur intÃ©grÃ©.
          </span>
          <span>
            Appuyez sur <span className="font-semibold">Installer</span> puis ouvrez le lien dans Chrome/Safari.
          </span>
        </span>
      );
    }

    if (isInstallable) {
      return "L'installation dÃ©marrera automatiquement aprÃ¨s confirmation.";
    }

    if (isIOS || isMac) {
      return (
        <span className="flex flex-col gap-2 text-left">
          <span className="font-medium">{isMac ? 'Sur Mac :' : 'Sur iPhone/iPad :'}</span>
          {isMac ? (
            <>
              <span>1. Cliquez sur Fichier dans la barre de menu</span>
              <span>2. Cliquez sur "Ajouter au Dock"</span>
            </>
          ) : (
            <>
              <span>1. Appuyez sur <Share className="inline w-4 h-4" /> (Partager)</span>
              <span>2. Faites dÃ©filer et appuyez sur "Sur l'Ã©cran d'accueil"</span>
              <span>3. Appuyez sur "Ajouter"</span>
            </>
          )}
        </span>
      );
    }

    if (isMobile) {
      return (
        <span className="flex flex-col gap-2 text-left">
          <span className="font-medium">Sur Android :</span>
          <span>1. Appuyez sur <MoreVertical className="inline w-4 h-4" /> (menu)</span>
          <span>2. Appuyez sur "Installer l'application" ou "Ajouter Ã  l'Ã©cran d'accueil"</span>
        </span>
      );
    }

    return "Cliquez sur l'icÃ´ne d'installation dans la barre d'adresse.";
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
              <p>Installez l'application pour un accÃ¨s rapide depuis votre Ã©cran d'accueil.</p>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {getInstallInstructions()}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isInstalling}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={runInstall} disabled={isInstalling}>
            {isInstalling
              ? 'Installationâ€¦'
              : isInIframe || isInAppBrowser
                ? 'Ouvrir pour installer'
                : isInstallable
                  ? 'Installer maintenant'
                  : 'Compris'}
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
        <IOSInstallGuide open={iosGuideOpen} onOpenChange={setIosGuideOpen} />
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
        <IOSInstallGuide open={iosGuideOpen} onOpenChange={setIosGuideOpen} />
      </>
    );
  }

  // Bouton par dÃ©faut (carte)
  return (
    <>
      <div className={`bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 shadow-lg ${className}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Installer 224Solutions</h3>
            <p className="text-white/80 text-sm">AccÃ¨s rapide depuis votre Ã©cran d'accueil</p>
          </div>
          <Button onClick={handleInstallClick} variant="secondary" className="gap-2 font-semibold">
            <Download className="w-4 h-4" />
            Installer
          </Button>
        </div>

        {/* Avantages */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-white/90 text-xs">
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">âš¡</span>
            <span>Plus rapide</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">ðŸ“´</span>
            <span>Hors-ligne</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">ðŸ””</span>
            <span>Notifications</span>
          </div>
        </div>
      </div>

      {ConfirmDialog}
      <IOSInstallGuide open={iosGuideOpen} onOpenChange={setIosGuideOpen} />
    </>
  );
}

export default InstallAppButton;
