/**
 * 🔐 SSO LOGIN - 224SOLUTIONS
 * Composant pour l'authentification SSO avec fallback local
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
  Key, 
  Mail, 
  Lock, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

interface SSOProvider {
  id: string;
  name: string;
  enabled: boolean;
  authUrl: string;
  clientId: string;
  redirectUri: string;
}

interface SSOLoginProps {
  onSuccess: (token: string, user: any) => void;
  onError: (error: string) => void;
}

export const SSOLogin: React.FC<SSOLoginProps> = ({
  onSuccess,
  onError
}) => {
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string>('');
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackCredentials, setFallbackCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Charger les providers SSO disponibles
  useEffect(() => {
    loadSSOProviders();
  }, []);

  const loadSSOProviders = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/sso/providers');
      const data = await response.json();

      if (data.success) {
        setProviders(data.providers);
      } else {
        setError(data.error || 'Erreur chargement providers SSO');
      }
    } catch (error) {
      console.error('Erreur chargement providers SSO:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Authentification SSO
  const handleSSOLogin = (provider: SSOProvider) => {
    setIsAuthenticating(true);
    setError('');

    try {
      // Rediriger vers le provider SSO
      window.location.href = provider.authUrl;
    } catch (error) {
      console.error('Erreur redirection SSO:', error);
      setError('Erreur redirection vers le provider SSO');
      setIsAuthenticating(false);
    }
  };

  // Authentification locale de fallback
  const handleFallbackLogin = async () => {
    if (!fallbackCredentials.email || !fallbackCredentials.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    try {
      const response = await fetch('/api/auth/sso/fallback/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackCredentials)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.token, data.user);
        toast({
          title: "✅ Connexion réussie",
          description: `Bienvenue ${data.user.first_name} ${data.user.last_name}`,
        });
      } else {
        setError(data.error || 'Erreur authentification');
      }
    } catch (error) {
      console.error('Erreur authentification locale:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Obtenir l'icône du provider
  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'keycloak':
        return <Shield className="w-5 h-5" />;
      case 'okta':
        return <Key className="w-5 h-5" />;
      default:
        return <ExternalLink className="w-5 h-5" />;
    }
  };

  // Obtenir la couleur du provider
  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'keycloak':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'okta':
        return 'bg-purple-600 hover:bg-purple-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des options d'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Connexion Sécurisée</h2>
        <p className="text-gray-600">
          Choisissez votre méthode d'authentification
        </p>
      </div>

      {/* Providers SSO */}
      {providers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Authentification SSO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                onClick={() => handleSSOLogin(provider)}
                disabled={isAuthenticating}
                className={`w-full ${getProviderColor(provider.id)} text-white`}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    {getProviderIcon(provider.id)}
                    <span className="ml-2">Se connecter avec {provider.name}</span>
                  </>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Séparateur */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">ou</span>
        </div>
      </div>

      {/* Authentification locale de fallback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Connexion locale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showFallback ? (
            <Button
              onClick={() => setShowFallback(true)}
              variant="outline"
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              Utiliser mes identifiants
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={fallbackCredentials.email}
                  onChange={(e) => setFallbackCredentials({
                    ...fallbackCredentials,
                    email: e.target.value
                  })}
                  disabled={isAuthenticating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={fallbackCredentials.password}
                    onChange={(e) => setFallbackCredentials({
                      ...fallbackCredentials,
                      password: e.target.value
                    })}
                    disabled={isAuthenticating}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isAuthenticating}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleFallbackLogin}
                  disabled={isAuthenticating || !fallbackCredentials.email || !fallbackCredentials.password}
                  className="flex-1"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Se connecter
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFallback(false)}
                  disabled={isAuthenticating}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations de sécurité */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Sécurité renforcée</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>SSO:</strong> Authentification centralisée et sécurisée</li>
                <li>• <strong>Fallback:</strong> Connexion locale en cas d'indisponibilité SSO</li>
                <li>• <strong>Chiffrement:</strong> Toutes les communications sont chiffrées</li>
                <li>• <strong>Audit:</strong> Toutes les connexions sont tracées</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
