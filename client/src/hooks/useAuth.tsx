import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'vendeur' | 'livreur' | 'taxi' | 'syndicat' | 'transitaire' | 'client';
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: Profile | null;
  session: { token: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; role?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  ensureUserSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour s'assurer que l'utilisateur a son setup complet
  // NOTE: Cette fonction est maintenant gérée automatiquement par le backend lors du register
  // On la garde pour compatibilité mais elle ne fait plus rien (auto-setup fait par backend)
  const ensureUserSetup = useCallback(async () => {
    if (!user) return;
    console.log('✅ Setup utilisateur géré automatiquement par le backend lors du register');
  }, [user]);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setProfile(null);
      setUser(null);
      return;
    }

    try {
      const profile = await api.auth.me();
      setProfile(profile);
      setUser(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('auth_token');
      setProfile(null);
      setUser(null);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    // Get initial session from localStorage
    const getInitialSession = async () => {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        setSession({ token });
        try {
          const profile = await api.auth.me();
          setUser(profile);
          setProfile(profile);
        } catch (error) {
          console.error('Invalid token:', error);
          localStorage.removeItem('auth_token');
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      }
      
      setLoading(false);
    };

    getInitialSession();
  }, []);

  // Fetch profile when user changes (pour compatibilité)
  useEffect(() => {
    if (user) {
      ensureUserSetup();
    }
  }, [user, ensureUserSetup]);

  const signIn = async (email: string, password: string) => {
    try {
      const { profile, token } = await api.auth.login(email, password);
      setUser(profile);
      setProfile(profile);
      setSession({ token });
      toast.success('Connexion réussie !');
    } catch (error: any) {
      toast.error(error.message || 'Erreur de connexion');
      throw error;
    }
  };

  const signUp = async (data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string; role?: string }) => {
    try {
      const { profile, token } = await api.auth.register(data);
      setUser(profile);
      setProfile(profile);
      setSession({ token });
      toast.success('Compte créé avec succès ! Wallet, ID et carte virtuelle configurés automatiquement.');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du compte');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setProfile(null);
      setSession(null);
      toast.success('Déconnexion réussie');
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
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