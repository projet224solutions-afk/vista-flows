/**
 * Page de définition de mot de passe pour les utilisateurs OAuth
 * Affichée après la première connexion via Google/Facebook
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, Eye, EyeOff, Loader2, CheckCircle2, Shield, 
  AlertCircle, Mail, ArrowRight, SkipForward
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function SetPasswordAfterOAuth() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Vérifications de sécurité du mot de passe
  const passwordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    matches: password === confirmPassword && password.length > 0,
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  // Rediriger si pas d'utilisateur ou si pas un utilisateur OAuth
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Vérifier si l'utilisateur a déjà défini un mot de passe ou passé l'étape
    const hasSetPassword = localStorage.getItem(`oauth_password_set_${user.id}`);
    if (hasSetPassword === 'true' || hasSetPassword === 'skipped') {
      redirectToProperDashboard();
    }
  }, [user, navigate]);

  const redirectToProperDashboard = () => {
    const roleRoutes: Record<string, string> = {
      admin: '/pdg',
      ceo: '/pdg',
      vendeur: '/vendeur',
      livreur: '/livreur',
      taxi: '/taxi-moto/driver',
      syndicat: '/syndicat',
      transitaire: '/transitaire',
      client: '/client',
      agent: '/agent',
    };
    
    const targetRoute = profile?.role ? roleRoutes[profile.role] || '/' : '/';
    navigate(targetRoute, { replace: true });
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Veuillez remplir tous les critères de sécurité du mot de passe.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Marquer que le mot de passe a été défini
      localStorage.setItem(`oauth_password_set_${user?.id}`, 'true');
      localStorage.removeItem('needs_oauth_password');
      
      setSuccess(true);
      toast.success('Mot de passe défini avec succès !');

      // Rediriger après un court délai
      setTimeout(() => {
        redirectToProperDashboard();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la définition du mot de passe';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Permettre de passer cette étape (optionnel)
    localStorage.setItem(`oauth_password_set_${user?.id}`, 'skipped');
    localStorage.removeItem('needs_oauth_password');
    toast.info('Vous pourrez définir votre mot de passe plus tard dans les paramètres.');
    redirectToProperDashboard();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-700">Mot de passe défini !</h2>
            <p className="text-muted-foreground">
              Vous pouvez maintenant vous connecter avec votre email et mot de passe.
            </p>
            <div className="pt-4">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Redirection en cours...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Définir un mot de passe</CardTitle>
              <CardDescription>Sécurisez votre compte</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Message d'information */}
          <Alert className="bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Vous êtes connecté via Google.</strong><br />
              Définissez un mot de passe pour pouvoir aussi vous connecter par email.
              <br /><br />
              <span className="text-sm opacity-90">
                Vous n'avez pas encore de mot de passe. En définissant un mot de passe, 
                vous pourrez aussi vous connecter avec votre email.
              </span>
            </AlertDescription>
          </Alert>

          {/* Email affiché */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email du compte</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4">
            {/* Nouveau mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirmer mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Indicateurs de sécurité */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Critères de sécurité :
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <PasswordCheck 
                  valid={passwordChecks.minLength} 
                  label="8 caractères minimum" 
                />
                <PasswordCheck 
                  valid={passwordChecks.hasUppercase} 
                  label="Une majuscule" 
                />
                <PasswordCheck 
                  valid={passwordChecks.hasLowercase} 
                  label="Une minuscule" 
                />
                <PasswordCheck 
                  valid={passwordChecks.hasNumber} 
                  label="Un chiffre" 
                />
                <PasswordCheck 
                  valid={passwordChecks.matches} 
                  label="Mots de passe identiques" 
                  className="col-span-2"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Boutons d'action */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading || !isPasswordValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Définition en cours...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Définir le mot de passe
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleSkip}
                disabled={loading}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Passer cette étape
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordCheck({ 
  valid, 
  label, 
  className = '' 
}: { 
  valid: boolean; 
  label: string; 
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
        valid ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
      }`}>
        {valid ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <div className="w-1.5 h-1.5 bg-current rounded-full" />
        )}
      </div>
      <span className={valid ? 'text-green-700' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  );
}
