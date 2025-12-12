import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface BureauLoginResponse {
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
    bureau_code: string;
    president_email: string;
    president_phone: string;
    prefecture: string;
    commune: string;
  };
  user_type?: string;
  session_token?: string;
  redirect_url?: string;
  error?: string;
  attempts_remaining?: number;
}

export const useBureauAuth = () => {
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
      const { data, error } = await supabase.functions.invoke<BureauLoginResponse>(
        'auth-bureau-login',
        {
          body: {
            identifier: identifierValue,
            password: password
          }
        }
      );

      if (error) {
        console.error('[useBureauAuth] Erreur invocation:', error);
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
      console.error('[useBureauAuth] Erreur login:', error);
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
            user_type: 'bureau'
          }
        }
      );

      if (error) {
        console.error('[useBureauAuth] Erreur vérification OTP:', error);
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

      // Succès → Stocker session (localStorage pour persistance après refresh)
      if (data.session_token && data.user) {
        localStorage.setItem('bureau_session', data.session_token);
        localStorage.setItem('bureau_user', JSON.stringify(data.user));
        
        toast.success(`Bienvenue Bureau ${data.user.bureau_code} - ${data.user.commune} !`);
        
        // Redirection après 500ms
        setTimeout(() => {
          window.location.href = data.redirect_url || '/bureau';
        }, 500);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useBureauAuth] Erreur vérification OTP:', error);
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
      toast.info('Nouveau code en cours d\'envoi...');

      // Pour simplifier, on réinitialise et demande de ressaisir mot de passe
      toast.warning('Veuillez vous reconnecter pour recevoir un nouveau code');
      setRequiresOTP(false);
      setIdentifier('');
      setOtpExpiresAt('');
      
    } catch (error) {
      console.error('[useBureauAuth] Erreur renvoi OTP:', error);
      toast.error('Erreur lors du renvoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = () => {
    localStorage.removeItem('bureau_session');
    localStorage.removeItem('bureau_user');
    sessionStorage.removeItem('bureau_session');
    sessionStorage.removeItem('bureau_user');
    toast.success('Déconnexion réussie');
    window.location.href = '/bureau/login';
  };

  /**
   * Vérifier si bureau connecté
   */
  const isAuthenticated = (): boolean => {
    const session = localStorage.getItem('bureau_session') || sessionStorage.getItem('bureau_session');
    const user = localStorage.getItem('bureau_user') || sessionStorage.getItem('bureau_user');
    return !!session && !!user;
  };

  /**
   * Obtenir bureau connecté
   */
  const getCurrentBureau = () => {
    const userStr = localStorage.getItem('bureau_user') || sessionStorage.getItem('bureau_user');
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
    getCurrentBureau,
    isLoading,
    requiresOTP,
    identifier,
    otpExpiresAt
  };
};
