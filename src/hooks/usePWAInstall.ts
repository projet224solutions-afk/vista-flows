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
    deviceType: 'android' | 'ios' | 'desktop' | 'unknown';
    installPrompt: InstallPromptEvent | null;
    showInstallBanner: boolean;
}

export function usePWAInstall() {
    const [installState, setInstallState] = useState<PWAInstallState>({
        isInstallable: false,
        isInstalled: false,
        deviceType: 'unknown',
        installPrompt: null,
        showInstallBanner: false
    });

    const [needRefresh, setNeedRefresh] = useState(false);
    const updateServiceWorker = () => {};

    useEffect(() => {
        // Détecter le type d'appareil
        let deviceType: 'android' | 'ios' | 'desktop' | 'unknown' = 'unknown';
        if (isAndroid) deviceType = 'android';
        else if (isIOS) deviceType = 'ios';
        else if (isDesktop) deviceType = 'desktop';

        // Vérifier si l'app est déjà installée
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setInstallState(prev => ({
            ...prev,
            deviceType,
            isInstalled
        }));

        // Gérer l'événement beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as InstallPromptEvent;

            setInstallState(prev => ({
                ...prev,
                isInstallable: true,
                installPrompt: promptEvent,
                showInstallBanner: true
            }));
        };

        // Gérer l'événement appinstalled
        const handleAppInstalled = () => {
            setInstallState(prev => ({
                ...prev,
                isInstalled: true,
                showInstallBanner: false
            }));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!installState.installPrompt) {
            // Pour iOS, afficher les instructions d'installation
            if (installState.deviceType === 'ios') {
                return showIOSInstallInstructions();
            }
            return false;
        }

        try {
            await installState.installPrompt.prompt();
            const { outcome } = await installState.installPrompt.userChoice;

            if (outcome === 'accepted') {
                setInstallState(prev => ({
                    ...prev,
                    showInstallBanner: false
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Erreur installation:', error);
            return false;
        }
    };

    const showIOSInstallInstructions = () => {
        // Afficher les instructions pour iOS
        const instructions = `
📱 INSTALLATION SUR iOS

1. Appuyez sur le bouton "Partager" (📤) en bas de l'écran
2. Faites défiler et sélectionnez "Ajouter à l'écran d'accueil"
3. Appuyez sur "Ajouter" pour installer l'application

L'application sera alors disponible sur votre écran d'accueil !
    `;

        alert(instructions);
        return true;
    };

    const dismissInstallBanner = () => {
        setInstallState(prev => ({
            ...prev,
            showInstallBanner: false
        }));
    };

    const getInstallButtonText = () => {
        switch (installState.deviceType) {
            case 'android':
                return '📱 Installer l\'application';
            case 'ios':
                return '📱 Ajouter à l\'écran d\'accueil';
            case 'desktop':
                return '💻 Installer l\'application';
            default:
                return '📱 Installer l\'application';
        }
    };

    const getInstallInstructions = () => {
        switch (installState.deviceType) {
            case 'android':
                return 'Appuyez sur "Installer" pour ajouter l\'application à votre écran d\'accueil';
            case 'ios':
                return 'Appuyez sur le bouton Partager (📤) puis "Ajouter à l\'écran d\'accueil"';
            case 'desktop':
                return 'Cliquez sur "Installer" pour ajouter l\'application à votre bureau';
            default:
                return 'Installez l\'application pour une meilleure expérience';
        }
    };

    return {
        ...installState,
        installApp,
        dismissInstallBanner,
        getInstallButtonText,
        getInstallInstructions,
        needRefresh,
        updateServiceWorker
    };
}
