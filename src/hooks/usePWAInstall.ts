import { useState, useEffect, useCallback } from 'react';
import {
  getPWAInstallPromptState,
  initPWAInstallPromptListener,
  promptPWAInstall,
  subscribePWAInstallPrompt,
} from '@/lib/pwaInstallPrompt';

export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1) Listener global (au cas où l'événement arrive très tôt)
    initPWAInstallPromptListener();

    // 2) Détection installation (standalone)
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkIfInstalled();

    // 3) Sync installable depuis le singleton
    const syncInstallable = () => {
      const state = getPWAInstallPromptState();
      setIsInstallable(state.isInstallable);
    };

    syncInstallable();

    const unsubscribe = subscribePWAInstallPrompt(() => {
      syncInstallable();
    });

    // Re-check si le display-mode change
    const media = window.matchMedia('(display-mode: standalone)');
    const onMediaChange = () => checkIfInstalled();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onMediaChange);
    } else {
      // Safari ancien
      media.addListener(onMediaChange);
    }

    window.addEventListener('appinstalled', checkIfInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', checkIfInstalled);
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', onMediaChange);
      } else {
        media.removeListener(onMediaChange);
      }
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const outcome = await promptPWAInstall();

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      return true;
    }

    return false;
  }, []);

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
}
