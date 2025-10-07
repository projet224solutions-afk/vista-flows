/**
 * PAGE D'INSTALLATION PWA BUREAU SYNDICAT
 * Détection automatique d'appareil et installation
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    User
} from 'lucide-react';
import { isMobile, isAndroid, isIOS, isDesktop } from 'react-device-detect';
import { installLinkService } from '@/services/installLinkService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface BureauData {
    id: string;
    bureau_code: string;
    prefecture: string;
    commune: string;
    president_name: string;
    president_email: string;
    president_phone?: string;
}

export default function SyndicatInstall() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [bureauData, setBureauData] = useState<BureauData | null>(null);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop' | 'mobile'>('mobile');

    useEffect(() => {
        // Détecter le type d'appareil
        if (isAndroid) setDeviceType('android');
        else if (isIOS) setDeviceType('ios');
        else if (isDesktop) setDeviceType('desktop');
        else if (isMobile) setDeviceType('mobile');

        // Valider le token et charger les données
        if (token) {
            validateTokenAndLoadData();
        } else {
            setError('Token d\'installation manquant');
            setValidating(false);
            setLoading(false);
        }
    }, [token]);

    const validateTokenAndLoadData = async () => {
        try {
            setValidating(true);

            // Valider le token
            const validation = await installLinkService.validateInstallToken(token!);

            if (!validation.valid) {
                setError(validation.error || 'Token invalide');
                return;
            }

            // Charger les données du bureau
            const { data: bureau, error: bureauError } = await supabase
                .from('syndicate_bureaus')
                .select('*')
                .eq('id', validation.bureauId)
                .single();

            if (bureauError || !bureau) {
                setError('Bureau syndical introuvable');
                return;
            }

            setBureauData(bureau);

            // Marquer le token comme utilisé
            await installLinkService.markTokenAsUsed(token!);

            toast.success('✅ Token validé avec succès !', {
                description: 'Redirection vers l\'interface Bureau Syndicat'
            });

        } catch (error) {
            console.error('❌ Erreur validation:', error);
            setError('Erreur lors de la validation du token');
        } finally {
            setValidating(false);
            setLoading(false);
        }
    };

    const handleInstall = () => {
        // Rediriger vers l'interface Bureau Syndicat
        navigate(`/syndicat/president/${bureauData?.id}`);
    };

    const getDeviceIcon = () => {
        switch (deviceType) {
            case 'android':
                return <Smartphone className="w-8 h-8 text-green-600" />;
            case 'ios':
                return <Smartphone className="w-8 h-8 text-blue-600" />;
            case 'desktop':
                return <Monitor className="w-8 h-8 text-purple-600" />;
            default:
                return <Smartphone className="w-8 h-8 text-gray-600" />;
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
                return <Badge className="bg-gray-100 text-gray-800">Mobile</Badge>;
        }
    };

    const getInstallInstructions = () => {
        switch (deviceType) {
            case 'android':
                return {
                    title: 'Installation sur Android',
                    steps: [
                        'Appuyez sur le bouton "Installer" ci-dessous',
                        'Confirmez l\'installation dans la popup',
                        'L\'application sera ajoutée à votre écran d\'accueil'
                    ]
                };
            case 'ios':
                return {
                    title: 'Installation sur iOS',
                    steps: [
                        'Appuyez sur le bouton "Partager" (📤) en bas de l\'écran',
                        'Faites défiler et sélectionnez "Ajouter à l\'écran d\'accueil"',
                        'Appuyez sur "Ajouter" pour installer l\'application'
                    ]
                };
            case 'desktop':
                return {
                    title: 'Installation sur Desktop',
                    steps: [
                        'Cliquez sur le bouton "Installer" ci-dessous',
                        'Confirmez l\'installation dans la popup du navigateur',
                        'L\'application sera ajoutée à votre bureau'
                    ]
                };
            default:
                return {
                    title: 'Installation sur Mobile',
                    steps: [
                        'Suivez les instructions d\'installation de votre appareil',
                        'L\'application sera ajoutée à votre écran d\'accueil'
                    ]
                };
        }
    };

    if (loading || validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold mb-2">
                            {validating ? 'Validation du token...' : 'Chargement...'}
                        </h2>
                        <p className="text-gray-600">
                            {validating ? 'Vérification de votre lien d\'installation' : 'Préparation de l\'interface'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-red-800 mb-2">Erreur d'installation</h2>
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button
                            onClick={() => navigate('/')}
                            variant="outline"
                            className="border-red-300 text-red-700"
                        >
                            Retour à l'accueil
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const instructions = getInstallInstructions();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Building2 className="w-10 h-10 text-blue-600" />
                            <h1 className="text-3xl font-bold text-gray-900">
                                Bureau Syndicat 224Solutions
                            </h1>
                        </div>
                        <p className="text-gray-600">
                            Installation de votre application Bureau Syndicat
                        </p>
                    </div>

                    {/* Détection d'appareil */}
                    <Card className="mb-6">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getDeviceIcon()}
                                    <div>
                                        <h3 className="font-semibold">Appareil détecté</h3>
                                        <p className="text-sm text-gray-600">
                                            {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
                                        </p>
                                    </div>
                                </div>
                                {getDeviceBadge()}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Informations du bureau */}
                    {bureauData && (
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    Informations du Bureau
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-gray-500" />
                                        <span className="font-medium">{bureauData.bureau_code}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">📍</span>
                                        <span>{bureauData.prefecture} - {bureauData.commune}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span>Président: {bureauData.president_name}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Instructions d'installation */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>{instructions.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {instructions.steps.map((step, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-700">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bouton d'installation */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold mb-4">
                                    Prêt à installer l'application ?
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Cliquez sur le bouton ci-dessous pour accéder à votre interface Bureau Syndicat
                                </p>

                                <Button
                                    onClick={handleInstall}
                                    size="lg"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                                >
                                    {deviceType === 'ios' ? (
                                        <>
                                            <Share className="w-5 h-5 mr-2" />
                                            Accéder à l'interface
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5 mr-2" />
                                            Installer l'application
                                        </>
                                    )}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>

                                <p className="text-xs text-gray-500 mt-4">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    Cette session est sécurisée et temporaire
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
