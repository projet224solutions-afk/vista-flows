/**
 * COMPOSANT: DownloadAppButton
 * Bouton de téléchargement APK/EXE avec génération automatique
 * Version: 4.0 - Avec fallback PWA automatique
 * 
 * CHANGEMENTS v4.0:
 * - Fallback automatique vers PWA si APK/EXE indisponibles
 * - Affichage intelligent selon disponibilité des fichiers
 * - Mode "toujours afficher" même si fichiers manquants
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// Configuration des liens de téléchargement
const SUPABASE_URL = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const DOWNLOAD_CONFIG = {
  apk: {
    url: `${SUPABASE_URL}/storage/v1/object/public/app-downloads/224Solutions.apk`,
    name: '224Solutions.apk',
    size: '~15 MB',
    platform: 'Android'
  },
  exe: {
    url: `${SUPABASE_URL}/storage/v1/object/public/app-downloads/224Solutions.exe`,
    name: '224Solutions.exe',
    size: '~80 MB',
    platform: 'Windows'
  }
};

interface DownloadAppButtonProps {
  variant?: 'default' | 'compact' | 'banner';
  className?: string;
}

export function DownloadAppButton({ variant = 'default', className = '' }: DownloadAppButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{
    apk: 'checking' | 'available' | 'unavailable';
    exe: 'checking' | 'available' | 'unavailable';
  }>({
    apk: 'checking',
    exe: 'checking'
  });

  // Hook PWA pour fallback
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  useEffect(() => {
    // Détection mobile
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Vérifier la disponibilité des fichiers
    checkFileAvailability();
  }, []);

  const checkFileAvailability = async () => {
    try {
      // Vérifier APK avec timeout court
      const apkPromise = fetch(DOWNLOAD_CONFIG.apk.url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 secondes max
      });
      
      // Vérifier EXE avec timeout court
      const exePromise = fetch(DOWNLOAD_CONFIG.exe.url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      const [apkResponse, exeResponse] = await Promise.allSettled([apkPromise, exePromise]);

      setDownloadStatus({
        apk: apkResponse.status === 'fulfilled' && apkResponse.value.ok ? 'available' : 'unavailable',
        exe: exeResponse.status === 'fulfilled' && exeResponse.value.ok ? 'available' : 'unavailable'
      });

      console.log('📥 [Download] Statut fichiers:', {
        apk: apkResponse.status === 'fulfilled' ? apkResponse.value.status : 'timeout',
        exe: exeResponse.status === 'fulfilled' ? exeResponse.value.status : 'timeout'
      });
    } catch (error) {
      console.error('❌ [Download] Erreur vérification fichiers:', error);
      // Marquer comme unavailable mais ne pas bloquer l'affichage
      setDownloadStatus({
        apk: 'unavailable',
        exe: 'unavailable'
      });
    }
  };

  const handleDownload = (type: 'apk' | 'exe') => {
    const config = DOWNLOAD_CONFIG[type];

    console.log(`📥 [Download] Lancement téléchargement: ${config.name}`);

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

    console.log(`✅ [Download] Téléchargement déclenché: ${config.name}`);
  };

  const handleInstallPWA = async () => {
    console.log('📱 [PWA] Tentative installation PWA');
    const success = await promptInstall();
    if (success) {
      console.log('✅ [PWA] Installation réussie');
      setShowDialog(false);
    } else {
      console.log('⚠️ [PWA] Installation annulée ou échouée');
    }
  };

  // Variant Banner (bandeau en bas de page)
  if (variant === 'banner') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg ${className}`}>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <Smartphone className="w-6 h-6" />
            ) : (
              <Monitor className="w-6 h-6" />
            )}
            <div>
              <p className="font-semibold">Téléchargez 224Solutions</p>
              <p className="text-sm opacity-90">Installation rapide et facile</p>
            </div>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            variant="secondary"
            className="gap-2"
          >
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
        <Button
          onClick={() => setShowDialog(true)}
          variant="outline"
          size="sm"
          className={`gap-2 ${className}`}
        >
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
            <p className="text-sm opacity-90">
              {isMobile ? 'Version Android APK' : 'Version Windows et Android'}
            </p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            variant="secondary"
            size="lg"
            className="gap-2"
          >
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
  onInstallPWA: () => void;
  canInstallPWA: boolean;
  isMobile: boolean;
}

function DownloadDialog({ open, onOpenChange, downloadStatus, onDownload, onInstallPWA, canInstallPWA, isMobile }: DownloadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            Installer 224Solutions
          </DialogTitle>
          <DialogDescription>
            Choisissez la méthode d'installation adaptée à votre appareil
          </DialogDescription>
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
                  <p className="text-sm text-muted-foreground">
                    Fichier APK • {DOWNLOAD_CONFIG.apk.size}
                  </p>

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
                      <AlertDescription>
                        Installation native Android (sources inconnues peut être requis).
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={() => onDownload('apk')} className="w-full mt-3">
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
                  <p className="text-sm text-muted-foreground">Icône sur l'écran d'accueil • Mises à jour automatiques</p>

                  <Alert className="mt-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Installation directe depuis Chrome (recommandé si le téléchargement est bloqué).
                    </AlertDescription>
                  </Alert>

                  <Button onClick={onInstallPWA} className="w-full mt-3">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Installer la PWA
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* OPTION 3: Instructions si APK indisponible et PWA impossible */}
          {isMobile && downloadStatus.apk !== 'available' && !canInstallPWA && (
            <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-10 h-10 text-yellow-600" />
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">Téléchargement en cours de préparation</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    L'application mobile est en cours de génération. En attendant, vous pouvez :
                  </p>
                  
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Utiliser l'application web depuis votre navigateur</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Ajouter un raccourci sur votre écran d'accueil</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <span>Revenir dans quelques heures pour télécharger l'APK</span>
                    </li>
                  </ul>
                  
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="w-full mt-3"
                  >
                    🔄 Vérifier à nouveau
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

                  <Button onClick={() => onDownload('exe')} variant="outline" className="w-full mt-3">
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
            {downloadStatus.apk === 'available' ? (
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Autorisez l'installation depuis des sources inconnues</li>
                <li>Ouvrez le fichier téléchargé et suivez les instructions</li>
                <li>L'icône apparaîtra sur votre écran d'accueil</li>
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">
                L'application sera accessible comme une app native avec son icône sur l'écran d'accueil.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DownloadAppButton;

