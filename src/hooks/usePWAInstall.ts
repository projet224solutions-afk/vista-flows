import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    const checkIfInstalled = () => {
      // Mode standalone = installé
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // iOS Safari
      const isIOSStandalone = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkIfInstalled();

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('✅ [PWA] Événement beforeinstallprompt détecté');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Écouter l'installation
    const handleAppInstalled = () => {
      console.log('✅ [PWA] Application installée!');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ [PWA] Pas de prompt disponible');
      return false;
    }

    try {
      console.log('📱 [PWA] Affichage prompt installation...');
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      console.log(`🎯 [PWA] Choix utilisateur: ${choiceResult.outcome}`);
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      setDeferredPrompt(null);
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('❌ [PWA] Erreur installation:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall
  };
}
