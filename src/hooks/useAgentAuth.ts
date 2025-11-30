import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface AgentLoginResponse {
  success: boolean;
  message: string;
  requires_otp?: boolean;
  identifier?: string;
  otp_expires_at?: string;
  error?: string;
  attempts_remaining?: number;
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    agent_type: string;
  };
  user_type?: string;
  session_token?: string;
  redirect_url?: string;
  error?: string;
  attempts_remaining?: number;
}

export const useAgentAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [identifier, setIdentifier] = useState<string>('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<string>('');

  /**
   * Étape 1: Login avec identifiant (email/phone) + mot de passe
   */
  const login = async (identifierValue: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke<AgentLoginResponse>(
        'auth-agent-login',
        {
          body: {
            identifier: identifierValue,
            password: password
          }
        }
      );

      if (error) {
        console.error('[useAgentAuth] Erreur invocation:', error);
        toast.error('Erreur de connexion. Veuillez réessayer.');
        return false;
      }

      if (!data) {
        toast.error('Réponse vide du serveur');
        return false;
      }

      if (!data.success) {
        toast.error(data.error || 'Identifiant ou mot de passe incorrect');
        
        // Afficher tentatives restantes si disponible
        if (data.attempts_remaining !== undefined) {
          toast.warning(`⚠️ ${data.attempts_remaining} tentative(s) restante(s)`);
        }
        
        return false;
      }

      // Succès étape 1 → OTP envoyé
      if (data.requires_otp) {
        setRequiresOTP(true);
        setIdentifier(data.identifier || identifierValue);
        setOtpExpiresAt(data.otp_expires_at || '');
        
        toast.success(data.message || 'Code de sécurité envoyé à votre email');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useAgentAuth] Erreur login:', error);
      toast.error('Erreur lors de la connexion');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Étape 2: Vérification OTP
   */
  const verifyOTP = async (otp: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke<VerifyOTPResponse>(
        'auth-verify-otp',
        {
          body: {
            identifier: identifier,
            otp: otp,
            user_type: 'agent'
          }
        }
      );

      if (error) {
        console.error('[useAgentAuth] Erreur vérification OTP:', error);
        toast.error('Erreur de vérification. Veuillez réessayer.');
        return false;
      }

      if (!data) {
        toast.error('Réponse vide du serveur');
        return false;
      }

      if (!data.success) {
        toast.error(data.error || 'Code incorrect');
        
        // Afficher tentatives restantes
        if (data.attempts_remaining !== undefined) {
          if (data.attempts_remaining === 0) {
            toast.error('Trop de tentatives. Demandez un nouveau code.');
            setRequiresOTP(false);
          } else {
            toast.warning(`⚠️ ${data.attempts_remaining} tentative(s) restante(s)`);
          }
        }
        
        return false;
      }

      // Succès → Stocker session
      if (data.session_token && data.user) {
        sessionStorage.setItem('agent_session', data.session_token);
        sessionStorage.setItem('agent_user', JSON.stringify(data.user));
        
        toast.success(`Bienvenue ${data.user.first_name} ${data.user.last_name} !`);
        
        // Redirection après 500ms
        setTimeout(() => {
          window.location.href = data.redirect_url || '/agent';
        }, 500);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useAgentAuth] Erreur vérification OTP:', error);
      toast.error('Erreur lors de la vérification');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Renvoyer OTP
   */
  const resendOTP = async (): Promise<void> => {
    setIsLoading(true);

    try {
      // Pas besoin du mot de passe pour renvoyer OTP
      // On utilise juste l'identifier stocké
      toast.info('Nouveau code en cours d\'envoi...');

      // Note: Pour renvoyer OTP, on doit redemander à l'utilisateur de se reconnecter
      // OU créer une edge function dédiée "resend-otp"
      // Pour simplifier, on réinitialise et demande de ressaisir mot de passe
      
      toast.warning('Veuillez vous reconnecter pour recevoir un nouveau code');
      setRequiresOTP(false);
      setIdentifier('');
      setOtpExpiresAt('');
      
    } catch (error) {
      console.error('[useAgentAuth] Erreur renvoi OTP:', error);
      toast.error('Erreur lors du renvoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = () => {
    sessionStorage.removeItem('agent_session');
    sessionStorage.removeItem('agent_user');
    toast.success('Déconnexion réussie');
    window.location.href = '/agent/login';
  };

  /**
   * Vérifier si agent connecté
   */
  const isAuthenticated = (): boolean => {
    const session = sessionStorage.getItem('agent_session');
    const user = sessionStorage.getItem('agent_user');
    return !!session && !!user;
  };

  /**
   * Obtenir agent connecté
   */
  const getCurrentAgent = () => {
    const userStr = sessionStorage.getItem('agent_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  return {
    login,
    verifyOTP,
    resendOTP,
    logout,
    isAuthenticated,
    getCurrentAgent,
    isLoading,
    requiresOTP,
    identifier,
    otpExpiresAt
  };
};
