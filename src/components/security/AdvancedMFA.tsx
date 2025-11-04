/**
 * MFA AVANCÉ
 * Support YubiKey, FIDO2, authenticator apps
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Smartphone, Usb, Shield, CheckCircle2 } from "lucide-react";
import { ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";

interface MFAMethod {
  id: string;
  name: string;
  type: 'totp' | 'webauthn' | 'yubikey' | 'sms';
  icon: any;
  enabled: boolean;
  isPrimary: boolean;
  security: 'high' | 'medium' | 'low';
}

const mfaMethods: MFAMethod[] = [
  {
    id: 'yubikey',
    name: 'YubiKey / Clé matérielle',
    type: 'yubikey',
    icon: Usb,
    enabled: true,
    isPrimary: true,
    security: 'high'
  },
  {
    id: 'webauthn',
    name: 'FIDO2 / WebAuthn',
    type: 'webauthn',
    icon: Key,
    enabled: true,
    isPrimary: false,
    security: 'high'
  },
  {
    id: 'totp',
    name: 'Authenticator App (TOTP)',
    type: 'totp',
    icon: Smartphone,
    enabled: true,
    isPrimary: false,
    security: 'high'
  },
  {
    id: 'sms',
    name: 'SMS (Non recommandé)',
    type: 'sms',
    icon: Smartphone,
    enabled: false,
    isPrimary: false,
    security: 'low'
  }
];

export function AdvancedMFA() {
  const getSecurityBadge = (security: string) => {
    switch (security) {
      case 'high':
        return <Badge className="bg-green-500">Haute sécurité</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Sécurité moyenne</Badge>;
      case 'low':
        return <Badge className="bg-red-500">Sécurité faible</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Authentification Multi-Facteurs Avancée
        </CardTitle>
        <CardDescription>
          Protection renforcée avec YubiKey et FIDO2
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mfaMethods.map((method) => {
          const Icon = method.icon;
          return (
            <div key={method.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{method.name}</h4>
                      {method.isPrimary && (
                        <Badge variant="outline" className="text-xs">Primaire</Badge>
                      )}
                    </div>
                    {getSecurityBadge(method.security)}
                    <p className="text-sm text-muted-foreground mt-2">
                      {method.type === 'yubikey' && 'Clé de sécurité matérielle USB/NFC'}
                      {method.type === 'webauthn' && 'Authentification biométrique ou PIN'}
                      {method.type === 'totp' && 'Code à 6 chiffres généré par application'}
                      {method.type === 'sms' && 'Code envoyé par SMS (vulnérable)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.enabled && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  <Button 
                    variant={method.enabled ? "outline" : "default"}
                    size="sm"
                  >
                    {method.enabled ? 'Configurer' : 'Activer'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium mb-2">💡 Recommandation</p>
          <p className="text-sm text-muted-foreground">
            Pour une sécurité maximale, utilisez une YubiKey ou une clé FIDO2 comme méthode primaire. 
            Conservez l'authenticator app comme backup.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
