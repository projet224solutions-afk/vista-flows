// ============================================================================
// COMPOSANT LOGIN AGENT & BUREAU - 224SOLUTIONS
// ============================================================================

import { useState } from 'react';
import { useAgentBureauAuth, type UserType } from '@/hooks/useAgentBureauAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Phone, Lock, KeyRound, Loader2 } from 'lucide-react';

interface AgentBureauLoginProps {
  onSuccess?: (userType: UserType, userId: string) => void;
  defaultTab?: UserType;
}

export const AgentBureauLogin = ({ 
  onSuccess, 
  defaultTab = 'agent' 
}: AgentBureauLoginProps) => {
  const {
    login,
    verifyOtp,
    isLoading,
    requireOtp,
    currentIdentifier,
    currentUserType
  } = useAgentBureauAuth();

  const [activeTab, setActiveTab] = useState<UserType>(defaultTab);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    const result = await login(identifier.trim(), password, activeTab);
    
    if (!result.success) {
      setError(result.error || 'Erreur de connexion');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otpCode.length !== 6) {
      setError('Le code OTP doit contenir 6 chiffres');
      return;
    }

    const result = await verifyOtp(currentIdentifier, otpCode, currentUserType);
    
    if (result.success && result.user) {
      onSuccess?.(result.user.type as UserType, result.user.id);
    } else {
      setError(result.error || 'Code OTP incorrect');
    }
  };

  const handleOtpInputChange = (value: string) => {
    // Autoriser uniquement les chiffres, max 6
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(cleaned);
  };

  if (requireOtp) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Vérification de Sécurité</CardTitle>
          <CardDescription>
            Un code de sécurité a été envoyé à <strong>{currentIdentifier}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">Code OTP (6 chiffres)</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => handleOtpInputChange(e.target.value)}
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                autoFocus
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground text-center">
                Le code expire dans 5 minutes
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Vérifier le Code
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Annuler
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Connexion Sécurisée</CardTitle>
        <CardDescription>
          Authentification avec double facteur
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agent">Agent</TabsTrigger>
            <TabsTrigger value="bureau">Bureau Syndicat</TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="space-y-4 mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Connectez-vous avec votre <strong>email</strong> ou <strong>numéro de téléphone</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="identifier-agent">Email ou Téléphone</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier-agent"
                    type="text"
                    placeholder="agent@example.com ou 628765432"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-agent">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password-agent"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se Connecter'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bureau" className="space-y-4 mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  Connectez-vous avec votre <strong>email</strong> ou <strong>numéro de téléphone</strong> de président
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="identifier-bureau">Email ou Téléphone</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier-bureau"
                    type="text"
                    placeholder="president@bureau.com ou 628765432"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-bureau">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password-bureau"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se Connecter'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Connexion sécurisée avec authentification à deux facteurs (MFA)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
