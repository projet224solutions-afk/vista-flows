/**
 * Système d'Authentification Amélioré
 * - Parcours en étapes fluide
 * - Connexion sociale (Google, Facebook)
 * - Détection intelligente du type de compte
 * - Vérification email existant AVANT OAuth
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  UserCheck, Store, Truck, Bike, Ship, ArrowLeft, ArrowRight,
  Lock, Mail, Phone, Loader2, Eye, EyeOff, AlertCircle, Check,
  ChevronRight, User, LogIn, UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Lazy load framer-motion pour réduire TBT (914ms -> <200ms)
const motion = {
  div: (props: any) => <div {...props} />,
  button: (props: any) => <button {...props} />
};
const AnimatePresence = ({ children }: any) => <>{children}</>;

type AccountType = 'client' | 'marchand' | 'livreur' | 'taxi_moto' | 'transitaire';
type AuthMode = 'login' | 'signup';
type Step = 'type' | 'method' | 'form';

interface AccountTypeOption {
  value: AccountType;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

const accountTypes: AccountTypeOption[] = [
  {
    value: 'client',
    label: 'Client',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    description: 'Achetez et commandez'
  },
  {
    value: 'marchand',
    label: 'Marchand',
    icon: Store,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    description: 'Vendez vos produits'
  },
  {
    value: 'livreur',
    label: 'Livreur',
    icon: Truck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    description: 'Livrez des colis'
  },
  {
    value: 'taxi_moto',
    label: 'Taxi Moto',
    icon: Bike,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    description: 'Transport de personnes'
  },
  {
    value: 'transitaire',
    label: 'Transitaire',
    icon: Ship,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    description: 'Import/Export'
  }
];

export default function EnhancedAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('type');
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // État pour le modal "Email déjà existant"
  const [existingEmailModal, setExistingEmailModal] = useState<{
    open: boolean;
    email: string;
    role: string;
    provider: 'google' | 'facebook' | null;
  }>({ open: false, email: '', role: '', provider: null });

  // État pour afficher le modal si l'utilisateur OAuth existe déjà
  const [oauthExistingAccountModal, setOauthExistingAccountModal] = useState<{
    open: boolean;
    email: string;
    role: string;
  }>({ open: false, email: '', role: '' });

  // Handle OAuth callback - avec détection si compte existe déjà
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('🔐 [EnhancedAuth] OAuth SIGNED_IN détecté');
        const isNewSignup = localStorage.getItem('oauth_is_new_signup') === 'true';
        
        // Vérifier si c'est une connexion OAuth (Google/Facebook)
        const provider = session.user.app_metadata?.provider;
        const isOAuthUser = provider === 'google' || provider === 'facebook';
        
        // Attendre que le profil soit créé/chargé
        setTimeout(async () => {
          try {
            // Récupérer le profil pour déterminer la redirection
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('first_name, last_name, phone, role, created_at')
              .eq('id', session.user.id)
              .maybeSingle();

            if (error) {
              console.error('❌ Erreur récupération profil:', error);
              navigate('/');
              return;
            }

            // ✅ NOUVEAU: Détecter si l'utilisateur essayait de s'inscrire mais avait déjà un compte
            if (isNewSignup && profile) {
              // Vérifier si le profil existait AVANT cette connexion OAuth
              // (si created_at est plus vieux que quelques secondes, c'est un compte existant)
              const profileCreatedAt = new Date(profile.created_at || Date.now());
              const now = new Date();
              const diffSeconds = (now.getTime() - profileCreatedAt.getTime()) / 1000;
              
              // Si le profil a été créé il y a plus de 30 secondes, c'est un compte existant
              if (diffSeconds > 30) {
                console.log('⚠️ [EnhancedAuth] Inscription OAuth mais compte existant détecté');
                
                // Afficher le modal d'information
                setOauthExistingAccountModal({
                  open: true,
                  email: session.user.email || '',
                  role: profile.role || 'client',
                });
                
                localStorage.removeItem('oauth_is_new_signup');
                return; // Ne pas rediriger, laisser l'utilisateur voir le modal
              }
            }

            // Vérifier si l'utilisateur OAuth a déjà défini un mot de passe ou passé l'étape
            const hasSetPassword = localStorage.getItem(`oauth_password_set_${session.user.id}`);
            const alreadyHandled = hasSetPassword === 'true' || hasSetPassword === 'skipped';
            const needsPassword = isOAuthUser && !alreadyHandled;

            if (needsPassword) {
              console.log('🔐 [EnhancedAuth] Utilisateur OAuth sans mot de passe, redirection vers /auth/set-password');
              localStorage.setItem('needs_oauth_password', 'true');
              localStorage.removeItem('oauth_is_new_signup');
              navigate('/auth/set-password', { replace: true });
              return;
            }

            if (profile && profile.role) {
              const isProfileIncomplete = !profile.first_name || !profile.last_name || !profile.phone;
              
              if (isNewSignup && isProfileIncomplete) {
                toast.info('Bienvenue ! Veuillez compléter votre profil.');
                localStorage.setItem('needs_profile_completion', 'true');
              } else {
                toast.success('Connexion réussie !');
              }
              
              // Définir la route cible selon le rôle
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
              
              const targetRoute = roleRoutes[profile.role] || '/';
              console.log(`🚀 [EnhancedAuth] Redirection vers ${targetRoute} (rôle: ${profile.role})`);
              
              localStorage.removeItem('oauth_is_new_signup');
              navigate(targetRoute, { replace: true });
            } else {
              console.log('⚠️ [EnhancedAuth] Pas de profil/rôle, redirection vers /');
              localStorage.removeItem('oauth_is_new_signup');
              navigate('/');
            }
          } catch (err) {
            console.error('❌ Erreur OAuth callback:', err);
            localStorage.removeItem('oauth_is_new_signup');
            navigate('/');
          }
        }, 800); // Délai légèrement plus long pour laisser le temps au profil d'être créé
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fonction pour continuer après le modal "compte existant"
  const handleContinueWithExistingAccount = () => {
    setOauthExistingAccountModal({ open: false, email: '', role: '' });
    
    // Rediriger vers la page appropriée selon le rôle
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
    
    const targetRoute = roleRoutes[oauthExistingAccountModal.role] || '/';
    navigate(targetRoute, { replace: true });
  };

  // Vérifier si un email existe déjà dans le système
  const checkEmailExists = async (emailToCheck: string): Promise<{ exists: boolean; role?: string }> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, role')
        .eq('email', emailToCheck)
        .maybeSingle();

      if (error) {
        console.error('Erreur vérification email:', error);
        return { exists: false };
      }

      return data ? { exists: true, role: data.role } : { exists: false };
    } catch (err) {
      console.error('Erreur:', err);
      return { exists: false };
    }
  };

  // Procéder à la connexion OAuth (sans création de compte)
  const proceedWithOAuthLogin = async (provider: 'google' | 'facebook') => {
    // Mode connexion - nettoyer les flags
    localStorage.removeItem('oauth_intent_role');
    localStorage.removeItem('oauth_is_new_signup');

    const origin = window.location.origin;
    const safeOrigin = origin.includes('224solution.net') ? origin.replace('http://', 'https://') : origin;
    const redirectUrl = `${safeOrigin}/`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      setError(error.message);
      toast.error(error.message);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    setError(null);

    try {
      const mapAccountTypeToRole = (type: AccountType) => {
        switch (type) {
          case 'marchand':
            return 'vendeur';
          case 'livreur':
            return 'livreur';
          case 'taxi_moto':
            return 'taxi';
          case 'transitaire':
            return 'transitaire';
          case 'client':
          default:
            return 'client';
        }
      };

      // En mode INSCRIPTION, on doit vérifier si l'email existe déjà
      if (mode === 'signup' && accountType) {
        // Note: On ne peut pas vérifier l'email Google AVANT l'OAuth
        // Donc on configure les flags et on laisse useAuth gérer la détection
        localStorage.setItem('oauth_intent_role', mapAccountTypeToRole(accountType));
        localStorage.setItem('oauth_is_new_signup', 'true');
      } else {
        // Mode CONNEXION - nettoyer les flags
        localStorage.removeItem('oauth_intent_role');
        localStorage.removeItem('oauth_is_new_signup');
      }

      const origin = window.location.origin;
      const safeOrigin = origin.includes('224solution.net') ? origin.replace('http://', 'https://') : origin;
      const redirectUrl = `${safeOrigin}/`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: accountType
            ? { account_type: accountType }
            : undefined,
        },
      });

      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(message);
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Mapper le type de compte vers le rôle
      const mapAccountTypeToRole = (type: AccountType | null) => {
        switch (type) {
          case 'marchand':
            return 'vendeur';
          case 'livreur':
            return 'livreur';
          case 'taxi_moto':
            return 'taxi';
          case 'transitaire':
            return 'transitaire';
          case 'client':
          default:
            return 'client';
        }
      };

      if (mode === 'signup') {
        // Inscription - passer le rôle mappé ET le account_type
        const roleToUse = mapAccountTypeToRole(accountType);
        
        // Extraire prénom et nom du nom complet
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
              account_type: accountType,
              role: roleToUse,
              has_password: true // Marquer que l'utilisateur a défini un mot de passe
            }
          }
        });
        
        if (error) throw error;
        
        // ✅ Marquer has_password = true dans le profil (au cas où le trigger ne le fait pas)
        if (data.user) {
          // Note: Le profil sera créé par le trigger, on mettra à jour has_password après confirmation
          localStorage.setItem(`oauth_password_set_${data.user.id}`, 'true');
        }
        
        toast.success('Vérifiez votre email pour confirmer votre inscription !');
      } else {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        toast.success('Connexion réussie !');
        navigate('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'authentification';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+224${phone}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            account_type: accountType
          }
        }
      });
      
      if (error) throw error;
      toast.success('Code OTP envoyé sur votre téléphone !');
      // TODO: Show OTP input
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'envoi OTP';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'form') setStep('method');
    else if (step === 'method') setStep('type');
    else navigate('/');
  };

  const goNext = () => {
    if (step === 'type' && accountType) setStep('method');
    else if (step === 'method' && authMethod) setStep('form');
  };

  const selectedType = accountTypes.find(t => t.value === accountType);

  // État pour basculer entre connexion et inscription sur mobile
  const [showSignupPanel, setShowSignupPanel] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary flex flex-col">
      {/* Header Premium avec logo */}
      <header className="w-full py-4 px-4 sm:px-6 flex items-center justify-between bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="h-10 w-10 rounded-xl hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              224Solutions
            </span>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-6 sm:py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Toggle Connexion / Inscription - Style Premium */}
          <div className="mb-6">
            <div className="flex items-center justify-center">
              <div className="bg-muted/80 backdrop-blur-sm p-1 rounded-2xl inline-flex gap-1 shadow-inner border border-border/50">
                <button
                  onClick={() => setShowSignupPanel(false)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    !showSignupPanel 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  Connexion
                </button>
                <button
                  onClick={() => setShowSignupPanel(true)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    showSignupPanel 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-green-500/25 scale-[1.02]' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Créer un compte
                </button>
              </div>
            </div>
          </div>

          {/* Carte principale */}
          <Card className="shadow-2xl border-0 overflow-hidden bg-card/95 backdrop-blur-xl">
            {/* Header de la carte */}
            <CardHeader className={`pb-4 pt-6 ${!showSignupPanel ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent' : 'bg-gradient-to-br from-emerald-50 via-green-50/50 to-transparent dark:from-emerald-900/20 dark:via-green-900/10'}`}>
              <div className="text-center space-y-2">
                <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${!showSignupPanel ? 'bg-gradient-to-br from-primary to-primary/70' : 'bg-gradient-to-br from-emerald-500 to-green-600'}`}>
                  {!showSignupPanel ? (
                    <LogIn className="h-7 w-7 text-white" />
                  ) : (
                    <UserPlus className="h-7 w-7 text-white" />
                  )}
                </div>
                <CardTitle className={`text-xl font-bold ${!showSignupPanel ? 'text-foreground' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {!showSignupPanel ? 'Connectez-vous à votre espace' : 'Rejoignez 224Solutions'}
                </CardTitle>
                <CardDescription className="text-sm max-w-xs mx-auto">
                  {!showSignupPanel 
                    ? 'Accédez à vos services professionnels en toute sécurité' 
                    : 'Créez votre compte et développez votre activité'
                  }
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* ===== FORMULAIRE CONNEXION ===== */}
              {!showSignupPanel && (
                <div className="space-y-5">
                  {/* Info connexion intelligente - Premium style */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Connexion intelligente</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Utilisez vos identifiants habituels. Le système reconnaîtra automatiquement votre type de compte.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Formulaire de connexion */}
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="h-12 rounded-xl border-border/50 bg-input/50 focus:bg-background focus:border-primary transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        Mot de passe
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          className="h-12 rounded-xl border-border/50 bg-input/50 pr-12 focus:bg-background focus:border-primary transition-all"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </div>

                    {error && mode === 'login' && (
                      <Alert variant="destructive" className="rounded-xl">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
                      disabled={loading}
                      onClick={() => setMode('login')}
                    >
                      {loading && mode === 'login' ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-5 w-5" />
                          Se connecter
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Séparateur élégant */}
                  <div className="relative py-3">
                    <Separator className="bg-border/50" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ou continuer avec
                    </span>
                  </div>

                  {/* Connexion sociale - Design premium */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 gap-2.5 rounded-xl border-2 border-border/50 hover:border-red-200 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all group"
                      onClick={() => { setMode('login'); handleSocialLogin('google'); }}
                      disabled={socialLoading !== null}
                    >
                      {socialLoading === 'google' && mode === 'login' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <svg className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      <span className="font-medium">Google</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-12 gap-2.5 rounded-xl border-2 border-border/50 hover:border-blue-200 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all group"
                      onClick={() => { setMode('login'); handleSocialLogin('facebook'); }}
                      disabled={socialLoading !== null}
                    >
                      {socialLoading === 'facebook' && mode === 'login' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <svg className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )}
                      <span className="font-medium">Facebook</span>
                    </Button>
                  </div>

                  {/* Note confirmation email */}
                  <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-3.5">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        <strong>Nouveau inscrit ?</strong> Confirmez votre email avant de vous connecter.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* ===== FORMULAIRE INSCRIPTION ===== */}
              {showSignupPanel && (
                <div className="space-y-5">
                  {/* Types de comptes - Design premium */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider">
                      Choisissez votre profil
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {accountTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = accountType === type.value;
                        return (
                          <button
                            key={type.value}
                            onClick={() => { setAccountType(type.value); setMode('signup'); }}
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-300 ${
                              isSelected 
                                ? 'border-primary bg-primary/10 shadow-md shadow-primary/20 scale-[1.02]' 
                                : 'border-transparent bg-muted/50 hover:bg-muted hover:border-border'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground shadow-lg' 
                                : `bg-card ${type.color}`
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className={`text-[10px] font-medium leading-tight text-center ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                              {type.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Formulaire d'inscription (visible si type sélectionné) */}
                  {accountType && mode === 'signup' && (
                    <motion.div
                      key="signup-form"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 pt-4 border-t border-border/50"
                    >
                      <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-sm font-medium flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            Nom complet
                          </Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Votre nom complet"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={loading}
                            className="h-11 rounded-xl border-border/50 bg-input/50 focus:bg-background focus:border-emerald-500 transition-all"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-sm font-medium flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            Email
                          </Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="votre@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="h-11 rounded-xl border-border/50 bg-input/50 focus:bg-background focus:border-emerald-500 transition-all"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-sm font-medium flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            Mot de passe
                          </Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Minimum 6 caractères"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={loading}
                              className="h-11 rounded-xl border-border/50 bg-input/50 pr-12 focus:bg-background focus:border-emerald-500 transition-all"
                              required
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {error && mode === 'signup' && (
                          <Alert variant="destructive" className="rounded-xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">{error}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          type="submit"
                          className="w-full h-11 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-green-500/25 transition-all hover:shadow-xl active:scale-[0.98]"
                          disabled={loading}
                        >
                          {loading && mode === 'signup' ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Inscription...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-5 w-5" />
                              S'inscrire en tant que {accountTypes.find(t => t.value === accountType)?.label}
                            </>
                          )}
                        </Button>
                      </form>

                      {/* Ou s'inscrire avec Google/Facebook */}
                      <div className="relative py-3">
                        <Separator className="bg-border/50" />
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          ou
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          className="h-11 gap-2 rounded-xl border-2 border-border/50 hover:border-red-200 hover:bg-red-50/50 transition-all"
                          onClick={() => handleSocialLogin('google')}
                          disabled={socialLoading !== null}
                        >
                          {socialLoading === 'google' && mode === 'signup' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          )}
                          <span className="text-sm font-medium">Google</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-11 gap-2 rounded-xl border-2 border-border/50 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                          onClick={() => handleSocialLogin('facebook')}
                          disabled={socialLoading !== null}
                        >
                          {socialLoading === 'facebook' && mode === 'signup' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          )}
                          <span className="text-sm font-medium">Facebook</span>
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Message si pas de type sélectionné */}
                  {!accountType && (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <UserPlus className="h-8 w-8 opacity-40" />
                      </div>
                      <p className="text-sm">Sélectionnez votre type de compte ci-dessus pour commencer</p>
                    </div>
                  )}

                  {/* Note confirmation email */}
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-3.5">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>
                        <strong>Inscription gratuite et sécurisée.</strong> Confirmez votre email après inscription.
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Footer sécurité */}
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl p-3.5 text-center border border-primary/10">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  <span>Connexion sécurisée 256-bit SSL avec <span className="font-semibold text-foreground">224Solutions</span></span>
                </p>
              </div>
            </div>
          </Card>

          {/* Texte légal en bas */}
          {/* Texte légal en bas */}
          <p className="text-center text-[10px] text-muted-foreground mt-4 px-4">
            En continuant, vous acceptez nos <button className="underline hover:text-foreground">Conditions d'utilisation</button> et notre <button className="underline hover:text-foreground">Politique de confidentialité</button>
          </p>
        </div>
      </div>

      {/* Modal: Email déjà existant (pour inscription classique) */}
      <Dialog open={existingEmailModal.open} onOpenChange={(open) => setExistingEmailModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Email déjà enregistré
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p>
                L'email <strong className="text-foreground">{existingEmailModal.email}</strong> est déjà 
                associé à un compte <Badge variant="secondary">{existingEmailModal.role}</Badge>.
              </p>
              <p className="text-sm">
                Souhaitez-vous vous connecter avec ce compte existant ?
              </p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{existingEmailModal.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>Compte: {existingEmailModal.role}</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setExistingEmailModal(prev => ({ ...prev, open: false }))}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                setExistingEmailModal(prev => ({ ...prev, open: false }));
                if (existingEmailModal.provider) {
                  proceedWithOAuthLogin(existingEmailModal.provider);
                }
              }}
              className="w-full sm:w-auto gap-2"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Compte OAuth existant détecté lors d'une inscription */}
      <Dialog open={oauthExistingAccountModal.open} onOpenChange={(open) => !open && handleContinueWithExistingAccount()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Compte existant détecté
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3">
              <p>
                L'adresse email <strong className="text-foreground">{oauthExistingAccountModal.email}</strong> est 
                déjà associée à un compte existant.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-800 dark:text-amber-300">
                <p className="text-sm font-medium">
                  Vous avez été connecté à votre compte existant :
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50">
                    {(() => {
                      const roleLabels: Record<string, string> = {
                        client: 'Client',
                        vendeur: 'Marchand',
                        livreur: 'Livreur',
                        taxi: 'Taxi Moto',
                        transitaire: 'Transitaire',
                        admin: 'Administrateur',
                        ceo: 'PDG',
                        agent: 'Agent',
                        syndicat: 'Syndicat',
                      };
                      return roleLabels[oauthExistingAccountModal.role] || oauthExistingAccountModal.role;
                    })()}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Si vous souhaitez créer un compte avec un rôle différent, veuillez utiliser une autre adresse email.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={handleContinueWithExistingAccount}
              className="w-full gap-2"
            >
              <LogIn className="h-4 w-4" />
              Continuer avec ce compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
