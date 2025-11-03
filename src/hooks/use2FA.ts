import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface TwoFASettings {
  isEnabled: boolean;
  phoneNumber?: string;
  lastUsedAt?: string;
}

/**
 * Hook pour gérer l'authentification 2FA (Two-Factor Authentication)
 * Améliore la sécurité en requérant un code SMS en plus du mot de passe
 */
export const use2FA = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TwoFASettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Charger les paramètres 2FA de l'utilisateur
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setSettings(data as TwoFASettings || { isEnabled: false });
    } catch (error: any) {
      console.error('Erreur chargement 2FA:', error);
    }
  };

  /**
   * Activer le 2FA pour l'utilisateur
   */
  const enable2FA = async (phoneNumber: string): Promise<boolean> => {
    if (!user) {
      toast.error('Utilisateur non authentifié');
      return false;
    }

    setLoading(true);
    try {
      // Générer codes de backup (8 codes de 8 caractères)
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      const { error } = await supabase
        .from('user_2fa_settings')
        .upsert({
          user_id: user.id,
          is_enabled: true,
          phone_number: phoneNumber,
          backup_codes: backupCodes
        });

      if (error) throw error;

      await loadSettings();
      
      toast.success('✅ 2FA activé avec succès', {
        description: 'Conservez vos codes de backup en lieu sûr'
      });

      return true;
    } catch (error: any) {
      console.error('Erreur activation 2FA:', error);
      toast.error('Erreur lors de l\'activation du 2FA');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Désactiver le 2FA
   */
  const disable2FA = async (): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_2fa_settings')
        .update({ is_enabled: false })
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSettings();
      toast.success('2FA désactivé');
      return true;
    } catch (error: any) {
      console.error('Erreur désactivation 2FA:', error);
      toast.error('Erreur lors de la désactivation du 2FA');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envoyer un code 2FA par SMS
   */
  const sendCode = async (phoneNumber?: string): Promise<boolean> => {
    if (!user) return false;

    const phone = phoneNumber || settings?.phoneNumber;
    if (!phone) {
      toast.error('Numéro de téléphone requis');
      return false;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: {
          userId: user.id,
          phoneNumber: phone
        }
      });

      if (error) throw error;

      setCodeSent(true);
      toast.success('📱 Code envoyé par SMS', {
        description: `Vérifiez votre téléphone ${phone}`
      });

      // En dev, afficher le code (à supprimer en production)
      if (data?.devCode) {
        console.log('🔐 Code 2FA (dev):', data.devCode);
        toast.info(`Code dev: ${data.devCode}`, { duration: 10000 });
      }

      return true;
    } catch (error: any) {
      console.error('Erreur envoi code:', error);
      toast.error('Erreur lors de l\'envoi du code');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vérifier un code 2FA
   */
  const verifyCode = async (code: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_2fa_code', {
        p_user_id: user.id,
        p_code: code
      });

      if (error) throw error;

      if (data) {
        toast.success('✅ Code vérifié');
        setCodeSent(false);
        return true;
      } else {
        toast.error('❌ Code incorrect ou expiré');
        return false;
      }
    } catch (error: any) {
      console.error('Erreur vérification code:', error);
      toast.error('Erreur lors de la vérification');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vérifier un code de backup
   */
  const verifyBackupCode = async (backupCode: string): Promise<boolean> => {
    if (!user || !settings?.backupCodes) return false;

    if (settings.backupCodes.includes(backupCode.toUpperCase())) {
      // Retirer le code de backup utilisé
      const updatedCodes = settings.backupCodes.filter(c => c !== backupCode.toUpperCase());
      
      await supabase
        .from('user_2fa_settings')
        .update({ backup_codes: updatedCodes })
        .eq('user_id', user.id);

      toast.success('✅ Code de backup accepté');
      await loadSettings();
      return true;
    }

    toast.error('❌ Code de backup invalide');
    return false;
  };

  return {
    settings,
    loading,
    codeSent,
    enable2FA,
    disable2FA,
    sendCode,
    verifyCode,
    verifyBackupCode,
    reload: loadSettings
  };
};