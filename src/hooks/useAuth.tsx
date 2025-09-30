import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'client';
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
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
        toast.info(`Configuration automatique en cours: ${missing.join(', ')}`);

        let customId = '';

        // Créer ID utilisateur si manquant
        if (needsUserId) {
          customId = 'USR' + Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
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
          customId = userIdCheck.data?.custom_id || 'USR0000000';
        }

        // Créer wallet si manquant
        if (needsWallet) {
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              balance: 10000, // Bonus de bienvenue
              currency: 'XAF',
              status: 'active'
            });

          if (walletError) {
            console.error('❌ Erreur création wallet:', walletError);
          } else {
            console.log('✅ Wallet créé avec bonus de 10,000 XAF');
          }
        }

        // Créer carte virtuelle si manquante
        if (needsVirtualCard) {
          const cardNumber = '4*** **** **** ' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
          const { error: cardError } = await supabase
            .from('virtual_cards')
            .upsert({
              user_id: user.id,
              card_number: cardNumber,
              cardholder_name: `${user.user_metadata?.first_name || 'Client'} ${user.user_metadata?.last_name || customId}`,
              expiry_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 ans
              cvv: Math.floor(Math.random() * 900 + 100).toString(),
              status: 'active',
              card_type: 'virtual',
              daily_limit: 500000,
              monthly_limit: 2000000,
              created_at: new Date().toISOString()
            });

          if (cardError) {
            console.error('❌ Erreur création carte virtuelle:', cardError);
          } else {
            console.log('✅ Carte virtuelle créée:', cardNumber);
          }
        }

        toast.success('✅ Configuration client complétée ! Wallet, ID et carte virtuelle créés.');
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
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in refreshProfile:', error);
    }
  }, [user]);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    loading,
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