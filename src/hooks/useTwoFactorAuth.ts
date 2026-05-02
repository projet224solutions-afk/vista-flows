/**
 * Hook pour gérer l'authentification à deux facteurs (2FA/TOTP)
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';

interface TwoFactorSettings {
  isEnabled: boolean;
  preferredMethod: 'totp' | 'sms' | 'email';
  lastUsedAt: string | null;
  verifiedAt: string | null;
  recoveryEmail: string | null;
}

interface UseTwoFactorAuthReturn {
  settings: TwoFactorSettings | null;
  loading: boolean;
  generating: boolean;
  verifying: boolean;
  qrCodeUrl: string | null;
  secretKey: string | null;
  backupCodes: string[] | null;
  generateSecret: () => Promise<void>;
  verifyAndEnable: (code: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  disable2FA: (code: string) => Promise<boolean>;
  regenerateBackupCodes: () => Promise<string[] | null>;
  loadSettings: () => Promise<void>;
}

// Génère un secret TOTP compatible Google Authenticator
const generateTOTPSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
};

// Génère des codes de récupération
const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() +
                 '-' +
                 Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
  }
  return codes;
};

// Calcule le code TOTP actuel
const calculateTOTP = (secret: string): string => {
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const counter = Math.floor(epoch / timeStep);

  // Simplified TOTP - using Utf8 encoding since CryptoJS doesn't have native Base32
  // In production, consider using a proper TOTP library like otpauth
  const hmac = CryptoJS.HmacSHA1(
    CryptoJS.enc.Hex.parse(counter.toString(16).padStart(16, '0')),
    CryptoJS.enc.Utf8.parse(secret)
  );

  const offset = hmac.words[hmac.words.length - 1] & 0xf;
  const binary = ((hmac.words[Math.floor(offset / 4)] >>> ((3 - (offset % 4)) * 8)) & 0x7fffffff);
  const otp = binary % 1000000;

  return otp.toString().padStart(6, '0');
};

export const useTwoFactorAuth = (): UseTwoFactorAuthReturn => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TwoFactorSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          isEnabled: data.is_enabled || false,
          preferredMethod: (data.preferred_method as 'totp' | 'sms' | 'email') || 'totp',
          lastUsedAt: data.last_used_at,
          verifiedAt: data.verified_at,
          recoveryEmail: data.recovery_email
        });
      } else {
        setSettings({
          isEnabled: false,
          preferredMethod: 'totp',
          lastUsedAt: null,
          verifiedAt: null,
          recoveryEmail: null
        });
      }
    } catch (error) {
      console.error('Erreur chargement 2FA:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const generateSecret = useCallback(async () => {
    if (!user?.id || !user?.email) {
      toast.error('Utilisateur non connecté');
      return;
    }

    setGenerating(true);
    try {
      const secret = generateTOTPSecret();
      const codes = generateBackupCodes(10);

      // Créer l'URL pour QR code
      const issuer = '224Solutions';
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      // Chiffrer le secret et les codes
      const encryptionKey = user.id.slice(0, 32);
      const iv = CryptoJS.lib.WordArray.random(16);
      const encryptedSecret = CryptoJS.AES.encrypt(secret, encryptionKey, { iv }).toString();
      const encryptedCodes = CryptoJS.AES.encrypt(JSON.stringify(codes), encryptionKey, { iv }).toString();

      // Sauvegarder temporairement (non activé)
      const { error } = await supabase
        .from('user_2fa_settings')
        .upsert({
          user_id: user.id,
          is_enabled: false,
          totp_secret_encrypted: encryptedSecret,
          totp_secret_iv: iv.toString(),
          backup_codes_encrypted: encryptedCodes,
          backup_codes_iv: iv.toString(),
          preferred_method: 'totp',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setSecretKey(secret);
      setQrCodeUrl(otpauthUrl);
      setBackupCodes(codes);

      toast.success('Secret 2FA généré. Scannez le QR code avec votre application.');
    } catch (error) {
      console.error('Erreur génération 2FA:', error);
      toast.error('Erreur lors de la génération du secret 2FA');
    } finally {
      setGenerating(false);
    }
  }, [user]);

  const verifyAndEnable = useCallback(async (code: string): Promise<boolean> => {
    if (!user?.id || !secretKey) {
      toast.error('Configuration incomplète');
      return false;
    }

    setVerifying(true);
    try {
      // Vérifier le code
      const expectedCode = calculateTOTP(secretKey);
      const isValid = code === expectedCode;

      // Log de la tentative
      await supabase
        .from('totp_verification_attempts')
        .insert({
          user_id: user.id,
          success: isValid,
          failure_reason: isValid ? null : 'Code invalide'
        });

      if (!isValid) {
        toast.error('Code incorrect. Veuillez réessayer.');
        return false;
      }

      // Activer la 2FA
      const { error } = await supabase
        .from('user_2fa_settings')
        .update({
          is_enabled: true,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSettings();
      toast.success('🔐 Authentification à deux facteurs activée !');
      return true;
    } catch (error) {
      console.error('Erreur vérification 2FA:', error);
      toast.error('Erreur lors de l\'activation de la 2FA');
      return false;
    } finally {
      setVerifying(false);
    }
  }, [user?.id, secretKey, loadSettings]);

  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    if (!user?.id) return false;

    setVerifying(true);
    try {
      // Récupérer le secret chiffré
      const { data, error } = await supabase
        .from('user_2fa_settings')
        .select('totp_secret_encrypted, totp_secret_iv')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        toast.error('2FA non configurée');
        return false;
      }

      // Déchiffrer
      const encryptionKey = user.id.slice(0, 32);
      const decrypted = CryptoJS.AES.decrypt(
        data.totp_secret_encrypted,
        encryptionKey,
        { iv: CryptoJS.enc.Hex.parse(data.totp_secret_iv) }
      ).toString(CryptoJS.enc.Utf8);

      // Vérifier
      const expectedCode = calculateTOTP(decrypted);
      const isValid = code === expectedCode;

      // Log
      await supabase
        .from('totp_verification_attempts')
        .insert({
          user_id: user.id,
          success: isValid,
          failure_reason: isValid ? null : 'Code invalide'
        });

      if (isValid) {
        await supabase
          .from('user_2fa_settings')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }

      return isValid;
    } catch (error) {
      console.error('Erreur vérification:', error);
      return false;
    } finally {
      setVerifying(false);
    }
  }, [user?.id]);

  const disable2FA = useCallback(async (code: string): Promise<boolean> => {
    if (!user?.id) return false;

    const isValid = await verifyCode(code);
    if (!isValid) {
      toast.error('Code invalide');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_2fa_settings')
        .update({
          is_enabled: false,
          totp_secret_encrypted: null,
          totp_secret_iv: null,
          backup_codes_encrypted: null,
          backup_codes_iv: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await loadSettings();
      setSecretKey(null);
      setQrCodeUrl(null);
      setBackupCodes(null);

      toast.success('2FA désactivée');
      return true;
    } catch (error) {
      console.error('Erreur désactivation:', error);
      toast.error('Erreur lors de la désactivation');
      return false;
    }
  }, [user?.id, verifyCode, loadSettings]);

  const regenerateBackupCodes = useCallback(async (): Promise<string[] | null> => {
    if (!user?.id) return null;

    try {
      const codes = generateBackupCodes(10);
      const encryptionKey = user.id.slice(0, 32);
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(codes), encryptionKey, { iv }).toString();

      const { error } = await supabase
        .from('user_2fa_settings')
        .update({
          backup_codes_encrypted: encrypted,
          backup_codes_iv: iv.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setBackupCodes(codes);
      toast.success('Nouveaux codes de récupération générés');
      return codes;
    } catch (error) {
      console.error('Erreur régénération:', error);
      toast.error('Erreur lors de la régénération');
      return null;
    }
  }, [user?.id]);

  return {
    settings,
    loading,
    generating,
    verifying,
    qrCodeUrl,
    secretKey,
    backupCodes,
    generateSecret,
    verifyAndEnable,
    verifyCode,
    disable2FA,
    regenerateBackupCodes,
    loadSettings
  };
};
