import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, startSessionMonitor, stopSessionMonitor, getLocalSession, isOffline } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'ceo' | 'pdg' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'client' | 'agent' | 'vendor_agent';
  avatar_url?: string;
  phone?: string;
  city?: string;
  country?: string;
  is_active: boolean;
  kyc_status?: string;
  has_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  ensureUserSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Refs anti-boucles / anti-requêtes répétées
  const profileRef = useRef<Profile | null>(null);
  const ensuredSetupForUserRef = useRef<string | null>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Fonction pour s'assurer que l'utilisateur a son setup complet
  const ensureUserSetup = useCallback(async () => {
    if (!user) return;

    try {
      const p = profileRef.current;
      console.log('🔍 Vérification setup utilisateur:', user.id);

      const [walletCheck, userIdCheck, virtualCardCheck] = await Promise.all([
        supabase.from('wallets').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_ids').select('custom_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('virtual_cards').select('id').eq('user_id', user.id).maybeSingle(),
      ]);

      // Si l'une des requêtes échoue (RLS, réseau, etc.) → on remonte l'erreur
      const unexpectedError = walletCheck.error || userIdCheck.error || virtualCardCheck.error;
      if (unexpectedError) throw unexpectedError;

      const needsWallet = !walletCheck.data;
      const needsUserId = !userIdCheck.data;
      const needsVirtualCard = !virtualCardCheck.data;

      if (!needsWallet && !needsUserId && !needsVirtualCard) {
        console.log('✅ Setup utilisateur complet');
        return;
      }

      const missing: string[] = [];
      if (needsWallet) missing.push('Wallet');
      if (needsUserId) missing.push('ID utilisateur');
      if (needsVirtualCard) missing.push('Carte virtuelle');
      console.log('⚠️ Éléments manquants:', missing);

      let customId = '';

      // Créer ID utilisateur si manquant avec le format basé sur le rôle
      if (needsUserId) {
        const userRole = p?.role || 'client';

        const { data: generatedId, error: generateError } = await supabase
          .rpc('generate_custom_id_with_role', { p_role: userRole });

        if (generateError) {
          console.error('❌ Erreur génération ID:', generateError);
          customId = 'TMP' + Math.random().toString(36).substring(2, 6).toUpperCase();
        } else {
          customId = generatedId as string;
        }

        const { error: idError } = await supabase
          .from('user_ids')
          .upsert({
            user_id: user.id,
            custom_id: customId,
          });

        if (idError) {
          console.error('❌ Erreur création ID:', idError);
        } else {
          console.log('✅ ID utilisateur créé:', customId);
        }
      } else {
        customId = userIdCheck.data?.custom_id || 'ABC0000';
      }

      // Créer wallet si manquant via RPC
      if (needsWallet) {
        console.log('⚠️ Wallet manquant pour:', user.id);
        console.log('📝 Initialisation via RPC...');

        try {
          const { data: initResult, error: rpcError } = await supabase
            .rpc('initialize_user_wallet', { p_user_id: user.id });

          if (rpcError) {
            console.error('❌ Erreur RPC:', rpcError);
          } else if (initResult) {
            const result = initResult as any;
            if (result.success) {
              console.log('✅ Wallet initialisé:', result);
            }
          }
        } catch (initError) {
          console.error('❌ Erreur appel fonction initialisation:', initError);
        }
      }

      // Créer carte virtuelle si manquante
      if (needsVirtualCard) {
        const last4Digits = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const cardNumber = `4*** **** **** ${last4Digits}`;

        const holderName = `${p?.first_name || ''} ${p?.last_name || customId}`.trim();

        const futureDate = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000);
        const month = (futureDate.getMonth() + 1).toString().padStart(2, '0');
        const year = futureDate.getFullYear().toString().slice(-2);
        const expiryDate = `${month}/${year}`;

        const { error: cardError } = await supabase
          .from('virtual_cards')
          .upsert({
            user_id: user.id,
            card_number: cardNumber,
            holder_name: holderName,
            expiry_date: expiryDate,
            cvv: Math.floor(Math.random() * 900 + 100).toString(),
            daily_limit: 500000,
            monthly_limit: 2000000,
          });

        if (cardError) {
          console.error('❌ Erreur création carte virtuelle:', cardError);
        } else {
          console.log('✅ Carte virtuelle créée:', cardNumber);
        }
      }

      console.log('✅ Configuration utilisateur complétée !');
    } catch (error) {
      console.error('❌ Erreur setup utilisateur:', error);
      toast.error('Erreur lors de la configuration utilisateur');
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    const mapAccountTypeToRole = (value: string): string | null => {
      const v = value.toLowerCase().trim();
      if (v === 'marchand' || v === 'merchant' || v === 'vendeur') return 'vendeur';
      if (v === 'prestataire' || v === 'service') return 'prestataire';
      if (v === 'livreur' || v === 'driver') return 'livreur';
      if (v === 'taxi_moto' || v === 'taxi-moto' || v === 'taxi') return 'taxi';
      if (v === 'transitaire') return 'transitaire';
      if (v === 'syndicat' || v === 'bureau') return 'syndicat';
      if (v === 'agent') return 'agent';
      if (v === 'admin') return 'admin';
      if (v === 'ceo' || v === 'pdg') return 'pdg';
      if (v === 'client') return 'client';
      if (v === 'vendor_agent') return 'vendor_agent';
      return null;
    };
    
    // Clé de cache pour le profil
    const profileCacheKey = `profile_cache_${user.id}`;

    // ✅ Fonction réutilisable pour créer vendor lors de l'OAuth (vendeurs uniquement)
    const createVendorForOAuth = async (authUser: User) => {
      try {
        const oauthShopType = localStorage.getItem('oauth_vendor_shop_type') || 'physical';
        const meta: any = (authUser as any).user_metadata || {};
        const fullName = (meta.full_name || meta.name || '').toString().trim();
        const businessName = fullName || authUser.email?.split('@')[0] || 'Ma Boutique';

        // Vérifier si un vendor existe déjà
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (existingVendor) {
          console.log('ℹ️ Vendor existe déjà, skip création');
          return;
        }

        const { error: vendorError } = await supabase
          .from('vendors')
          .insert({
            user_id: authUser.id,
            business_name: businessName,
            email: authUser.email || '',
            is_verified: false,
            is_active: true,
            service_type: 'general',
            business_type: oauthShopType === 'digital' ? 'digital' : 'physical',
          });

        if (vendorError) {
          console.error('❌ Erreur création vendor OAuth:', vendorError);
          return;
        }
        console.log('✅ Vendor créé via OAuth:', { businessName, shopType: oauthShopType });
      } catch (vendorErr) {
        console.error('❌ Exception création vendor OAuth:', vendorErr);
      }
    };

    // ✅ NOUVEAU: Fonction pour créer professional_service pour prestataires OAuth
    const createServiceForOAuthPrestataire = async (authUser: User) => {
      try {
        const oauthServiceType = localStorage.getItem('oauth_service_type');
        if (!oauthServiceType || oauthServiceType === 'general') {
          console.log('ℹ️ Pas de service type spécifique, skip création');
          return;
        }

        const meta: any = (authUser as any).user_metadata || {};
        const fullName = (meta.full_name || meta.name || '').toString().trim();
        const businessName = fullName || authUser.email?.split('@')[0] || 'Mon Service';

        // Vérifier si un professional_service existe déjà
        const { data: existingService } = await supabase
          .from('professional_services')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (existingService) {
          console.log('ℹ️ Professional service existe déjà, skip création');
          return;
        }

        const { data: serviceTypeData } = await supabase
          .from('service_types')
          .select('id')
          .eq('code', oauthServiceType)
          .maybeSingle();

        if (serviceTypeData) {
          const { error: psError } = await supabase
            .from('professional_services')
            .insert({
              user_id: authUser.id,
              service_type_id: serviceTypeData.id,
              business_name: businessName,
              status: 'active',
              verification_status: 'unverified',
              email: authUser.email || '',
            });
          if (psError) {
            console.error('❌ Erreur création professional_service:', psError);
          } else {
            console.log('✅ Professional service créé via OAuth pour prestataire:', oauthServiceType);
          }
        } else {
          console.warn('⚠️ Service type non trouvé pour le code:', oauthServiceType);
        }
      } catch (err) {
        console.error('❌ Exception création service prestataire OAuth:', err);
      }
    };

    setProfileLoading(true);
    console.log('🔄 Chargement profil pour:', user.email);
    
    // Timeout sécurité: ne jamais bloquer plus de 4 secondes
    const profileTimeout = setTimeout(() => {
      console.warn('⚠️ Timeout profil (4s) - utilisation cache ou fallback');
      const cachedProfile = localStorage.getItem(profileCacheKey);
      if (cachedProfile && !profileRef.current) {
        try {
          setProfile(JSON.parse(cachedProfile) as Profile);
        } catch (e) {}
      }
      setProfileLoading(false);
    }, 4000);

    try {
      // ✨ NOUVEAU: En mode offline, utiliser le profil en cache
      if (isOffline()) {
        console.log('📡 Mode hors ligne - utilisation profil en cache');
        const cachedProfile = localStorage.getItem(profileCacheKey);
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile) as Profile;
            console.log('✅ Profil restauré depuis cache:', parsed.role);
            setProfile(parsed);
          } catch (e) {
            console.warn('⚠️ Erreur parsing profil cache');
          }
        }
        setProfileLoading(false);
        return;
      }
      
      // Récupérer les flags OAuth
      const intendedRoleRaw = localStorage.getItem('oauth_intent_role') || '';
      const intendedRole = intendedRoleRaw ? mapAccountTypeToRole(intendedRoleRaw) : null;
      const isNewOAuthSignup = localStorage.getItem('oauth_is_new_signup') === 'true';

      // 1. Vérifier si un profil existe déjà pour cet utilisateur
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        // ✨ NOUVEAU: Ignorer erreurs réseau et utiliser cache
        if (profileError.message?.includes('network') || profileError.message?.includes('fetch')) {
          console.warn('⚠️ Erreur réseau - utilisation profil en cache');
          const cachedProfile = localStorage.getItem(profileCacheKey);
          if (cachedProfile) {
            try {
              setProfile(JSON.parse(cachedProfile) as Profile);
            } catch (e) {}
          }
          setProfileLoading(false);
          return;
        }
        
        console.error('❌ Erreur chargement profil:', profileError);
        localStorage.removeItem('oauth_intent_role');
        localStorage.removeItem('oauth_is_new_signup');
        return;
      }

      // 2. Profil existant trouvé
      if (existingProfile) {
        const current = existingProfile as Profile;
        console.log('✅ Profil existant trouvé:', current.email, '| Rôle:', current.role);

        // Si l'utilisateur essayait de créer un compte (isNewOAuthSignup=true)
        // et le profil a été créé par le trigger avec le rôle par défaut 'client'
        // mais l'utilisateur avait choisi un rôle différent → mettre à jour le rôle
        if (isNewOAuthSignup && intendedRole && intendedRole !== 'client' && current.role === 'client') {
          console.log('🔄 Mise à jour du rôle OAuth:', current.role, '→', intendedRole);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: intendedRole as any })
            .eq('id', user.id);

          if (!updateError) {
            const updatedProfile = { ...current, role: intendedRole } as Profile;
            setProfile(updatedProfile);
            localStorage.setItem(profileCacheKey, JSON.stringify(updatedProfile));
            
            // ✅ Créer le vendor pour les vendeurs OU le service pour les prestataires
            if (intendedRole === 'vendeur') {
              await createVendorForOAuth(user);
            } else if (intendedRole === 'prestataire') {
              await createServiceForOAuthPrestataire(user);
            }
            
            const roleLabels: Record<string, string> = {
              client: 'Client',
              vendeur: 'Marchand',
              prestataire: 'Prestataire de Service',
              livreur: 'Livreur',
              taxi: 'Taxi Moto',
              transitaire: 'Transitaire',
            };
            toast.success(
              `Compte créé avec succès !`,
              {
                duration: 5000,
                description: `Vous êtes inscrit en tant que ${roleLabels[intendedRole] || intendedRole}.`,
              }
            );
          } else {
            console.error('❌ Erreur mise à jour rôle OAuth:', updateError);
            setProfile(current);
            localStorage.setItem(profileCacheKey, JSON.stringify(current));
          }
          
          localStorage.removeItem('oauth_intent_role');
          localStorage.removeItem('oauth_is_new_signup');
          return;
        }

        // Si l'utilisateur essayait de créer un compte mais le profil existait DÉJÀ avant
        if (isNewOAuthSignup) {
          console.log('⚠️ Tentative d\'inscription mais compte existe déjà');
          
          toast.warning(
            `Cet email est déjà enregistré ! Vous avez été connecté à votre compte ${current.role} existant.`,
            {
              duration: 6000,
              description: 'Votre compte existant a été utilisé pour la connexion.',
            }
          );
        } else {
          // Connexion normale - afficher le toast une seule fois par session
          const welcomeShownKey = `welcome_shown_${user.id}`;
          if (!sessionStorage.getItem(welcomeShownKey)) {
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
            toast.success(`Bienvenue ! Vous êtes connecté en tant que ${roleLabels[current.role] || current.role}.`);
            sessionStorage.setItem(welcomeShownKey, 'true');
          }
        }

        // NE JAMAIS modifier le rôle d'un profil existant (sauf cas OAuth ci-dessus)
        setProfile(current);
        
        // ✨ NOUVEAU: Mettre en cache le profil pour mode offline
        localStorage.setItem(profileCacheKey, JSON.stringify(current));

        // Nettoyer immédiatement les flags
        localStorage.removeItem('oauth_intent_role');
        localStorage.removeItem('oauth_is_new_signup');
        return;
      }

      // 3. Vérifier si l'email existe déjà dans un AUTRE profil (cas rare mais possible)
      if (user.email) {
        const { data: emailCheck } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('email', user.email)
          .neq('id', user.id)
          .maybeSingle();

        if (emailCheck) {
          console.log('⚠️ Email déjà utilisé par un autre compte:', emailCheck.email);
          toast.warning('Cet email est déjà associé à un autre compte.');
          // Ne pas créer de doublon
          localStorage.removeItem('oauth_intent_role');
          localStorage.removeItem('oauth_is_new_signup');
          setProfileLoading(false);
          return;
        }
      }

      // 4. Aucun profil existant → Créer un nouveau profil (vraie nouvelle inscription)
      console.log('📝 Création nouveau profil pour:', user.email);

      const meta: any = (user as any).user_metadata || {};
      const fullName = (meta.full_name || meta.name || '').toString().trim();
      const firstName = (meta.first_name || (fullName ? fullName.split(' ')[0] : '') || '').toString().trim();
      const lastName = (meta.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '') || '').toString().trim();

      // Utiliser le rôle choisi lors de l'inscription OU client par défaut
      const roleToUse = intendedRole || mapAccountTypeToRole(meta.account_type || '') || 'client';

      const profileToCreate = {
        id: user.id,
        email: user.email || '',
        first_name: firstName || null,
        last_name: lastName || null,
        role: roleToUse,
        avatar_url: (meta.avatar_url || meta.picture || null) as string | null,
        is_active: true,
      };

      console.log('📝 Nouveau profil avec rôle:', roleToUse);

      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileToCreate as any);

      if (insertError) {
        console.error('❌ Erreur création profil:', insertError);
        // Si erreur de duplicat (conflit), essayer de récupérer le profil existant
        if (insertError.code === '23505') {
          const { data: conflictProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (conflictProfile) {
            setProfile(conflictProfile as Profile);
          }
        }
        localStorage.removeItem('oauth_intent_role');
        localStorage.removeItem('oauth_is_new_signup');
        return;
      }

      // Recharger le profil créé
      const { data: createdProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (createdProfile) {
        console.log('✅ Nouveau profil créé avec succès:', createdProfile.role);
        
        // ✅ Créer le vendor pour les vendeurs OU le service pour les prestataires
        if (createdProfile.role === 'vendeur') {
          await createVendorForOAuth(user);
        } else if ((createdProfile.role as string) === 'prestataire') {
          await createServiceForOAuthPrestataire(user);
        }
        
        const roleLabels: Record<string, string> = {
          client: 'Client',
          vendeur: 'Marchand',
          prestataire: 'Prestataire de Service',
          livreur: 'Livreur',
          taxi: 'Taxi Moto',
          transitaire: 'Transitaire',
        };
        
        toast.success(
          `Compte créé avec succès !`,
          {
            duration: 5000,
            description: `Vous êtes inscrit en tant que ${roleLabels[createdProfile.role] || createdProfile.role}. Complétez votre profil pour continuer.`,
          }
        );
        
        // Marquer que le profil doit être complété
        localStorage.setItem('needs_profile_completion', 'true');
        
        setProfile(createdProfile as Profile);
        // ✨ NOUVEAU: Mettre en cache le profil pour mode offline
        localStorage.setItem(profileCacheKey, JSON.stringify(createdProfile));
      } else {
        setProfile(profileToCreate as any);
        // ✨ NOUVEAU: Mettre en cache le profil pour mode offline
        localStorage.setItem(profileCacheKey, JSON.stringify(profileToCreate));
      }

      // Nettoyer les flags
      localStorage.removeItem('oauth_intent_role');
      localStorage.removeItem('oauth_is_new_signup');
    } catch (error) {
      console.error('❌ Erreur dans refreshProfile:', error);
      localStorage.removeItem('oauth_intent_role');
      localStorage.removeItem('oauth_is_new_signup');
    } finally {
      clearTimeout(profileTimeout);
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // IMPORTANT: on écoute d'abord les changements auth, puis on lit la session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log('🔔 Auth state change:', event, nextSession?.user?.email || 'no user');

      // ✨ Ignorer les événements TOKEN_REFRESHED pour éviter les re-renders inutiles
      // Ces événements ne changent pas l'utilisateur, juste le token
      if (event === 'TOKEN_REFRESHED') {
        console.log('⏭️ Token refresh ignoré (pas de re-render)');
        // Mettre à jour silencieusement la session sans déclencher de re-render du user
        setSession(nextSession);
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        stopSessionMonitor();
      } else {
        startSessionMonitor();
      }

      setLoading(false);
    });

    const init = async () => {
      console.log('🔍 Vérification session...');

      // Timeout de sécurité - plus court si offline
      const timeoutMs = isOffline() ? 1000 : 5000;
      const timeoutId = setTimeout(() => {
        console.log('⚠️ Timeout session - continuer sans auth');
        // En mode offline, essayer la session locale avant d'abandonner
        if (isOffline()) {
          const localSession = getLocalSession();
          if (localSession?.access_token) {
            console.log('✅ Session locale restaurée via timeout (mode offline)');
            setSession(localSession as unknown as Session);
            setUser(localSession.user);
          }
        }
        setLoading(false);
      }, timeoutMs);

      try {
        // ✨ NOUVEAU: En mode offline, utiliser la session locale stockée
        if (isOffline()) {
          console.log('📡 Mode hors ligne détecté - utilisation session locale');
          const localSession = getLocalSession();
          clearTimeout(timeoutId);
          
          if (localSession?.access_token) {
            console.log('✅ Session locale restaurée (mode offline)');
            // Reconstruire un objet session minimal
            const offlineSession = {
              access_token: localSession.access_token,
              refresh_token: localSession.refresh_token,
              expires_at: localSession.expires_at,
              expires_in: localSession.expires_in,
              token_type: 'bearer',
              user: localSession.user
            } as Session;
            
            setSession(offlineSession);
            setUser(localSession.user);
            // Ne pas démarrer le monitor en offline
          } else {
            console.log('ℹ️ Pas de session locale stockée');
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
          return;
        }
        
        // Mode online: procéder normalement
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (error) {
          // ✨ NOUVEAU: Ignorer les erreurs réseau et utiliser session locale
          if (error.message?.includes('network') || error.message?.includes('fetch')) {
            console.warn('⚠️ Erreur réseau - utilisation session locale');
            const localSession = getLocalSession();
            if (localSession?.access_token) {
              setSession(localSession as unknown as Session);
              setUser(localSession.user);
              setLoading(false);
              return;
            }
          }
          
          console.error('❌ Erreur session:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (initialSession) {
          console.log('✅ Session restaurée:', initialSession.user.email);
          setSession(initialSession);
          setUser(initialSession.user);
          startSessionMonitor();
        } else {
          console.log('ℹ️ Pas de session active');
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        
        // ✨ NOUVEAU: Ignorer erreurs réseau et utiliser session locale
        if (error?.message?.includes('network') || error?.message?.includes('fetch') || error?.message?.includes('Failed to fetch')) {
          console.warn('⚠️ Exception réseau - utilisation session locale');
          const localSession = getLocalSession();
          if (localSession?.access_token) {
            setSession(localSession as unknown as Session);
            setUser(localSession.user);
            setLoading(false);
            return;
          }
        }
        
        console.error('❌ Erreur inattendue:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      subscription.unsubscribe();
      stopSessionMonitor();
    };
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
      ensuredSetupForUserRef.current = null;
    }
  }, [user, refreshProfile]);

  // Setup automatique: NON-BLOQUANT, en arrière-plan après un délai
  // Ne doit JAMAIS bloquer l'affichage de l'UI
  useEffect(() => {
    if (!user || profileLoading || !profile) return;
    if (ensuredSetupForUserRef.current === user.id) return;

    ensuredSetupForUserRef.current = user.id;
    
    // Lancer le setup en arrière-plan après 2s pour ne pas bloquer le rendu
    const timer = setTimeout(() => {
      ensureUserSetup().catch((err) => {
        console.warn('⚠️ Setup arrière-plan échoué (non bloquant):', err);
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user, profile, profileLoading, ensureUserSetup]);

  const signOut = async () => {
    try {
      // Nettoyer immédiatement l'état local
      setSession(null);
      setUser(null);
      setProfile(null);
      stopSessionMonitor();
      
      // Essayer de déconnecter côté Supabase
      const { error } = await supabase.auth.signOut();
      
      // Si la session n'existait pas côté serveur, ce n'est pas grave
      // L'important est que l'état local soit nettoyé
      if (error && error.message !== 'Session not found') {
        console.error('Erreur déconnexion Supabase:', error);
      }
      
      // Nettoyer aussi le localStorage de façon explicite
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-uakkxaibujzxdiqzpnpr-auth-token');
      localStorage.removeItem('agent_token');
      sessionStorage.clear();
      
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Même en cas d'erreur, on nettoie l'état local
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    signOut,
    refreshProfile,
    ensureUserSetup
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};