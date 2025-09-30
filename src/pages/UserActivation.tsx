/**
 * 🔗 Page d'Activation Utilisateur - 224Solutions
 * 
 * Interface d'activation automatique avec détection de device
 * et téléchargement de l'application
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle, AlertCircle, Download, Smartphone,
    Monitor, Tablet, ExternalLink, ArrowRight,
    Crown, Clock, Shield, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { agentService, AgentUser } from '@/services/agentManagementService';

interface DeviceInfo {
    type: 'mobile' | 'pc' | 'tablet';
    os: string;
    browser: string;
    userAgent: string;
}

interface ActivationStep {
    id: number;
    title: string;
    description: string;
    completed: boolean;
    current: boolean;
}

export const UserActivation: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    // États
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [activated, setActivated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userData, setUserData] = useState<AgentUser | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string>('');
    const [activationProgress, setActivationProgress] = useState(0);

    const [steps, setSteps] = useState<ActivationStep[]>([
        { id: 1, title: 'Vérification du lien', description: 'Validation du token d\'invitation', completed: false, current: true },
        { id: 2, title: 'Détection du device', description: 'Identification de votre appareil', completed: false, current: false },
        { id: 3, title: 'Activation du compte', description: 'Configuration de votre profil', completed: false, current: false },
        { id: 4, title: 'Téléchargement', description: 'Obtention de l\'application', completed: false, current: false }
    ]);

    // =====================================================
    // DETECTION DE DEVICE
    // =====================================================

    const detectDevice = (): DeviceInfo => {
        const userAgent = navigator.userAgent;
        let deviceType: 'mobile' | 'pc' | 'tablet' = 'pc';
        let os = 'Unknown';
        let browser = 'Unknown';

        // Détection du type de device
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            if (/iPad/i.test(userAgent) || (window.innerWidth > 768 && /Android/i.test(userAgent))) {
                deviceType = 'tablet';
            } else {
                deviceType = 'mobile';
            }
        }

        // Détection de l'OS
        if (/Windows/i.test(userAgent)) os = 'Windows';
        else if (/Mac/i.test(userAgent)) os = 'macOS';
        else if (/Linux/i.test(userAgent)) os = 'Linux';
        else if (/Android/i.test(userAgent)) os = 'Android';
        else if (/iPhone|iPad|iPod/i.test(userAgent)) os = 'iOS';

        // Détection du navigateur
        if (/Chrome/i.test(userAgent)) browser = 'Chrome';
        else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
        else if (/Safari/i.test(userAgent)) browser = 'Safari';
        else if (/Edge/i.test(userAgent)) browser = 'Edge';
        else if (/Opera/i.test(userAgent)) browser = 'Opera';

        return { type: deviceType, os, browser, userAgent };
    };

    // =====================================================
    // SIMULATION DU PROCESSUS D'ACTIVATION
    // =====================================================

    const simulateProgress = async (stepIndex: number, duration: number = 1000) => {
        const progressPerStep = 100 / steps.length;
        const startProgress = stepIndex * progressPerStep;
        const endProgress = (stepIndex + 1) * progressPerStep;

        // Animation progressive
        const increment = (endProgress - startProgress) / (duration / 50);
        let currentProgress = startProgress;

        const interval = setInterval(() => {
            currentProgress += increment;
            setActivationProgress(Math.min(currentProgress, endProgress));

            if (currentProgress >= endProgress) {
                clearInterval(interval);

                // Marquer l'étape comme terminée
                setSteps(prev => prev.map((step, index) => ({
                    ...step,
                    completed: index <= stepIndex,
                    current: index === stepIndex + 1
                })));
            }
        }, 50);

        await new Promise(resolve => setTimeout(resolve, duration));
    };

    // =====================================================
    // PROCESSUS D'ACTIVATION
    // =====================================================

    const startActivation = async () => {
        if (!token) {
            setError('Token d\'invitation manquant');
            setLoading(false);
            return;
        }

        setActivating(true);

        try {
            // Étape 1: Vérification du token (simulation)
            await simulateProgress(0, 800);

            // Étape 2: Détection du device
            const device = detectDevice();
            setDeviceInfo(device);
            await simulateProgress(1, 600);

            // Étape 3: Activation du compte
            const result = await agentService.activateUser(token, {
                deviceType: device.type,
                userAgent: device.userAgent,
                ipAddress: '127.0.0.1' // TODO: Récupérer vraie IP
            });

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors de l\'activation');
            }

            setUserData(result.userData || null);
            setDownloadUrl(result.downloadUrl || '');
            await simulateProgress(2, 1000);

            // Étape 4: Préparation du téléchargement
            await simulateProgress(3, 500);

            setActivated(true);
            toast.success('Compte activé avec succès !');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setActivating(false);
            setLoading(false);
        }
    };

    // =====================================================
    // GESTION DU TÉLÉCHARGEMENT
    // =====================================================

    const handleDownload = () => {
        if (downloadUrl) {
            if (deviceInfo?.type === 'mobile') {
                // Pour mobile, ouvrir le store
                window.open(downloadUrl, '_blank');
            } else {
                // Pour PC, téléchargement direct
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = '224Solutions-Setup.exe';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            toast.success('Téléchargement lancé !');
        }
    };

    const getDeviceIcon = () => {
        switch (deviceInfo?.type) {
            case 'mobile': return <Smartphone className="h-8 w-8" />;
            case 'tablet': return <Tablet className="h-8 w-8" />;
            default: return <Monitor className="h-8 w-8" />;
        }
    };

    const getDeviceRecommendation = () => {
        switch (deviceInfo?.type) {
            case 'mobile':
                return {
                    title: 'Application Mobile Recommandée',
                    description: 'Téléchargez l\'app 224Solutions depuis le Play Store pour une expérience optimale sur mobile.',
                    buttonText: 'Ouvrir le Play Store',
                    color: 'text-green-600'
                };
            case 'tablet':
                return {
                    title: 'Version Tablette Disponible',
                    description: 'L\'application 224Solutions est optimisée pour votre tablette.',
                    buttonText: 'Télécharger pour Tablette',
                    color: 'text-blue-600'
                };
            default:
                return {
                    title: 'Application Desktop',
                    description: 'Téléchargez l\'application 224Solutions pour votre ordinateur.',
                    buttonText: 'Télécharger pour PC',
                    color: 'text-purple-600'
                };
        }
    };

    // =====================================================
    // EFFECTS
    // =====================================================

    useEffect(() => {
        if (token) {
            // Démarrer l'activation après un délai court pour l'UX
            setTimeout(() => {
                startActivation();
            }, 500);
        } else {
            setError('Token d\'invitation invalide');
            setLoading(false);
        }
    }, [token]);

    // =====================================================
    // RENDER
    // =====================================================

    if (loading || activating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                            <Crown className="h-8 w-8 text-yellow-500" />
                            Activation de votre compte 224Solutions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Barre de progression */}
                        <div>
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Progression</span>
                                <span>{Math.round(activationProgress)}%</span>
                            </div>
                            <Progress value={activationProgress} className="w-full" />
                        </div>

                        {/* Étapes */}
                        <div className="space-y-4">
                            {steps.map((step) => (
                                <div key={step.id} className={`flex items-center gap-4 p-3 rounded-lg ${step.completed ? 'bg-green-50' :
                                    step.current ? 'bg-blue-50' : 'bg-gray-50'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500 text-white' :
                                        step.current ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                                        }`}>
                                        {step.completed ? (
                                            <CheckCircle className="h-5 w-5" />
                                        ) : (
                                            <span className="text-sm font-medium">{step.id}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className={`font-medium ${step.completed ? 'text-green-800' :
                                            step.current ? 'text-blue-800' : 'text-gray-600'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-sm text-gray-600">{step.description}</p>
                                    </div>
                                    {step.current && (
                                        <div className="ml-auto">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Informations device (si détecté) */}
                        {deviceInfo && (
                            <Alert>
                                <Activity className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Device détecté :</strong> {deviceInfo.os} - {deviceInfo.browser} ({deviceInfo.type})
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-3 text-xl text-red-600">
                            <AlertCircle className="h-6 w-6" />
                            Erreur d'Activation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>

                        <div className="space-y-2 text-sm text-gray-600">
                            <p><strong>Causes possibles :</strong></p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Lien d'invitation expiré (7 jours)</li>
                                <li>Lien déjà utilisé</li>
                                <li>Token invalide ou corrompu</li>
                            </ul>
                        </div>

                        <Button
                            onClick={() => navigate('/auth')}
                            variant="outline"
                            className="w-full"
                        >
                            Retour à la connexion
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (activated && userData) {
        const recommendation = getDeviceRecommendation();

        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-3 text-2xl text-green-600">
                            <CheckCircle className="h-8 w-8" />
                            Compte Activé avec Succès !
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Informations utilisateur */}
                        <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Bienvenue {userData.name} !</strong> Votre compte 224Solutions est maintenant actif.
                            </AlertDescription>
                        </Alert>

                        {/* Informations device */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-blue-600">
                                    {getDeviceIcon()}
                                </div>
                                <div>
                                    <p className="font-medium">Device configuré</p>
                                    <p className="text-sm text-gray-600">
                                        {deviceInfo?.os} - {deviceInfo?.browser}
                                    </p>
                                </div>
                                <Badge variant="outline" className="ml-auto">
                                    {deviceInfo?.type}
                                </Badge>
                            </div>
                        </div>

                        {/* Recommandation de téléchargement */}
                        <div className="bg-white border-2 border-blue-200 p-6 rounded-lg">
                            <div className="flex items-start gap-4">
                                <div className={recommendation.color}>
                                    <Download className="h-8 w-8" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-2">{recommendation.title}</h3>
                                    <p className="text-gray-600 mb-4">{recommendation.description}</p>

                                    <div className="flex gap-3">
                                        <Button
                                            onClick={handleDownload}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            {recommendation.buttonText}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/auth')}
                                        >
                                            Continuer sur le Web
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Informations supplémentaires */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h4 className="font-medium text-purple-800 mb-2">🎯 Prochaines étapes</h4>
                                <ul className="space-y-1 text-purple-700">
                                    <li>• Téléchargez l'application</li>
                                    <li>• Connectez-vous avec vos identifiants</li>
                                    <li>• Explorez toutes les fonctionnalités</li>
                                </ul>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <h4 className="font-medium text-green-800 mb-2">💼 Vos avantages</h4>
                                <ul className="space-y-1 text-green-700">
                                    <li>• Accès complet à 224Solutions</li>
                                    <li>• Support client dédié</li>
                                    <li>• Mises à jour automatiques</li>
                                </ul>
                            </div>
                        </div>

                        {/* Informations de contact */}
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-blue-800">
                                <strong>Besoin d'aide ?</strong> Contactez votre agent ou notre support à
                                <a href="mailto:support@224solutions.com" className="underline ml-1">
                                    support@224solutions.com
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
};

export default UserActivation;
