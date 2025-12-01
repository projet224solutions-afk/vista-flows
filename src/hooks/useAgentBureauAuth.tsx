// ============================================================================
// HOOK AUTHENTIFICATION AGENTS & BUREAUX - 224SOLUTIONS
// ============================================================================
// Hook: useAgentBureauAuth
// Description: Gestion complète de l'authentification agents et bureaux syndicat

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserType = 'agent' | 'bureau';

export interface AgentBureauSession {
  userId: string;
  userType: UserType;
  identifier: string;
  email: string;
  name: string;
  role: string;
  status: string;
  loginTime: string;
  expiresAt: string;
}

export interface AgentBureauUser {
  id: string;
  type: UserType;
  email: string;
  name: string;
  role: string;
  status: string;
  phone?: string;
  // Agent specific
  agentType?: string;
  vendorId?: string;
  // Bureau specific
  bureauCode?: string;
  prefecture?: string;
  commune?: string;
}

interface LoginResponse {
  success: boolean;
  requireOtp: boolean;
  identifier: string;
  userType: UserType;
  userId: string;
  expiresAt: string;
  message?: string;
  error?: string;
}

interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  session?: AgentBureauSession;
  user?: AgentBureauUser;
  error?: string;
  attemptsRemaining?: number;
}

export const useAgentBureauAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [requireOtp, setRequireOtp] = useState(false);
  const [currentIdentifier, setCurrentIdentifier] = useState<string>('');
  const [currentUserType, setCurrentUserType] = useState<UserType>('agent');
  const [session, setSession] = useState<AgentBureauSession | null>(null);
  const [user, setUser] = useState<AgentBureauUser | null>(null);

  /**
   * Étape 1: Connexion avec identifiant (email ou phone) + mot de passe
   */
  const login = async (
    identifier: string,
    password: string,
    userType: UserType
  ): Promise<LoginResponse> => {
    setIsLoading(true);
    
    try {
      console.log(`🔐 Connexion ${userType}:`, identifier);

      const { data, error } = await supabase.functions.invoke(
        'auth-agent-bureau-login',
        {
          body: {
            identifier,
            password,
            userType
          }
        }
      );

      if (error) {
        console.error('❌ Erreur login:', error);
        toast.error(error.message || 'Erreur de connexion');
        return {
          success: false,
          requireOtp: false,
          identifier: '',
          userType,
          userId: '',
          expiresAt: '',
          error: error.message
        };
      }

      if (data.success) {
        console.log('✅ Mot de passe validé, OTP requis');
        toast.success(data.message || 'Code de sécurité envoyé');
        
        setRequireOtp(true);
        setCurrentIdentifier(identifier);
        setCurrentUserType(userType);

        return {
          success: true,
          requireOtp: true,
          identifier: data.identifier,
          userType: data.userType,
          userId: data.userId,
          expiresAt: data.expiresAt,
          message: data.message
        };
      } else {
        toast.error(data.error || 'Erreur de connexion');
        return {
          success: false,
          requireOtp: false,
          identifier: '',
          userType,
          userId: '',
          expiresAt: '',
          error: data.error
        };
      }
    } catch (err: any) {
      console.error('❌ Exception login:', err);
      toast.error('Erreur réseau');
      return {
        success: false,
        requireOtp: false,
        identifier: '',
        userType,
        userId: '',
        expiresAt: '',
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Étape 2: Vérifier le code OTP
   */
  const verifyOtp = async (
    identifier: string,
    otp: string,
    userType: UserType
  ): Promise<VerifyOtpResponse> => {
    setIsLoading(true);
    
    try {
      console.log('🔐 Vérification OTP:', identifier);

      const { data, error } = await supabase.functions.invoke(
        'auth-agent-bureau-verify-otp',
        {
          body: {
            identifier,
            otp,
            userType
          }
        }
      );

      if (error) {
        console.error('❌ Erreur verify OTP:', error);
        toast.error(error.message || 'Erreur vérification');
        return {
          success: false,
          error: error.message
        };
      }

      if (data.success) {
        console.log('✅ OTP validé, connexion réussie');
        toast.success('Connexion réussie !');
        
        // Stocker session en localStorage
        localStorage.setItem('agentBureauSession', JSON.stringify(data.session));
        localStorage.setItem('agentBureauUser', JSON.stringify(data.user));
        
        setSession(data.session);
        setUser(data.user);
        setRequireOtp(false);

        return {
          success: true,
          message: data.message,
          session: data.session,
          user: data.user
        };
      } else {
        const errorMsg = data.error || 'Code OTP incorrect';
        toast.error(errorMsg);
        
        if (data.attemptsRemaining !== undefined) {
          toast.warning(`${data.attemptsRemaining} tentative(s) restante(s)`);
        }

        return {
          success: false,
          error: data.error,
          attemptsRemaining: data.attemptsRemaining
        };
      }
    } catch (err: any) {
      console.error('❌ Exception verify OTP:', err);
      toast.error('Erreur réseau');
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Restaurer session depuis localStorage
   */
  const restoreSession = (): boolean => {
    try {
      const sessionJson = localStorage.getItem('agentBureauSession');
      const userJson = localStorage.getItem('agentBureauUser');

      if (!sessionJson || !userJson) {
        return false;
      }

      const storedSession: AgentBureauSession = JSON.parse(sessionJson);
      const storedUser: AgentBureauUser = JSON.parse(userJson);

      // Vérifier expiration
      if (new Date(storedSession.expiresAt) < new Date()) {
        console.log('⚠️ Session expirée');
        logout();
        return false;
      }

      console.log('✅ Session restaurée:', storedUser.type, storedUser.email);
      setSession(storedSession);
      setUser(storedUser);
      return true;
    } catch (err) {
      console.error('❌ Erreur restore session:', err);
      logout();
      return false;
    }
  };

  /**
   * Déconnexion
   */
  const logout = () => {
    localStorage.removeItem('agentBureauSession');
    localStorage.removeItem('agentBureauUser');
    setSession(null);
    setUser(null);
    setRequireOtp(false);
    setCurrentIdentifier('');
    toast.info('Déconnexion réussie');
  };

  /**
   * Vérifier si session valide
   */
  const isAuthenticated = (): boolean => {
    if (!session) {
      return restoreSession();
    }

    // Vérifier expiration
    if (new Date(session.expiresAt) < new Date()) {
      logout();
      return false;
    }

    return true;
  };

  return {
    // State
    isLoading,
    requireOtp,
    currentIdentifier,
    currentUserType,
    session,
    user,
    isAuthenticated: isAuthenticated(),

    // Methods
    login,
    verifyOtp,
    restoreSession,
    logout
  };
};
