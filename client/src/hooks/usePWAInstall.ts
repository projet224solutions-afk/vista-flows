/**
 * HOOK PWA INSTALL - DÉTECTION ET INSTALLATION AUTOMATIQUE
 * Gère l'installation PWA avec détection d'appareil
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { isMobile, isAndroid, isIOS, isDesktop } from 'react-device-detect';

export interface InstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAInstallState {
    isInstallable: boolean;
    isInstalled: boolean;
    deferredPrompt: InstallPromptEvent | null;
}

export function usePWAInstall() {
<<<<<<< HEAD:src/hooks/usePWAInstall.ts
    const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
=======
    const [installState, setInstallState] = useState<PWAInstallState>({
        isInstallable: false,
        isInstalled: false,
        deviceType: 'unknown',
        installPrompt: null,
        showInstallBanner: false
    });

    const [needRefresh, setNeedRefresh] = useState(false);
    const updateServiceWorker = () => {};
>>>>>>> 33b42bafcc846916b3f76992c9af5e7e0240830e:client/src/hooks/usePWAInstall.ts

    // Détecte si l'app est déjà installée
    useEffect(() => {
        const checkInstalled = () => {
            // Mode standalone signifie que l'app est installée
            const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
            const isInIosStandaloneMode = (window.navigator as any).standalone === true;
            
            setIsInstalled(isInStandaloneMode || isInIosStandaloneMode);
        };

        checkInstalled();
    }, []);

    // Écoute l'événement beforeinstallprompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const event = e as InstallPromptEvent;
            setDeferredPrompt(event);
            setIsInstallable(true);
            console.log('📱 PWA installable détecté');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // Fonction pour déclencher l'installation
    const promptInstall = async (): Promise<boolean> => {
        if (!deferredPrompt) {
            console.warn('❌ Aucune prompt d\'installation disponible');
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            console.log(`✅ Installation ${outcome === 'accepted' ? 'acceptée' : 'refusée'}`);
            
            setDeferredPrompt(null);
            setIsInstallable(false);
            
            return outcome === 'accepted';
        } catch (error) {
            console.error('❌ Erreur lors de l\'installation:', error);
            return false;
        }
    };

    // Détecte le type de plateforme
    const getPlatform = (): string => {
        if (isIOS) return 'ios';
        if (isAndroid) return 'android';
        if (isDesktop) return 'desktop';
        return 'unknown';
    };

    // Instructions spécifiques iOS (Safari)
    const getIOSInstructions = () => {
        return {
            canInstall: isIOS && !isInstalled,
            instructions: [
                'Appuyez sur le bouton Partager',
                'Sélectionnez "Sur l\'écran d\'accueil"',
                'Appuyez sur "Ajouter"'
            ]
        };
    };

    return {
        isInstallable,
        isInstalled,
        deferredPrompt,
        promptInstall,
        platform: getPlatform(),
        isMobile,
        isAndroid,
        isIOS,
        isDesktop,
        iosInstructions: getIOSInstructions(),
        canShowPrompt: isInstallable && !isInstalled && deferredPrompt !== null
    };
}

export default usePWAInstall;
