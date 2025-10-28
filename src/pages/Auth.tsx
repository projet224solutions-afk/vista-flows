import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, User as UserIcon, Store, Truck, Bike, Users, Ship, Crown, Utensils, ShoppingBag, Scissors, Car, GraduationCap, Stethoscope, Wrench, Home, Plane, Camera, ArrowLeft, Eye, EyeOff } from "lucide-react";
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
  role: z.enum(['client', 'vendeur', 'livreur', 'taxi', 'syndicat', 'transitaire', 'admin']),
  city: z.string().min(1, "La ville est requise")
});

type UserRole = 'client' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'admin';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Form data
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [showServiceSelection, setShowServiceSelection] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    city: ''
  });
  
  const [bureaus, setBureaus] = useState<Array<{ id: string; commune: string; prefecture: string }>>([]);

  // Charger les bureaux syndicaux disponibles
  useEffect(() => {
    const loadBureaus = async () => {
      const { data, error } = await supabase
        .from('bureaus')
        .select('id, commune, prefecture')
        .eq('status', 'active')
        .order('prefecture', { ascending: true });
      
      if (!error && data) {
        setBureaus(data);
      }
    };
    loadBureaus();
  }, []);

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
            } else if (profile.role === 'taxi') {
              navigate('/taxi-moto-driver');
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

        const { data: authData, error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            data: {
              first_name: validatedData.firstName,
              last_name: validatedData.lastName,
              role: validatedData.role,
              phone: formData.phone,
              country: formData.country,
              city: validatedData.city,
              custom_id: userCustomId
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        // Si c'est un taxi-motard, créer son profil conducteur et le lier à son bureau
        if (!error && authData.user && validatedData.role === 'taxi') {
          try {
            // Trouver le bureau de la ville sélectionnée
            const bureau = bureaus.find(b => b.commune === validatedData.city);
            
            // Créer l'entrée taxi_drivers avec les infos du bureau pour la synchronisation
            const { error: driverError } = await supabase
              .from('taxi_drivers')
              .insert({
                user_id: authData.user.id,
                is_online: false,
                status: 'pending_verification',
                vehicle: {
                  commune: validatedData.city,
                  bureau_id: bureau?.id || null,
                  prefecture: bureau?.prefecture || null,
                  registration_date: new Date().toISOString()
                }
              });
            
            if (driverError) {
              console.error('❌ Erreur création profil conducteur:', driverError);
            } else {
              console.log('✅ Profil taxi-motard créé et synchronisé avec le bureau de', validatedData.city);
            }
          } catch (syncError) {
            console.error('❌ Erreur synchronisation:', syncError);
          }
        }

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
    if (role === 'vendeur') {
      // Pour les marchands, afficher d'abord la sélection du type de service
      setShowServiceSelection(true);
      setSelectedRole(role);
    } else {
      setSelectedRole(role);
      setShowSignup(true);
    }
  };

  const handleServiceTypeSelect = (serviceTypeId: string) => {
    setSelectedServiceType(serviceTypeId);
    setShowServiceSelection(false);
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
              <span className="text-xs text-muted-foreground">15 services pro</span>
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

      {/* Sélection du type de service professionnel pour les marchands */}
      {showServiceSelection && (
        <div className="max-w-6xl mx-auto px-6 mt-8">
          <Card className="shadow-xl border-2 border-primary">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowServiceSelection(false);
                    setSelectedRole(null);
                  }}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Button>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">
                  Choisissez votre Type de Service Professionnel
                </h3>
                <p className="text-muted-foreground">
                  Sélectionnez le service que vous souhaitez créer parmi nos 15 catégories professionnelles
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { id: '1', name: 'Restaurant', icon: '🍽️', color: 'orange' },
                  { id: '2', name: 'Boutique E-commerce', icon: '🛍️', color: 'blue' },
                  { id: '3', name: 'Livraison', icon: '📦', color: 'green' },
                  { id: '4', name: 'Taxi-Moto', icon: '🏍️', color: 'yellow' },
                  { id: '5', name: 'Beauté & Bien-être', icon: '💇', color: 'pink' },
                  { id: '6', name: 'Réparation', icon: '🔧', color: 'gray' },
                  { id: '7', name: 'Location Immobilière', icon: '🏠', color: 'purple' },
                  { id: '8', name: 'Éducation', icon: '🎓', color: 'indigo' },
                  { id: '9', name: 'Santé', icon: '🏥', color: 'red' },
                  { id: '10', name: 'Voyage', icon: '✈️', color: 'cyan' },
                  { id: '11', name: 'Freelance', icon: '💼', color: 'teal' },
                  { id: '12', name: 'Agriculture', icon: '🌾', color: 'lime' },
                  { id: '13', name: 'Construction', icon: '🏗️', color: 'amber' },
                  { id: '14', name: 'Média', icon: '📸', color: 'rose' },
                  { id: '15', name: 'Informatique', icon: '💻', color: 'violet' },
                ].map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceTypeSelect(service.id)}
                    className={`flex flex-col items-center p-4 bg-white rounded-lg border-2 hover:border-primary hover:shadow-lg transition-all ${
                      selectedServiceType === service.id ? 'border-primary ring-2 ring-primary' : 'border-border'
                    }`}
                  >
                    <div className="text-4xl mb-2">{service.icon}</div>
                    <span className="text-sm font-medium text-center">{service.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulaire de connexion/inscription */}
      {!showServiceSelection && (
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
                  <strong>🎯 Création de compte :</strong> Remplissez les informations ci-dessous pour créer votre compte {selectedRole ? `en tant que ${selectedRole === 'vendeur' ? 'Marchand Professionnel' : selectedRole}` : ''}.
                  {selectedServiceType && (
                    <span className="block mt-1 font-semibold">
                      Service sélectionné : Type {selectedServiceType}
                    </span>
                  )}
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
                      placeholder="Votre pays (ex: Guinée)"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Ville / Commune</Label>
                    <select
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                      className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Sélectionnez votre ville</option>
                      {bureaus.map((bureau) => (
                        <option key={bureau.id} value={bureau.commune}>
                          {bureau.commune} - {bureau.prefecture}
                        </option>
                      ))}
                    </select>
                    {selectedRole === 'taxi' && formData.city && (
                      <p className="text-xs text-green-600 mt-1">
                        ✅ Vous serez automatiquement synchronisé avec le bureau syndical de {formData.city}
                      </p>
                    )}
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
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Minimum 6 caractères"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {showSignup && (
                <div>
                  <Label htmlFor="confirmPassword">Retaper le mot de passe</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Retapez votre mot de passe"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              
              {!showSignup && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {/* TODO: Implémenter récupération mot de passe */}}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
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
      )}

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}
