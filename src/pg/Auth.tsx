import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, Store, ArrowLeft, Eye, EyeOff, Search, ChevronDown, Check, RefreshCw, Zap, LogIn, UserPlus, Briefcase, CheckCircle2, Laptop, ShoppingBag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import QuickFooter from "@/components/QuickFooter";
import { z } from "zod";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSelector from "@/components/LanguageSelector";

import { syncCognitoProfile } from "@/services/cognitoSyncService";
import { getSafeBrowserGeo } from "@/lib/safeGeo";
import { resolvePostAuthRoute, cleanupOAuthFlags, cleanupAffiliateFlags } from "@/utils/postAuthRoute";
import { COUNTRY_PHONE_CODES, WORLD_PHONE_CODES, PHONE_VALIDATION_RULES, validatePhoneNumber, getPhoneExample, getPhoneLengthHint } from "@/utils/phoneData";

// Validation schemas avec tous les r├┤les
// Password strength: 8+ chars, uppercase, lowercase, digit
const passwordSchema = z.string()
  .min(8, "Le mot de passe doit faire au moins 8 caract├¿res")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis")
});

const signupSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: passwordSchema,
  firstName: z.string().min(1, "Le pr├®nom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  role: z.enum(['client', 'vendeur', 'livreur', 'taxi', 'syndicat', 'transitaire', 'admin', 'prestataire']),
  city: z.string().min(1, "La ville est requise")
});

type UserRole = 'client' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'admin' | 'prestataire';

export default function Auth() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [oauthRetrying, setOauthRetrying] = useState(false);
  const [oauthAttempts, setOauthAttempts] = useState<{ google: number; facebook: number }>({ google: 0, facebook: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [checkingResetLink, setCheckingResetLink] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  // Cognito d├®sactiv├® comme auth principal - Supabase est le syst├¿me principal
  const navigate = useNavigate();
  
  // Ô£à FIX: Ref pour bloquer le handler SIGNED_IN pendant que handleSubmit g├¿re la cr├®ation
  const isFormSubmittingRef = useRef(false);
  
  // === AFFILIATION AGENT ===
  // Lire le token d'affiliation depuis localStorage (stock├® par AgentAffiliateRedirect)
  const [affiliateData, setAffiliateData] = useState<{
    token: string | null;
    agentName: string | null;
    targetRole: string | null;
  }>({ token: null, agentName: null, targetRole: null });
  
  // Charger les donn├®es d'affiliation au montage
  useEffect(() => {
    const token = localStorage.getItem('affiliate_token');
    const agentName = localStorage.getItem('affiliate_agent_name');
    const targetRole = localStorage.getItem('affiliate_target_role');
    const timestamp = localStorage.getItem('affiliate_timestamp');
    
    // V├®rifier si le token est encore valide (max 24h)
    const isValid = timestamp && (Date.now() - parseInt(timestamp)) < 24 * 60 * 60 * 1000;
    
    if (token && isValid) {
      setAffiliateData({ token, agentName, targetRole });
      // Afficher un message si venant d'un lien d'affiliation
      const locationState = location.state as { fromAffiliate?: boolean } | null;
      if (locationState?.fromAffiliate) {
        toast({
          title: `Bienvenue !`,
          description: `Vous avez ├®t├® invit├® par ${agentName || 'un agent'}. Cr├®ez votre compte pour continuer.`,
        });
        // Passer automatiquement en mode inscription
        setShowSignup(true);
      }
    } else {
      // Nettoyer les donn├®es expir├®es
      localStorage.removeItem('affiliate_token');
      localStorage.removeItem('affiliate_agent_name');
      localStorage.removeItem('affiliate_agent_id');
      localStorage.removeItem('affiliate_target_role');
      localStorage.removeItem('affiliate_timestamp');
    }
  }, [location.state, toast]);

  // Form data - MUST be declared before trackOAuthEvent uses them
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false);
  const [vendorShopType, setVendorShopType] = useState<'physical' | 'digital' | null>(null);
  const [showVendorTypeSelection, setShowVendorTypeSelection] = useState(false);
  const [currentClientEmail, setCurrentClientEmail] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successRedirectRoute, setSuccessRedirectRoute] = useState<string | null>(null);

  // === OAUTH HANDLERS AM├ëLIOR├ëS (Google & Facebook) ===
  
  // ­ƒôè Analytics tracking
  const trackOAuthEvent = useCallback((provider: 'google' | 'facebook', event: 'click' | 'success' | 'error', metadata?: any) => {
    const timestamp = Date.now();
    const analyticsData = {
      provider,
      event,
      timestamp,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      role: selectedRole || 'none',
      mode: showSignup ? 'signup' : 'login',
      ...metadata
    };
    
    // Log to console (en dev) ou envoyer ├á analytics service (en prod)
    console.log('­ƒôè OAuth Analytics:', analyticsData);
    
    // TODO: Envoyer ├á Google Analytics, Mixpanel, ou autre
    // analytics.track('oauth_event', analyticsData);
    
    // Sauvegarder localement pour debug
    try {
      const existingLogs = JSON.parse(localStorage.getItem('oauth_analytics') || '[]');
      existingLogs.push(analyticsData);
      // Garder seulement les 50 derniers ├®v├®nements
      if (existingLogs.length > 50) existingLogs.shift();
      localStorage.setItem('oauth_analytics', JSON.stringify(existingLogs));
    } catch (e) {
      // Ignore storage errors
    }
  }, [selectedRole, showSignup]);

  const handleGoogleLogin = async (isRetry = false) => {
    // ­ƒøí´©Å Rate limiting: Max 3 tentatives par minute
    const now = Date.now();
    const lastAttemptKey = 'oauth_google_last_attempt';
    const lastAttempt = parseInt(localStorage.getItem(lastAttemptKey) || '0');
    
    if (!isRetry && now - lastAttempt < 20000 && oauthAttempts.google >= 3) {
      toast({
        title: "ÔÅ▒´©Å Trop de tentatives",
        description: "Veuillez patienter 20 secondes avant de r├®essayer.",
        variant: "destructive",
      });
      return;
    }
    
    // Si l'utilisateur est en mode inscription mais n'a pas choisi de r├┤le, on force un choix
    if (showSignup && !selectedRole) {
      setShowRoleSelectionModal(true);
      trackOAuthEvent('google', 'click', { blocked: 'no_role' });
      return;
    }

    // Persister l'intention (r├┤le) pour que le callback OAuth cr├®e/ajuste le profil correctement
    if (selectedRole) {
      localStorage.setItem('oauth_intent_role', selectedRole);
    }
    // Marquer comme nouvelle inscription si en mode signup
    if (showSignup) {
      localStorage.setItem('oauth_is_new_signup', 'true');
    }
    // Ô£à FIX: Persister le type de boutique pour les vendeurs
    if (vendorShopType) {
      localStorage.setItem('oauth_vendor_shop_type', vendorShopType);
    }
    // Ô£à Persister le service type pour les prestataires
    if (selectedServiceType) {
      localStorage.setItem('oauth_service_type', selectedServiceType);
    }

    // ­ƒôè Track click
    trackOAuthEvent('google', 'click', { attempt: oauthAttempts.google + 1, isRetry });
    
    setOauthLoading('google');
    if (isRetry) setOauthRetrying(true);
    setError(null);
    setOauthAttempts(prev => ({ ...prev, google: prev.google + 1 }));
    localStorage.setItem(lastAttemptKey, now.toString());

    try {
      // Forcer HTTPS sur le domaine production (sinon session perdue entre http/https)
      const origin = window.location.origin;
      const safeOrigin = origin.includes('224solution.net') ? origin.replace('http://', 'https://') : origin;
      const redirectUrl = `${safeOrigin}/`;

      // Ô£¿ Toast de d├®marrage
      toast({
        title: "­ƒöä Connexion Google",
        description: "Redirection vers Google en cours...",
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      
      // ­ƒôè Track success
      trackOAuthEvent('google', 'success');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion Google';
      setError(message);
      console.error('ÔØî Erreur Google OAuth:', err);
      
      // ­ƒôè Track error
      trackOAuthEvent('google', 'error', { error: message });
      
      // ­ƒöä Toast d'erreur avec option retry
      toast({
        title: "ÔØî Erreur de connexion",
        description: message + " ÔÇó Cliquez sur le bouton Google pour r├®essayer.",
        variant: "destructive",
      });
    } finally {
      setOauthLoading(null);
      setOauthRetrying(false);
    }
  };

  const handleFacebookLogin = async (isRetry = false) => {
    // ­ƒøí´©Å Rate limiting
    const now = Date.now();
    const lastAttemptKey = 'oauth_facebook_last_attempt';
    const lastAttempt = parseInt(localStorage.getItem(lastAttemptKey) || '0');
    
    if (!isRetry && now - lastAttempt < 20000 && oauthAttempts.facebook >= 3) {
      toast({
        title: "ÔÅ▒´©Å Trop de tentatives",
        description: "Veuillez patienter 20 secondes avant de r├®essayer.",
        variant: "destructive",
      });
      return;
    }

    if (showSignup && !selectedRole) {
      setShowRoleSelectionModal(true);
      trackOAuthEvent('facebook', 'click', { blocked: 'no_role' });
      return;
    }

    if (selectedRole) {
      localStorage.setItem('oauth_intent_role', selectedRole);
    }
    if (showSignup) {
      localStorage.setItem('oauth_is_new_signup', 'true');
    }
    // Ô£à FIX: Persister le type de boutique pour les vendeurs
    if (vendorShopType) {
      localStorage.setItem('oauth_vendor_shop_type', vendorShopType);
    }
    // Ô£à Persister le service type pour les prestataires
    if (selectedServiceType) {
      localStorage.setItem('oauth_service_type', selectedServiceType);
    }

    // ­ƒôè Track click
    trackOAuthEvent('facebook', 'click', { attempt: oauthAttempts.facebook + 1, isRetry });

    setOauthLoading('facebook');
    if (isRetry) setOauthRetrying(true);
    setError(null);
    setOauthAttempts(prev => ({ ...prev, facebook: prev.facebook + 1 }));
    localStorage.setItem(lastAttemptKey, now.toString());

    try {
      const origin = window.location.origin;
      const safeOrigin = origin.includes('224solution.net') ? origin.replace('http://', 'https://') : origin;
      const redirectUrl = `${safeOrigin}/`;

      // Ô£¿ Toast de d├®marrage
      toast({
        title: "­ƒöä Connexion Facebook",
        description: "Redirection vers Facebook en cours...",
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      
      // ­ƒôè Track success
      trackOAuthEvent('facebook', 'success');
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion Facebook';
      setError(message);
      console.error('ÔØî Erreur Facebook OAuth:', err);
      
      // ­ƒôè Track error
      trackOAuthEvent('facebook', 'error', { error: message });
      
      // ­ƒöä Toast d'erreur avec option retry
      toast({
        title: "ÔØî Erreur de connexion",
        description: message + " ÔÇó Cliquez sur le bouton Facebook pour r├®essayer.",
        variant: "destructive",
      });
    } finally {
      setOauthLoading(null);
      setOauthRetrying(false);
    }
  };

  // ÔÜí IMPORTANT: ├ëcouter les ├®v├®nements OAuth et PASSWORD_RECOVERY pour rediriger correctement
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('­ƒöö [Auth] Auth state change:', event, session?.user?.email || 'no user');
      
      // Ô£à G├®rer l'├®v├®nement PASSWORD_RECOVERY (quand l'utilisateur clique sur le lien de r├®initialisation)
      if (event === 'PASSWORD_RECOVERY') {
        console.log('­ƒöÉ [Auth] PASSWORD_RECOVERY d├®tect├® - affichage du formulaire de nouveau mot de passe');
        setShowNewPasswordForm(true);
        setShowResetPassword(false);
        setIsLogin(false);
        return;
      }
      
      // Rediriger apr├¿s connexion OAuth r├®ussie
      if (event === 'SIGNED_IN' && session?.user) {
        // Ô£à FIX: Ne pas interf├®rer si handleSubmit est en cours d'ex├®cution
        // handleSubmit g├¿re lui-m├¬me la cr├®ation vendor/service et la redirection
        if (isFormSubmittingRef.current) {
          console.log('ÔÅ¡´©Å [Auth] SIGNED_IN ignor├® - handleSubmit en cours');
          return;
        }
        
        // Ô£à Ne pas rediriger si on est en mode r├®initialisation de mot de passe
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isReset = params.get('reset') === 'true' || hashParams.get('type') === 'recovery';
        
        if (isReset) {
          console.log('­ƒöÉ [Auth] Mode r├®initialisation d├®tect├®, affichage du formulaire');
          setShowNewPasswordForm(true);
          setShowResetPassword(false);
          setIsLogin(false);
          return;
        }
        
        console.log('­ƒöÉ [Auth] SIGNED_IN d├®tect├® - v├®rification du profil...');
        setIsAuthenticating(true);
        
        // V├®rifier si c'est une connexion OAuth (Google/Facebook)
        const provider = session.user.app_metadata?.provider;
        const isOAuthUser = provider === 'google' || provider === 'facebook';
        
        // Ô£à IMPORTANT: Lire le r├┤le OAuth AVANT de poller le profil
        // Ce r├┤le a ├®t├® d├®fini AVANT la redirection OAuth et persiste dans localStorage
        const oauthIntentRole = localStorage.getItem('oauth_intent_role');
        const isNewOAuthSignup = localStorage.getItem('oauth_is_new_signup') === 'true';
        
        // D├®lai pour laisser useAuth (source unique) cr├®er/charger le profil
        // useAuth.tsx g├¿re TOUTE la cr├®ation de profil OAuth - pas de duplication ici
        const maxWait = 15;
        let profile: any = null;
        
        try {
          for (let i = 0; i < maxWait; i++) {
            await new Promise(resolve => setTimeout(resolve, 800));
            const { data } = await supabase
              .from('profiles')
              .select('id, role, public_id, has_password')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (data?.role) {
              // Ô£à FIX: Si c'est une nouvelle inscription OAuth avec un r├┤le choisi,
              // attendre que useAuth.tsx mette ├á jour le r├┤le (pas le r├┤le 'client' du trigger)
              if (isNewOAuthSignup && oauthIntentRole && oauthIntentRole !== 'client' && data.role === 'client') {
                console.log(`ÔÅ│ [Auth] Attente mise ├á jour r├┤le OAuth... (${i + 1}/${maxWait}) - actuel: client, attendu: ${oauthIntentRole}`);
                // Continuer ├á attendre que useAuth mette ├á jour le r├┤le
                continue;
              }
              profile = data;
              break;
            }
            console.log(`ÔÅ│ [Auth] Attente profil... (${i + 1}/${maxWait})`);
          }
          
          // Ô£à Si apr├¿s l'attente le r├┤le est toujours 'client' mais on attendait un autre r├┤le,
          // utiliser le r├┤le intentionnel directement
          const effectiveRole = (isNewOAuthSignup && oauthIntentRole && oauthIntentRole !== 'client' && profile?.role === 'client')
            ? oauthIntentRole
            : profile?.role;
          
          // V├®rifier si l'utilisateur OAuth a d├®j├á d├®fini un mot de passe ou pass├® l'├®tape
          const hasSetPassword = localStorage.getItem(`oauth_password_set_${session.user.id}`);
          const alreadyHandled = hasSetPassword === 'true' || hasSetPassword === 'skipped';
          const hasPasswordInDB = (profile as any)?.has_password === true;
          const needsPassword = isOAuthUser && !alreadyHandled && !hasPasswordInDB;
          
          // Si le mot de passe est d├®fini en BDD mais pas en localStorage, synchroniser
          if (hasPasswordInDB && !alreadyHandled) {
            localStorage.setItem(`oauth_password_set_${session.user.id}`, 'true');
          }
          
          if (needsPassword) {
            console.log('­ƒöÉ [Auth] Utilisateur OAuth sans mot de passe, redirection vers /auth/set-password');
            localStorage.setItem('needs_oauth_password', 'true');
            localStorage.removeItem('oauth_is_new_signup');
            navigate('/auth/set-password', { replace: true });
            setIsAuthenticating(false);
            return;
          }
          
          if (effectiveRole) {
            const oauthShopType = localStorage.getItem('oauth_vendor_shop_type');
            const targetRoute = await resolvePostAuthRoute({
              userId: session.user.id,
              role: effectiveRole,
              vendorShopType: oauthShopType,
            });
            
            console.log(`­ƒÜÇ [Auth] Redirection vers ${targetRoute} (r├┤le effectif: ${effectiveRole}, DB: ${profile?.role})`);
            
            toast({
              title: "Ô£à Connexion r├®ussie",
              description: `Bienvenue ! Redirection vers votre espace ${effectiveRole}...`,
            });
            
            cleanupOAuthFlags();
            const pendingRedirectOAuth = sessionStorage.getItem('post_auth_redirect');
            if (pendingRedirectOAuth) {
              sessionStorage.removeItem('post_auth_redirect');
              console.log('­ƒöù [Auth OAuth] Redirection vers lien partag├®:', pendingRedirectOAuth);
              navigate(pendingRedirectOAuth, { replace: true });
            } else {
              navigate(targetRoute, { replace: true });
            }
          } else {
            console.log('ÔÜá´©Å [Auth] Pas de r├┤le trouv├®, reste sur /auth');
          }
        } catch (err) {
          console.error('ÔØî [Auth] Erreur callback OAuth:', err);
        } finally {
          setIsAuthenticating(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // V├®rifier si l'utilisateur est d├®j├á connect├® au chargement de la page
  useEffect(() => {
    let isMounted = true;
    
    const checkExistingSession = async () => {
      // Ne pas v├®rifier si on est en train de se connecter
      if (isAuthenticating) return;
      
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const isReset = params.get('reset') === 'true';
      const isRecoveryHash = hashParams.get('type') === 'recovery';
      const hasAccessToken = hash.includes('access_token');
      
      // Ne pas rediriger si c'est une r├®initialisation de mot de passe
      // (via query param OU via hash fragment du lien email)
      if (isReset || isRecoveryHash || (hasAccessToken && hash.includes('type=recovery'))) {
        console.log('­ƒöÉ [Auth Mount] Mode r├®initialisation d├®tect├®, pas de redirection automatique');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && isMounted) {
        console.log('­ƒöì [Auth Mount] Utilisateur d├®j├á connect├® d├®tect├®');
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profileData?.role && isMounted) {
          const targetRoute = await resolvePostAuthRoute({
            userId: session.user.id,
            role: profileData.role,
          });
          console.log('­ƒÜÇ [Auth Mount] Redirection utilisateur existant vers:', targetRoute);
          const pendingRedirectMount = sessionStorage.getItem('post_auth_redirect');
          if (pendingRedirectMount) {
            sessionStorage.removeItem('post_auth_redirect');
            console.log('­ƒöù [Auth Mount] Redirection vers lien partag├®:', pendingRedirectMount);
            navigate(pendingRedirectMount, { replace: true });
          } else {
            navigate(targetRoute, { replace: true });
          }
        }
      }
    };
    
    checkExistingSession();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticating]); // Ajouter isAuthenticating comme d├®pendance

  // D├®tecter si on vient d'un lien de r├®initialisation et v├®rifier la session
  useEffect(() => {
    const checkResetSession = async () => {
      // Supabase g├¿re le reset par lien (pas par code)

      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      
      // D├®tecter tous les cas de r├®initialisation possibles
      const isResetQuery = params.get('reset') === 'true';
      const isRecoveryType = hashParams.get('type') === 'recovery';
      const hasAccessToken = hash.includes('access_token');
      const hasErrorInHash = hashParams.get('error_description');
      
      console.log('­ƒöì [Auth] V├®rification reset:', { 
        isResetQuery, 
        isRecoveryType, 
        hasAccessToken, 
        hasErrorInHash,
        hash: hash.substring(0, 100) + '...'
      });
      
      // Si erreur dans le hash (lien expir├®)
      if (hasErrorInHash) {
        const errorDesc = decodeURIComponent(hashParams.get('error_description') || '');
        console.error('ÔØî Erreur dans le lien:', errorDesc);
        setError(`Le lien de r├®initialisation est invalide ou a expir├®. ${errorDesc.includes('expired') ? 'Veuillez demander un nouveau lien.' : ''}`);
        setShowResetPassword(true);
        setShowNewPasswordForm(false);
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      
      const isReset = isResetQuery || isRecoveryType || (hasAccessToken && hash.includes('type=recovery'));
      
      if (isReset || (hasAccessToken && !hash.includes('type=signup'))) {
        console.log('­ƒöæ Lien de r├®initialisation d├®tect├®, v├®rification de la session...');
        setCheckingResetLink(true);
        setLoading(true);
        
        // Ô£à M├®thode am├®lior├®e: utiliser setSession pour traiter le hash directement
        if (hasAccessToken) {
          console.log('­ƒöÉ Traitement du hash avec access_token...');
          
          // Extraire les tokens du hash
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            try {
              const { data, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (sessionError) {
                console.error('ÔØî Erreur setSession:', sessionError);
                throw sessionError;
              }
              
              if (data.session) {
                console.log('Ô£à Session cr├®├®e avec succ├¿s via setSession');
                setShowNewPasswordForm(true);
                setShowResetPassword(false);
                setIsLogin(false);
                setError(null);
                // Nettoyer l'URL pour ├®viter les re-traitements
                window.history.replaceState({}, document.title, window.location.pathname + '?reset=true');
                setLoading(false);
                setCheckingResetLink(false);
                return;
              }
            } catch (e) {
              console.error('ÔØî Exception lors de setSession:', e);
            }
          }
        }
        
        // Fallback: attendre que Supabase traite le hash automatiquement
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // V├®rifier qu'on a bien une session active
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('­ƒöÉ Session apr├¿s attente:', { 
          hasSession: !!session, 
          userId: session?.user?.id?.substring(0, 8),
          error 
        });
        
        if (session) {
          console.log('Ô£à Session de r├®initialisation active - affichage du formulaire');
          setShowNewPasswordForm(true);
          setShowResetPassword(false);
          setIsLogin(false);
          setError(null);
          // Nettoyer l'URL pour ├®viter les re-traitements
          window.history.replaceState({}, document.title, window.location.pathname + '?reset=true');
        } else {
          console.error('ÔØî Aucune session trouv├®e apr├¿s traitement du hash:', error);
          setError('Le lien de r├®initialisation est invalide ou a expir├®. Veuillez demander un nouveau lien.');
          setShowResetPassword(true);
          setShowNewPasswordForm(false);
          // Nettoyer l'URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        setLoading(false);
        setCheckingResetLink(false);
      }
    };
    
    checkResetSession();
  }, []);

  // Form data is already declared above (before trackOAuthEvent)

  // D├®tecter si l'utilisateur vient de "Devenir Marchand" pour cr├®er un compte s├®par├®
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const role = params.get('role');
    const clientEmail = params.get('currentEmail');
    
    if (mode === 'signup' && role === 'merchant' && clientEmail) {
      console.log('­ƒÅ¬ Cr├®ation compte marchand s├®par├® d├®tect├®e pour:', clientEmail);
      setShowSignup(true);
      setIsLogin(false);
      setSelectedRole('vendeur');
      setCurrentClientEmail(clientEmail);
      setError(`ÔÜá´©Å Veuillez utiliser une adresse email diff├®rente de ${clientEmail} pour cr├®er votre compte marchand.`);
    }
  }, []);

  // Phone code data is now imported from @/utils/phoneData

  // Phone validation rules and helpers are now imported from @/utils/phoneData

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('+224');
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  const [countrySelectOpen, setCountrySelectOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    city: '',
    businessName: '',
    address: ''
  });

  // Auto-d├®tection de l'indicatif t├®l├®phonique bas├® sur le pays
  useEffect(() => {
    if (formData.country) {
      const countryLower = formData.country.toLowerCase().trim();
      const code = COUNTRY_PHONE_CODES[countryLower];
      if (code) {
        setPhoneCode(code);
      }
    }
  }, [formData.country]);

  // Validation du num├®ro quand il change
  useEffect(() => {
    if (formData.phone) {
      const isValid = validatePhoneNumber(formData.phone, phoneCode);
      if (!isValid) {
        const hint = getPhoneLengthHint(phoneCode);
        setPhoneError(`Format invalide pour ${phoneCode}. Attendu: ${hint}`);
      } else {
        setPhoneError(null);
      }
    } else {
      setPhoneError(null);
    }
  }, [formData.phone, phoneCode]);
  
  const [manualCityEntry, setManualCityEntry] = useState(false);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsAuthenticating(true);
    isFormSubmittingRef.current = true; // Ô£à FIX: Bloquer le handler SIGNED_IN
    setError(null);
    setSuccess(null);

    try {
      if (showSignup) {
        // Inscription
        if (!selectedRole) {
          throw new Error("ÔÜá´©Å Veuillez d'abord s├®lectionner un type de compte ci-dessus (Client, Marchand, Livreur, etc.)");
        }
        
        // V├®rifier que l'email est diff├®rent de celui du compte client actuel (si cr├®ation de compte marchand s├®par├®)
        if (currentClientEmail && formData.email.toLowerCase() === currentClientEmail.toLowerCase()) {
          throw new Error(`ÔØî Vous devez utiliser une adresse email diff├®rente de ${currentClientEmail} pour cr├®er votre compte marchand. Les comptes client et marchand doivent ├¬tre s├®par├®s.`);
        }
        
        if (formData.password !== formData.confirmPassword) {
          throw new Error("ÔØî Les mots de passe ne correspondent pas");
        }

        // Validation du num├®ro de t├®l├®phone
        if (!validatePhoneNumber(formData.phone, phoneCode)) {
          const hint = getPhoneLengthHint(phoneCode);
          throw new Error(`ÔØî Num├®ro de t├®l├®phone invalide pour ${phoneCode}. Format attendu: ${hint}`);
        }
        const validatedData = signupSchema.parse({ ...formData, role: selectedRole });

        // G├®n├®rer un ID utilisateur avec le bon pr├®fixe selon le r├┤le
        const { data: userCustomId, error: generateError } = await supabase
          .rpc('generate_custom_id_with_role', { p_role: selectedRole });

        if (generateError) {
          console.error('ÔØî Erreur g├®n├®ration ID:', generateError);
          throw new Error('Erreur lors de la g├®n├®ration de votre identifiant');
        }

        // Supabase est le syst├¿me principal - pas de Cognito signup
        
        // ­ƒöæ ├ëTAPE 2: Synchroniser avec Supabase Auth (pour RLS/DB)
        // Supabase est le syst├¿me principal - sync Cloud SQL en arri├¿re-plan
        
        // ­ƒöæ Signup Supabase directement
        const { data: authData, error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            data: {
              first_name: validatedData.firstName,
              last_name: validatedData.lastName,
              role: validatedData.role,
              phone: `${phoneCode} ${formData.phone}`,
              country: formData.country,
              city: validatedData.city,
              custom_id: userCustomId,
              cognito_user_id: undefined,
              business_name: validatedData.role === 'vendeur' ? (formData.businessName?.trim() || `${validatedData.firstName} ${validatedData.lastName}`) : null,
              service_type: validatedData.role === 'prestataire' ? selectedServiceType : null
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        // Si c'est un taxi-motard, cr├®er son profil conducteur et le lier ├á son bureau
        if (!error && authData.user && validatedData.role === 'taxi') {
          try {
            // Trouver le bureau de la ville s├®lectionn├®e
            const bureau = bureaus.find(b => b.commune === validatedData.city);
            
            // 1. Cr├®er l'entr├®e taxi_drivers avec les infos du bureau pour la synchronisation
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
              console.error('ÔØî Erreur cr├®ation profil conducteur:', driverError);
            } else {
              console.log('Ô£à Profil taxi-motard cr├®├® avec succ├¿s');
            }

            // 2. SYNCHRONISATION BUREAU: Cr├®er l'entr├®e dans la table members pour que le bureau le voit
            if (bureau?.id) {
              const { error: memberError } = await supabase
                .from('members')
                .insert({
                  bureau_id: bureau.id,
                  name: `${validatedData.firstName} ${validatedData.lastName}`,
                  email: validatedData.email,
                  phone: `${phoneCode} ${formData.phone}`,
                  status: 'pending', // En attente de validation par le bureau
                  cotisation_status: 'pending',
                  join_date: new Date().toISOString().split('T')[0],
                  custom_id: userCustomId
                });
              
              if (memberError) {
                console.error('ÔØî Erreur synchronisation bureau:', memberError);
              } else {
                console.log('Ô£à Taxi-motard synchronis├® avec le bureau syndical de', validatedData.city);
              }
            } else {
              console.warn('ÔÜá´©Å Aucun bureau trouv├® pour la ville:', validatedData.city);
            }
          } catch (syncError) {
            console.error('ÔØî Erreur synchronisation:', syncError);
          }
        }

        // Si c'est un vendeur (marchand), cr├®er automatiquement son profil vendor avec le nom d'entreprise
        // Ô£à IMPORTANT: Les services professionnels n'utilisent PLUS le r├┤le vendeur
        if (!error && authData.user && validatedData.role === 'vendeur') {
          try {
            const businessName = formData.businessName?.trim() || `${validatedData.firstName} ${validatedData.lastName}`;
            
            // 1. Cr├®er le profil vendor (PAS de service professionnel ici)
            const { error: vendorError } = await supabase
              .from('vendors')
              .insert({
                user_id: authData.user.id,
                business_name: businessName,
                email: validatedData.email,
                phone: `${phoneCode} ${formData.phone}`,
                address: validatedData.city,
                city: validatedData.city,
                is_verified: false,
                is_active: true,
                service_type: 'general',
                business_type: vendorShopType || 'physical'
              });
            
            if (vendorError) {
              console.error('ÔØî Erreur cr├®ation profil vendeur:', vendorError);
              toast({
                title: "Erreur cr├®ation profil vendeur",
                description: vendorError.message || "Impossible de cr├®er le profil vendeur. Contactez le support.",
                variant: "destructive"
              });
            } else {
              console.log('Ô£à Profil vendeur cr├®├® avec nom entreprise:', businessName);
            }
          } catch (vendorSyncError) {
            console.error('ÔØî Erreur synchronisation vendeur:', vendorSyncError);
          }
        }

        // Ô£à NOUVEAU: Si c'est un prestataire de service, cr├®er le professional_service SANS vendor
        if (!error && authData.user && validatedData.role === 'prestataire' && selectedServiceType) {
          try {
            const businessName = formData.businessName?.trim() || `${validatedData.firstName} ${validatedData.lastName}`;
            console.log('­ƒöº Cr├®ation du professional_service pour prestataire:', selectedServiceType);
            
            // R├®cup├®rer le service_type_id ├á partir du code
            const { data: serviceType, error: serviceTypeError } = await supabase
              .from('service_types')
              .select('id')
              .eq('code', selectedServiceType)
              .maybeSingle();
            
            if (serviceTypeError) {
              console.error('ÔØî Erreur r├®cup├®ration service_type:', serviceTypeError);
            } else if (serviceType) {
              const { error: professionalServiceError } = await supabase
                .from('professional_services')
                .insert({
                  user_id: authData.user.id,
                  service_type_id: serviceType.id,
                  business_name: businessName,
                  address: validatedData.city,
                  phone: `${phoneCode} ${formData.phone}`,
                  email: validatedData.email,
                  status: 'active',
                  verification_status: 'unverified'
                });
              
              if (professionalServiceError) {
                console.error('ÔØî Erreur cr├®ation professional_service:', professionalServiceError);
                toast({
                  title: "Erreur cr├®ation service professionnel",
                  description: professionalServiceError.message || "Le service n'a pas pu ├¬tre cr├®├®.",
                  variant: "destructive"
                });
              } else {
                console.log('Ô£à Professional service cr├®├® pour prestataire:', selectedServiceType);
              }
            } else {
              console.warn('ÔÜá´©Å Service type non trouv├® pour le code:', selectedServiceType);
            }
          } catch (serviceError) {
            console.error('ÔØî Erreur cr├®ation service prestataire:', serviceError);
          }
        }

        if (error) {
          if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
            throw new Error('­ƒôº Cette adresse email est d├®j├á inscrite. Veuillez vous connecter ou utiliser une autre adresse.');
          } else if (error.message.includes('rate limit') || error.message.includes('email rate limit exceeded') || error.status === 429) {
            throw new Error('ÔÅ▒´©Å Trop de tentatives d\'inscription. Veuillez patienter quelques minutes avant de r├®essayer.');
          } else {
            throw error;
          }
        }
        
        // Ô£à FIX: Supabase ne retourne pas toujours une erreur pour les emails existants
        // Il retourne un user sans identities[] si l'email existe d├®j├á (comportement s├®curit├®)
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
          throw new Error('­ƒôº Cette adresse email est d├®j├á inscrite. Veuillez vous connecter ou utiliser une autre adresse.');
        }
        
        // === AFFILIATION AGENT: Enregistrer le parrainage si token pr├®sent ===
        if (authData.user && affiliateData.token) {
          try {
            console.log('­ƒöù [Affiliation] Enregistrement du parrainage...');
            const { data: affiliateResult, error: affiliateError } = await supabase.functions.invoke('register-with-affiliate', {
              body: {
                user_id: authData.user.id,
                email: validatedData.email,
                phone: `${phoneCode} ${formData.phone}`,
                first_name: validatedData.firstName,
                last_name: validatedData.lastName,
                role: validatedData.role,
                affiliate_token: affiliateData.token
              }
            });
            
            if (affiliateError) {
              console.error('ÔÜá´©Å [Affiliation] Erreur:', affiliateError);
            } else if (affiliateResult?.success) {
              console.log('Ô£à [Affiliation] Parrainage enregistr├® avec succ├¿s');
              toast({
                title: "Parrainage enregistr├® !",
                description: `Vous avez ├®t├® parrain├® par ${affiliateData.agentName || 'un agent'}.`,
              });
            }
            
            cleanupAffiliateFlags();
          } catch (affiliateErr) {
            console.error('ÔÜá´©Å [Affiliation] Erreur inattendue:', affiliateErr);
          }
        }
        
        // Ô£à Afficher le modal de succ├¿s puis rediriger
        if (authData.user) {
          // Attendre que le profil soit cr├®├® avec retry (max 5 secondes)
          let profileData = null;
          let attempts = 0;
          const maxAttempts = 10;
          
          while (!profileData && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', authData.user.id)
              .maybeSingle();
            
            if (data?.role) {
              profileData = data;
              break;
            }
            
            attempts++;
            console.log(`ÔÅ│ Attente cr├®ation profil... (tentative ${attempts}/${maxAttempts})`);
          }
          
          // D├®terminer la route cible
          let targetRoute = '/home';
          if (profileData?.role) {
            targetRoute = await resolvePostAuthRoute({
              userId: authData.user!.id,
              role: profileData.role,
              vendorShopType,
            });
          }

          // Afficher le modal de succ├¿s
          setSuccessRedirectRoute(targetRoute);
          setShowSuccessModal(true);
          
          // Rediriger apr├¿s 2.5 secondes
          setTimeout(() => {
            setShowSuccessModal(false);
            const pendingRedirectSignup = sessionStorage.getItem('post_auth_redirect');
            if (pendingRedirectSignup) {
              sessionStorage.removeItem('post_auth_redirect');
              console.log('­ƒöù [Auth Signup] Redirection vers lien partag├®:', pendingRedirectSignup);
              navigate(pendingRedirectSignup, { replace: true });
            } else {
              console.log('­ƒÜÇ [Auth Signup] Redirection vers:', targetRoute);
              navigate(targetRoute, { replace: true });
            }
          }, 2500);
        } else {
          setSuccess("Ô£à Inscription r├®ussie ! V├®rifiez votre bo├«te mail pour confirmer votre compte, puis connectez-vous.");
        }
      } else {
        // Connexion - Supabase Auth est le syst├¿me principal
        console.log('­ƒöÉ [Auth] Tentative de connexion Supabase...');
        const validatedData = loginSchema.parse(formData);
        
        // ­ƒöæ Login Supabase (syst├¿me principal)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('­ƒôº Email non confirm├®. Veuillez v├®rifier votre bo├«te mail et cliquer sur le lien de confirmation.');
          } else if (error.message.includes('Invalid login credentials')) {
            throw new Error('ÔØî Email ou mot de passe incorrect. Veuillez r├®essayer.');
          } else {
            throw error;
          }
        }

        console.log('Ô£à [Auth] Login Supabase r├®ussi');
        
        // ­ƒöä Sync Cloud SQL en arri├¿re-plan (non bloquant)
        if (data.session?.access_token) {
          syncCognitoProfile(data.session.access_token).catch(err => {
            console.warn('ÔÜá´©Å [Auth] Sync Cloud SQL ├®chou├®e (non bloquant):', err);
          });
        }

        
        if (data.user) {
          setSuccess("Ô£à Connexion r├®ussie ! Redirection en cours...");
          
          // ÔÜí R├®cup├®rer le profil avec retry pour s'assurer qu'il est charg├®
          let profileData = null;
          let attempts = 0;
          const maxAttempts = 10;
          const userId = data.user.id;
          
          while (!profileData && attempts < maxAttempts) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .maybeSingle();
            
            if (profile?.role) {
              profileData = profile;
              break;
            }
            
            // Attendre 200ms entre chaque tentative (max 2s total)
            if (attempts < maxAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            attempts++;
            console.log(`ÔÅ│ [Auth Login] Chargement profil... (tentative ${attempts}/${maxAttempts})`);
          }
          
          if (profileData?.role) {
            const targetRoute = await resolvePostAuthRoute({
              userId,
              role: profileData.role,
            });
            console.log('­ƒÜÇ [Auth Login] Redirection vers:', targetRoute, '(r├┤le:', profileData.role, ')');
            await new Promise(resolve => setTimeout(resolve, 300));
            const pendingRedirectLogin = sessionStorage.getItem('post_auth_redirect');
            if (pendingRedirectLogin) {
              sessionStorage.removeItem('post_auth_redirect');
              console.log('­ƒöù [Auth Login] Redirection vers lien partag├®:', pendingRedirectLogin);
              navigate(pendingRedirectLogin, { replace: true });
            } else {
              navigate(targetRoute, { replace: true });
            }
          } else {
            // Fallback: rediriger vers home, useRoleRedirect prendra le relais
            console.log('ÔÜá´©Å [Auth Login] Pas de profil trouv├®, redirection vers /home');
            navigate('/home', { replace: true });
          }
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
      setIsAuthenticating(false);
      isFormSubmittingRef.current = false; // Ô£à FIX: D├®bloquer le handler SIGNED_IN
    }
  };

  const handleRoleClick = (role: UserRole) => {
    // Si on clique sur un autre r├┤le que vendeur et que showServiceSelection est ouvert, le fermer
    if (role !== 'vendeur' && showServiceSelection) {
      setShowServiceSelection(false);
      setSelectedServiceType(null);
    }
    
    if (role === 'vendeur') {
      // Pour les marchands, afficher d'abord la s├®lection du type de service
      setShowServiceSelection(true);
      setSelectedRole(role);
      // Scroll vers le milieu pour afficher la fen├¬tre de s├®lection
      setTimeout(() => {
        const serviceCard = document.getElementById('service-selection-card');
        if (serviceCard) {
          serviceCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    } else {
      setSelectedRole(role);
      setShowSignup(true);
    }
  };

  // Fonction pour fermer la s├®lection de service quand on clique ailleurs
  const handleCloseServiceSelection = () => {
    setShowServiceSelection(false);
    setSelectedServiceType(null);
    setSelectedRole(null);
  };

  const handleSkipServiceSelection = () => {
    setShowServiceSelection(false);
    setSelectedServiceType(null); // Pas de service professionnel s├®lectionn├®
    setShowSignup(true);
  };

  const handleServiceTypeSelect = (serviceTypeId: string) => {
    // Ô£à FIX: Traitement sp├®cial pour les types non-service
    if (serviceTypeId === 'digital') {
      // Produits num├®riques ÔåÆ vendeur digital (pas un service professionnel)
      setSelectedServiceType(null);
      setSelectedRole('vendeur');
      setVendorShopType('digital');
      setShowServiceSelection(false);
      setShowSignup(true);
      console.log('­ƒöº [Auth] Type digital s├®lectionn├® ÔåÆ vendeur digital');
      return;
    }
    
    if (serviceTypeId === 'ecommerce') {
      // Boutique e-commerce ÔåÆ vendeur classique (pas un service professionnel)
      setSelectedServiceType(null);
      setSelectedRole('vendeur');
      setVendorShopType('physical');
      setShowServiceSelection(false);
      setShowSignup(true);
      console.log('­ƒöº [Auth] Type ecommerce s├®lectionn├® ÔåÆ vendeur physique');
      return;
    }
    
    // Ô£à NOUVEAU: Les services professionnels utilisent le r├┤le 'prestataire' (PAS 'vendeur')
    setSelectedServiceType(serviceTypeId);
    setSelectedRole('prestataire');
    setVendorShopType(null);
    setShowServiceSelection(false);
    setShowSignup(true);
    console.log('­ƒöº [Auth] Service s├®lectionn├®:', serviceTypeId, 'ÔåÆ r├┤le: prestataire (ind├®pendant du vendeur)');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const emailSchema = z.string().email("Adresse email invalide");
      emailSchema.parse(resetEmail);

      // Ô£à Supabase Auth - syst├¿me principal
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;

      setSuccess("Ô£à Lien de r├®initialisation envoy├®. V├®rifiez votre email.");
      setShowResetPassword(false);
      setIsLogin(true);
    } catch (err) {
      let errorMessage = 'Une erreur est survenue';
      if (err instanceof Error) errorMessage = err.message;
      if (err && typeof err === 'object' && 'issues' in err) {
        errorMessage = (err as any).issues[0]?.message || errorMessage;
      }
      setError(errorMessage);
      console.error('Erreur r├®initialisation mot de passe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation du nouveau mot de passe (m├¬mes r├¿gles que l'inscription)
      passwordSchema.parse(newPassword);

      if (newPassword !== confirmNewPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }

      // Supabase Auth - mise ├á jour du mot de passe via session de recovery
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Session expir├®e. Veuillez demander un nouveau lien de r├®initialisation.");
      }

      console.log('­ƒöÉ Session active, mise ├á jour du mot de passe...');

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('ÔØî Erreur Supabase:', error);
        throw error;
      }

      console.log('Ô£à Mot de passe mis ├á jour avec succ├¿s');
      setSuccess("Ô£à Mot de passe r├®initialis├® avec succ├¿s ! Vous pouvez maintenant vous connecter.");
      setNewPassword('');
      setConfirmNewPassword('');
      
      await supabase.auth.signOut();
      
      setTimeout(() => {
        setShowNewPasswordForm(false);
        setIsLogin(true);
        setSuccess(null);
        navigate('/auth');
      }, 2000);
    } catch (err) {
      let errorMessage = 'Une erreur est survenue';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('ÔØî Erreur changement mot de passe:', err);
    } finally {
      setLoading(false);
    }
  };

  // UI: panneau d'inscription (├á droite) uniquement quand on est vraiment en mode inscription
  // (pas pendant reset password / nouveau mot de passe)
  const showSignupLayout = (showSignup || showVendorTypeSelection) && !showResetPassword && !showNewPasswordForm;

  return (
    <div className="min-h-screen bg-white pb-24 overflow-x-hidden">
      {/* Header avec 224SOLUTIONS et boutons */}
      <div className="text-center py-8 px-4">
        <div className="flex justify-end mb-4 px-4">
          <LanguageSelector variant="compact" />
        </div>
        <img src="/logo-224solutions.png" alt="224Solutions" className="w-24 h-24 mx-auto mb-4 object-contain rounded-2xl bg-primary/5 p-2 shadow-sm" />
        <h1 className="text-4xl font-bold text-primary mb-6">224Solutions</h1>


        {/* Titre principal - encore plus rapproch├® du bloc de s├®lection */}
        <h2 className="text-2xl text-gray-600 mb-2">
          {t('auth.connectToSpace')} <span className="font-bold text-gray-800">{t('auth.professionalSpace')}</span>
        </h2>
      </div>

      {/* NB: Les types de comptes sont d├®sormais affich├®s dans le panneau d'inscription (├á droite) */}

      {/* S├®lection du type de service professionnel pour les marchands */}
      {showServiceSelection && (
        <>
          {/* Overlay cliquable pour fermer */}
          <div 
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={handleCloseServiceSelection}
          />
          <div className="max-w-6xl mx-auto px-4 mt-6 relative z-50">
            <Card id="service-selection-card" className="shadow-2xl border-2 border-primary bg-white overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-start mb-6">
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
              

              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold mb-2">
                  Choisissez votre Type de Service
                </h3>
                <p className="text-muted-foreground text-sm">
                  S├®lectionnez le service que vous souhaitez proposer sur la plateforme
                </p>
              </div>

              {/* Section: Inscription directe par r├┤le (Taxi Moto, Livreur, Transitaire) */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-amber-600 mb-3 flex items-center justify-center gap-2">
                  <span className="w-8 h-0.5 bg-amber-500 rounded"></span>
                  Inscription Rapide
                  <span className="w-8 h-0.5 bg-amber-500 rounded"></span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { role: 'taxi' as UserRole, name: 'Taxi Moto', icon: '­ƒÅì´©Å', desc: 'Conducteur taxi-moto' },
                    { role: 'livreur' as UserRole, name: 'Livreur', icon: '­ƒôª', desc: 'Coursier & livraison' },
                    { role: 'transitaire' as UserRole, name: 'Transitaire', icon: '­ƒÜó', desc: 'Import & export' },
                  ].map((item) => (
                    <button
                      key={item.role}
                      onClick={() => {
                        setShowServiceSelection(false);
                        setSelectedServiceType(null);
                        setSelectedRole(item.role);
                        setShowSignup(true);
                      }}
                      className="flex flex-col items-center p-3 bg-gradient-to-br from-amber-50 to-white rounded-xl border-2 hover:border-amber-500 hover:shadow-lg hover:scale-[1.02] transition-all border-amber-200"
                    >
                      <div className="text-3xl mb-1.5">{item.icon}</div>
                      <span className="text-sm font-semibold text-foreground">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section: Services de Proximit├® */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-primary mb-3 flex items-center justify-center gap-2">
                  <span className="w-8 h-0.5 bg-primary rounded"></span>
                  Services de Proximit├®
                  <span className="w-8 h-0.5 bg-primary rounded"></span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'restaurant', name: 'Restaurant', icon: '­ƒì¢´©Å', desc: 'Cuisine & plats' },
                    { id: 'beaute', name: 'Beaut├® & Coiffure', icon: '­ƒÆç', desc: 'Soins & styling' },
                    { id: 'vtc', name: 'Transport VTC', icon: '­ƒÜù', desc: 'V├®hicules priv├®s' },
                    { id: 'reparation', name: 'R├®paration', icon: '­ƒöº', desc: '├ëlectro & m├®canique' },
                    { id: 'menage', name: 'Nettoyage', icon: 'Ô£¿', desc: 'M├®nage & pressing' },
                    { id: 'informatique', name: 'Informatique', icon: '­ƒÆ╗', desc: 'Tech & d├®pannage' },
                    { id: 'livraison', name: 'Livraison', icon: '­ƒÜÜ', desc: 'Coursier & colis' },
                    { id: 'ecommerce', name: 'Boutique', icon: '­ƒÅ¬', desc: 'E-commerce' },
                  ].map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceTypeSelect(service.id)}
                      className={`flex flex-col items-center p-3 bg-gradient-to-br from-white to-slate-50 rounded-xl border-2 hover:border-primary hover:shadow-lg hover:scale-[1.02] transition-all ${
                        selectedServiceType === service.id ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-slate-200'
                      }`}
                    >
                      <div className="text-3xl mb-1.5">{service.icon}</div>
                      <span className="text-sm font-semibold text-foreground">{service.name}</span>
                      <span className="text-[10px] text-muted-foreground">{service.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section: Services Professionnels */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-violet-600 mb-3 flex items-center justify-center gap-2">
                  <span className="w-8 h-0.5 bg-violet-500 rounded"></span>
                  Services Professionnels
                  <span className="w-8 h-0.5 bg-violet-500 rounded"></span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'sport', name: 'Sport & Fitness', icon: '­ƒÅï´©Å', desc: 'Coaching' },
                    { id: 'location', name: 'Immobilier', icon: '­ƒÅó', desc: 'Location & vente' },
                    { id: 'media', name: 'Photo & Vid├®o', icon: '­ƒô©', desc: '├ëv├®nements' },
                    { id: 'construction', name: 'Construction & BTP', icon: '­ƒÅù´©Å', desc: 'B├ótiment' },
                    { id: 'agriculture', name: 'Agriculture', icon: '­ƒî¥', desc: 'Produits locaux' },
                    { id: 'freelance', name: 'Administratif', icon: '­ƒÆ╝', desc: 'Secr├®tariat' },
                    { id: 'sante', name: 'Sant├® & Bien-├¬tre', icon: '­ƒÆè', desc: 'Pharmacie & soins' },
                    { id: 'maison', name: 'Maison & D├®co', icon: '­ƒÅá', desc: 'Int├®rieur' },
                    { id: 'education', name: 'Formation', icon: '­ƒÄô', desc: 'Cours & coaching' },
                    { id: 'voyage', name: 'Voyage', icon: 'Ô£ê´©Å', desc: 'Tourisme & voyages' },
                    { id: 'digital', name: 'Produits Num├®riques', icon: '­ƒô▒', desc: 'E-books & logiciels' },
                  ].map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceTypeSelect(service.id)}
                      className={`flex flex-col items-center p-3 bg-gradient-to-br from-violet-50 to-white rounded-xl border-2 hover:border-violet-500 hover:shadow-lg hover:scale-[1.02] transition-all ${
                        selectedServiceType === service.id ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-violet-200'
                      }`}
                    >
                      <div className="text-3xl mb-1.5">{service.icon}</div>
                      <span className="text-sm font-semibold text-foreground">{service.name}</span>
                      <span className="text-[10px] text-muted-foreground">{service.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Google OAuth pour inscription service */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center mb-3">ou cr├®er votre compte professionnel avec</p>
                <button
                  type="button"
                  onClick={() => {
                    // Ô£à NOUVEAU: Les services utilisent le r├┤le 'prestataire' (pas 'vendeur')
                    setSelectedRole('prestataire');
                    setShowServiceSelection(false);
                    localStorage.setItem('oauth_intent_role', 'prestataire');
                    localStorage.setItem('oauth_is_new_signup', 'true');
                    if (selectedServiceType) {
                      localStorage.setItem('oauth_service_type', selectedServiceType);
                    }
                    handleGoogleLogin(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md transition-all duration-200"
                  disabled={oauthLoading !== null}
                >
                  {oauthLoading === 'google' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span className="font-semibold text-gray-700 text-sm">
                    {oauthLoading === 'google' ? 'Connexion...' : "S'inscrire avec Google"}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
        </>
      )}

      {/* Formulaire de connexion/inscription/reset */}
      {!showServiceSelection && (
        <div className="max-w-md mx-auto px-4 mt-1">
              <div>
                <Card className="shadow-lg border-2 border-primary/20">
                  <CardContent className="p-8">
            {/* ├ëcran de chargement pendant la v├®rification du lien de r├®initialisation */}
            {checkingResetLink ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">­ƒöÉ V├®rification en cours...</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Validation de votre lien de r├®initialisation
                  </p>
                </div>
              </div>
            ) : (
            <>
            {/* Bouton retour pour le reset password */}
            {showResetPassword && (
              <Button
                variant="ghost"
                onClick={() => {
                  setShowResetPassword(false);
                  setError(null);
                  setSuccess(null);
                  setResetEmail('');
                }}
                className="gap-2 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour ├á la connexion
              </Button>
            )}

            {/* Messages d'information */}
            {/* Boutons Connexion / Cr├®er un compte - toujours visibles sauf reset password */}
            {/* Onglets Connexion / Inscription - Design professionnel */}
            {!showResetPassword && !showNewPasswordForm && (
              <div className="mb-6">
                <div className="relative flex p-1 rounded-2xl border border-border/50">
                  {/* Indicateur anim├® */}
                  <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-primary to-primary/90 rounded-xl shadow-lg transition-all duration-300 ease-out ${
                      showSignup ? 'left-[calc(50%+2px)]' : 'left-1'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignup(false);
                      setSelectedRole(null);
                      setError(null);
                      setSuccess(null);
                    }}
                    className={`relative z-10 flex-1 py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                      !showSignup 
                        ? 'text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <LogIn className="h-4 w-4 flex-shrink-0" />
                      Connexion
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignup(true);
                      setIsLogin(false);
                      setSelectedRole(null);
                      setShowVendorTypeSelection(false);
                      setShowServiceSelection(false);
                      setVendorShopType(null);
                      setSelectedServiceType(null);
                      setError(null);
                      setSuccess(null);
                    }}
                    className={`relative z-10 flex-1 py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 whitespace-nowrap ${
                      showSignup 
                        ? 'text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <UserPlus className="h-4 w-4 flex-shrink-0" />
                      Marchand/Service
                    </span>
                  </button>
                </div>
              </div>
            )}

            {!showSignup && !showResetPassword && !showVendorTypeSelection && (
              <>
                <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold text-sm mb-1">Connexion intelligente</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Utilisez vos identifiants habituels. Le syst├¿me reconna├«tra automatiquement votre type de compte.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-6 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-amber-700 text-xs">
                      Nouveau inscrit ? Confirmez votre email avant de vous connecter.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Types de comptes - Vendeur classique & Service */}
            {/* S├®lection du type de boutique vendeur - Page d├®di├®e */}
            {showVendorTypeSelection && !showSignup && (
              <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                <div className="bg-gradient-to-br from-muted/20 via-background to-muted/10 border border-border/50 rounded-2xl p-6 shadow-sm">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Store className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">Vendeur classique</h3>
                    <p className="text-xs text-muted-foreground">Quel type de produits souhaitez-vous vendre ?</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* E-commerce - Produits physiques */}
                    <button
                      type="button"
                      onClick={() => {
                        setVendorShopType('physical');
                        setSelectedServiceType(null);
                        setSelectedRole('vendeur');
                        setShowServiceSelection(false);
                        setShowVendorTypeSelection(false);
                        setShowSignup(true);
                      }}
                      className="group flex flex-col items-center text-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-xl border-2 border-border/60 bg-background hover:border-primary hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 group-hover:bg-primary flex items-center justify-center shrink-0 transition-colors">
                        <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-foreground block mb-0.5 sm:mb-1">E-commerce</span>
                        <span className="text-[10px] sm:text-[11px] leading-tight text-muted-foreground block">Produits physiques, v├¬tements, ├®lectroniqueÔÇª</span>
                      </div>
                    </button>

                    {/* Produits digitaux */}
                    <button
                      type="button"
                      onClick={() => {
                        setVendorShopType('digital');
                        setSelectedServiceType(null);
                        setSelectedRole('vendeur');
                        setShowServiceSelection(false);
                        setShowVendorTypeSelection(false);
                        setShowSignup(true);
                      }}
                      className="group flex flex-col items-center text-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-xl border-2 border-border/60 bg-background hover:border-indigo-400 hover:bg-indigo-50/60 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-indigo-100 group-hover:bg-indigo-500 flex items-center justify-center shrink-0 transition-colors">
                        <Laptop className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-foreground block mb-0.5 sm:mb-1">Digitaux</span>
                        <span className="text-[10px] sm:text-[11px] leading-tight text-muted-foreground block">Fichiers, formations, ebooks, logicielsÔÇª</span>
                      </div>
                    </button>
                  </div>

                  {/* Google OAuth pour vendeur classique */}
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground text-center mb-3">ou cr├®er votre boutique avec</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRole('vendeur');
                        localStorage.setItem('oauth_intent_role', 'vendeur');
                        localStorage.setItem('oauth_is_new_signup', 'true');
                        handleGoogleLogin(false);
                      }}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md transition-all duration-200"
                      disabled={oauthLoading !== null}
                    >
                      {oauthLoading === 'google' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      <span className="font-semibold text-gray-700 text-sm">
                        {oauthLoading === 'google' ? 'Connexion...' : "S'inscrire avec Google"}
                      </span>
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Types de comptes - Vendeur classique & Service */}
            {showSignupLayout && !showVendorTypeSelection && !selectedRole && (
              <div className="mb-6 bg-gradient-to-br from-muted/20 via-background to-muted/10 border border-border/50 rounded-2xl p-5 shadow-sm">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-foreground mb-1">Choisissez votre profil</h3>
                  <p className="text-xs text-muted-foreground">S├®lectionnez le type de compte qui vous correspond</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Vendeur classique - Un seul bouton qui ouvre la page d├®di├®e */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowVendorTypeSelection(true);
                      setShowSignup(false);
                      setSelectedRole(null);
                      setSelectedServiceType(null);
                    }}
                    className={`group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedRole === 'vendeur' && !selectedServiceType
                        ? 'bg-gradient-to-br from-primary to-secondary border-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                        : 'bg-background border-border/60 hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedRole === 'vendeur' && !selectedServiceType ? 'bg-white/20' : 'bg-primary/10 group-hover:bg-primary/20'
                    }`}>
                      <Store className={`h-6 w-6 ${selectedRole === 'vendeur' && !selectedServiceType ? 'text-white' : 'text-primary'}`} />
                    </div>
                    <span className={`text-sm font-semibold ${selectedRole === 'vendeur' && !selectedServiceType ? 'text-white' : 'text-foreground'}`}>
                      Vendeur classique
                    </span>
                    <span className={`text-[10px] ${selectedRole === 'vendeur' && !selectedServiceType ? 'text-white/80' : 'text-muted-foreground'}`}>
                      Vendre des produits
                    </span>
                  </button>

                  {/* Service */}
                  <button
                    type="button"
                    onClick={() => handleRoleClick('vendeur')}
                    className={`group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedRole === 'prestataire'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                        : 'bg-background border-border/60 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedRole === 'prestataire' ? 'bg-white/20' : 'bg-emerald-100 group-hover:bg-emerald-200'
                    }`}>
                      <Briefcase className={`h-6 w-6 ${selectedRole === 'prestataire' ? 'text-white' : 'text-emerald-600'}`} />
                    </div>
                    <span className={`text-sm font-semibold ${selectedRole === 'prestataire' ? 'text-white' : 'text-foreground'}`}>
                      Service
                    </span>
                    <span className={`text-[10px] ${selectedRole === 'prestataire' ? 'text-white/80' : 'text-muted-foreground'}`}>
                      Proposer des services
                    </span>
                  </button>
                </div>
              </div>
            )}
            
              {showSignup && selectedRole && (
              <div className={`mb-6 p-4 rounded-lg border ${
                selectedRole === 'vendeur' ? 'bg-primary/5 border-primary/20' :
                selectedRole === 'prestataire' ? 'bg-emerald-50 border-emerald-200' :
                selectedRole === 'livreur' ? 'bg-orange-50 border-orange-200' :
                selectedRole === 'taxi' ? 'bg-yellow-50 border-yellow-200' :
                selectedRole === 'transitaire' ? 'bg-purple-50 border-purple-200' :
                selectedRole === 'client' ? 'bg-emerald-50 border-emerald-200' :
                'bg-muted/50 border-border'
              }`}>
                <p className={`text-sm ${
                  selectedRole === 'vendeur' ? 'text-primary' :
                  selectedRole === 'prestataire' ? 'text-emerald-800' :
                  selectedRole === 'livreur' ? 'text-orange-800' :
                  selectedRole === 'taxi' ? 'text-yellow-800' :
                  selectedRole === 'transitaire' ? 'text-purple-800' :
                  selectedRole === 'client' ? 'text-emerald-800' :
                  'text-foreground'
                }`}>
                  <strong>­ƒÄ» Cr├®ation de compte :</strong> Remplissez les informations ci-dessous pour cr├®er votre compte {selectedRole ? `en tant que ${selectedRole === 'prestataire' ? 'Prestataire de Service' : selectedRole === 'vendeur' ? 'Vendeur E-commerce' : selectedRole}` : ''}.
                  {selectedServiceType && (
                    <span className={`block mt-2 font-semibold ${
                      selectedRole === 'vendeur' ? 'text-primary' :
                      selectedRole === 'livreur' ? 'text-orange-700' :
                      selectedRole === 'taxi' ? 'text-yellow-700' :
                      selectedRole === 'transitaire' ? 'text-purple-700' :
                      selectedRole === 'client' ? 'text-emerald-700' :
                      'text-primary'
                    }`}>
                      Ô£ô Service s├®lectionn├® : {(() => {
                        const allServices = [
                          // Services de Proximit├® Populaires (6)
                          { id: 'restaurant', name: 'Restaurant', icon: '­ƒì¢´©Å' },
                          { id: 'beaute', name: 'Beaut├® & Coiffure', icon: '­ƒÆç' },
                          { id: 'vtc', name: 'Transport VTC', icon: '­ƒÜù' },
                          { id: 'reparation', name: 'R├®paration', icon: '­ƒöº' },
                          { id: 'menage', name: 'Nettoyage', icon: 'Ô£¿' },
                          { id: 'informatique', name: 'Informatique', icon: '­ƒÆ╗' },
                          // Services Professionnels (8)
                          { id: 'sport', name: 'Sport & Fitness', icon: '­ƒÅï´©Å' },
                          { id: 'location', name: 'Immobilier', icon: '­ƒÅó' },
                          { id: 'media', name: 'Photo & Vid├®o', icon: '­ƒô©' },
                          { id: 'construction', name: 'Construction & BTP', icon: '­ƒÅù´©Å' },
                          { id: 'agriculture', name: 'Agriculture', icon: '­ƒî¥' },
                          { id: 'freelance', name: 'Administratif', icon: '­ƒÆ╝' },
                          { id: 'sante', name: 'Sant├® & Bien-├¬tre', icon: '­ƒÆè' },
                          { id: 'maison', name: 'Maison & D├®co', icon: '­ƒÅá' },
                          // Autres Services (4)
                          { id: 'education', name: 'Formation', icon: '­ƒÄô' },
                          { id: 'livraison', name: 'Livraison', icon: '­ƒÜÜ' },
                          { id: 'voyage', name: 'Voyage', icon: 'Ô£ê´©Å' },
                          { id: 'ecommerce', name: 'Boutique', icon: '­ƒÅ¬' },
                        ];
                        const service = allServices.find(s => s.id === selectedServiceType);
                        return service ? `${service.icon} ${service.name}` : selectedServiceType;
                      })()}
                    </span>
                  )}
                  {selectedRole === 'vendeur' && !selectedServiceType && vendorShopType === 'digital' && (
                    <span className="block mt-1 font-semibold text-purple-700">
                      Ô£ô Mode Produits digitaux (fichiers, formations, ebooks)
                    </span>
                  )}
                  {selectedRole === 'vendeur' && !selectedServiceType && vendorShopType !== 'digital' && (
                    <span className="block mt-1 font-semibold text-blue-700">
                      Ô£ô Mode Boutique E-commerce (produits physiques)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Formulaire de r├®initialisation de mot de passe */}
            {showResetPassword ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Entrez votre adresse email pour recevoir un lien de r├®initialisation de mot de passe.
                  </p>
                  <Label htmlFor="reset-email">Adresse email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
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
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien de r├®initialisation'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowResetPassword(false);
                    setError(null);
                    setSuccess(null);
                    setResetCode('');
                  }}
                >
                  Retour ├á la connexion
                </Button>
              </form>
            ) : showNewPasswordForm ? (
              <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    ­ƒöÉ Choisissez votre nouveau mot de passe.
                  </p>

                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 caract├¿res"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Retapez votre mot de passe"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
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

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      R├®initialisation en cours...
                    </>
                  ) : (
                    'R├®initialiser mon mot de passe'
                  )}
                </Button>
              </form>
            ) : showVendorTypeSelection ? null : (
              <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">{success}</AlertDescription>
                </Alert>
              )}

              {showSignup && selectedRole && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder={t('auth.firstName')}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder={t('auth.lastName')}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Champ Nom d'entreprise - uniquement pour les marchands */}
                  {selectedRole === 'vendeur' && (
                    <div>
                      <Label htmlFor="businessName">
                        <Store className="inline w-4 h-4 mr-1" />
                        Nom de l'entreprise / Boutique
                      </Label>
                      <Input
                        id="businessName"
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        placeholder="Ex: Boutique Fatou, Restaurant Le D├®lice..."
                        required
                        className="mt-1"
                      />
                    </div>
                  )}

                  {/* Bouton d├®tection position */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-primary border-primary/30 hover:bg-primary/5"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const data = getSafeBrowserGeo();
                        handleInputChange('country', data.countryName || 'Guin├®e');
                        handleInputChange('city', data.city || 'Conakry');
                        handleInputChange('address', [data.region, data.city, data.countryName].filter(Boolean).join(', '));
                        toast({ title: "­ƒôì Position d├®tect├®e", description: `${data.city || 'Conakry'}, ${data.countryName || 'Guin├®e'}` });
                      } catch {
                        toast({ title: "Erreur", description: "Impossible de d├®tecter la position", variant: "destructive" });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    D├®tecter ma position automatiquement
                  </Button>

                  <div>
                    <Label htmlFor="country">Pays</Label>
                    <Popover open={countrySelectOpen} onOpenChange={setCountrySelectOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={countrySelectOpen}
                          className="w-full justify-between mt-1 font-normal"
                        >
                          <span className="truncate">
                            {formData.country
                              ? (() => {
                                  const found = WORLD_PHONE_CODES.find(c => c.country === formData.country);
                                  return found ? `${found.flag} ${found.country}` : formData.country;
                                })()
                              : "S├®lectionner un pays..."}
                          </span>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0 bg-background border shadow-lg z-[100]" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher un pays..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>Aucun pays trouv├®</CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-auto">
                              {WORLD_PHONE_CODES.map((item) => (
                                <CommandItem
                                  key={`country-${item.code}-${item.country}`}
                                  value={`${item.country}`}
                                  onSelect={() => {
                                    handleInputChange('country', item.country);
                                    setCountrySelectOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <span className="mr-2">{item.flag}</span>
                                  <span className="flex-1 truncate text-sm">{item.country}</span>
                                  {formData.country === item.country && (
                                    <Check className="ml-2 h-4 w-4 text-primary" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="city">Ville / Commune</Label>
                      {/* Afficher le bouton de s├®lection uniquement pour taxi (synchronisation bureau) */}
                      {selectedRole === 'taxi' && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualCityEntry(!manualCityEntry);
                            setFormData({ ...formData, city: '' });
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          {manualCityEntry ? '­ƒôï Choisir dans la liste' : 'Ô£Å´©Å Saisir manuellement'}
                        </button>
                      )}
                    </div>
                    
                    {/* Pour client, livreur, vendeur et transitaire: saisie manuelle uniquement */}
                    {(selectedRole === 'client' || selectedRole === 'livreur' || selectedRole === 'vendeur' || selectedRole === 'transitaire') ? (
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Saisissez votre ville"
                        className="mt-1"
                      />
                    ) : manualCityEntry ? (
                      <Input
                        id="city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Saisissez votre ville"
                        required
                        className="mt-1"
                      />
                    ) : (
                      <select
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        required
                        className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring z-50"
                      >
                        <option value="">S├®lectionnez votre ville</option>
                        {bureaus.map((bureau) => (
                          <option key={bureau.id} value={bureau.commune}>
                            {bureau.commune} - {bureau.prefecture}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {selectedRole === 'taxi' && formData.city && !manualCityEntry && (
                      <p className="text-xs text-green-600 mt-1">
                        Ô£à Vous serez automatiquement synchronis├® avec le bureau syndical de {formData.city}
                      </p>
                    )}
                    {selectedRole === 'taxi' && formData.city && manualCityEntry && (
                      <p className="text-xs text-amber-600 mt-1">
                        ÔÜá´©Å Ville saisie manuellement - synchronisation bureau non garantie
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Ex: Quartier Madina, Rue KA-020"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Num├®ro de t├®l├®phone</Label>
                    <div className="flex gap-2 mt-1">
                      {/* S├®lecteur d'indicatif pays avec recherche */}
                      <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={phoneCodeOpen}
                            className="w-32 justify-between px-2 font-medium"
                          >
                            <span className="flex items-center gap-1 truncate">
                              {WORLD_PHONE_CODES.find(c => c.code === phoneCode)?.flag} {phoneCode}
                            </span>
                            <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 bg-background border shadow-lg z-[100]" align="start">
                          <Command>
                            <CommandInput placeholder="Rechercher un pays..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>Aucun pays trouv├®</CommandEmpty>
                              <CommandGroup className="max-h-60 overflow-auto">
                                {WORLD_PHONE_CODES.map((item) => (
                                  <CommandItem
                                    key={`${item.code}-${item.country}`}
                                    value={`${item.country} ${item.code}`}
                                    onSelect={() => {
                                      setPhoneCode(item.code);
                                      setPhoneCodeOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <span className="mr-2">{item.flag}</span>
                                    <span className="flex-1 truncate">{item.country}</span>
                                    <span className="ml-2 text-muted-foreground">{item.code}</span>
                                    {phoneCode === item.code && (
                                      <Check className="ml-2 h-4 w-4 text-primary" />
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {/* Num├®ro de t├®l├®phone */}
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          // Nettoyer le num├®ro (enlever espaces et caract├¿res non num├®riques)
                          const cleaned = e.target.value.replace(/[^\d]/g, '');
                          handleInputChange('phone', cleaned);
                        }}
                        placeholder={getPhoneExample(phoneCode)}
                        required
                        className={`flex-1 ${phoneError ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-xs text-red-500 mt-1">
                        ÔØî {phoneError}
                      </p>
                    ) : formData.phone && !phoneError ? (
                      <p className="text-xs text-green-600 mt-1">
                        Ô£à Format valide ({getPhoneLengthHint(phoneCode)})
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Format attendu: {getPhoneLengthHint(phoneCode)} ÔÇó Ex: {getPhoneExample(phoneCode)}
                      </p>
                    )}
                  </div>
                </>
              )}

              {(!showSignup || selectedRole) && (<>
              <div>
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={t('auth.password')}
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
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder={t('auth.confirmPassword')}
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
                    onClick={() => {
                      setShowResetPassword(true);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-sm text-purple-600 hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading || oauthLoading !== null}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {showSignup ? t('auth.registering') : t('auth.loggingIn')}
                  </>
                ) : (
                  showSignup ? t('auth.register') : t('auth.login')
                )}
              </Button>
              </>)}

              {/* ===== OAUTH BUTTONS ===== */}
              {(
                <>
                  <div className="relative my-6">
                    <Separator />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-muted-foreground">
                      {showSignup ? "ou s'inscrire avec" : 'ou continuer avec'}
                    </span>
                  </div>

                  <div className="flex justify-center">
                    <div className="relative w-full max-w-sm">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-14 gap-3 font-medium text-base hover:bg-red-50 hover:border-red-300 hover:shadow-lg transition-all duration-200 relative overflow-hidden group"
                        onClick={() => handleGoogleLogin(false)}
                        disabled={loading || oauthLoading !== null}
                        aria-label={showSignup ? "S'inscrire avec Google" : "Se connecter avec Google"}
                        aria-busy={oauthLoading === 'google'}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        {oauthLoading === 'google' ? (
                          <>
                            {oauthRetrying ? (
                              <RefreshCw className="h-6 w-6 animate-spin" />
                            ) : (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            )}
                            <span>{oauthRetrying ? 'Nouvelle tentative...' : 'Connexion...'}</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span>{showSignup ? "S'inscrire avec Google" : 'Continuer avec Google'}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {oauthLoading === 'google' && (
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-600 animate-pulse">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span>Redirection s├®curis├®e vers Google...</span>
                    </div>
                  )}
                </>
              )}

              {/* Section basculer Connexion / Inscription - Design compact */}
              <div className="mt-3 pt-3 border-t border-border/30">
                {!showSignup ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">Pas de compte ?</span>
                    <button
                      type="button"
                      onClick={() => { setShowRoleSelectionModal(true); setError(null); setSuccess(null); }}
                      className="inline-flex items-center gap-1.5 py-2 px-4 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all duration-200"
                    >
                      <UserPlus className="h-4 w-4" />
                      Cr├®er un compte
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground">D├®j├á inscrit ?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignup(false);
                        setSelectedRole(null);
                        setError(null);
                        setSuccess(null);
                      }}
                      className="inline-flex items-center gap-1.5 py-2 px-4 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all duration-200"
                    >
                      <LogIn className="h-4 w-4" />
                      Se connecter
                    </button>
                  </div>
                )}
              </div>

            </form>
            )}
            </>
            )}
                  </CardContent>
                </Card>
              </div>
        </div>
      )}

      {/* Modal de cr├®ation de compte Client */}
      {showRoleSelectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowRoleSelectionModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in zoom-in-95 duration-200 my-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-center mb-1 text-gray-800">
              Cr├®er un compte Client
            </h3>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Remplissez vos informations pour vous inscrire
            </p>

            {/* Formulaire d'inscription Client directement dans la modal */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              // Ensure role is set before submission
              setSelectedRole('client');
              setShowSignup(true);
              // Small delay to let state update, then trigger submit
              setLoading(true);
              setIsAuthenticating(true);
              setError(null);
              setSuccess(null);
              try {
                if (formData.password !== formData.confirmPassword) {
                  throw new Error("ÔØî Les mots de passe ne correspondent pas");
                }
                if (!validatePhoneNumber(formData.phone, phoneCode)) {
                  const hint = getPhoneLengthHint(phoneCode);
                  throw new Error(`ÔØî Num├®ro de t├®l├®phone invalide pour ${phoneCode}. Format attendu: ${hint}`);
                }
                const validatedData = signupSchema.parse({ ...formData, role: 'client' });
                const { data: userCustomId, error: generateError } = await supabase
                  .rpc('generate_custom_id_with_role', { p_role: 'client' });
                if (generateError) throw new Error('Erreur lors de la g├®n├®ration de votre identifiant');
                
                // ­ƒöæ Cognito signup d'abord (principal)
                // Supabase signup directement (pas de Cognito)
                
                // Sync avec Supabase pour RLS
                try {
                  await supabase.functions.invoke('cognito-sync-session', {
                    body: {
                      email: validatedData.email,
                      password: validatedData.password,
                      role: 'client',
                      firstName: validatedData.firstName,
                      lastName: validatedData.lastName,
                      phone: `${phoneCode} ${formData.phone}`,
                      city: validatedData.city,
                      country: formData.country,
                      customId: userCustomId,
                      mode: 'signup',
                    },
                  });
                } catch (syncErr) {
                  console.warn('ÔÜá´©Å Sync Supabase ├®chou├®e:', syncErr);
                }
                
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                  email: validatedData.email,
                  password: validatedData.password,
                  options: {
                    data: {
                      first_name: validatedData.firstName,
                      last_name: validatedData.lastName,
                      role: 'client',
                      phone: `${phoneCode} ${formData.phone}`,
                      country: formData.country,
                      city: validatedData.city,
                      custom_id: userCustomId,
                    },
                    emailRedirectTo: `${window.location.origin}/`
                  }
                });
                if (signUpError) throw signUpError;
                setShowRoleSelectionModal(false);
                setSuccess("Ô£à Compte cr├®├® ! V├®rifiez votre email pour confirmer votre inscription.");
              } catch (err: any) {
                setError(err.message || 'Erreur lors de la cr├®ation du compte');
              } finally {
                setLoading(false);
                setIsAuthenticating(false);
              }
            }} className="space-y-3">
              {/* Pr├®nom & Nom */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="modal-firstName" className="text-xs">{t('auth.firstName')}</Label>
                  <Input
                    id="modal-firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Pr├®nom"
                    className="h-9 text-sm"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="modal-lastName" className="text-xs">{t('auth.lastName')}</Label>
                  <Input
                    id="modal-lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Nom"
                    className="h-9 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="modal-email" className="text-xs">{t('auth.email')}</Label>
                <Input
                  id="modal-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@exemple.com"
                  className="h-9 text-sm"
                  required
                />
              </div>

              {/* T├®l├®phone */}
              <div>
                <Label htmlFor="modal-phone" className="text-xs">{t('auth.phone')}</Label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-28 h-9 justify-between px-2 text-xs font-medium shrink-0"
                      >
                        <span className="flex items-center gap-1 truncate">
                          {WORLD_PHONE_CODES.find(c => c.code === phoneCode)?.flag} {phoneCode}
                        </span>
                        <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 z-[200]" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>Aucun pays trouv├®</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-auto">
                            {WORLD_PHONE_CODES.map((item) => (
                              <CommandItem
                                key={`modal-${item.code}-${item.country}`}
                                value={`${item.country} ${item.code}`}
                                onSelect={() => setPhoneCode(item.code)}
                                className="cursor-pointer"
                              >
                                <span className="mr-2">{item.flag}</span>
                                <span className="flex-1 truncate text-xs">{item.country}</span>
                                <span className="ml-2 text-muted-foreground text-xs">{item.code}</span>
                                {phoneCode === item.code && (
                                  <Check className="ml-1 h-3 w-3 text-primary" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    id="modal-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                    placeholder={getPhoneExample(phoneCode)}
                    className="h-9 text-sm flex-1"
                    required
                  />
                </div>
                {phoneError && <p className="text-[10px] text-red-500 mt-0.5">{phoneError}</p>}
              </div>

              {/* Pays & Ville */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="modal-country" className="text-xs">{t('auth.country')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-9 text-sm justify-between font-normal"
                      >
                        <span className="truncate">
                          {formData.country
                            ? WORLD_PHONE_CODES.find(c => c.country === formData.country)
                              ? `${WORLD_PHONE_CODES.find(c => c.country === formData.country)!.flag} ${formData.country}`
                              : formData.country
                            : 'S├®lectionner...'}
                        </span>
                        <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-0 z-[200]" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher un pays..." className="h-8 text-sm" />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty>Aucun pays trouv├®</CommandEmpty>
                          <CommandGroup>
                            {WORLD_PHONE_CODES.map((entry) => (
                              <CommandItem
                                key={entry.code + entry.country}
                                value={entry.country}
                                onSelect={() => handleInputChange('country', entry.country)}
                                className="text-sm"
                              >
                                <span className="mr-2">{entry.flag}</span>
                                <span className="truncate">{entry.country}</span>
                                {formData.country === entry.country && (
                                  <Check className="ml-auto h-3 w-3" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="modal-city" className="text-xs">{t('auth.city')}</Label>
                  <Input
                    id="modal-city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Ville"
                    className="h-9 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <Label htmlFor="modal-password" className="text-xs">{t('auth.password')}</Label>
                <Input
                  id="modal-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="ÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇó"
                  className="h-9 text-sm"
                  required
                />
              </div>

              {/* Confirmer mot de passe */}
              <div>
                <Label htmlFor="modal-confirmPassword" className="text-xs">{t('auth.confirmPassword')}</Label>
                <Input
                  id="modal-confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="ÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇóÔÇó"
                  className="h-9 text-sm"
                  required
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">{error}</p>
              )}

              {/* Bouton Cr├®er */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Cr├®ation...' : 'Cr├®er mon compte'}
              </Button>
            </form>
            
            {/* S├®parateur OAuth */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200"></span>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-muted-foreground">ou s'inscrire avec</span>
              </div>
            </div>
            
            {/* Bouton Google OAuth */}
            <button
              onClick={() => {
                setSelectedRole('client');
                setShowRoleSelectionModal(false);
                handleGoogleLogin(false);
              }}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md transition-all duration-200"
              disabled={oauthLoading !== null}
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="font-semibold text-gray-700 text-sm">
                {oauthLoading === 'google' ? 'Connexion...' : 'Continuer avec Google'}
              </span>
            </button>
            
            {/* Bouton fermer */}
            <button
              onClick={() => setShowRoleSelectionModal(false)}
              className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL SUCC├êS INSCRIPTION ===== */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-2xl p-0 overflow-hidden [&>button]:hidden">
          <div className="flex flex-col items-center text-center p-8">
            {/* Cercle anim├® avec checkmark */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-[scale-in_0.4s_ease-out]">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-orange-400/30 animate-ping" style={{ animationDuration: '1.5s' }} />
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-2">
              Inscription r├®ussie !
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Votre compte a ├®t├® cr├®├® avec succ├¿s. Vous allez ├¬tre redirig├® vers votre espace.
            </p>
            
            {/* Barre de progression */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                style={{ 
                  animation: 'progress-fill 2.5s ease-in-out forwards'
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Redirection en cours...
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes progress-fill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}
