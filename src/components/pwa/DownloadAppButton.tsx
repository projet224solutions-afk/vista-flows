/**
 * COMPOSANT: DownloadAppButton
 * Bouton de téléchargement APK/EXE avec génération automatique
 * Version: 3.0 - Avec support génération locale
 */

import { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  useEffect(() => {
    // Détection mobile
    const mobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Vérifier la disponibilité des fichiers
    checkFileAvailability();
  }, []);

  const checkFileAvailability = async () => {
    try {
      // Vérifier APK
      const apkResponse = await fetch(DOWNLOAD_CONFIG.apk.url, { method: 'HEAD' });
      // Vérifier EXE
      const exeResponse = await fetch(DOWNLOAD_CONFIG.exe.url, { method: 'HEAD' });

      setDownloadStatus({
        apk: apkResponse.ok ? 'available' : 'unavailable',
        exe: exeResponse.ok ? 'available' : 'unavailable'
      });
    } catch (error) {
      console.error('Erreur vérification fichiers:', error);
      setDownloadStatus({
        apk: 'unavailable',
        exe: 'unavailable'
      });
    }
  };

  const handleDownload = (type: 'apk' | 'exe') => {
    const config = DOWNLOAD_CONFIG[type];
    window.open(config.url, '_blank');
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
  isMobile: boolean;
}

function DownloadDialog({ open, onOpenChange, downloadStatus, onDownload, isMobile }: DownloadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-6 h-6 text-primary" />
            Télécharger 224Solutions
          </DialogTitle>
          <DialogDescription>
            Choisissez la version adaptée à votre appareil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* APK Android */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <Smartphone className="w-10 h-10 text-green-600" />
              <div className="flex-1">
                <h4 className="font-semibold text-lg">Version Android</h4>
                <p className="text-sm text-muted-foreground">
                  Fichier APK • {DOWNLOAD_CONFIG.apk.size}
                </p>
                
                {downloadStatus.apk === 'checking' && (
                  <p className="text-sm text-muted-foreground mt-2">Vérification...</p>
                )}
                
                {downloadStatus.apk === 'available' ? (
                  <>
                    <Alert className="mt-3 bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Fichier disponible et prêt à télécharger
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={() => onDownload('apk')}
                      className="w-full mt-3 bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger APK
                    </Button>
                  </>
                ) : downloadStatus.apk === 'unavailable' ? (
                  <Alert className="mt-3" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Fichier en cours de génération. Réessayez dans quelques minutes.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            </div>
          </div>

          {/* EXE Windows */}
          {!isMobile && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <Monitor className="w-10 h-10 text-blue-600" />
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">Version Windows</h4>
                  <p className="text-sm text-muted-foreground">
                    Installateur EXE • {DOWNLOAD_CONFIG.exe.size}
                  </p>
                  
                  {downloadStatus.exe === 'checking' && (
                    <p className="text-sm text-muted-foreground mt-2">Vérification...</p>
                  )}
                  
                  {downloadStatus.exe === 'available' ? (
                    <>
                      <Alert className="mt-3 bg-blue-50 border-blue-200">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          Fichier disponible et prêt à télécharger
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={() => onDownload('exe')}
                        variant="outline"
                        className="w-full mt-3"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger EXE
                      </Button>
                    </>
                  ) : downloadStatus.exe === 'unavailable' ? (
                    <Alert className="mt-3" variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Fichier en cours de génération. Réessayez dans quelques minutes.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Instructions d'installation</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Téléchargez le fichier correspondant à votre appareil</li>
              {isMobile ? (
                <>
                  <li>Autorisez l'installation depuis des sources inconnues</li>
                  <li>Ouvrez le fichier APK et suivez les instructions</li>
                </>
              ) : (
                <>
                  <li>Exécutez l'installateur téléchargé</li>
                  <li>Suivez les étapes d'installation</li>
                </>
              )}
              <li>Lancez l'application depuis votre écran d'accueil</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DownloadAppButton;
