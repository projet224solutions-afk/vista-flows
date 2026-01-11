/**
 * COMPOSANT: DownloadAppButton
 * Bouton de téléchargement APK/EXE avec génération automatique
 * Version: 4.1 - Confirmation avant action (download / install)
 */

import { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, AlertCircle, CheckCircle, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// Configuration des liens de téléchargement (hébergés sur GitHub Releases)
// NB: plus fiable sur mobile que le téléchargement cross-domain depuis Storage.
const DOWNLOAD_CONFIG = {
  apk: {
    url: 'https://github.com/projet224solutions-afk/vista-flows/releases/latest/download/224solutions-android.apk',
    name: '224solutions-android.apk',
    size: '~25 MB',
    platform: 'Android',
  },
  exe: {
    url: 'https://github.com/projet224solutions-afk/vista-flows/releases/latest/download/224solutions-windows.exe',
    name: '224solutions-windows.exe',
    size: '~85 MB',
    platform: 'Windows',
  },
};

type ConfirmAction = null | 'apk' | 'exe' | 'pwa';

interface DownloadAppButtonProps {
  variant?: 'default' | 'compact' | 'banner';
  className?: string;
}

export function DownloadAppButton({ variant = 'default', className = '' }: DownloadAppButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [downloadStatus] = useState<{
    apk: 'checking' | 'available' | 'unavailable';
    exe: 'checking' | 'available' | 'unavailable';
  }>({
    // On évite les checks HEAD/CORS souvent bloqués sur mobile.
    // On laisse le download se déclencher directement.
    apk: 'available',
    exe: 'available',
  });

  // Hook PWA pour fallback
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  useEffect(() => {
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  const handleDownload = (type: 'apk' | 'exe') => {
    const config = DOWNLOAD_CONFIG[type];

    const isMobileUA =
      /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Sur mobile, la navigation directe est la plus fiable (le flag `download` est souvent ignoré en cross-domain)
    if (isMobileUA) {
      window.location.assign(config.url);
      return;
    }

    const newTab = window.open(config.url, '_blank', 'noopener,noreferrer');
    if (!newTab) {
      window.location.assign(config.url);
    }
  };

  const handleInstallPWA = async () => {
    // Fermer le dialog avant d'afficher le prompt système (meilleure UX)
    setShowDialog(false);
    await promptInstall();
  };

  // Variant Banner (bandeau en bas de page)
  if (variant === 'banner') {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg ${className}`}
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile ? <Smartphone className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            <div>
              <p className="font-semibold">Téléchargez 224Solutions</p>
              <p className="text-sm opacity-90">Installation rapide et facile</p>
            </div>
          </div>
          <Button onClick={() => setShowDialog(true)} variant="secondary" className="gap-2">
            <Download className="w-4 h-4" />
            Télécharger
          </Button>
        </div>
      </div>
    );
  }

  // Variant Compact
  if (variant === 'compact') {
    return (
      <>
        <Button onClick={() => setShowDialog(true)} variant="outline" size="sm" className={`gap-2 ${className}`}>
          <Download className="w-4 h-4" />
          Télécharger l'app
        </Button>
        <DownloadDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          downloadStatus={downloadStatus}
          onDownload={handleDownload}
          onInstallPWA={handleInstallPWA}
          canInstallPWA={isInstallable && !isInstalled}
          isMobile={isMobile}
        />
      </>
    );
  }

  // Variant Default (carte)
  return (
    <>
      <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg ${className}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Download className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Télécharger 224Solutions</h3>
            <p className="text-sm opacity-90">{isMobile ? 'Version Android APK' : 'Version Windows et Android'}</p>
          </div>
          <Button onClick={() => setShowDialog(true)} variant="secondary" size="lg" className="gap-2">
            <Download className="w-5 h-5" />
            Télécharger
          </Button>
        </div>
      </div>

      <DownloadDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        downloadStatus={downloadStatus}
        onDownload={handleDownload}
        onInstallPWA={handleInstallPWA}
        canInstallPWA={isInstallable && !isInstalled}
        isMobile={isMobile}
      />
    </>
  );
}

// Dialog de téléchargement
interface DownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  downloadStatus: {
    apk: 'checking' | 'available' | 'unavailable';
    exe: 'checking' | 'available' | 'unavailable';
  };
  onDownload: (type: 'apk' | 'exe') => void;
  onInstallPWA: () => Promise<void> | void;
  canInstallPWA: boolean;
  isMobile: boolean;
}

function DownloadDialog({
  open,
  onOpenChange,
  downloadStatus,
  onDownload,
  onInstallPWA,
  canInstallPWA,
  isMobile,
}: DownloadDialogProps) {
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  const confirmTitle =
    confirm === 'pwa'
      ? 'Confirmer l’installation'
      : confirm === 'apk'
        ? 'Confirmer le téléchargement (APK)'
        : confirm === 'exe'
          ? 'Confirmer le téléchargement (EXE)'
          : '';

  const confirmDescription =
    confirm === 'pwa'
      ? 'Voulez-vous installer 224Solutions sur cet appareil maintenant ?'
      : confirm === 'apk'
        ? `Télécharger le fichier ${DOWNLOAD_CONFIG.apk.name} (${DOWNLOAD_CONFIG.apk.size}) ?`
        : confirm === 'exe'
          ? `Télécharger le fichier ${DOWNLOAD_CONFIG.exe.name} (${DOWNLOAD_CONFIG.exe.size}) ?`
          : '';

  const doConfirm = async () => {
    const action = confirm;
    setConfirm(null);

    // Fermer la fenêtre de choix avant de lancer l'action
    onOpenChange(false);

    if (action === 'pwa') {
      await onInstallPWA();
      return;
    }

    if (action === 'apk' || action === 'exe') {
      onDownload(action);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            Installer 224Solutions
          </DialogTitle>
          <DialogDescription>Choisissez la méthode d'installation adaptée à votre appareil</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* OPTION 1: Android (APK) */}
          {isMobile && (
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-start gap-3">
                <Smartphone className="w-10 h-10 text-primary" />
                <div className="flex-1">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    Version Android (APK)
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">APK</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">Fichier APK • {DOWNLOAD_CONFIG.apk.size}</p>

                  {downloadStatus.apk === 'unavailable' ? (
                    <Alert className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Si le téléchargement ne démarre pas, installez plutôt la version PWA (ci-dessous).
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="mt-3">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Installation native Android (sources inconnues peut être requis).</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={() => setConfirm('apk')} className="w-full mt-3">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger l'APK
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* OPTION 2: PWA (installation depuis le navigateur) */}
          {canInstallPWA && (
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-start gap-3">
                <Sparkles className="w-10 h-10 text-primary" />
                <div className="flex-1">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    Application Web (PWA)
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Sans APK</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Icône sur l'écran d'accueil • Mises à jour automatiques
                  </p>

                  <Alert className="mt-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription>Installation directe depuis Chrome (recommandé).</AlertDescription>
                  </Alert>

                  <Button onClick={() => setConfirm('pwa')} className="w-full mt-3">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Installer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* OPTION 4: Windows (EXE) */}
          {!isMobile && (
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-start gap-3">
                <Monitor className="w-10 h-10 text-primary" />
                <div className="flex-1">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    Version Windows
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">EXE</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">Installateur • {DOWNLOAD_CONFIG.exe.size}</p>

                  {downloadStatus.exe === 'unavailable' ? (
                    <Alert className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Le lien Windows semble indisponible pour le moment. Vous pouvez installer la PWA via Chrome.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="mt-3">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>Fichier prêt à télécharger</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={() => setConfirm('exe')} variant="outline" className="w-full mt-3">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger EXE
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions générales */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2 text-sm">📝 Après l'installation</h4>
            <p className="text-xs text-muted-foreground">
              Après téléchargement, ouvrez le fichier et suivez les étapes de votre appareil (Android/Windows).
            </p>
          </div>
        </div>

        {/* Confirmation (avant action) */}
        <AlertDialog open={confirm !== null} onOpenChange={(o) => setConfirm(o ? confirm : null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={doConfirm}>Continuer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

export default DownloadAppButton;
