import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, User as UserIcon, Store, Truck, Bike, Globe, ShieldCheck, Info } from "lucide-react";
import NavigationFooter from "@/components/NavigationFooter";
import { z } from "zod";

// Strict validation schemas
const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Adresse email invalide" })
    .max(255, { message: "L'email doit faire moins de 255 caractères" })
    .min(1, { message: "L'email est requis" }),
  password: z.string()
    .min(6, { message: "Le mot de passe doit faire au moins 6 caractères" })
    .max(128, { message: "Le mot de passe doit faire moins de 128 caractères" })
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, { message: "Le mot de passe doit contenir au moins une lettre et un chiffre" })
});

const signupSchema = loginSchema.extend({
  firstName: z.string()
    .trim()
    .min(1, { message: "Le prénom est requis" })
    .max(50, { message: "Le prénom doit faire moins de 50 caractères" })
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, { message: "Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes" }),
  lastName: z.string()
    .trim()
    .min(1, { message: "Le nom est requis" })
    .max(50, { message: "Le nom doit faire moins de 50 caractères" })
    .regex(/^[a-zA-ZÀ-ÿ\s-']+$/, { message: "Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes" }),
  role: z.enum(['client', 'vendeur', 'livreur', 'taxi', 'syndicat', 'transitaire', 'admin'] as const)
});

type UserRole = 'client' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'admin';

const profileTypes = [
  {
    id: 'client',
    title: 'Client',
    description: 'Acheter des produits et services',
    icon: UserIcon,
    category: 'Commerce et services',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'vendeur',
    title: 'Marchand',
    description: 'Gérer une boutique en ligne',
    icon: Store,
    category: 'Commerce et services',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'livreur',
    title: 'Livreur',
    description: 'Service de livraison rapide',
    icon: Truck,
    category: 'Transport et logistique',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    id: 'taxi',
    title: 'Moto-Taxi',
    description: 'Transport de personnes',
    icon: Bike,
    category: 'Transport et logistique',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  {
    id: 'transitaire',
    title: 'Transitaire',
    description: 'Transport international',
    icon: Globe,
    category: 'International',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'client' as UserRole
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        redirectUser(session.user);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          redirectUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const redirectUser = async (user: User) => {
    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || 'client';
    
    // Redirect based on role
    switch (userRole) {
      case 'vendeur':
        navigate('/vendeur');
        break;
      case 'livreur':
        navigate('/livreur');
        break;
      case 'taxi':
        navigate('/taxi');
        break;
      case 'syndicat':
        navigate('/syndicat');
        break;
      case 'transitaire':
        navigate('/transitaire');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/client');
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setFormData(prev => ({ ...prev, role }));
    setShowForm(true);
  };

  const handleBackToSelection = () => {
    setShowForm(false);
    setSelectedRole(null);
    setError(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Strict validation
      if (isLogin) {
        const validationResult = loginSchema.safeParse({
          email: formData.email,
          password: formData.password
        });
        
        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues[0]?.message || "Données invalides";
          throw new Error(errorMessage);
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: validationResult.data.email,
          password: validationResult.data.password,
        });
        
        if (error) {
          // Don't log sensitive authentication details
          if (error.message.includes('Invalid login credentials')) {
            throw new Error("Identifiants incorrects. Vérifiez votre email et mot de passe.");
          }
          throw error;
        }
      } else {
        const validationResult = signupSchema.safeParse({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role
        });
        
        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues[0]?.message || "Données invalides";
          throw new Error(errorMessage);
        }

        const { error } = await supabase.auth.signUp({
          email: validationResult.data.email,
          password: validationResult.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: validationResult.data.firstName,
              last_name: validationResult.data.lastName,
              role: validationResult.data.role
            }
          }
        });
        
        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error("Un compte avec cet email existe déjà. Utilisez la connexion.");
          }
          throw error;
        }
        
        setError("Compte créé avec succès ! Vérifiez votre email pour activer votre compte.");
      }
    } catch (error) {
      setError(error.message || "Une erreur s'est produite lors de l'authentification");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Connecté</h2>
          <p className="text-muted-foreground mb-6">
            Vous êtes connecté en tant que {user.email}
          </p>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </Card>
      </div>
    );
  }

  if (showForm) {
    const selectedProfile = profileTypes.find(p => p.id === selectedRole);
    
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-4xl mx-auto p-4">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-3xl font-bold mb-2">224SOLUTIONS</h1>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Button size="sm" className="bg-green-500 hover:bg-green-600">Accueil</Button>
              <Button size="sm" variant="outline">Marché</Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-600">Services</Button>
            </div>
            <p className="text-muted-foreground">Authentification avec Supabase</p>
          </div>

          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={handleBackToSelection}
            className="mb-6"
          >
            ← Retour
          </Button>

          {/* Form Card */}
          <Card className="max-w-md mx-auto shadow-elegant">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${selectedProfile?.bgColor} flex items-center justify-center mb-4`}>
                  {selectedProfile && <selectedProfile.icon className={`w-8 h-8 ${selectedProfile.color.replace('bg-', 'text-')}`} />}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {isLogin ? 'Connexion' : 'Inscription'} {selectedProfile?.title}
                </h2>
                <p className="text-muted-foreground">{selectedProfile?.description}</p>
              </div>

              {error && (
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Information notice */}
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Utilisez vos identifiants habituels.</strong> Le système reconnaîtra automatiquement votre type de compte (Client, Marchand, Livreur, ou Transitaire).
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    placeholder="votre@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  {!isLogin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Le mot de passe doit contenir au moins 6 caractères, une lettre et un chiffre
                    </p>
                  )}
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        required
                        placeholder="John"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        required
                        placeholder="Doe"
                      />
                    </div>
                  </>
                )}

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

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin 
                    ? "Pas de compte ? Créez-en un" 
                    : "Déjà un compte ? Connectez-vous"
                  }
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <NavigationFooter />
      </div>
    );
  }

  // Profile selection interface
  const categories = ['Commerce et services', 'Transport et logistique', 'International'];
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold mb-2">224SOLUTIONS</h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Button size="sm" className="bg-green-500 hover:bg-green-600">Accueil</Button>
            <Button size="sm" variant="outline">Marché</Button>
            <Button size="sm" className="bg-red-500 hover:bg-red-600">Services</Button>
          </div>
          <p className="text-muted-foreground mb-8">Authentification avec Supabase</p>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Choisissez votre profil <span className="font-bold text-foreground">professionnel</span>
          </h2>
        </div>

        {/* Profile Categories */}
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 bg-primary rounded"></div>
                <h3 className="text-lg font-semibold">{category}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileTypes
                  .filter(profile => profile.category === category)
                  .map((profile) => {
                    const Icon = profile.icon;
                    return (
                      <Card 
                        key={profile.id}
                        className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
                          profile.id === 'client' ? `${profile.borderColor} border-2 ${profile.bgColor}` : 'hover:border-primary/20'
                        }`}
                        onClick={() => handleRoleSelect(profile.id as UserRole)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl ${profile.bgColor} flex items-center justify-center`}>
                              <Icon className={`w-6 h-6 ${profile.color.replace('bg-', 'text-')}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-1">{profile.title}</h4>
                              <p className="text-muted-foreground text-sm">{profile.description}</p>
                            </div>
                            {profile.id === 'client' && (
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Login link */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground mb-4">Vous avez déjà un compte ?</p>
          <Button 
            variant="outline" 
            onClick={() => setShowForm(true)}
            className="min-w-[200px]"
          >
            Se connecter
          </Button>
        </div>
      </div>
      
      <NavigationFooter />
    </div>
  );
}