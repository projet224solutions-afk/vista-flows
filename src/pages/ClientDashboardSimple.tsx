import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Home, ShoppingCart, User, LogOut, Package } from 'lucide-react';

export default function ClientDashboardSimple() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [compteur, setCompteur] = useState(0);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const testClick = (testName: string) => {
    setCompteur(prev => prev + 1);
    toast.success(`✅ ${testName} fonctionne ! Clic #${compteur + 1}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Utilisateur non connecté</h2>
            <Button onClick={() => navigate('/auth')}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header simple */}
        <Card className="bg-blue-600 text-white">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              ✅ INTERFACE CLIENT SIMPLIFIÉE - TESTS FRONT-END
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">
              Bonjour {profile?.first_name || user.email} !
            </p>
            <p className="text-sm opacity-90">
              Cette interface teste si React et les événements fonctionnent
            </p>
          </CardContent>
        </Card>

        {/* Tests de base */}
        <Card>
          <CardHeader>
            <CardTitle>🧪 Tests de Fonctionnement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ État actuel :</h3>
                <ul className="text-green-700 space-y-1">
                  <li>• React fonctionne (cette page s'affiche)</li>
                  <li>• Utilisateur connecté : {user.email}</li>
                  <li>• Profil chargé : {profile ? 'Oui' : 'Non'}</li>
                  <li>• Rôle : {profile?.role || 'Non défini'}</li>
                  <li>• Compteur de clics : {compteur}</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  onClick={() => testClick('Bouton 1')}
                  className="bg-blue-500 hover:bg-blue-600 h-20 flex flex-col items-center justify-center"
                >
                  <Home className="w-6 h-6 mb-2" />
                  Test 1
                </Button>

                <Button 
                  onClick={() => testClick('Bouton 2')}
                  className="bg-green-500 hover:bg-green-600 h-20 flex flex-col items-center justify-center"
                >
                  <ShoppingCart className="w-6 h-6 mb-2" />
                  Test 2
                </Button>

                <Button 
                  onClick={() => testClick('Bouton 3')}
                  className="bg-orange-500 hover:bg-orange-600 h-20 flex flex-col items-center justify-center"
                >
                  <Package className="w-6 h-6 mb-2" />
                  Test 3
                </Button>

                <Button 
                  onClick={() => testClick('Bouton 4')}
                  className="bg-purple-500 hover:bg-purple-600 h-20 flex flex-col items-center justify-center"
                >
                  <User className="w-6 h-6 mb-2" />
                  Test 4
                </Button>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Instructions :</h3>
                <ol className="text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Cliquez sur chaque bouton de test</li>
                  <li>Vérifiez que les notifications toast apparaissent</li>
                  <li>Vérifiez que le compteur augmente</li>
                  <li>Si ça marche ici, le problème est dans l'interface complexe</li>
                </ol>
              </div>

              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/client')}
                  variant="outline"
                >
                  → Interface Client Complexe
                </Button>
                
                <Button 
                  onClick={() => navigate('/vendeur')}
                  variant="outline"
                >
                  → Interface Vendeur
                </Button>

                <Button 
                  onClick={() => navigate('/test-client')}
                  variant="outline"
                >
                  → Page Test Diagnostic
                </Button>
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={handleSignOut}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test d'état */}
        <Card>
          <CardHeader>
            <CardTitle>📊 État React & Props</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
{JSON.stringify({
  userExists: !!user,
  profileExists: !!profile,
  userEmail: user?.email,
  profileRole: profile?.role,
  compteurClics: compteur,
  timestamp: new Date().toLocaleTimeString()
}, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}