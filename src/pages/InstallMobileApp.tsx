/**
 * PAGE D'INSTALLATION PWA
 * Guide l'utilisateur pour installer l'application sur son tÃ©lÃ©phone
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, Check, Apple, Chrome, MoreVertical, Share, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function InstallMobileApp() {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    
    // DÃ©tecter iOS
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    
    // DÃ©tecter Android
    setIsAndroid(/Android/.test(ua));
    
    // Desktop = ni iOS ni Android
    setIsDesktop(!(/iPad|iPhone|iPod|Android/.test(ua)));
    
    console.log('ðŸ“± [Install Page] Device detection:', {
      isIOS: /iPad|iPhone|iPod/.test(ua),
      isAndroid: /Android/.test(ua),
      isInstallable,
      isInstalled
    });
  }, [isInstallable, isInstalled]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await promptInstall();
      if (success) {
        toast.success('âœ… Application installÃ©e avec succÃ¨s!');
      }
    } else {
      toast.info('Suivez les instructions ci-dessous pour installer l\'application');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        {/* En-tÃªte */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-3xl shadow-2xl">
              <Smartphone className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Installer 224Solutions
          </h1>
          <p className="text-gray-600 text-lg">
            AccÃ©dez rapidement Ã  vos services prÃ©fÃ©rÃ©s
          </p>
        </div>

        {/* Statut d'installation */}
        {isInstalled ? (
          <Card className="bg-primary-blue-50 border-primary-orange-200 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary-blue-600 p-3 rounded-full">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-primary-orange-900">Application dÃ©jÃ  installÃ©e!</p>
                  <p className="text-sm text-primary-orange-700">Vous pouvez la retrouver sur votre Ã©cran d'accueil</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Bouton d'installation automatique (si disponible) */}
            {isInstallable && (
              <Card className="border-2 border-primary shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 bg-primary-orange-100 text-primary-orange-700 rounded-full text-sm font-medium mb-2">
                      âœ¨ Installation rapide disponible
                    </span>
                  </div>
                  <Button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-14 text-lg shadow-lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Installer maintenant
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Instructions pour Android Chrome */}
            {isAndroid && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="w-5 h-5 text-primary-orange-600" />
                    Installation sur Android
                  </CardTitle>
                  <CardDescription>
                    {isInstallable 
                      ? 'Cliquez sur le bouton ci-dessus ou suivez ces Ã©tapes'
                      : 'Suivez ces Ã©tapes simples'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Ouvrez le menu Chrome</p>
                        <div className="flex items-center gap-2 mt-1 text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                          <span className="text-sm">Appuyez sur les 3 points en haut Ã  droite</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">SÃ©lectionnez "Installer l'application"</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Ou "Ajouter Ã  l'Ã©cran d'accueil"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Confirmez l'installation</p>
                        <p className="text-sm text-gray-600 mt-1">
                          L'icÃ´ne apparaÃ®tra sur votre Ã©cran d'accueil
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bouton pour rafraÃ®chir si le prompt n'apparaÃ®t pas */}
                  {!isInstallable && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg mb-3">
                        ðŸ’¡ Si vous ne voyez pas l'option "Installer", essayez de rafraÃ®chir la page ou utilisez le menu du navigateur.
                      </p>
                      <Button onClick={handleRefresh} variant="outline" className="w-full gap-2">
                        <RefreshCw className="w-4 h-4" />
                        RafraÃ®chir la page
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions pour iOS */}
            {isIOS && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="w-5 h-5" />
                    Installation sur iPhone/iPad
                  </CardTitle>
                  <CardDescription>Suivez ces Ã©tapes simples dans Safari</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      ðŸ“± Assurez-vous d'utiliser Safari pour cette installation
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Appuyez sur le bouton Partager</p>
                        <div className="flex items-center gap-2 mt-1 text-gray-600">
                          <Share className="w-4 h-4" />
                          <span className="text-sm">En bas de l'Ã©cran Safari</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">SÃ©lectionnez "Sur l'Ã©cran d'accueil"</p>
                        <div className="flex items-center gap-2 mt-1 text-gray-600">
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">Faites dÃ©filer pour trouver cette option</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Appuyez sur "Ajouter"</p>
                        <p className="text-sm text-gray-600 mt-1">
                          En haut Ã  droite de l'Ã©cran
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions pour Desktop */}
            {isDesktop && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="w-5 h-5 text-blue-600" />
                    Installation sur ordinateur
                  </CardTitle>
                  <CardDescription>Installez l'application sur votre bureau</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Cherchez l'icÃ´ne d'installation</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Dans la barre d'adresse de Chrome (icÃ´ne +)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Ou utilisez le menu Chrome</p>
                        <p className="text-sm text-gray-600 mt-1">
                          â‹® â†’ "Installer 224Solutions..."
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Avantages */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Pourquoi installer l'application ?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary-orange-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-primary-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">AccÃ¨s rapide</p>
                  <p className="text-sm text-gray-600">Lancez l'app directement depuis votre Ã©cran d'accueil</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary-orange-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-primary-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Mode hors ligne</p>
                  <p className="text-sm text-gray-600">Consultez vos courses et commandes mÃªme sans connexion</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary-orange-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-primary-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Notifications</p>
                  <p className="text-sm text-gray-600">Recevez les alertes en temps rÃ©el</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary-orange-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-primary-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">0 Mo d'espace</p>
                  <p className="text-sm text-gray-600">LÃ©ger, rapide, sans tÃ©lÃ©chargement lourd</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bouton retour */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto"
          >
            Retour Ã  l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
