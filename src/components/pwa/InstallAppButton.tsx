/**
 * =====================================================
 * COMPOSANT: InstallAppButton
 * =====================================================
 * 
 * Bouton d'installation PWA native depuis le navigateur
 * - Détecte automatiquement si l'installation PWA est possible
 * - Affiche des instructions spécifiques selon le navigateur/OS
 * - Installation directe sans téléchargement de fichiers
 * 
 * @author 224Solutions
 * @version 2.0
 */

import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle2, Share, Plus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallAppButtonProps {
  variant?: 'default' | 'compact' | 'floating';
  className?: string;
}

export function InstallAppButton({ variant = 'default', className = '' }: InstallAppButtonProps) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    setDeviceInfo({
      isIOS: /iPhone|iPad|iPod/i.test(ua),
      isAndroid: /Android/i.test(ua),
      isSafari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
      isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
      isFirefox: /Firefox/i.test(ua),
    });
  }, []);

  const handleInstallClick = async () => {
    console.log('📱 [Install] Click - isInstallable:', isInstallable);
    
    if (isInstallable) {
      const success = await promptInstall();
      console.log('📱 [Install] Prompt result:', success);
      if (!success) {
        setShowInstructions(true);
      }
    } else {
      // Pas de prompt natif disponible, montrer les instructions manuelles
      setShowInstructions(true);
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

  // Bouton flottant (pour le coin de l'écran)
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
        <InstallInstructionsDialog 
          open={showInstructions} 
          onOpenChange={setShowInstructions}
          deviceInfo={deviceInfo}
        />
      </>
    );
  }

  // Bouton compact
  if (variant === 'compact') {
    return (
      <>
        <Button
          onClick={handleInstallClick}
          size="sm"
          className={`gap-2 ${className}`}
        >
          <Download className="w-4 h-4" />
          Installer
        </Button>
        <InstallInstructionsDialog 
          open={showInstructions} 
          onOpenChange={setShowInstructions}
          deviceInfo={deviceInfo}
        />
      </>
    );
  }

  // Bouton par défaut (carte attractive)
  return (
    <>
      <div className={`bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 shadow-lg ${className}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg">Installer 224Solutions</h3>
            <p className="text-white/80 text-sm">
              Accès rapide depuis votre écran d'accueil
            </p>
          </div>
          <Button
            onClick={handleInstallClick}
            variant="secondary"
            className="gap-2 font-semibold"
          >
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

      <InstallInstructionsDialog 
        open={showInstructions} 
        onOpenChange={setShowInstructions}
        deviceInfo={deviceInfo}
      />
    </>
  );
}

// Dialog avec instructions selon le navigateur
interface InstallInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceInfo: {
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
    isChrome: boolean;
    isFirefox: boolean;
  };
}

function InstallInstructionsDialog({ open, onOpenChange, deviceInfo }: InstallInstructionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-primary" />
            Installer 224Solutions
          </DialogTitle>
          <DialogDescription>
            Suivez les étapes pour installer l'application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {deviceInfo.isIOS ? (
            // Instructions iOS/Safari
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  📱 Sur iPhone/iPad, utilisez Safari pour installer l'app
                </p>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Appuyez sur le bouton Partager</p>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <Share className="w-4 h-4" />
                    <span className="text-sm">En bas de Safari</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Faites défiler et appuyez sur</p>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">"Sur l'écran d'accueil"</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium">Appuyez sur "Ajouter"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'icône apparaîtra sur votre écran d'accueil
                  </p>
                </div>
              </div>
            </div>
          ) : deviceInfo.isAndroid || deviceInfo.isChrome ? (
            // Instructions Chrome (Android/Desktop)
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Appuyez sur le menu</p>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <MoreVertical className="w-4 h-4" />
                    <span className="text-sm">Les 3 points en haut à droite</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Sélectionnez "Installer l'application"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ou "Ajouter à l'écran d'accueil"
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium">Confirmez l'installation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'application sera disponible comme une app native
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Instructions génériques
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Ouvrez le menu de votre navigateur</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Généralement les 3 points ou lignes
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Cherchez "Installer" ou "Ajouter à l'écran"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    L'option peut varier selon le navigateur
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-center text-sm text-muted-foreground">
              💡 Une fois installée, l'app sera accessible depuis votre écran d'accueil
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InstallAppButton;
