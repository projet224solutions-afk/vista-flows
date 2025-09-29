import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, User as UserIcon, Store, Truck, Car, Users, Ship, Crown } from "lucide-react";
import { PDGAuthButton } from "@/components/PDGAuthButton";
import QuickFooter from "@/components/QuickFooter";
import { z } from "zod";

// Validation schemas avec tous les rôles
const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères")
});

const signupSchema = loginSchema.extend({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.enum(['client', 'vendeur', 'livreur', 'taxi', 'syndicat', 'transitaire', 'admin'])
});

type UserRole = 'client' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'admin';

export default function AuthNew() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Rediriger vers le dashboard approprié
          const role = selectedRole || 'client';
          navigate(`/${role}`);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, selectedRole]);

  const handleRoleSelection = (role: UserRole) => {
    setSelectedRole(role);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const validatedData = loginSchema.parse(formData);
        const { error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });
        if (error) throw error;
      } else {
        const validatedData = signupSchema.parse({
          ...formData,
          role: selectedRole
        });
        
        const { error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            data: {
              first_name: validatedData.firstName,
              last_name: validatedData.lastName,
              role: validatedData.role
            }
          }
        });
        if (error) throw error;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Interface de sélection de profil (page principale)
  if (!showForm) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header avec 224SOLUTIONS et boutons */}
        <div className="text-center py-8 px-4">
          <h1 className="text-4xl font-bold text-purple-600 mb-6">224SOLUTIONS</h1>
          
          {/* Boutons du header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Button 
              size="sm" 
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full"
              onClick={() => navigate('/home')}
            >
              Accueil
            </Button>
            <Button 
              size="sm" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full"
              onClick={() => navigate('/marketplace')}
            >
              Marché
            </Button>
            <Button 
              size="sm" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full"
            >
              Services
            </Button>
          </div>

          {/* Authentification avec Supabase */}
          <p className="text-gray-500 mb-8 text-lg">Authentification avec Supabase</p>

          {/* Titre principal */}
          <h2 className="text-2xl text-gray-600 mb-12">
            Choisissez votre profil <span className="font-bold text-gray-800">professionnel</span>
          </h2>
        </div>

        {/* Toutes les catégories de rôles */}
        <div className="max-w-6xl mx-auto px-6 pb-24">
          
          {/* Commerce et services */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-blue-500 rounded"></div>
              <h3 className="text-xl font-semibold text-gray-800">Commerce et services</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client */}
              <Card 
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedRole === 'client' 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
                onClick={() => handleRoleSelection('client')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-lg bg-blue-500 text-white">
                      <UserIcon className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-xl text-gray-800">Client</h4>
                      <p className="text-gray-600 text-base">Acheter des produits et services</p>
                    </div>
                    {selectedRole === 'client' && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Vendeur */}
              <Card 
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedRole === 'vendeur' 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200 bg-white hover:border-green-300'
                }`}
                onClick={() => handleRoleSelection('vendeur')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-lg bg-green-500 text-white">
                      <Store className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-xl text-gray-800">Marchand</h4>
                      <p className="text-gray-600 text-base">Gérer une boutique en ligne</p>
                    </div>
                    {selectedRole === 'vendeur' && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Transport et logistique */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-orange-500 rounded"></div>
              <h3 className="text-xl font-semibold text-gray-800">Transport et logistique</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Livreur */}
              <Card 
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedRole === 'livreur' 
                    ? 'border-orange-300 bg-orange-50' 
                    : 'border-gray-200 bg-white hover:border-orange-300'
                }`}
                onClick={() => handleRoleSelection('livreur')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-4 rounded-lg bg-orange-500 text-white">
                      <Truck className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-gray-800">Livreur</h4>
                      <p className="text-gray-600 text-sm">Livraison de colis et produits</p>
                    </div>
                    {selectedRole === 'livreur' && (
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Taxi */}
              <Card 
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedRole === 'taxi' 
                    ? 'border-yellow-300 bg-yellow-50' 
                    : 'border-gray-200 bg-white hover:border-yellow-300'
                }`}
                onClick={() => handleRoleSelection('taxi')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-4 rounded-lg bg-yellow-500 text-white">
                      <Car className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-gray-800">Chauffeur Taxi</h4>
                      <p className="text-gray-600 text-sm">Transport de personnes</p>
                    </div>
                    {selectedRole === 'taxi' && (
                      <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Transitaire */}
              <Card 
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedRole === 'transitaire' 
                    ? 'border-indigo-300 bg-indigo-50' 
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
                onClick={() => handleRoleSelection('transitaire')}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-4 rounded-lg bg-indigo-500 text-white">
                      <Ship className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg text-gray-800">Transitaire</h4>
                      <p className="text-gray-600 text-sm">Import/Export international</p>
                    </div>
                    {selectedRole === 'transitaire' && (
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Organisation et administration */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-purple-500 rounded"></div>
              <h3 className="text-xl font-semibold text-gray-800">Organisation et administration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Syndicat */}
              <Card 
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedRole === 'syndicat' 
                    ? 'border-purple-300 bg-purple-50' 
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
                onClick={() => handleRoleSelection('syndicat')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-lg bg-purple-500 text-white">
                      <Users className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-xl text-gray-800">Syndicat</h4>
                      <p className="text-gray-600 text-base">Gestion des organisations professionnelles</p>
                    </div>
                    {selectedRole === 'syndicat' && (
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Admin */}
              <Card 
                className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                  selectedRole === 'admin' 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 bg-white hover:border-red-300'
                }`}
                onClick={() => handleRoleSelection('admin')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-lg bg-red-500 text-white">
                      <Crown className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-xl text-gray-800">Administrateur</h4>
                      <p className="text-gray-600 text-base">Gestion complète de la plateforme</p>
                    </div>
                    {selectedRole === 'admin' && (
                      <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer de navigation */}
        <QuickFooter />
        
        {/* Bouton PDG discret */}
        <div className="fixed bottom-24 right-4 z-50">
          <PDGAuthButton />
        </div>
      </div>
    );
  }

  // Formulaire de connexion/inscription
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-600 mb-2">224SOLUTIONS</h1>
          <p className="text-gray-500">
            {isLogin ? 'Connexion' : 'Inscription'} - {selectedRole === 'client' ? 'Client' : 'Marchand'}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  isLogin ? 'Se connecter' : 'Créer un compte'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:underline"
              >
                {isLogin 
                  ? "Pas de compte ? Créez-en un" 
                  : "Déjà un compte ? Connectez-vous"
                }
              </button>
              
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="block w-full text-sm text-gray-500 hover:underline"
              >
                ← Retour à la sélection de profil
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
