import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
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

        // Créer ID utilisateur si manquant (3 lettres + 4 chiffres)
        if (needsUserId) {
          // Générer 3 lettres aléatoires (A-Z)
          let letters = '';
          for (let i = 0; i < 3; i++) {
            letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
          }

          // Générer 4 chiffres aléatoires (0-9)
          let numbers = '';
          for (let i = 0; i < 4; i++) {
            numbers += Math.floor(Math.random() * 10).toString();
          }

          customId = letters + numbers;

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

        // Créer wallet si manquant
        if (needsWallet) {
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              balance: 10000, // Bonus de bienvenue
              currency: 'GNF',
              status: 'active'
            });

          if (walletError) {
            console.error('❌ Erreur création wallet:', walletError);
          } else {
            console.log('✅ Wallet créé avec bonus de 10,000 GNF');
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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfileLoading(false);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in refreshProfile:', error);
    } finally {
      setProfileLoading(false);
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