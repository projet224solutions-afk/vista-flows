/**
 * 🔐 AUTHENTIFICATION RENFORCÉE - 224SOLUTIONS
 * Composant principal pour l'authentification 2FA et WebAuthn
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Smartphone, 
  Key, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';

import { TwoFactorSetup } from './TwoFactorSetup';
import { WebAuthnSetup } from './WebAuthnSetup';

interface AuthStats {
  has_2fa: boolean;
  has_webauthn: boolean;
  webauthn_keys_count: number;
  last_2fa_used?: string;
  last_webauthn_used?: string;
}

interface EnhancedAuthProps {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const EnhancedAuth: React.FC<EnhancedAuthProps> = ({
  userId,
  userEmail,
  userName,
  userRole,
  onComplete,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [authStats, setAuthStats] = useState<AuthStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showWebAuthnSetup, setShowWebAuthnSetup] = useState(false);
  const { toast } = useToast();

  // Charger les statistiques d'authentification
  useEffect(() => {
    loadAuthStats();
  }, []);

  const loadAuthStats = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/auth/stats?user_id=${userId}`);
      const data = await response.json();

      if (data.success) {
        setAuthStats(data.stats);
      } else {
        setError(data.error || 'Erreur chargement statistiques');
      }
    } catch (error) {
      console.error('Erreur chargement stats auth:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Activer 2FA
  const enableTwoFactor = () => {
    setShowTwoFactorSetup(true);
  };

  // Désactiver 2FA
  const disableTwoFactor = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?')) {
      return;
    }

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "2FA désactivé",
          description: "L'authentification à deux facteurs a été désactivée",
        });
        loadAuthStats();
      } else {
        throw new Error(data.error || 'Erreur désactivation 2FA');
      }
    } catch (error: any) {
      console.error('Erreur désactivation 2FA:', error);
      setError(error.message || 'Erreur désactivation 2FA');
    }
  };

  // Gérer la fermeture des modales
  const handleTwoFactorComplete = () => {
    setShowTwoFactorSetup(false);
    loadAuthStats();
  };

  const handleWebAuthnComplete = () => {
    setShowWebAuthnSetup(false);
    loadAuthStats();
  };

  // Vérifier si l'utilisateur est PDG/Admin
  const isAdminUser = userRole === 'pdg' || userRole === 'admin';

  if (showTwoFactorSetup) {
    return (
      <TwoFactorSetup
        userId={userId}
        userEmail={userEmail}
        onComplete={handleTwoFactorComplete}
        onCancel={() => setShowTwoFactorSetup(false)}
      />
    );
  }

  if (showWebAuthnSetup) {
    return (
      <WebAuthnSetup
        userId={userId}
        userEmail={userEmail}
        userName={userName}
        onComplete={handleWebAuthnComplete}
        onCancel={() => setShowWebAuthnSetup(false)}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Authentification Renforcée</h2>
        <p className="text-gray-600">
          Sécurisez votre compte avec des méthodes d'authentification avancées
        </p>
      </div>

      {/* Alertes de sécurité */}
      {isAdminUser && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Attention:</strong> En tant que {userRole === 'pdg' ? 'PDG' : 'Administrateur'}, 
            l'authentification renforcée est fortement recommandée pour protéger l'accès aux données sensibles.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques d'authentification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            État de la sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : authStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 2FA Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Authentification 2FA</p>
                    <p className="text-sm text-gray-500">
                      {authStats.has_2fa ? 'Activée' : 'Non configurée'}
                    </p>
                  </div>
                </div>
                <Badge variant={authStats.has_2fa ? 'default' : 'secondary'}>
                  {authStats.has_2fa ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-1" />
                  )}
                  {authStats.has_2fa ? 'Sécurisé' : 'Non sécurisé'}
                </Badge>
              </div>

              {/* WebAuthn Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Clés de sécurité</p>
                    <p className="text-sm text-gray-500">
                      {authStats.webauthn_keys_count} clé(s) enregistrée(s)
                    </p>
                  </div>
                </div>
                <Badge variant={authStats.has_webauthn ? 'default' : 'secondary'}>
                  {authStats.has_webauthn ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-1" />
                  )}
                  {authStats.has_webauthn ? 'Sécurisé' : 'Non sécurisé'}
                </Badge>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Configuration des méthodes d'authentification */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Méthodes d'authentification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 2FA Configuration */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Authentification 2FA (TOTP)</p>
                    <p className="text-sm text-gray-500">
                      Codes à 6 chiffres via application mobile
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {authStats?.has_2fa ? (
                    <>
                      <Badge variant="default">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activé
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={disableTwoFactor}
                        className="text-red-600 hover:text-red-700"
                      >
                        Désactiver
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={enableTwoFactor}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Activer
                    </Button>
                  )}
                </div>
              </div>

              {/* WebAuthn Configuration */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Clés de sécurité WebAuthn</p>
                    <p className="text-sm text-gray-500">
                      Clés matérielles et biométrie
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowWebAuthnSetup(true)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Gérer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Exiger 2FA pour la connexion</p>
                    <p className="text-sm text-gray-500">
                      Force l'utilisation de 2FA à chaque connexion
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {authStats?.has_2fa ? 'Configuré' : 'Non disponible'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Exiger WebAuthn pour la connexion</p>
                    <p className="text-sm text-gray-500">
                      Force l'utilisation de clés de sécurité
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {authStats?.has_webauthn ? 'Configuré' : 'Non disponible'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notifications de sécurité</p>
                    <p className="text-sm text-gray-500">
                      Recevoir des alertes pour les connexions suspectes
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Activé
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Fermer
        </Button>
        <Button onClick={onComplete}>
          Terminer
        </Button>
      </div>
    </div>
  );
};
