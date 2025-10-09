import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Package, ShoppingCart, LogOut } from 'lucide-react';

export default function VendeurDashboardSimple() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [produitTest, setProduitTest] = useState('');
  const [prixTest, setPrixTest] = useState('');
  const [produits, setProduits] = useState<Array<{nom: string, prix: string}>>([]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const ajouterProduitTest = () => {
    if (!produitTest || !prixTest) {
      toast.error('Veuillez remplir le nom et le prix');
      return;
    }

    const nouveauProduit = { nom: produitTest, prix: prixTest };
    setProduits(prev => [...prev, nouveauProduit]);
    toast.success(`✅ Produit "${produitTest}" ajouté en local !`);
    
    // Reset form
    setProduitTest('');
    setPrixTest('');
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
        <Card className="bg-green-600 text-white">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              ✅ INTERFACE VENDEUR SIMPLIFIÉE - TESTS FRONT-END
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-2">
              Bonjour vendeur {profile?.first_name || user.email} !
            </p>
            <p className="text-sm opacity-90">
              Test d'ajout de produit en mémoire locale (pas Supabase)
            </p>
          </CardContent>
        </Card>

        {/* Formulaire d'ajout de produit simple */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              🧪 Test Ajout Produit (Local)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="produit">Nom du produit</Label>
                <Input
                  id="produit"
                  type="text"
                  placeholder="Ex: Smartphone"
                  value={produitTest}
                  onChange={(e) => setProduitTest(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="prix">Prix (FCFA)</Label>
                <Input
                  id="prix"
                  type="number"
                  placeholder="Ex: 50000"
                  value={prixTest}
                  onChange={(e) => setPrixTest(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={ajouterProduitTest}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter (Test)
                </Button>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ <strong>Important :</strong> Ce formulaire teste uniquement le front-end. 
                Les produits sont stockés en mémoire locale, pas dans Supabase.
                Si ce formulaire fonctionne, le problème est avec Supabase.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Liste des produits test */}
        {produits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Produits ajoutés (en mémoire)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {produits.map((produit, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <span className="font-medium">{produit.nom}</span>
                      <span className="text-gray-500 ml-2">#{index + 1}</span>
                    </div>
                    <div className="font-bold text-green-600">
                      {parseInt(produit.prix).toLocaleString()} FCFA
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tests et navigation */}
        <Card>
          <CardHeader>
            <CardTitle>🔧 Tests & Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">✅ État actuel :</h3>
                <ul className="text-blue-700 space-y-1">
                  <li>• Utilisateur connecté : {user.email}</li>
                  <li>• Rôle : {profile?.role || 'Non défini'}</li>
                  <li>• Produits en mémoire : {produits.length}</li>
                  <li>• Formulaire fonctionne : {produits.length > 0 ? 'Oui' : 'Pas encore testé'}</li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center flex-wrap">
                <Button 
                  onClick={() => navigate('/vendeur')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Interface Vendeur Complexe
                </Button>
                
                <Button 
                  onClick={() => navigate('/client-simple')}
                  variant="outline"
                >
                  Interface Client Simple
                </Button>

                <Button 
                  onClick={() => navigate('/test-client')}
                  variant="outline"
                >
                  Page Diagnostic
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
            <CardTitle>📊 Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
{JSON.stringify({
  userExists: !!user,
  profileExists: !!profile,
  userEmail: user?.email,
  profileRole: profile?.role,
  produitsEnMemoire: produits.length,
  derniersProduitsAjoutes: produits.slice(-3),
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

