/**
 * SERVICE DE SÉCURITÉ AVANCÉE
 * Gestion des tokens temporaires et authentification renforcée
 * 224Solutions - Bureau Syndicat System
 */

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface SecurityToken {
  id: string;
  token: string;
  type: 'install' | 'access' | 'admin' | 'president';
  bureauId?: string;
  userId?: string;
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
}

export interface SecurityAudit {
  id: string;
  action: string;
  userId?: string;
  bureauId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: any;
  timestamp: string;
}

class SecurityService {
  private readonly TOKEN_EXPIRY_HOURS = {
    install: 24,
    access: 168, // 7 jours
    admin: 1,
    president: 24
  };

  /**
   * Génère un token sécurisé
   */
  private generateSecureToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const crypto = crypto.getRandomValues(new Uint8Array(16));
    const cryptoString = Array.from(crypto, byte => byte.toString(36)).join('');
    return `secure_${timestamp}_${random}_${cryptoString}`;
  }

  /**
   * Crée un token de sécurité
   */
  async createSecurityToken(
    type: SecurityToken['type'],
    bureauId?: string,
    userId?: string,
    createdBy?: string
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS[type]);

      const { error } = await supabase
        .from('security_tokens')
        .insert({
          token,
          type,
          bureau_id: bureauId,
          user_id: userId,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_by: createdBy,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('❌ Erreur création token:', error);
        return { success: false, error: error.message };
      }

      // Audit log
      await this.logSecurityAction('token_created', {
        tokenType: type,
        bureauId,
        userId,
        token: token.substring(0, 10) + '...'
      });

      return { success: true, token };
    } catch (error) {
      console.error('❌ Exception création token:', error);
      return { success: false, error: 'Erreur lors de la création du token' };
    }
  }

  /**
   * Valide un token de sécurité
   */
  async validateSecurityToken(
    token: string,
    type?: SecurityToken['type']
  ): Promise<{ valid: boolean; data?: SecurityToken; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('security_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) {
        return { valid: false, error: 'Token invalide' };
      }

      // Vérifier l'expiration
      const now = new Date();
      const expiresAt = new Date(data.expires_at);

      if (now > expiresAt) {
        return { valid: false, error: 'Token expiré' };
      }

      // Vérifier si déjà utilisé
      if (data.used) {
        return { valid: false, error: 'Token déjà utilisé' };
      }

      // Vérifier le type si spécifié
      if (type && data.type !== type) {
        return { valid: false, error: 'Type de token incorrect' };
      }

      // Audit log
      await this.logSecurityAction('token_validated', {
        tokenType: data.type,
        bureauId: data.bureau_id,
        userId: data.user_id
      });

      return { valid: true, data };
    } catch (error) {
      console.error('❌ Erreur validation token:', error);
      return { valid: false, error: 'Erreur de validation' };
    }
  }

  /**
   * Marque un token comme utilisé
   */
  async markTokenAsUsed(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('security_tokens')
        .update({
          used: true,
          used_at: new Date().toISOString(),
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent
        })
        .eq('token', token);

      if (error) {
        console.error('❌ Erreur marquage token:', error);
        return false;
      }

      // Audit log
      await this.logSecurityAction('token_used', { token });

      return true;
    } catch (error) {
      console.error('❌ Exception marquage token:', error);
      return false;
    }
  }

  /**
   * Révoke un token (invalide immédiatement)
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('security_tokens')
        .update({
          used: true,
          expires_at: new Date().toISOString() // Expire immédiatement
        })
        .eq('token', token);

      if (error) {
        console.error('❌ Erreur révocation token:', error);
        return false;
      }

      // Audit log
      await this.logSecurityAction('token_revoked', { token });

      return true;
    } catch (error) {
      console.error('❌ Exception révocation token:', error);
      return false;
    }
  }

  /**
   * Nettoie les tokens expirés
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('security_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('❌ Erreur nettoyage tokens:', error);
        return 0;
      }

      const cleanedCount = data?.length || 0;

      if (cleanedCount > 0) {
        await this.logSecurityAction('tokens_cleaned', { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Exception nettoyage tokens:', error);
      return 0;
    }
  }

  /**
   * Obtient l'IP du client (simulation)
   */
  private async getClientIP(): Promise<string> {
    // Dans un vrai projet, utiliser un service d'IP
    return '127.0.0.1';
  }

  /**
   * Enregistre une action de sécurité
   */
  private async logSecurityAction(
    action: string,
    details: any
  ): Promise<void> {
    try {
      await supabase
        .from('security_audit')
        .insert({
          action,
          details,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Erreur audit sécurité:', error);
    }
  }

  /**
   * Vérifie les permissions d'accès
   */
  async checkAccessPermissions(
    userId: string,
    bureauId: string,
    requiredRole: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Vérifier le rôle de l'utilisateur
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return { allowed: false, reason: 'Utilisateur non trouvé' };
      }

      // Vérifier les permissions selon le rôle
      const hasPermission = this.checkRolePermission(user.role, requiredRole);

      if (!hasPermission) {
        await this.logSecurityAction('access_denied', {
          userId,
          bureauId,
          userRole: user.role,
          requiredRole
        });

        return { allowed: false, reason: 'Permissions insuffisantes' };
      }

      // Vérifier l'accès au bureau spécifique
      if (bureauId && user.role !== 'admin_pdg') {
        const { data: bureauAccess, error: accessError } = await supabase
          .from('bureau_access')
          .select('id')
          .eq('user_id', userId)
          .eq('bureau_id', bureauId)
          .single();

        if (accessError || !bureauAccess) {
          return { allowed: false, reason: 'Accès au bureau non autorisé' };
        }
      }

      await this.logSecurityAction('access_granted', {
        userId,
        bureauId,
        userRole: user.role
      });

      return { allowed: true };
    } catch (error) {
      console.error('❌ Erreur vérification permissions:', error);
      return { allowed: false, reason: 'Erreur de vérification' };
    }
  }

  /**
   * Vérifie les permissions selon le rôle
   */
  private checkRolePermission(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'admin_pdg': ['admin_pdg', 'admin', 'president', 'user'],
      'admin': ['admin', 'president', 'user'],
      'president': ['president', 'user'],
      'user': ['user']
    };

    const userPermissions = roleHierarchy[userRole as keyof typeof roleHierarchy] || [];
    return userPermissions.includes(requiredRole);
  }

  /**
   * Génère un rapport de sécurité
   */
  async generateSecurityReport(): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    recentActivity: SecurityAudit[];
  }> {
    try {
      // Compter les tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('security_tokens')
        .select('id, used, expires_at');

      if (tokensError) {
        throw new Error('Erreur récupération tokens');
      }

      const now = new Date();
      const totalTokens = tokens.length;
      const activeTokens = tokens.filter(t => !t.used && new Date(t.expires_at) > now).length;
      const expiredTokens = tokens.filter(t => new Date(t.expires_at) <= now).length;

      // Récupérer l'activité récente
      const { data: activity, error: activityError } = await supabase
        .from('security_audit')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (activityError) {
        throw new Error('Erreur récupération activité');
      }

      return {
        totalTokens,
        activeTokens,
        expiredTokens,
        recentActivity: activity || []
      };
    } catch (error) {
      console.error('❌ Erreur génération rapport:', error);
      throw error;
    }
  }
}

export const securityService = new SecurityService();