import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, startSessionMonitor, stopSessionMonitor } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'ceo' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'client' | 'agent';
  avatar_url?: string;
  phone?: string;
  city?: string;
  country?: string;
  is_active: boolean;
  kyc_status?: string;
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

    const mapAccountTypeToRole = (value: string): Profile['role'] | null => {
      const v = value.toLowerCase().trim();
      if (v === 'marchand' || v === 'merchant' || v === 'vendeur') return 'vendeur';
      if (v === 'livreur' || v === 'driver') return 'livreur';
      if (v === 'taxi_moto' || v === 'taxi-moto' || v === 'taxi') return 'taxi';
      if (v === 'transitaire') return 'transitaire';
      if (v === 'syndicat' || v === 'bureau') return 'syndicat';
      if (v === 'agent') return 'agent';
      if (v === 'admin') return 'admin';
      if (v === 'ceo' || v === 'pdg') return 'ceo';
      if (v === 'client') return 'client';
      return null;
    };

    setProfileLoading(true);
    console.log('🔄 Chargement profil pour:', user.email);

    try {
      const intendedRoleRaw = localStorage.getItem('oauth_intent_role') || '';
      const intendedRole = intendedRoleRaw ? mapAccountTypeToRole(intendedRoleRaw) : null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Erreur chargement profil:', error);
        return;
      }

      // Profil existant
      if (data) {
        const current = data as Profile;

        // Si l'utilisateur vient de choisir un rôle avant OAuth, on l'applique une seule fois.
        if (intendedRole && current.role !== intendedRole) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: intendedRole })
            .eq('id', user.id);

          if (updateError) {
            console.error('❌ Impossible de mettre à jour le rôle:', updateError);
            setProfile(current);
          } else {
            setProfile({ ...current, role: intendedRole });
          }
        } else {
          setProfile(current);
        }

        if (intendedRoleRaw) localStorage.removeItem('oauth_intent_role');
        return;
      }

      // Profil manquant (cas fréquent après OAuth) → créer un profil minimal
      const meta: any = (user as any).user_metadata || {};
      const fullName = (meta.full_name || meta.name || '').toString().trim();
      const firstName = (meta.first_name || (fullName ? fullName.split(' ')[0] : '') || '').toString().trim();
      const lastName = (meta.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '') || '').toString().trim();

      const roleCandidate = (
        meta.role ||
        meta.account_type ||
        intendedRoleRaw ||
        'client'
      ).toString();

      const roleFromCandidate = mapAccountTypeToRole(roleCandidate) || 'client';

      const profileToUpsert = {
        id: user.id,
        email: user.email || '',
        first_name: firstName || null,
        last_name: lastName || null,
        role: roleFromCandidate,
        avatar_url: (meta.avatar_url || meta.picture || null) as string | null,
        is_active: true,
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileToUpsert);

      if (upsertError) {
        console.error('❌ Impossible de créer le profil:', upsertError);
        return;
      }

      // Recharger pour avoir la version DB
      const { data: createdProfile, error: reloadError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (reloadError) {
        console.error('❌ Erreur reload profil:', reloadError);
        setProfile(profileToUpsert as any);
      } else {
        console.log('✅ Profil créé/chargé');
        setProfile((createdProfile || profileToUpsert) as any);
      }

      if (intendedRoleRaw) localStorage.removeItem('oauth_intent_role');
    } catch (error) {
      console.error('❌ Erreur dans refreshProfile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // IMPORTANT: on écoute d'abord les changements auth, puis on lit la session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log('🔔 Auth state change:', event, nextSession?.user?.email || 'no user');

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

      // Timeout de sécurité - ne pas bloquer plus de 5s
      const timeoutId = setTimeout(() => {
        console.log('⚠️ Timeout session - continuer sans auth');
        setLoading(false);
      }, 5000);

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (error) {
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
      } catch (error) {
        clearTimeout(timeoutId);
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

  // Setup automatique: 1 seule fois par utilisateur (évite les boucles + lenteurs)
  useEffect(() => {
    if (!user || profileLoading || !profile) return;
    if (ensuredSetupForUserRef.current === user.id) return;

    ensuredSetupForUserRef.current = user.id;
    ensureUserSetup();
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