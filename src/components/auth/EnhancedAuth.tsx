/**
 * Système d'Authentification Amélioré
 * - Parcours en étapes fluide
 * - Connexion sociale (Google, Facebook)
 * - Détection intelligente du type de compte
 * - Vérification email existant AVANT OAuth
 */

import { useState, useEffect, useMemo } from 'react';
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
  UserCheck, Store, Truck, Bike, Ship, ArrowLeft,
  Lock, Mail, Loader2, Eye, EyeOff, AlertCircle,
  User, LogIn, UserPlus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { useCognitoAuth } from '@/contexts/CognitoAuthContext';

// Lazy load framer-motion pour réduire TBT (914ms -> <200ms)
const motion = {
  div: (props: any) => <div {...props} />,
  button: (props: any) => <button {...props} />
};
const _AnimatePresence = ({ children }: any) => <>{children}</>;

type AccountType = 'client' | 'marchand' | 'livreur' | 'taxi_moto' | 'transitaire';
type AuthMode = 'login' | 'signup';
type Step = 'type' | 'method' | 'form';

interface AccountTypeOption {
  value: AccountType;
  labelKey: string;
  descKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const accountTypeConfigs: AccountTypeOption[] = [
  {
    value: 'client',
    labelKey: 'auth.accountType.client',
    descKey: 'auth.accountType.clientDesc',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    value: 'marchand',
    labelKey: 'auth.accountType.merchant',
    descKey: 'auth.accountType.merchantDesc',
    icon: Store,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
  },
  {
    value: 'livreur',
    labelKey: 'auth.accountType.delivery',
    descKey: 'auth.accountType.deliveryDesc',
    icon: Truck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
  },
  {
    value: 'taxi_moto',
    labelKey: 'auth.accountType.taxi',
    descKey: 'auth.accountType.taxiDesc',
    icon: Bike,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  },
  {
    value: 'transitaire',
    labelKey: 'auth.accountType.transit',
    descKey: 'auth.accountType.transitDesc',
    icon: Ship,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
  }
];

export default function EnhancedAuth() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const {
    isCognitoEnabled,
    signIn: cognitoSignIn,
    signUp: cognitoSignUp,
    confirmSignUp: cognitoConfirmSignUp,
    isAuthenticated: isCognitoAuthenticated,
    cognitoProfile,
  } = useCognitoAuth();

  const [step, setStep] = useState<Step>('type');
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | null>(null);

  // Memoize account types with translations
  const accountTypes = useMemo(() => accountTypeConfigs.map(config => ({
    ...config,
    label: t(config.labelKey),
    description: t(config.descKey),
  })), [t]);

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Cognito confirmation state
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');

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

  // Cognito: rediriger si authentifié
  useEffect(() => {
    if (isCognitoEnabled && isCognitoAuthenticated && cognitoProfile) {
      const roleRoutes: Record<string, string> = {
        admin: '/pdg', ceo: '/pdg', vendeur: '/vendeur', livreur: '/livreur',
        taxi: '/taxi-moto/driver', syndicat: '/syndicat', transitaire: '/transitaire',
        client: '/client', agent: '/agent',
      };
      const targetRoute = roleRoutes[cognitoProfile.role || 'client'] || '/client';
      console.log(`🚀 [Cognito] Redirection vers ${targetRoute} (rôle: ${cognitoProfile.role})`);
      navigate(targetRoute, { replace: true });
    }
  }, [isCognitoEnabled, isCognitoAuthenticated, cognitoProfile, navigate]);

  // Handle OAuth callback (Supabase) - délègue la logique profil/rôle à useAuth
  useEffect(() => {
    if (!authLoading && !profileLoading && user && profile?.role) {
      const isNewSignup = localStorage.getItem('oauth_is_new_signup') === 'true';
      
      const provider = user.app_metadata?.provider;
      const isOAuthUser = provider === 'google' || provider === 'facebook';
      const hasSetPassword = localStorage.getItem(`oauth_password_set_${user.id}`);
      const alreadyHandled = hasSetPassword === 'true' || hasSetPassword === 'skipped';
      const hasPasswordInDB = profile?.has_password === true;
      const needsPassword = isOAuthUser && !alreadyHandled && !hasPasswordInDB;

      if (hasPasswordInDB && !alreadyHandled) {
        localStorage.setItem(`oauth_password_set_${user.id}`, 'true');
      }

      if (needsPassword) {
        localStorage.setItem('needs_oauth_password', 'true');
        localStorage.removeItem('oauth_is_new_signup');
        navigate('/auth/set-password', { replace: true });
        return;
      }

      const roleRoutes: Record<string, string> = {
        admin: '/pdg', ceo: '/pdg', vendeur: '/vendeur', livreur: '/livreur',
        taxi: '/taxi-moto/driver', syndicat: '/syndicat', transitaire: '/transitaire',
        client: '/client', agent: '/agent',
      };

      const targetRoute = roleRoutes[profile.role] || '/';
      
      if (isNewSignup) {
        const isProfileIncomplete = !profile.first_name || !profile.last_name || !profile.phone;
        if (isProfileIncomplete) {
          toast.info(`${t('auth.welcomeMessage')} ${t('auth.completeProfile')}`);
          localStorage.setItem('needs_profile_completion', 'true');
        }
      }

      localStorage.removeItem('oauth_is_new_signup');
      navigate(targetRoute, { replace: true });
    }
  }, [authLoading, profileLoading, user, profile, navigate, t]);

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
        },
      });

      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.connectionError');
      setError(message);
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  };

  // Helper: mapper le type de compte vers le rôle
  const mapAccountTypeToRole = (type: AccountType | null) => {
    switch (type) {
      case 'marchand': return 'vendeur';
      case 'livreur': return 'livreur';
      case 'taxi_moto': return 'taxi';
      case 'transitaire': return 'transitaire';
      case 'client': default: return 'client';
    }
  };

  // Cognito: gérer la confirmation du code d'inscription
  const handleCognitoConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await cognitoConfirmSignUp(confirmationEmail, confirmationCode);
      if (!result.success) {
        throw new Error(result.error || 'Erreur de confirmation');
      }

      toast.success(t('auth.emailConfirmed') || 'Email confirmé ! Connectez-vous.');
      setNeedsConfirmation(false);
      setConfirmationCode('');
      setMode('login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de confirmation';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ===== COGNITO AUTH (prioritaire si configuré) =====
      if (isCognitoEnabled) {
        if (mode === 'signup') {
          const roleToUse = mapAccountTypeToRole(accountType);
          const result = await cognitoSignUp(email, password, {
            'custom:role': roleToUse,
            name: fullName,
          });

          if (!result.success) {
            throw new Error(result.error || 'Erreur d\'inscription');
          }

          if (result.needsConfirmation) {
            setNeedsConfirmation(true);
            setConfirmationEmail(email);
            toast.info(t('auth.checkEmail') || 'Vérifiez votre email pour le code de confirmation');
          } else {
            toast.success(t('auth.signupSuccess') || 'Inscription réussie !');
          }
        } else {
          // Connexion Cognito
          const result = await cognitoSignIn(email, password);

          if (!result.success) {
            if (result.challengeName === 'NEW_PASSWORD_REQUIRED') {
              toast.info('Nouveau mot de passe requis');
              // TODO: handle new password challenge
              return;
            }
            throw new Error(result.error || 'Erreur de connexion');
          }

          toast.success(t('auth.connectionSuccess'));
          // La redirection se fait via le useEffect qui observe isCognitoAuthenticated
        }
        return;
      }

      // ===== SUPABASE AUTH (fallback) =====
      if (mode === 'signup') {
        const roleToUse = mapAccountTypeToRole(accountType);
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
              has_password: true
            }
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          localStorage.setItem(`oauth_password_set_${data.user.id}`, 'true');
        }
        
        toast.success(t('auth.checkEmail'));
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        toast.success(t('auth.connectionSuccess'));
        
        if (data.user) {
          let profileData = null;
          let attempts = 0;
          const maxAttempts = 10;
          
          while (!profileData && attempts < maxAttempts) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .maybeSingle();
            
            if (profile?.role) {
              profileData = profile;
              break;
            }
            
            if (attempts < maxAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            attempts++;
          }
          
          if (profileData?.role) {
            const roleRoutes: Record<string, string> = {
              admin: '/pdg', ceo: '/pdg', pdg: '/pdg',
              vendeur: '/vendeur', livreur: '/livreur',
              taxi: '/taxi-moto/driver', driver: '/taxi-moto/driver',
              syndicat: '/syndicat', transitaire: '/transitaire',
              client: '/client', agent: '/agent',
            };
            const targetRoute = roleRoutes[profileData.role] || '/home';
            console.log(`🚀 [EnhancedAuth] Redirection login vers ${targetRoute} (rôle: ${profileData.role})`);
            navigate(targetRoute, { replace: true });
          } else {
            navigate('/home', { replace: true });
          }
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.authError');
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
      toast.success(t('auth.otpSent'));
      // TODO: Show OTP input
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.otpError');
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

  // Auto-set client type when signup panel is shown
  useEffect(() => {
    if (showSignupPanel) {
      setAccountType('client');
      setMode('signup');
    }
  }, [showSignupPanel]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header ultra-compact professionnel */}
      <header className="w-full py-1.5 px-3 flex items-center justify-between bg-card border-b border-border/30 sticky top-0 z-50">
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="h-7 w-7 rounded-md hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">M</span>
            </div>
            <span className="font-semibold text-sm text-foreground">224Solutions</span>
          </div>
        </div>
      </header>

      {/* Contenu principal - ultra compact */}
      <div className="flex-1 flex items-start justify-center px-3 py-2 overflow-y-auto">
        <div className="w-full max-w-[360px]">
          {/* Toggle ultra compact */}
          <div className="flex justify-center mb-2">
            <div className="bg-muted/50 p-0.5 rounded-md inline-flex border border-border/20">
              <button
                onClick={() => setShowSignupPanel(false)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  !showSignupPanel
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn className="h-3 w-3" />
                {t('auth.connectionTitle')}
              </button>
              <button
                onClick={() => setShowSignupPanel(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  showSignupPanel
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus className="h-3 w-3" />
                {t('auth.register')}
              </button>
            </div>
          </div>

          {/* Carte principale ultra compacte */}
          <Card className="shadow-lg border border-border/40 overflow-hidden bg-card">
            {/* Header minimal */}
            <CardHeader className={`py-2.5 px-3 ${!showSignupPanel ? 'bg-primary/5' : 'bg-emerald-50 dark:bg-emerald-900/10'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!showSignupPanel ? 'bg-primary' : 'bg-emerald-500'}`}>
                  {!showSignupPanel ? (
                    <LogIn className="h-4 w-4 text-white" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-white" />
                  )}
                </div>
                <div>
                  <CardTitle className={`text-sm font-semibold ${!showSignupPanel ? 'text-foreground' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {!showSignupPanel ? t('auth.connectionTitle') : t('auth.signupTitle')}
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    {!showSignupPanel ? t('auth.accessYourSpace') : t('auth.joinPlatform')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-2.5 space-y-2">
              {/* ===== COGNITO: FORMULAIRE CONFIRMATION CODE ===== */}
              {needsConfirmation && (
                <div className="space-y-2">
                  <div className="bg-primary/5 rounded-md p-2 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                      Un code de vérification a été envoyé à <strong>{confirmationEmail}</strong>
                    </p>
                  </div>

                  <form onSubmit={handleCognitoConfirmation} className="space-y-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="confirmation-code" className="text-[11px] font-medium flex items-center gap-1">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        Code de vérification
                      </Label>
                      <Input
                        id="confirmation-code"
                        type="text"
                        placeholder="123456"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        disabled={loading}
                        className="h-8 text-xs rounded-md text-center tracking-widest font-mono"
                        required
                        maxLength={6}
                        autoFocus
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive" className="rounded-md py-1.5 px-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-[10px] ml-1">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-8 text-xs font-medium rounded-md"
                      disabled={loading || confirmationCode.length < 4}
                    >
                      {loading ? (
                        <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Vérification...</>
                      ) : (
                        <><UserCheck className="mr-1 h-3 w-3" /> Confirmer mon email</>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-7 text-[10px]"
                      onClick={() => { setNeedsConfirmation(false); setError(null); }}
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" /> Retour
                    </Button>
                  </form>
                </div>
              )}

              {/* ===== FORMULAIRE CONNEXION ===== */}
              {!showSignupPanel && !needsConfirmation && (
                <div className="space-y-2">
                  {/* Info compact */}
                  <div className="bg-primary/5 rounded-md p-2 flex items-center gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                      {t('auth.smartLoginInfo')}
                    </p>
                  </div>

                  {/* Formulaire de connexion ultra-compact */}
                  <form onSubmit={handleEmailAuth} className="space-y-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="login-email" className="text-[11px] font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {t('auth.email')}
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="h-8 text-xs rounded-md"
                        required
                      />
                    </div>

                    <div className="space-y-0.5">
                      <Label htmlFor="login-password" className="text-[11px] font-medium flex items-center gap-1">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        {t('auth.password')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          className="h-8 text-xs rounded-md pr-8"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {error && mode === 'login' && (
                      <Alert variant="destructive" className="rounded-md py-1.5 px-2">
                        <AlertCircle className="h-3 w-3" />
                        <AlertDescription className="text-[10px] ml-1">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-8 text-xs font-medium rounded-md bg-primary hover:bg-primary/90"
                      disabled={loading}
                      onClick={() => setMode('login')}
                    >
                      {loading && mode === 'login' ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          {t('auth.connecting')}
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-1 h-3 w-3" />
                          {t('auth.login')}
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Séparateur compact */}
                  <div className="relative py-1.5">
                    <Separator className="bg-border/30" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-1.5 text-[9px] text-muted-foreground uppercase">
                      {t('auth.or')}
                    </span>
                  </div>

                  {/* Connexion sociale compact */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="outline"
                      className="h-8 gap-1 rounded-md border-border/50 text-[11px]"
                      onClick={() => { setMode('login'); handleSocialLogin('google'); }}
                      disabled={socialLoading !== null}
                    >
                      {socialLoading === 'google' && mode === 'login' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <svg className="h-3 w-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Google
                    </Button>

                    <Button
                      variant="outline"
                      className="h-8 gap-1 rounded-md border-border/50 text-[11px]"
                      onClick={() => { setMode('login'); handleSocialLogin('facebook'); }}
                      disabled={socialLoading !== null}
                    >
                      {socialLoading === 'facebook' && mode === 'login' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      )}
                      Facebook
                    </Button>
                  </div>

                  {/* Note compact */}
                  <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-md p-1.5">
                    <p className="text-[9px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                      <span>{t('auth.newUserNote')}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ===== FORMULAIRE INSCRIPTION (Client uniquement) ===== */}
              {showSignupPanel && !needsConfirmation && (
                <div className="space-y-2">
                  {/* Info: compte client */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-md p-2 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      {t('auth.createClientAccount') || 'Créez votre compte client pour acheter des produits et services'}
                    </p>
                  </div>

                  {/* Formulaire d'inscription compact */}
                  {accountType && (
                    <motion.div
                      key="signup-form"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2 pt-2 border-t border-border/20"
                    >
                      <form onSubmit={handleEmailAuth} className="space-y-1.5">
                        <div className="space-y-0.5">
                          <Label htmlFor="signup-name" className="text-[11px] font-medium flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {t('auth.fullName')}
                          </Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder={t('auth.fullNamePlaceholder')}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={loading}
                            className="h-8 text-xs rounded-md"
                            required
                          />
                        </div>

                        <div className="space-y-0.5">
                          <Label htmlFor="signup-email" className="text-[11px] font-medium flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {t('auth.email')}
                          </Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder={t('auth.emailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="h-8 text-xs rounded-md"
                            required
                          />
                        </div>

                        <div className="space-y-0.5">
                          <Label htmlFor="signup-password" className="text-[11px] font-medium flex items-center gap-1">
                            <Lock className="h-3 w-3 text-muted-foreground" />
                            {t('auth.password')}
                          </Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder={t('auth.passwordMinChars')}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={loading}
                              className="h-8 text-xs rounded-md pr-8"
                              required
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>

                        {error && mode === 'signup' && (
                          <Alert variant="destructive" className="rounded-md py-1.5 px-2">
                            <AlertCircle className="h-3 w-3" />
                            <AlertDescription className="text-[10px] ml-1">{error}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          type="submit"
                          className="w-full h-8 text-xs font-medium rounded-md bg-emerald-500 hover:bg-emerald-600"
                          disabled={loading}
                        >
                          {loading && mode === 'signup' ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              {t('auth.signing')}
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-1 h-3 w-3" />
                              {t('auth.createAccount') || 'Créer mon compte'}
                            </>
                          )}
                        </Button>
                      </form>

                      {/* Séparateur compact */}
                      <div className="relative py-1.5">
                        <Separator className="bg-border/30" />
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-1.5 text-[9px] text-muted-foreground uppercase">
                          {t('auth.or')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          variant="outline"
                          className="h-8 gap-1 rounded-md border-border/50 text-[11px]"
                          onClick={() => handleSocialLogin('google')}
                          disabled={socialLoading !== null}
                        >
                          {socialLoading === 'google' && mode === 'signup' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <svg className="h-3 w-3" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          )}
                          Google
                        </Button>

                        <Button
                          variant="outline"
                          className="h-8 gap-1 rounded-md border-border/50 text-[11px]"
                          onClick={() => handleSocialLogin('facebook')}
                          disabled={socialLoading !== null}
                        >
                          {socialLoading === 'facebook' && mode === 'signup' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="#1877F2">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          )}
                          Facebook
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Message si pas de type sélectionné */}
                  {!accountType && (
                    <div className="text-center py-3 text-muted-foreground">
                      <div className="w-8 h-8 mx-auto mb-1.5 rounded-md bg-muted/50 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 opacity-40" />
                      </div>
                      <p className="text-[10px]">{t('auth.selectAccountTypeMsg')}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {/* Footer sécurité - compact */}
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="bg-primary/5 rounded-lg p-2 text-center border border-primary/10">
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3 text-primary" />
                  <span>
                    {t('auth.securityInfo')} • <span className="font-medium text-primary">224Solutions</span>
                    {isCognitoEnabled && (
                      <span className="ml-1 text-[8px] bg-primary/10 text-primary px-1 py-0.5 rounded">AWS Cognito</span>
                    )}
                  </span>
                </p>
              </div>
            </div>
          </Card>

          {/* Texte légal */}
          <p className="text-center text-[9px] text-muted-foreground mt-2 px-2">
            {t('auth.termsAccept')} <button className="underline hover:text-foreground">{t('auth.terms')}</button> {t('auth.and')} <button className="underline hover:text-foreground">{t('auth.privacy')}</button>
          </p>
        </div>
      </div>

      {/* Modal: Email déjà existant (pour inscription classique) */}
      <Dialog open={existingEmailModal.open} onOpenChange={(open) => setExistingEmailModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              {t('auth.emailAlreadyRegistered')}
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <p>
                {t('auth.emailAssociatedWith')} <strong className="text-foreground">{existingEmailModal.email}</strong>{' '}
                <Badge variant="secondary">{t(`auth.role.${existingEmailModal.role}`)}</Badge>.
              </p>
              <p className="text-sm">
                {t('auth.wantToLogin')}
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
              <span>{t('auth.account')}: {t(`auth.role.${existingEmailModal.role}`)}</span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setExistingEmailModal(prev => ({ ...prev, open: false }))}
              className="w-full sm:w-auto"
            >
              {t('auth.cancel')}
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
              {t('auth.login')}
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
              {t('auth.existingAccountDetected')}
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3">
              <p>
                {t('auth.emailAlreadyAssociated')} <strong className="text-foreground">{oauthExistingAccountModal.email}</strong>
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-amber-800 dark:text-amber-300">
                <p className="text-sm font-medium">
                  {t('auth.connectedToExisting')}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50">
                    {t(`auth.role.${oauthExistingAccountModal.role}`)}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('auth.useAnotherEmail')}
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              onClick={handleContinueWithExistingAccount}
              className="w-full gap-2"
            >
              <LogIn className="h-4 w-4" />
              {t('auth.continueWithAccount')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
