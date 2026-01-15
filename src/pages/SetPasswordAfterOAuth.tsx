/**
 * Page de définition de mot de passe pour les utilisateurs OAuth
 * Affichée après la première connexion via Google/Facebook
 * 
 * WORKFLOW:
 * - Utilisateur OAuth (Google/Facebook) → DOIT définir un mot de passe (obligatoire)
 * - Utilisateur email/password → Redirigé automatiquement vers son dashboard
 * - Une fois le mot de passe défini, l'utilisateur ne reverra jamais cette page
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
  AlertCircle, Mail, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/hooks/useRoleRedirect';

export default function SetPasswordAfterOAuth() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
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

  // Fonction pour rediriger vers le bon dashboard
  const redirectToProperDashboard = () => {
    const targetRoute = getDashboardRoute(profile?.role);
    console.log(`🚀 [SetPasswordAfterOAuth] Redirection vers ${targetRoute}`);
    navigate(targetRoute, { replace: true });
  };

  // Vérifier si l'utilisateur doit voir cette page
  useEffect(() => {
    const checkUserStatus = async () => {
      // Attendre que l'auth soit chargée
      if (authLoading) return;

      // Pas d'utilisateur → rediriger vers /auth
      if (!user) {
        navigate('/auth', { replace: true });
        return;
      }

      // Attendre que le profil soit chargé
      if (profileLoading) return;

      // ✅ Vérifier si c'est un utilisateur OAuth (Google/Facebook)
      const provider = user.app_metadata?.provider;
      const isOAuthUser = provider === 'google' || provider === 'facebook';
      
      console.log('🔍 [SetPasswordAfterOAuth] Vérification:', { 
        provider, 
        isOAuthUser,
        hasPassword: profile?.has_password 
      });

      // ✅ Si ce n'est PAS un utilisateur OAuth (email/password), rediriger directement
      if (!isOAuthUser) {
        console.log('🔐 [SetPasswordAfterOAuth] Utilisateur email détecté, redirection...');
        localStorage.removeItem('needs_oauth_password');
        redirectToProperDashboard();
        return;
      }

      // ✅ Si l'utilisateur OAuth a déjà défini un mot de passe (vérifié en BDD)
      if (profile?.has_password === true) {
        console.log('✅ [SetPasswordAfterOAuth] Mot de passe déjà défini, redirection...');
        localStorage.removeItem('needs_oauth_password');
        redirectToProperDashboard();
        return;
      }

      // L'utilisateur OAuth doit définir son mot de passe
      console.log('🔐 [SetPasswordAfterOAuth] Utilisateur OAuth sans mot de passe, affichage du formulaire');
      setCheckingStatus(false);
    };

    checkUserStatus();
  }, [user, profile, authLoading, profileLoading, navigate]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Veuillez remplir tous les critères de sécurité du mot de passe.');
      return;
    }

    setLoading(true);

    try {
      // 1. Mettre à jour le mot de passe dans Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // 2. Marquer has_password = true dans le profil (persisté en BDD)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_password: true })
        .eq('id', user?.id);

      if (profileError) {
        console.error('Erreur mise à jour profil:', profileError);
        // Ne pas bloquer, le mot de passe est déjà défini
      }

      // 3. Nettoyer les flags localStorage (backup)
      localStorage.removeItem('needs_oauth_password');
      localStorage.setItem(`oauth_password_set_${user?.id}`, 'true');
      
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

  // Affichage pendant la vérification
  if (checkingStatus || authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vérification en cours...</p>
        </div>
      </div>
    );
  }

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
          {/* Message d'information - OBLIGATOIRE */}
          <Alert className="bg-amber-50 border-amber-200">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Étape obligatoire de sécurité</strong><br />
              Pour protéger votre compte, vous devez définir un mot de passe avant de continuer.
              <br /><br />
              <span className="text-sm opacity-90">
                Ce mot de passe vous permettra de vous connecter même sans Google.
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

            {/* Bouton d'action */}
            <div className="pt-2">
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
                    Définir le mot de passe et continuer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
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
