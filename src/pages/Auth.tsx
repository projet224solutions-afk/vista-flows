import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2 } from "lucide-react";

type UserRole = 'client' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'admin';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: formData.role
            }
          }
        });
        
        if (error) throw error;
        
        // Show success message for signup
        setError("Compte créé avec succès ! Vérifiez votre email pour activer votre compte.");
      }
    } catch (error: any) {
      setError(error.message || "Une erreur s'est produite");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Plateforme E-Commerce
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </p>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
            />
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

              <div className="space-y-2">
                <Label htmlFor="role">Type de compte</Label>
                <Select value={formData.role} onValueChange={(value: UserRole) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client/Acheteur</SelectItem>
                    <SelectItem value="vendeur">Vendeur</SelectItem>
                    <SelectItem value="livreur">Livreur</SelectItem>
                    <SelectItem value="taxi">Chauffeur Taxi/Moto</SelectItem>
                    <SelectItem value="syndicat">Bureau Syndicat</SelectItem>
                    <SelectItem value="transitaire">Transitaire International</SelectItem>
                  </SelectContent>
                </Select>
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

        <div className="mt-6 text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-sm"
          >
            ← Retour à l'accueil
          </Button>
        </div>
      </Card>
    </div>
  );
}