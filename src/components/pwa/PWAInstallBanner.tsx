/**
 * BANNIÈRE D'INSTALLATION PWA - DÉTECTION AUTOMATIQUE D'APPAREIL
 * Interface d'installation avec détection Android/iOS/Desktop
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Download,
    Smartphone,
    Monitor,
    X,
    CheckCircle,
    Share,
    Plus,
    ArrowDown,
    Sparkles
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

interface PWAInstallBannerProps {
    onInstall?: () => void;
    onDismiss?: () => void;
    showOnlyWhenInstallable?: boolean;
}

export default function PWAInstallBanner({
    onInstall,
    onDismiss,
    showOnlyWhenInstallable = false
}: PWAInstallBannerProps) {
    const {
        isInstallable,
        isInstalled,
        promptInstall,
        platform,
        isMobile,
        isAndroid,
        isIOS,
        isDesktop,
        iosInstructions,
        canShowPrompt
    } = usePWAInstall();

    const [isInstalling, setIsInstalling] = useState(false);
    const [showBanner, setShowBanner] = useState(true);

    // Ne pas afficher si déjà installé ou si showOnlyWhenInstallable et pas installable
    if (isInstalled || (showOnlyWhenInstallable && !canShowPrompt)) {
        return null;
    }

    // Ne pas afficher si bannière fermée
    if (!showBanner) {
        return null;
    }

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            const success = await promptInstall();
            if (success) {
                toast.success('✅ Installation lancée !', {
                    description: 'L\'application sera installée sur votre appareil'
                });
                onInstall?.();
            } else if (isIOS) {
                toast.info('📱 Instructions d\'installation', {
                    description: iosInstructions.instructions.join(' • ')
                });
            }
        } catch (error) {
            console.error('Erreur installation:', error);
            toast.error('❌ Erreur lors de l\'installation');
        } finally {
            setIsInstalling(false);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        onDismiss?.();
    };

    const getDeviceIcon = () => {
        if (isAndroid) return <Smartphone className="w-5 h-5 text-green-600" />;
        if (isIOS) return <Smartphone className="w-5 h-5 text-blue-600" />;
        if (isDesktop) return <Monitor className="w-5 h-5 text-purple-600" />;
        return <Download className="w-5 h-5 text-gray-600" />;
    };

    const getDeviceBadge = () => {
        if (isAndroid) return <Badge className="bg-green-100 text-green-800">Android</Badge>;
        if (isIOS) return <Badge className="bg-blue-100 text-blue-800">iOS</Badge>;
        if (isDesktop) return <Badge className="bg-purple-100 text-purple-800">Desktop</Badge>;
        return <Badge className="bg-gray-100 text-gray-800">Appareil</Badge>;
    };

    const getInstallButtonText = () => {
        if (isIOS) return 'Voir les instructions';
        return 'Installer l\'app';
    };

    const getInstallInstructions = () => {
        if (isIOS) return 'Appuyez sur Partager puis "Sur l\'écran d\'accueil"';
        if (isAndroid) return 'Installez l\'application pour un accès rapide';
        return 'Installez l\'application sur votre appareil';
    };

    return (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {getDeviceIcon()}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-blue-900">
                                    Installer l'application Bureau Syndicat
                                </h3>
                                {getDeviceBadge()}
                            </div>
                            <p className="text-sm text-blue-700">
                                {getInstallInstructions()}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleInstall}
                            disabled={isInstalling}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isInstalling ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Installation...
                                </>
                            ) : (
                                <>
                                     {isIOS ? (
                                         <Share className="w-4 h-4 mr-2" />
                                     ) : (
                                         <Download className="w-4 h-4 mr-2" />
                                     )}
                                    {getInstallButtonText()}
                                </>
                            )}
                        </Button>
                <Button
                    onClick={handleDismiss}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                    <X className="w-4 h-4" />
                </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
