/**
 * PAGE D'INSTALLATION PWA
 * Guide l'utilisateur pour installer l'application sur son téléphone
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, Check, Apple, Chrome } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Détecter Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info('L\'application est déjà installée ou l\'installation n\'est pas disponible');
      return;
    }

    // Afficher le prompt d'installation
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('✅ Application installée avec succès!');
      setIsInstalled(true);
    } else {
      toast.info('Installation annulée');
    }

    // Réinitialiser le prompt
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-6 rounded-3xl shadow-2xl">
              <Smartphone className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            Installer 224Solutions
          </h1>
          <p className="text-gray-600 text-lg">
            Accédez rapidement à vos services préférés
          </p>
        </div>

        {/* Statut d'installation */}
        {isInstalled ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-full">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">Application déjà installée!</p>
                  <p className="text-sm text-green-700">Vous pouvez la retrouver sur votre écran d'accueil</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Bouton d'installation Android/Chrome */}
            {deferredPrompt && (
              <Card className="border-blue-200 shadow-lg">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleInstallClick}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-14 text-lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Installer maintenant
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Instructions pour iOS */}
            {isIOS && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="w-5 h-5" />
                    Installation sur iPhone/iPad
                  </CardTitle>
                  <CardDescription>Suivez ces étapes simples</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <p className="text-sm text-gray-700">
                        Appuyez sur le bouton <strong>Partager</strong> (carré avec une flèche vers le haut) en bas de Safari
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <p className="text-sm text-gray-700">
                        Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <p className="text-sm text-gray-700">
                        Appuyez sur <strong>Ajouter</strong> en haut à droite
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions pour Android Chrome */}
            {isAndroid && !deferredPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="w-5 h-5" />
                    Installation sur Android
                  </CardTitle>
                  <CardDescription>Suivez ces étapes simples</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        1
                      </div>
                      <p className="text-sm text-gray-700">
                        Ouvrez le menu Chrome (trois points en haut à droite)
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        2
                      </div>
                      <p className="text-sm text-gray-700">
                        Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong> ou <strong>"Installer l'application"</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        3
                      </div>
                      <p className="text-sm text-gray-700">
                        Confirmez en appuyant sur <strong>Ajouter</strong>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Avantages */}
        <Card>
          <CardHeader>
            <CardTitle>Pourquoi installer l'application ?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Accès rapide</p>
                  <p className="text-sm text-gray-600">Lancez l'app directement depuis votre écran d'accueil</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Mode hors ligne</p>
                  <p className="text-sm text-gray-600">Consultez vos courses et commandes même sans connexion</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Performances optimales</p>
                  <p className="text-sm text-gray-600">Chargement ultra-rapide et expérience fluide</p>
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
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
