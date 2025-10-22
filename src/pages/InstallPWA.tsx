/**
 * PAGE D'INSTALLATION PWA SÉCURISÉE
 * Installation automatique du bureau syndicat via lien JWT
 * 224SOLUTIONS - Bureau Syndicat PWA
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Monitor,
  Shield,
  WifiOff,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { initializeDualSync } from '@/lib/dualSyncManager';

export default function InstallPWA() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [bureauData, setBureauData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const {
    isInstallable,
    isInstalled,
    platform,
    isMobile,
    promptInstall
  } = usePWAInstall();

  /**
   * Valide le token JWT et récupère les données du bureau
   */
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Lien d\'installation invalide - Token manquant');
        setValidating(false);
        return;
      }

      try {
        // Vérifier le token via edge function
        const { data, error: verifyError } = await supabase.functions.invoke(
          'verify-bureau-token',
          {
            body: { token }
          }
        );

        if (verifyError) throw verifyError;

        if (data.valid && data.bureau) {
          setIsValid(true);
          setBureauData(data.bureau);
          toast.success('✅ Lien validé !', {
            description: `Bureau: ${data.bureau.name}`
          });

          // Si installable, proposer l'installation automatique après 2 secondes
          if (isInstallable && !isInstalled) {
            setTimeout(() => {
              handleAutoInstall();
            }, 2000);
          }
        } else {
          setError('Token invalide ou expiré');
        }
      } catch (err: any) {
        console.error('Erreur validation token:', err);
        setError(err.message || 'Erreur lors de la validation du lien');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token, isInstallable, isInstalled]);

  /**
   * Installation automatique de la PWA
   */
  const handleAutoInstall = async () => {
    setInstalling(true);

    try {
      const success = await promptInstall();

      if (success) {
        // Initialiser la synchronisation dual
        initializeDualSync();

        // Enregistrer l'installation dans Supabase
        await (supabase as any).from('pwa_installations').insert({
          bureau_id: bureauData.id,
          installed_at: new Date().toISOString(),
          platform: platform || 'unknown',
          is_mobile: isMobile
        });

        toast.success('🎉 Application installée !', {
          description: 'Vous pouvez maintenant l\'utiliser hors ligne'
        });

        // Rediriger vers le dashboard bureau après 2 secondes
        setTimeout(() => {
          navigate(`/bureau?token=${token}`);
        }, 2000);
      } else {
        toast.info('Installation annulée', {
          description: 'Vous pouvez l\'installer plus tard depuis le menu'
        });
      }
    } catch (error: any) {
      console.error('Erreur installation:', error);
      toast.error('Erreur lors de l\'installation');
    } finally {
      setInstalling(false);
    }
  };

  /**
   * Installation manuelle
   */
  const handleManualInstall = async () => {
    await handleAutoInstall();
  };

  /**
   * Continuer sans installer
   */
  const handleContinueWithoutInstall = () => {
    if (bureauData) {
      navigate(`/bureau?token=${token}`);
    }
  };

  // État de chargement
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Validation en cours...</h2>
            <p className="text-gray-600">Vérification de votre lien d'accès</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erreur de validation
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold mb-2 text-red-900">Lien invalide</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Application déjà installée
  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-xl font-semibold mb-2 text-green-900">Déjà installée</h2>
            <p className="text-gray-600 mb-6">
              L'application Bureau Syndicat est déjà installée sur cet appareil
            </p>
            <Button onClick={handleContinueWithoutInstall} className="w-full">
              Ouvrir l'application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Page d'installation principale
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-blue-200 shadow-2xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Download className="w-8 h-8" />
            Installer Bureau Syndicat
          </CardTitle>
          <CardDescription className="text-blue-100">
            Application hors ligne 224Solutions
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* Informations du bureau */}
          {bureauData && (
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="w-4 h-4 text-blue-600" />
              <AlertDescription>
                <strong className="text-blue-900">Bureau: {bureauData.name}</strong>
                <p className="text-sm text-blue-700 mt-1">
                  {bureauData.prefecture} - {bureauData.commune}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Type d'appareil */}
          <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg">
            {isMobile ? (
              <Smartphone className="w-6 h-6 text-blue-600" />
            ) : (
              <Monitor className="w-6 h-6 text-blue-600" />
            )}
            <span className="font-medium">
              Installation sur {platform || (isMobile ? 'Mobile' : 'Desktop')}
            </span>
          </div>

          {/* Fonctionnalités */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">✨ Fonctionnalités incluses :</h3>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <WifiOff className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Mode hors ligne complet</p>
                  <p className="text-sm text-green-700">
                    Enregistrez des motos, gérez les membres même sans Internet
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Synchronisation automatique</p>
                  <p className="text-sm text-blue-700">
                    Vos données se synchronisent dès que vous êtes en ligne
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Database className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">Double sauvegarde</p>
                  <p className="text-sm text-purple-700">
                    Données stockées dans Firestore ET Supabase
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-900">Sécurité maximale</p>
                  <p className="text-sm text-orange-700">
                    Cryptage AES-256 des données locales
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3 pt-4">
            {isInstallable ? (
              <Button
                onClick={handleManualInstall}
                disabled={installing}
                className="w-full h-14 text-lg"
                size="lg"
              >
                {installing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Installation en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Installer maintenant
                  </>
                )}
              </Button>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Installation non disponible</strong>
                  <p className="text-sm mt-1">
                    Votre navigateur ne supporte pas l'installation PWA. 
                    Essayez avec Chrome, Edge ou Safari.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleContinueWithoutInstall}
              variant="outline"
              className="w-full"
            >
              Continuer sans installer
            </Button>
          </div>

          {/* Instructions iOS/Android */}
          {isMobile && !isInstallable && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm">
                <strong className="text-blue-900">Installation manuelle :</strong>
                <ul className="mt-2 space-y-1 text-blue-700">
                  {platform === 'iOS' ? (
                    <>
                      <li>1. Appuyez sur le bouton Partager (⬆️)</li>
                      <li>2. Faites défiler et appuyez sur "Sur l'écran d'accueil"</li>
                      <li>3. Appuyez sur "Ajouter"</li>
                    </>
                  ) : (
                    <>
                      <li>1. Appuyez sur le menu (⋮)</li>
                      <li>2. Sélectionnez "Installer l'application"</li>
                      <li>3. Confirmez l'installation</li>
                    </>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
