/**
 * MFA AVANCÉ
 * Authentification à deux facteurs — TOTP RÉEL via useTwoFactorAuth (enrôlement QR + vérification).
 * Les autres méthodes (YubiKey/FIDO2/SMS) sont affichées honnêtement comme non encore disponibles.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Key, Smartphone, Usb, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { useTwoFactorAuth } from "@/hooks/useTwoFactorAuth";

export function AdvancedMFA() {
  const {
    settings, loading, generating, verifying,
    qrCodeUrl, secretKey, backupCodes,
    generateSecret, verifyAndEnable, disable2FA,
  } = useTwoFactorAuth();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const totpEnabled = !!settings?.isEnabled;

  // Image QR rendue depuis l'URL otpauth:// retournée par le hook.
  const qrImageSrc = qrCodeUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`
    : null;

  const openEnroll = async () => {
    setCode("");
    setEnrollOpen(true);
    await generateSecret();
  };

  const handleVerify = async () => {
    const ok = await verifyAndEnable(code.trim());
    if (ok) {
      setCode("");
      // On garde la boîte ouverte si des codes de récupération viennent d'être générés, sinon on ferme.
      if (!backupCodes || backupCodes.length === 0) setEnrollOpen(false);
    }
  };

  const handleDisable = async () => {
    const ok = await disable2FA(disableCode.trim());
    if (ok) {
      setDisableCode("");
      setDisableOpen(false);
    }
  };

  // Méthodes : seul le TOTP est réellement géré ; les autres sont annoncées honnêtement.
  const methods = [
    {
      id: 'totp', name: 'Authenticator App (TOTP)', icon: Smartphone, available: true,
      enabled: totpEnabled, desc: 'Code à 6 chiffres généré par application (Google/Microsoft Authenticator)',
    },
    {
      id: 'yubikey', name: 'YubiKey / Clé matérielle', icon: Usb, available: false,
      enabled: false, desc: 'Clé de sécurité matérielle USB/NFC — bientôt disponible',
    },
    {
      id: 'webauthn', name: 'FIDO2 / WebAuthn', icon: Key, available: false,
      enabled: false, desc: 'Authentification biométrique ou PIN — bientôt disponible',
    },
    {
      id: 'sms', name: 'SMS', icon: Smartphone, available: false,
      enabled: false, desc: 'Code envoyé par SMS (moins sûr) — bientôt disponible',
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Authentification Multi-Facteurs (2FA)
          </CardTitle>
          <CardDescription>
            {loading ? 'Chargement de la configuration…'
              : totpEnabled ? '2FA activée — votre compte est protégé par TOTP.'
              : '2FA non activée — activez l\'authenticator app pour protéger votre compte.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.map((method) => {
            const Icon = method.icon;
            return (
              <div key={method.id} className={`p-4 border rounded-lg ${!method.available ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold">{method.name}</h4>
                        {method.enabled && (
                          <Badge className="bg-[#ff4000] text-white text-xs">Activé</Badge>
                        )}
                        {!method.available && (
                          <Badge variant="outline" className="text-xs">Bientôt</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{method.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.enabled && <CheckCircle2 className="w-5 h-5 text-[#ff4000]" />}
                    {method.id === 'totp' ? (
                      method.enabled ? (
                        <Button variant="ghost" size="sm" onClick={() => { setDisableCode(""); setDisableOpen(true); }}>
                          Désactiver
                        </Button>
                      ) : (
                        <Button variant="default" size="sm" onClick={openEnroll} disabled={loading || generating}>
                          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activer'}
                        </Button>
                      )
                    ) : (
                      <Button variant="outline" size="sm" disabled>Indisponible</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium mb-2">💡 Recommandation</p>
            <p className="text-sm text-muted-foreground">
              Activez l'authenticator app (TOTP) et conservez vos codes de récupération en lieu sûr.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'enrôlement TOTP */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activer l'authenticator app (TOTP)</DialogTitle>
            <DialogDescription>
              Scannez le QR code avec Google/Microsoft Authenticator, puis entrez le code à 6 chiffres.
            </DialogDescription>
          </DialogHeader>

          {generating ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Génération du secret…
            </div>
          ) : backupCodes && backupCodes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#ff4000]">2FA activée ✓ — conservez ces codes de récupération :</p>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c) => (
                  <code key={c} className="text-xs font-mono bg-muted px-2 py-1 rounded text-center">{c}</code>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Chaque code n'est utilisable qu'une fois en cas de perte de l'appareil.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qrImageSrc && (
                <div className="flex justify-center">
                  <img src={qrImageSrc} alt="QR code TOTP" className="rounded-lg border" width={200} height={200} />
                </div>
              )}
              {secretKey && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Ou saisissez ce code manuellement :</p>
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">{secretKey}</code>
                </div>
              )}
              <div>
                <p className="text-sm font-medium mb-2">Code à 6 chiffres</p>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-lg tracking-widest font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {backupCodes && backupCodes.length > 0 ? (
              <Button onClick={() => setEnrollOpen(false)}>Terminé</Button>
            ) : (
              <Button onClick={handleVerify} disabled={verifying || generating || code.length !== 6}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Vérifier & activer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de désactivation */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Désactiver la 2FA</DialogTitle>
            <DialogDescription>
              Entrez un code de votre authenticator app pour confirmer la désactivation.
            </DialogDescription>
          </DialogHeader>
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-lg tracking-widest font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDisable} disabled={verifying || disableCode.length !== 6}>
              {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
