/**
 * INTÉGRATION PWA BUREAU SYNDICAT
 * Composant d'installation PWA avec détection automatique
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Download,
    Smartphone,
    Monitor,
    CheckCircle,
    AlertTriangle,
    Building2,
    Shield,
    ArrowRight,
    Share,
    Plus,
    Clock,
    User,
    Wifi,
    WifiOff
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import PWAInstallBanner from '@/components/pwa/PWAInstallBanner';
import { toast } from 'sonner';

interface SyndicatePWAIntegrationProps {
    bureauId: string;
    bureauName: string;
    presidentName: string;
    isOnline?: boolean;
}

export default function SyndicatePWAIntegration({
    bureauId,
    bureauName,
    presidentName,
    isOnline = true
}: SyndicatePWAIntegrationProps) {
    const {
        isInstallable,
        isInstalled,
        deviceType,
        showInstallBanner,
        installApp,
        getInstallButtonText,
        getInstallInstructions,
        needRefresh,
        updateServiceWorker
    } = usePWAInstall();

    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    useEffect(() => {
        // Afficher le prompt d'installation si l'app n'est pas installée
        if (!isInstalled && isInstallable) {
            setShowInstallPrompt(true);
        }
    }, [isInstalled, isInstallable]);

    const handleInstall = async () => {
        try {
            const success = await installApp();
            if (success) {
                toast.success('✅ Installation lancée !', {
                    description: 'L\'application Bureau Syndicat sera installée sur votre appareil'
                });
                setShowInstallPrompt(false);
            }
        } catch (error) {
            console.error('Erreur installation:', error);
            toast.error('❌ Erreur lors de l\'installation');
        }
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
    };

    const handleUpdate = () => {
        updateServiceWorker(true);
        toast.success('🔄 Mise à jour en cours...');
    };

    const getDeviceIcon = () => {
        switch (deviceType) {
            case 'android':
                return <Smartphone className="w-6 h-6 text-green-600" />;
            case 'ios':
                return <Smartphone className="w-6 h-6 text-blue-600" />;
            case 'desktop':
                return <Monitor className="w-6 h-6 text-purple-600" />;
            default:
                return <Smartphone className="w-6 h-6 text-gray-600" />;
        }
    };

    const getDeviceBadge = () => {
        switch (deviceType) {
            case 'android':
                return <Badge className="bg-green-100 text-green-800">Android</Badge>;
            case 'ios':
                return <Badge className="bg-blue-100 text-blue-800">iOS</Badge>;
            case 'desktop':
                return <Badge className="bg-purple-100 text-purple-800">Desktop</Badge>;
            default:
                return <Badge className="bg-gray-100 text-gray-800">Appareil</Badge>;
        }
    };

    // Si l'app est déjà installée, afficher le statut
    if (isInstalled) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                                <h3 className="font-semibold text-green-900">Application installée</h3>
                                <p className="text-sm text-green-700">
                                    Bureau Syndicat {bureauName} - {presidentName}
                                </p>
                            </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Installé
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Bannière de mise à jour
    if (needRefresh) {
        return (
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-blue-600" />
                            <div>
                                <h3 className="font-semibold text-blue-900">Mise à jour disponible</h3>
                                <p className="text-sm text-blue-700">
                                    Une nouvelle version de l'application est disponible
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleUpdate}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Mettre à jour
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Bannière d'installation
    if (showInstallPrompt && isInstallable) {
        return (
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {getDeviceIcon()}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-blue-900">
                                        Installer l'application Bureau Syndicat
                                    </h3>
                                    {getDeviceBadge()}
                                </div>
                                <p className="text-sm text-blue-700">
                                    {getInstallInstructions()}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Bureau: {bureauName} • Président: {presidentName}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleInstall}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {deviceType === 'ios' ? (
                                    <>
                                        <Share className="w-4 h-4 mr-2" />
                                        Ajouter à l'écran d'accueil
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Installer l'application
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                variant="outline"
                                size="sm"
                                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                Plus tard
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Statut hors ligne
    if (!isOnline) {
        return (
            <Alert className="border-yellow-200 bg-yellow-50">
                <WifiOff className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                    <strong>Mode hors ligne</strong> - Certaines fonctionnalités peuvent être limitées
                </AlertDescription>
            </Alert>
        );
    }

    // Statut en ligne normal
    return (
        <Alert className="border-green-200 bg-green-50">
            <Wifi className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
                <strong>Mode en ligne</strong> - Toutes les fonctionnalités sont disponibles
            </AlertDescription>
        </Alert>
    );
}
