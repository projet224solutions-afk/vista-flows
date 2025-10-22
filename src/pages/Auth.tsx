import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, User as UserIcon, Store, Truck, Bike, Users, Ship, Crown } from "lucide-react";
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

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form data
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: ''
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user && event === 'SIGNED_IN') {
          // Attendre un peu pour que le profil soit créé/chargé
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Récupérer le profil utilisateur pour connaître son rôle
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile?.role) {
            // Redirection automatique vers le dashboard approprié
            if (profile.role === 'admin') {
              console.log('🎯 Redirection vers interface PDG');
              navigate('/pdg');
            } else if (profile.role === 'client') {
              navigate('/client');
            } else {
              navigate(`/${profile.role}`);
            }
          } else {
            console.warn('⚠️ Profil non trouvé, redirection par défaut');
            navigate('/client');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (showSignup) {
        // Inscription
        if (!selectedRole) {
          throw new Error("⚠️ Veuillez d'abord sélectionner un type de compte ci-dessus (Client, Marchand, Livreur, etc.)");
        }
        
        if (formData.password !== formData.confirmPassword) {
          throw new Error("❌ Les mots de passe ne correspondent pas");
        }

        const validatedData = signupSchema.parse({ ...formData, role: selectedRole });

        // Générer un ID utilisateur unique (3 lettres + 4 chiffres)
        let userCustomId = '';
        for (let i = 0; i < 3; i++) {
          userCustomId += String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
        for (let i = 0; i < 4; i++) {
          userCustomId += Math.floor(Math.random() * 10).toString();
        }

        const { error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            data: {
              first_name: validatedData.firstName,
              last_name: validatedData.lastName,
              role: validatedData.role,
              phone: formData.phone,
              country: formData.country,
              custom_id: userCustomId // Ajouter l'ID personnalisé
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('❌ Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.');
          } else {
            throw error;
          }
        }
        setSuccess("✅ Inscription réussie ! Vérifiez votre boîte mail pour confirmer votre compte, puis connectez-vous.");
      } else {
        // Connexion
        const validatedData = loginSchema.parse(formData);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        if (error) {
          // Gérer les erreurs d'authentification de manière conviviale
          if (error.message.includes('Email not confirmed')) {
            throw new Error('📧 Email non confirmé. Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation.');
          } else if (error.message.includes('Invalid login credentials')) {
            throw new Error('❌ Email ou mot de passe incorrect. Veuillez réessayer.');
          } else {
            throw error;
          }
        }
        
        if (data.user) {
          setSuccess("✅ Connexion réussie ! Redirection en cours...");
        }
      }
    } catch (err) {
      let errorMessage = 'Une erreur est survenue';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Gestion des erreurs de validation Zod
      if (err && typeof err === 'object' && 'issues' in err) {
        const zodError = err as any;
        errorMessage = zodError.issues[0]?.message || errorMessage;
      }
      
      setError(errorMessage);
      console.error('Erreur authentification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleClick = (role: UserRole) => {
    setSelectedRole(role);
    setShowSignup(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-white pb-20">
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
        <p className="text-gray-500 mb-4 text-lg">Authentification avec Supabase</p>

        {/* Titre principal */}
        <h2 className="text-2xl text-gray-600 mb-8">
          Connectez-vous à votre <span className="font-bold text-gray-800">espace professionnel</span>
        </h2>
      </div>

      {/* Information supplémentaire */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-border/50 rounded-3xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-center mb-4">
            {showSignup ? "Sélectionnez votre type de compte" : "Types de comptes supportés"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <button
              onClick={() => handleRoleClick('client')}
              className={`flex flex-col items-center p-3 bg-white/60 rounded-lg hover:bg-white hover:shadow-md transition-all cursor-pointer ${selectedRole === 'client' ? 'ring-2 ring-blue-600' : ''
                }`}
            >
              <UserIcon className="h-6 w-6 text-blue-600 mb-2" />
              <span className="font-medium">Client</span>
            </button>
            <button
              onClick={() => handleRoleClick('vendeur')}
              className={`flex flex-col items-center p-3 bg-white/60 rounded-lg hover:bg-white hover:shadow-md transition-all cursor-pointer ${selectedRole === 'vendeur' ? 'ring-2 ring-green-600' : ''
                }`}
            >
              <Store className="h-6 w-6 text-green-600 mb-2" />
              <span className="font-medium">Marchand</span>
            </button>
            <button
              onClick={() => handleRoleClick('livreur')}
              className={`flex flex-col items-center p-3 bg-white/60 rounded-lg hover:bg-white hover:shadow-md transition-all cursor-pointer ${selectedRole === 'livreur' ? 'ring-2 ring-orange-600' : ''
                }`}
            >
              <Truck className="h-6 w-6 text-orange-600 mb-2" />
              <span className="font-medium">Livreur</span>
            </button>
            <button
              onClick={() => handleRoleClick('taxi')}
              className={`flex flex-col items-center p-3 bg-white/60 rounded-lg hover:bg-white hover:shadow-md transition-all cursor-pointer ${selectedRole === 'taxi' ? 'ring-2 ring-yellow-600' : ''
                }`}
            >
              <Bike className="h-6 w-6 text-yellow-600 mb-2" />
              <span className="font-medium">Taxi Moto</span>
            </button>
            <button
              onClick={() => handleRoleClick('transitaire')}
              className={`flex flex-col items-center p-3 bg-white/60 rounded-lg hover:bg-white hover:shadow-md transition-all cursor-pointer ${selectedRole === 'transitaire' ? 'ring-2 ring-indigo-600' : ''
                }`}
            >
              <Ship className="h-6 w-6 text-indigo-600 mb-2" />
              <span className="font-medium">Transitaire</span>
            </button>
          </div>
        </div>
      </div>

      {/* Formulaire de connexion/inscription */}
      <div className="max-w-md mx-auto px-6 mt-8">
        <Card className="shadow-lg border-2 border-primary/20">
          <CardContent className="p-8">
            {/* Messages d'information */}
            {!showSignup && (
              <>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>✨ Connexion intelligente :</strong> Utilisez vos identifiants habituels.
                    Le système reconnaîtra automatiquement votre type de compte (Client, Marchand, Livreur, ou Transitaire).
                  </p>
                </div>
                <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-xs">
                    <strong>💡 Note :</strong> Si vous venez de vous inscrire, n'oubliez pas de confirmer votre email avant de vous connecter.
                  </p>
                </div>
              </>
            )}
            
            {showSignup && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-purple-800 text-sm">
                  <strong>🎯 Création de compte :</strong> Remplissez les informations ci-dessous pour créer votre compte {selectedRole ? `en tant que ${selectedRole}` : ''}.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {showSignup && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Votre prénom"
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Votre nom"
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Votre pays"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Numéro de téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+224 XXX XXX XXX"
                      required
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email">Email professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  className="mt-1"
                />
              </div>

              {showSignup && (
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Retapez votre mot de passe"
                    required
                    className="mt-1"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {showSignup ? "Inscription en cours..." : "Connexion en cours..."}
                  </>
                ) : (
                  showSignup ? "S'inscrire" : 'Se connecter'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignup(!showSignup);
                    setSelectedRole(null);
                    setError(null);
                  }}
                  className="text-sm text-purple-600 font-medium hover:underline"
                >
                  {showSignup ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}
