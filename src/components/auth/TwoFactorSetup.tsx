/**
 * 🔐 CONFIGURATION 2FA - 224SOLUTIONS
 * Composant pour configurer l'authentification à deux facteurs
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Smartphone, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  QrCode,
  Key
} from 'lucide-react';

interface TwoFactorSetupProps {
  userId: string;
  userEmail: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  userId,
  userEmail,
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup');
  const [secret, setSecret] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  // Étape 1: Configuration initiale
  useEffect(() => {
    if (step === 'setup') {
      setupTwoFactor();
    }
  }, [step]);

  const setupTwoFactor = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        setSecret(data.secret);
        setQrCode(data.qr_code);
        setBackupCodes(data.backup_codes);
        setStep('verify');
      } else {
        setError(data.error || 'Erreur configuration 2FA');
      }
    } catch (error) {
      console.error('Erreur setup 2FA:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 2: Vérification du code
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Veuillez entrer un code à 6 chiffres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          code: verificationCode,
          is_backup_code: false
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsVerified(true);
        setStep('backup');
        toast({
          title: "✅ 2FA activé",
          description: "Votre authentification à deux facteurs est maintenant active",
        });
      } else {
        setError(data.error || 'Code de vérification invalide');
      }
    } catch (error) {
      console.error('Erreur vérification 2FA:', error);
      setError('Erreur de vérification');
    } finally {
      setIsLoading(false);
    }
  };

  // Télécharger les codes de sauvegarde
  const downloadBackupCodes = () => {
    const content = `Codes de sauvegarde 2FA - ${userEmail}\n\n` +
      backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n') +
      `\n\n⚠️ IMPORTANT: Stockez ces codes dans un endroit sûr.\n` +
      `Chaque code ne peut être utilisé qu'une seule fois.\n` +
      `Généré le: ${new Date().toLocaleDateString('fr-FR')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codes-sauvegarde-2fa-${userEmail}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Copier un code de sauvegarde
  const copyBackupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copié",
      description: "Code de sauvegarde copié dans le presse-papiers",
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Configuration 2FA</h2>
        <p className="text-gray-600">
          Sécurisez votre compte avec l'authentification à deux facteurs
        </p>
      </div>

      {/* Étape 1: Configuration */}
      {step === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Configuration de l'application
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Configuration en cours...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Installez une application d'authentification comme Google Authenticator, 
                    Authy ou Microsoft Authenticator sur votre téléphone.
                  </AlertDescription>
                </Alert>
                <Button onClick={setupTwoFactor} className="w-full">
                  Commencer la configuration
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Étape 2: QR Code et vérification */}
      {step === 'verify' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Scanner le QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img 
                  src={qrCode} 
                  alt="QR Code 2FA" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Scannez ce QR Code avec votre application d'authentification
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="verification-code">Code de vérification</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Entrez le code à 6 chiffres affiché dans votre application
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={verifyCode} 
                  disabled={!verificationCode || verificationCode.length !== 6 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Vérification...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Vérifier
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 3: Codes de sauvegarde */}
      {step === 'backup' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Codes de sauvegarde
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Important:</strong> Stockez ces codes dans un endroit sûr. 
                Ils vous permettront d'accéder à votre compte si vous perdez votre téléphone.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <span className="font-mono text-sm">{code}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyBackupCode(code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
              <Button onClick={() => setStep('complete')} className="flex-1">
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Étape 4: Configuration terminée */}
      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Configuration terminée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-600">
                2FA activé avec succès
              </h3>
              <p className="text-gray-600">
                Votre compte est maintenant protégé par l'authentification à deux facteurs
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Prochaines étapes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Testez votre connexion avec le code 2FA</li>
                <li>• Gardez vos codes de sauvegarde en sécurité</li>
                <li>• Configurez WebAuthn pour une sécurité renforcée</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button onClick={onComplete} className="flex-1">
                Terminer
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
