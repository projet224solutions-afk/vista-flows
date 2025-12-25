import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, startSessionMonitor, stopSessionMonitor, refreshSession } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'ceo' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'client' | 'agent';
  avatar_url?: string;
  phone?: string;
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

  // Fonction pour s'assurer que l'utilisateur a son setup complet
  const ensureUserSetup = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Vérification setup utilisateur:', user.id);

      // Vérifier les éléments essentiels
      const [walletCheck, userIdCheck, virtualCardCheck] = await Promise.all([
        supabase.from('wallets').select('id').eq('user_id', user.id).single(),
        supabase.from('user_ids').select('custom_id').eq('user_id', user.id).single(),
        supabase.from('virtual_cards').select('id').eq('user_id', user.id).single()
      ]);

      const needsWallet = walletCheck.error;
      const needsUserId = userIdCheck.error;
      const needsVirtualCard = virtualCardCheck.error;

      if (needsWallet || needsUserId || needsVirtualCard) {
        const missing = [];
        if (needsWallet) missing.push('Wallet');
        if (needsUserId) missing.push('ID utilisateur');
        if (needsVirtualCard) missing.push('Carte virtuelle');

        console.log('⚠️ Éléments manquants:', missing);
        // Ne plus afficher de toast info pour éviter les notifications répétées

        let customId = '';

        // Créer ID utilisateur si manquant avec le format basé sur le rôle
        if (needsUserId) {
          // Utiliser la fonction RPC pour générer un ID avec le bon préfixe
          const userRole = profile?.role || 'client';
          
          const { data: generatedId, error: generateError } = await supabase
            .rpc('generate_custom_id_with_role', { p_role: userRole });

          if (generateError) {
            console.error('❌ Erreur génération ID:', generateError);
            // Fallback sur ancien système
            customId = 'TMP' + Math.random().toString(36).substring(2, 6).toUpperCase();
          } else {
            customId = generatedId;
          }

          const { error: idError } = await supabase
            .from('user_ids')
            .upsert({
              user_id: user.id,
              custom_id: customId
            });

          if (idError) {
            console.error('❌ Erreur création ID:', idError);
          } else {
            console.log('✅ ID utilisateur créé:', customId);
          }
        } else {
          // Récupérer l'ID existant
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
          // Générer un numéro de carte au format "4*** **** **** 1234" (19 caractères max)
          const last4Digits = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
          const cardNumber = `4*** **** **** ${last4Digits}`;
          
          // Nom du titulaire
          const holderName = `${profile?.first_name || ''} ${profile?.last_name || customId}`.trim();
          
          // Générer date d'expiration au format MM/YY (5 caractères)
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
              monthly_limit: 2000000
            });

          if (cardError) {
            console.error('❌ Erreur création carte virtuelle:', cardError);
            // Ne pas afficher de toast d'erreur pour éviter les notifications répétées
          } else {
            console.log('✅ Carte virtuelle créée:', cardNumber);
          }
        }

        // Afficher le toast de succès seulement une fois, silencieusement en logs
        if (missing.length > 0) {
          console.log('✅ Configuration client complétée !');
        }
      } else {
        console.log('✅ Setup utilisateur complet');
      }
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

    setProfileLoading(true);
    console.log('🔄 Chargement profil pour:', user.email);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Erreur chargement profil:', error);
        setProfileLoading(false);
        return;
      }

      console.log('✅ Profil chargé:', data.role, data.email);
      setProfile(data);
    } catch (error) {
      console.error('❌ Erreur dans refreshProfile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Get initial session - avec timeout pour éviter blocage
    const getInitialSession = async () => {
      console.log('🔍 Vérification session...');
      
      // Timeout de sécurité - ne pas bloquer plus de 3s
      const timeoutId = setTimeout(() => {
        console.log('⚠️ Timeout session - continuer sans auth');
        setLoading(false);
      }, 3000);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('❌ Erreur session:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (session) {
          console.log('✅ Session restaurée:', session.user.email);
          setSession(session);
          setUser(session.user);
        } else {
          console.log('ℹ️ Pas de session active');
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Erreur inattendue:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Démarrer le moniteur de session
    startSessionMonitor();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state change:', event, session?.user?.email || 'no user');
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 Utilisateur déconnecté');
          setSession(null);
          setUser(null);
          setProfile(null);
          stopSessionMonitor();
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token rafraîchi');
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    // Gérer la visibilité de la page pour rafraîchir la session
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page redevenue visible, vérification session...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession && user) {
          console.log('⚠️ Session perdue, tentative de rafraîchissement...');
          const newSession = await refreshSession();
          if (!newSession) {
            console.log('❌ Impossible de restaurer la session');
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        } else if (currentSession) {
          console.log('✅ Session toujours active');
          setSession(currentSession);
          setUser(currentSession.user);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      stopSessionMonitor();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      refreshProfile();
      // Setup automatique pour tous les nouveaux utilisateurs
      ensureUserSetup();
    } else {
      setProfile(null);
    }
  }, [user, refreshProfile, ensureUserSetup]);

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