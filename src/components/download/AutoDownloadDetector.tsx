/**
 * DÃ‰TECTEUR AUTOMATIQUE DE TÃ‰LÃ‰CHARGEMENT
 * DÃ©tecte l'OS de l'utilisateur et propose la version appropriÃ©e
 * 224Solutions - Auto Download System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Download,
    Smartphone,
    Monitor,
    Tablet,
    Apple,
    Chrome,
    Zap,
    CheckCircle,
    ExternalLink,
    QrCode,
    Globe,
    Wifi,
    WifiOff
} from "lucide-react";
import { toast } from "sonner";

interface DownloadOption {
    platform: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    fileSize: string;
    downloadUrl: string;
    installInstructions: string[];
    requirements: string[];
    features: string[];
}

interface DeviceInfo {
    os: string;
    browser: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
}

export default function AutoDownloadDetector() {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
    const [recommendedDownload, setRecommendedDownload] = useState<DownloadOption | null>(null);
    const [allDownloads, setAllDownloads] = useState<DownloadOption[]>([]);
    const [showAllOptions, setShowAllOptions] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        detectDevice();
        setupDownloadOptions();
        
        // Ã‰couter les changements de connexion
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /**
     * DÃ©tecte les informations de l'appareil
     */
    const detectDevice = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        let os = 'unknown';
        let browser = 'unknown';
        
        // DÃ©tection de l'OS
        if (userAgent.includes('android')) {
            os = 'android';
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            os = 'ios';
        } else if (platform.includes('win')) {
            os = 'windows';
        } else if (platform.includes('mac')) {
            os = 'macos';
        } else if (platform.includes('linux')) {
            os = 'linux';
        }
        
        // DÃ©tection du navigateur
        if (userAgent.includes('chrome')) {
            browser = 'chrome';
        } else if (userAgent.includes('firefox')) {
            browser = 'firefox';
        } else if (userAgent.includes('safari')) {
            browser = 'safari';
        } else if (userAgent.includes('edge')) {
            browser = 'edge';
        }
        
        // DÃ©tection du type d'appareil
        const isMobile = /android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
        const isDesktop = !isMobile && !isTablet;
        
        const info: DeviceInfo = {
            os,
            browser,
            isMobile,
            isTablet,
            isDesktop
        };
        
        setDeviceInfo(info);
        console.log('ðŸ“± Appareil dÃ©tectÃ©:', info);
    };

    /**
     * Configure les options de tÃ©lÃ©chargement
     */
    const setupDownloadOptions = () => {
        const downloads: DownloadOption[] = [
            {
                platform: 'android',
                name: 'Android APK',
                icon: <Smartphone className="w-6 h-6 text-primary-orange-600" />,
                description: 'Application native Android avec toutes les fonctionnalitÃ©s',
                fileSize: '25 MB',
                downloadUrl: 'https://github.com/projet224solutions-afk/vista-flows/releases/latest/download/224solutions-android.apk',
                installInstructions: [
                    'TÃ©lÃ©chargez le fichier APK',
                    'Activez "Sources inconnues" dans ParamÃ¨tres > SÃ©curitÃ©',
                    'Ouvrez le fichier APK tÃ©lÃ©chargÃ©',
                    'Suivez les instructions d\'installation',
                    'Lancez l\'application 224Solutions'
                ],
                requirements: [
                    'Android 7.0 ou supÃ©rieur',
                    '100 MB d\'espace libre',
                    'Connexion Internet pour la synchronisation'
                ],
                features: [
                    'Interface native Android',
                    'Notifications push',
                    'Mode hors ligne',
                    'Authentification biomÃ©trique',
                    'Synchronisation automatique'
                ]
            },
            {
                platform: 'ios',
                name: 'iOS IPA',
                icon: <Apple className="w-6 h-6 text-blue-600" />,
                description: 'Application native iOS optimisÃ©e pour iPhone et iPad',
                fileSize: '30 MB',
                downloadUrl: 'https://testflight.apple.com/join/224solutions',
                installInstructions: [
                    'Installez TestFlight depuis l\'App Store',
                    'Cliquez sur le lien d\'invitation',
                    'Acceptez l\'invitation dans TestFlight',
                    'TÃ©lÃ©chargez et installez l\'app',
                    'Lancez 224Solutions depuis l\'Ã©cran d\'accueil'
                ],
                requirements: [
                    'iOS 13.0 ou supÃ©rieur',
                    '150 MB d\'espace libre',
                    'Compte Apple ID',
                    'TestFlight installÃ©'
                ],
                features: [
                    'Interface native iOS',
                    'Touch ID / Face ID',
                    'Notifications push',
                    'Mode hors ligne',
                    'Widgets iOS',
                    'Siri Shortcuts'
                ]
            },
            {
                platform: 'windows',
                name: 'Windows EXE',
                icon: <Monitor className="w-6 h-6 text-blue-500" />,
                description: 'Application desktop Windows avec interface complÃ¨te',
                fileSize: '85 MB',
                downloadUrl: 'https://github.com/projet224solutions-afk/vista-flows/releases/latest/download/224solutions-windows.exe',
                installInstructions: [
                    'TÃ©lÃ©chargez le fichier .exe',
                    'ExÃ©cutez l\'installateur en tant qu\'administrateur',
                    'Suivez l\'assistant d\'installation',
                    'CrÃ©ez un raccourci sur le bureau',
                    'Lancez 224Solutions'
                ],
                requirements: [
                    'Windows 10 ou supÃ©rieur',
                    '200 MB d\'espace libre',
                    '4 GB de RAM minimum',
                    'Connexion Internet'
                ],
                features: [
                    'Interface desktop native',
                    'Raccourcis clavier',
                    'Notifications systÃ¨me',
                    'Multi-fenÃªtres',
                    'Impression intÃ©grÃ©e',
                    'Export de donnÃ©es'
                ]
            },
            {
                platform: 'macos',
                name: 'macOS DMG',
                icon: <Apple className="w-6 h-6 text-gray-600" />,
                description: 'Application macOS optimisÃ©e pour Mac',
                fileSize: '90 MB',
                downloadUrl: 'https://github.com/projet224solutions-afk/vista-flows/releases/latest/download/224solutions-macos.dmg',
                installInstructions: [
                    'TÃ©lÃ©chargez le fichier .dmg',
                    'Montez l\'image disque',
                    'Glissez 224Solutions vers Applications',
                    'Lancez depuis le Launchpad',
                    'Autorisez l\'app dans PrÃ©fÃ©rences SystÃ¨me si nÃ©cessaire'
                ],
                requirements: [
                    'macOS 11.0 ou supÃ©rieur',
                    '200 MB d\'espace libre',
                    '4 GB de RAM minimum',
                    'Connexion Internet'
                ],
                features: [
                    'Interface native macOS',
                    'Touch Bar support',
                    'Notifications systÃ¨me',
                    'Spotlight integration',
                    'iCloud sync',
                    'Dark mode'
                ]
            },
            {
                platform: 'web',
                name: 'Application Web',
                icon: <Globe className="w-6 h-6 text-purple-600" />,
                description: 'AccÃ¨s direct via navigateur, aucune installation requise',
                fileSize: 'Streaming',
                downloadUrl: window.location.origin,
                installInstructions: [
                    'Ouvrez votre navigateur web',
                    'Visitez 224solution.net',
                    'Connectez-vous Ã  votre compte',
                    'Ajoutez Ã  l\'Ã©cran d\'accueil (optionnel)',
                    'Utilisez directement en ligne'
                ],
                requirements: [
                    'Navigateur moderne (Chrome, Firefox, Safari, Edge)',
                    'Connexion Internet stable',
                    'JavaScript activÃ©'
                ],
                features: [
                    'AccÃ¨s instantanÃ©',
                    'Toujours Ã  jour',
                    'Multi-plateforme',
                    'Aucune installation',
                    'Synchronisation temps rÃ©el',
                    'PWA compatible'
                ]
            }
        ];
        
        setAllDownloads(downloads);
        
        // Recommander la meilleure option selon l'appareil
        if (deviceInfo) {
            const recommended = downloads.find(d => d.platform === deviceInfo.os) || downloads.find(d => d.platform === 'web');
            setRecommendedDownload(recommended || downloads[downloads.length - 1]);
        }
    };

    /**
     * Lance le tÃ©lÃ©chargement
     */
    const startDownload = (download: DownloadOption) => {
        if (!isOnline && download.platform !== 'web') {
            toast.error('Connexion Internet requise', {
                description: 'Veuillez vous connecter Ã  Internet pour tÃ©lÃ©charger'
            });
            return;
        }

        toast.info(`ðŸš€ TÃ©lÃ©chargement en cours...`, {
            description: `${download.name} - ${download.fileSize}`,
            duration: 5000
        });

        // Ouvrir le lien de tÃ©lÃ©chargement
        window.open(download.downloadUrl, '_blank', 'noopener,noreferrer');

        // Afficher les instructions
        setTimeout(() => {
            toast.success('ðŸ“¥ TÃ©lÃ©chargement dÃ©marrÃ© !', {
                description: 'Consultez les instructions d\'installation ci-dessous',
                duration: 10000
            });
        }, 1000);
    };

    /**
     * GÃ©nÃ¨re un QR Code pour le tÃ©lÃ©chargement mobile
     */
    const generateQRCode = (url: string) => {
        // En production, utiliser une vraie librairie QR Code
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    };

    if (!deviceInfo) {
        return (
            <Card className="border-0 shadow-xl rounded-2xl">
                <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">DÃ©tection de votre appareil...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statut de connexion */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isOnline ? (
                        <Wifi className="w-5 h-5 text-primary-orange-600" />
                    ) : (
                        <WifiOff className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${isOnline ? 'text-primary-orange-600' : 'text-red-600'}`}>
                        {isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                </div>
                
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {deviceInfo.os.charAt(0).toUpperCase() + deviceInfo.os.slice(1)} - {deviceInfo.browser}
                </Badge>
            </div>

            {/* Recommandation automatique */}
            {recommendedDownload && (
                <Card className="border-0 shadow-xl rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-3">
                            <Zap className="w-6 h-6 text-yellow-500" />
                            RecommandÃ© pour votre appareil
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                                {recommendedDownload.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                    {recommendedDownload.name}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {recommendedDownload.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span>ðŸ“¦ {recommendedDownload.fileSize}</span>
                                    <span>ðŸ“± {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablette' : 'Desktop'}</span>
                                    <span>ðŸŒ {deviceInfo.os}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* FonctionnalitÃ©s */}
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-primary-orange-600" />
                                    FonctionnalitÃ©s
                                </h4>
                                <ul className="space-y-2">
                                    {recommendedDownload.features.slice(0, 4).map((feature, index) => (
                                        <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* PrÃ©requis */}
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-orange-600" />
                                    PrÃ©requis
                                </h4>
                                <ul className="space-y-2">
                                    {recommendedDownload.requirements.map((req, index) => (
                                        <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* QR Code pour mobile */}
                            {(deviceInfo.isMobile || deviceInfo.isTablet) && (
                                <div className="text-center">
                                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-center gap-2">
                                        <QrCode className="w-4 h-4 text-purple-600" />
                                        QR Code
                                    </h4>
                                    <img
                                        src={generateQRCode(recommendedDownload.downloadUrl)}
                                        alt="QR Code"
                                        className="w-24 h-24 mx-auto rounded-lg shadow-md"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Scannez pour tÃ©lÃ©charger</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => startDownload(recommendedDownload)}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl py-3 text-lg font-semibold shadow-lg"
                                disabled={!isOnline && recommendedDownload.platform !== 'web'}
                            >
                                <Download className="w-5 h-5 mr-2" />
                                TÃ©lÃ©charger Maintenant
                            </Button>
                            
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="rounded-xl border-gray-300 hover:bg-gray-50">
                                        Instructions
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl rounded-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-bold text-gray-800">
                                            Instructions d'installation - {recommendedDownload.name}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <ol className="space-y-3">
                                            {recommendedDownload.installInstructions.map((instruction, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <span className="text-gray-700">{instruction}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Toutes les options */}
            <Card className="border-0 shadow-xl rounded-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold text-gray-800">
                            Toutes les Versions Disponibles
                        </CardTitle>
                        <Button
                            variant="outline"
                            onClick={() => setShowAllOptions(!showAllOptions)}
                            className="rounded-xl"
                        >
                            {showAllOptions ? 'Masquer' : 'Afficher Tout'}
                        </Button>
                    </div>
                </CardHeader>
                {showAllOptions && (
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {allDownloads.map((download) => (
                                <Card key={download.platform} className="border border-gray-200 hover:shadow-lg transition-all duration-300">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            {download.icon}
                                            <h3 className="font-bold text-gray-800">{download.name}</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">{download.description}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                            <span>ðŸ“¦ {download.fileSize}</span>
                                            <Badge className="bg-gray-100 text-gray-700 text-xs">
                                                {download.platform}
                                            </Badge>
                                        </div>
                                        <Button
                                            onClick={() => startDownload(download)}
                                            variant="outline"
                                            className="w-full rounded-xl"
                                            disabled={!isOnline && download.platform !== 'web'}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            TÃ©lÃ©charger
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
