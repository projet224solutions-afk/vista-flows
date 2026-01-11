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
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // 1) Listener global (au cas où l'événement arrive très tôt)
    initPWAInstallPromptListener();

    // Détection iOS
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
    setIsIOS(ios);
    setIsSafari(safari);

    // 2) Détection installation (standalone)
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // iOS Safari standalone mode
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkIfInstalled();

    // 3) Sync installable depuis le singleton
    const syncInstallable = () => {
      const state = getPWAInstallPromptState();
      // Sur iOS, on considère toujours "installable" via instructions manuelles
      // même si beforeinstallprompt n'est pas supporté
      if (ios) {
        setIsInstallable(true);
      } else {
        setIsInstallable(state.isInstallable);
      }
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
    isIOS,
    isSafari,
    promptInstall,
  };
}
