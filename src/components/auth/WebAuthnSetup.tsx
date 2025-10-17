/**
 * 🔐 CONFIGURATION WEBAUTHN - 224SOLUTIONS
 * Composant pour configurer l'authentification WebAuthn (clés matérielles)
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Smartphone,
  Usb,
  Fingerprint
} from 'lucide-react';

interface WebAuthnKey {
  id: string;
  device_name: string;
  device_type: string;
  created_at: string;
  last_used_at?: string;
}

interface WebAuthnSetupProps {
  userId: string;
  userEmail: string;
  userName: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const WebAuthnSetup: React.FC<WebAuthnSetupProps> = ({
  userId,
  userEmail,
  userName,
  onComplete,
  onCancel
}) => {
  const [keys, setKeys] = useState<WebAuthnKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const { toast } = useToast();

  // Charger les clés existantes
  React.useEffect(() => {
    loadExistingKeys();
  }, []);

  const loadExistingKeys = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/webauthn/keys?user_id=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Erreur chargement clés WebAuthn:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Enregistrer une nouvelle clé WebAuthn
  const registerNewKey = async () => {
    setIsRegistering(true);
    setError('');
    setSuccess('');

    try {
      // Étape 1: Commencer l'enregistrement
      const beginResponse = await fetch('/api/auth/webauthn/register/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          user_name: userName
        })
      });

      const beginData = await beginResponse.json();

      if (!beginData.success) {
        throw new Error(beginData.error || 'Erreur début enregistrement');
      }

      // Étape 2: Créer la clé WebAuthn côté client
      const credential = await navigator.credentials.create({
        publicKey: beginData.options
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Création de la clé WebAuthn échouée');
      }

      // Étape 3: Finaliser l'enregistrement
      const completeResponse = await fetch('/api/auth/webauthn/register/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          credential: {
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            response: {
              attestationObject: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject)),
              clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
            },
            type: credential.type
          }
        })
      });

      const completeData = await completeResponse.json();

      if (completeData.success) {
        setSuccess('Clé WebAuthn enregistrée avec succès');
        toast({
          title: "✅ Clé WebAuthn ajoutée",
          description: "Votre clé de sécurité a été enregistrée",
        });
        loadExistingKeys(); // Recharger la liste
      } else {
        throw new Error(completeData.error || 'Erreur finalisation enregistrement');
      }

    } catch (error: any) {
      console.error('Erreur enregistrement WebAuthn:', error);
      setError(error.message || 'Erreur enregistrement clé WebAuthn');
    } finally {
      setIsRegistering(false);
    }
  };

  // Supprimer une clé WebAuthn
  const deleteKey = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette clé de sécurité ?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/webauthn/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "🗑️ Clé supprimée",
          description: "La clé de sécurité a été supprimée",
        });
        loadExistingKeys();
      } else {
        throw new Error(data.error || 'Erreur suppression clé');
      }
    } catch (error: any) {
      console.error('Erreur suppression clé:', error);
      setError(error.message || 'Erreur suppression clé');
    } finally {
      setIsLoading(false);
    }
  };

  // Obtenir l'icône du type de dispositif
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'platform':
        return <Smartphone className="w-4 h-4" />;
      case 'cross-platform':
        return <Usb className="w-4 h-4" />;
      default:
        return <Key className="w-4 h-4" />;
    }
  };

  // Obtenir le nom du type de dispositif
  const getDeviceTypeName = (deviceType: string) => {
    switch (deviceType) {
      case 'platform':
        return 'Dispositif intégré';
      case 'cross-platform':
        return 'Clé USB';
      default:
        return 'Clé de sécurité';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Clés de Sécurité WebAuthn</h2>
        <p className="text-gray-600">
          Configurez des clés de sécurité pour une authentification renforcée
        </p>
      </div>

      {/* Clés existantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Clés de sécurité enregistrées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune clé de sécurité enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div 
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(key.device_type)}
                    <div>
                      <p className="font-medium">{key.device_name}</p>
                      <p className="text-sm text-gray-500">
                        {getDeviceTypeName(key.device_type)}
                      </p>
                      {key.last_used_at && (
                        <p className="text-xs text-gray-400">
                          Dernière utilisation: {new Date(key.last_used_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {new Date(key.created_at).toLocaleDateString('fr-FR')}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteKey(key.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajouter une nouvelle clé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Ajouter une clé de sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Types de clés supportés:</strong>
              <ul className="mt-2 space-y-1">
                <li>• <strong>Dispositifs intégrés:</strong> Touch ID, Face ID, Windows Hello</li>
                <li>• <strong>Clés USB:</strong> YubiKey, SoloKey, Nitrokey</li>
                <li>• <strong>Clés Bluetooth:</strong> Clés de sécurité compatibles</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={registerNewKey}
              disabled={isRegistering}
              className="flex-1"
            >
              {isRegistering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une clé
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Fermer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations de sécurité */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Fingerprint className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Avantages des clés WebAuthn</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Sécurité renforcée:</strong> Protection contre le phishing</li>
                <li>• <strong>Facilité d'utilisation:</strong> Pas de codes à saisir</li>
                <li>• <strong>Portabilité:</strong> Fonctionne sur tous vos appareils</li>
                <li>• <strong>Standard ouvert:</strong> Compatible avec tous les navigateurs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
