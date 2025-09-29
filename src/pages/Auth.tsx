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

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
          // Récupérer le profil utilisateur pour connaître son rôle
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profile?.role) {
            // Redirection automatique vers le dashboard approprié
            navigate(`/${profile.role}`);
          } else {
            // Si pas de profil trouvé, rediriger vers client par défaut
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
      const validatedData = loginSchema.parse(formData);
      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      setSuccess("Connexion réussie ! Redirection en cours...");

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

        {/* Message d'information */}
        <div className="max-w-2xl mx-auto mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>✨ Connexion intelligente :</strong> Utilisez vos identifiants habituels.
            Le système reconnaîtra automatiquement votre type de compte (Client, Marchand, Livreur, ou Transitaire).
          </p>
        </div>

        {/* Titre principal */}
        <h2 className="text-2xl text-gray-600 mb-8">
          Connectez-vous à votre <span className="font-bold text-gray-800">espace professionnel</span>
        </h2>
      </div>

      {/* Formulaire de connexion simplifié */}
      <div className="max-w-md mx-auto px-6">
        <Card className="shadow-lg border-2 border-primary/20">
          <CardContent className="p-8">
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

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Pas encore de compte ? <br />
                  <span className="text-purple-600 font-medium">Contactez votre administrateur</span>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Information supplémentaire */}
      <div className="max-w-4xl mx-auto px-6 mt-12">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-border/50 rounded-3xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-center mb-4">Types de comptes supportés</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600 mb-2" />
              <span className="font-medium">Client</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
              <Store className="h-6 w-6 text-green-600 mb-2" />
              <span className="font-medium">Marchand</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
              <Truck className="h-6 w-6 text-orange-600 mb-2" />
              <span className="font-medium">Livreur</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/60 rounded-lg">
              <Ship className="h-6 w-6 text-indigo-600 mb-2" />
              <span className="font-medium">Transitaire</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer de navigation */}
      <QuickFooter />

      {/* Bouton PDG discret */}
      <div className="fixed top-4 right-4 z-50">
        <PDGAuthButton />
      </div>
    </div>
  );
}
