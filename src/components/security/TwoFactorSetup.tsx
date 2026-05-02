/**
 * Composant de configuration 2FA/TOTP
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield,
  Smartphone,
  Key,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

export const TwoFactorSetup: React.FC = () => {
  const {
    settings,
    loading,
    generating,
    verifying,
    qrCodeUrl,
    secretKey,
    backupCodes,
    generateSecret,
    verifyAndEnable,
    disable2FA,
    regenerateBackupCodes
  } = useTwoFactorAuth();

  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'backup'>('intro');

  const handleCopySecret = () => {
    if (secretKey) {
      navigator.clipboard.writeText(secretKey);
      toast.success('Secret copié dans le presse-papier');
    }
  };

  const handleCopyBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      toast.success('Codes de récupération copiés');
    }
  };

  const handleDownloadBackupCodes = () => {
    if (backupCodes) {
      const content = `Codes de récupération 224Solutions 2FA\n${'='.repeat(40)}\n\nGardez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.\n\n${backupCodes.join('\n')}\n\nGénéré le: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '224solutions-2fa-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Codes téléchargés');
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    const success = await verifyAndEnable(verificationCode);
    if (success) {
      setStep('backup');
    }
  };

  const handleDisable = async () => {
    const success = await disable2FA(disableCode);
    if (success) {
      setShowDisableDialog(false);
      setDisableCode('');
      setStep('intro');
    }
  };

  const handleStartSetup = async () => {
    await generateSecret();
    setStep('setup');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Si 2FA est activée
  if (settings?.isEnabled) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <CardTitle>Authentification à Deux Facteurs</CardTitle>
                <CardDescription>Votre compte est protégé</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Activée
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Votre compte est sécurisé avec l'authentification à deux facteurs.
              {settings.lastUsedAt && (
                <span className="block text-sm mt-1">
                  Dernière utilisation: {new Date(settings.lastUsedAt).toLocaleString()}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={regenerateBackupCodes}
              className="flex-1"
            >
              <Key className="h-4 w-4 mr-2" />
              Régénérer codes de récupération
            </Button>

            <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Désactiver
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Désactiver la 2FA</DialogTitle>
                  <DialogDescription>
                    Entrez votre code 2FA actuel pour confirmer la désactivation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Désactiver la 2FA rendra votre compte moins sécurisé.
                    </AlertDescription>
                  </Alert>
                  <Input
                    placeholder="Code à 6 chiffres"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowDisableDialog(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDisable}
                      disabled={disableCode.length !== 6 || verifying}
                      className="flex-1"
                    >
                      {verifying ? 'Vérification...' : 'Désactiver'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {backupCodes && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Nouveaux codes de récupération
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-sm bg-background p-2 rounded text-center font-mono">
                    {code}
                  </code>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyBackupCodes}>
                  <Copy className="h-3 w-3 mr-1" /> Copier
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadBackupCodes}>
                  <Download className="h-3 w-3 mr-1" /> Télécharger
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Configuration 2FA
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Lock className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Authentification à Deux Facteurs</CardTitle>
            <CardDescription>
              Ajoutez une couche de sécurité supplémentaire à votre compte
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="intro" disabled={step !== 'intro'}>Introduction</TabsTrigger>
            <TabsTrigger value="setup" disabled={step === 'intro'}>Configuration</TabsTrigger>
            <TabsTrigger value="verify" disabled={step === 'intro' || step === 'setup'}>Vérification</TabsTrigger>
            <TabsTrigger value="backup" disabled={step !== 'backup'}>Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="intro" className="space-y-4 mt-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                L'authentification à deux facteurs (2FA) protège votre compte même si votre mot de passe est compromis.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Application Authenticator</h4>
                  <p className="text-sm text-muted-foreground">
                    Utilisez Google Authenticator, Authy ou toute autre application TOTP
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Key className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Codes de récupération</h4>
                  <p className="text-sm text-muted-foreground">
                    10 codes de secours en cas de perte de votre téléphone
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleStartSetup} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Configurer la 2FA
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4 mt-4">
            {qrCodeUrl && (
              <>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Scannez ce QR code avec votre application authenticator
                  </p>
                  <div className="inline-block p-4 bg-white rounded-lg border">
                    <QRCodeSVG value={qrCodeUrl} size={200} />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Ou entrez ce code manuellement:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded font-mono text-sm break-all">
                      {secretKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={handleCopySecret}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button onClick={() => setStep('verify')} className="w-full">
                  Continuer
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-4">
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Entrez le code à 6 chiffres affiché dans votre application authenticator
              </AlertDescription>
            </Alert>

            <Input
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
                Retour
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || verifying}
                className="flex-1"
              >
                {verifying ? 'Vérification...' : 'Vérifier et Activer'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                2FA activée avec succès ! Sauvegardez vos codes de récupération.
              </AlertDescription>
            </Alert>

            {backupCodes && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Codes de récupération
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Gardez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une fois.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="text-sm bg-background p-2 rounded text-center font-mono">
                      {code}
                    </code>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopyBackupCodes}>
                    <Copy className="h-3 w-3 mr-1" /> Copier
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownloadBackupCodes}>
                    <Download className="h-3 w-3 mr-1" /> Télécharger
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={() => window.location.reload()} className="w-full">
              Terminé
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;
