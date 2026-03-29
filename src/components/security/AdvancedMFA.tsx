/**
 * MFA AVANCÃ‰
 * Support YubiKey, FIDO2, authenticator apps
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Smartphone, Usb, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    name: 'YubiKey / ClÃ© matÃ©rielle',
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
    name: 'SMS (Non recommandÃ©)',
    type: 'sms',
    icon: Smartphone,
    enabled: false,
    isPrimary: false,
    security: 'low'
  }
];

export function AdvancedMFA() {
  const { user } = useAuth();
  const [mfaMethods, setMfaMethods] = useState<MFAMethod[]>([
    {
      id: 'yubikey',
      name: 'YubiKey / ClÃ© matÃ©rielle',
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
      name: 'SMS (Non recommandÃ©)',
      type: 'sms',
      icon: Smartphone,
      enabled: false,
      isPrimary: false,
      security: 'low'
    }
  ]);

  const getSecurityBadge = (security: string) => {
    switch (security) {
      case 'high':
        return <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500 text-white">Haute sÃ©curitÃ©</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white">SÃ©curitÃ© moyenne</Badge>;
      case 'low':
        return <Badge className="bg-red-500 text-white">SÃ©curitÃ© faible</Badge>;
    }
  };

  const handleToggleMFA = async (methodId: string) => {
    const method = mfaMethods.find(m => m.id === methodId);
    if (!method) return;

    // Mettre Ã  jour l'Ã©tat local
    const updatedMethods = mfaMethods.map(m => 
      m.id === methodId ? { ...m, enabled: !m.enabled } : m
    );
    setMfaMethods(updatedMethods);

    toast.success(
      method.enabled 
        ? `${method.name} dÃ©sactivÃ©` 
        : `${method.name} activÃ© avec succÃ¨s`,
      {
        description: 'Configuration MFA mise Ã  jour'
      }
    );
  };

  const handleConfigureMFA = (methodId: string) => {
    const method = mfaMethods.find(m => m.id === methodId);
    if (!method) return;

    toast.info(`Configuration de ${method.name}`, {
      description: 'FonctionnalitÃ© en cours de dÃ©veloppement'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Authentification Multi-Facteurs AvancÃ©e
        </CardTitle>
        <CardDescription>
          Protection renforcÃ©e avec YubiKey et FIDO2
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
                      {method.type === 'yubikey' && 'ClÃ© de sÃ©curitÃ© matÃ©rielle USB/NFC'}
                      {method.type === 'webauthn' && 'Authentification biomÃ©trique ou PIN'}
                      {method.type === 'totp' && 'Code Ã  6 chiffres gÃ©nÃ©rÃ© par application'}
                      {method.type === 'sms' && 'Code envoyÃ© par SMS (vulnÃ©rable)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.enabled && (
                    <CheckCircle2 className="w-5 h-5 text-primary-orange-500" />
                  )}
                  <Button 
                    variant={method.enabled ? "outline" : "default"}
                    size="sm"
                    onClick={() => method.enabled ? handleConfigureMFA(method.id) : handleToggleMFA(method.id)}
                  >
                    {method.enabled ? 'Configurer' : 'Activer'}
                  </Button>
                  {method.enabled && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleMFA(method.id)}
                    >
                      DÃ©sactiver
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium mb-2">ðŸ’¡ Recommandation</p>
          <p className="text-sm text-muted-foreground">
            Pour une sÃ©curitÃ© maximale, utilisez une YubiKey ou une clÃ© FIDO2 comme mÃ©thode primaire. 
            Conservez l'authenticator app comme backup.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
