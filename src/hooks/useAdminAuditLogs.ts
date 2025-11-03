import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminActionLog {
  id: string;
  admin_id: string;
  admin_email: string;
  admin_role: string;
  action: string;
  action_category: 'user_management' | 'financial' | 'security' | 'system';
  target_table?: string;
  target_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  metadata?: any;
  timestamp: string;
}

/**
 * Hook pour gérer les logs d'audit des actions administrateur
 * Traçabilité complète de toutes les actions sensibles
 */
export const useAdminAuditLogs = () => {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  /**
   * Charger les logs d'audit
   */
  const loadLogs = async (
    limit: number = 100,
    offset: number = 0,
    filters?: {
      adminId?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    if (!user || profile?.role !== 'admin') {
      console.warn('Accès refusé: admin requis');
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('admin_action_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      // Appliquer les filtres
      if (filters?.adminId) {
        query = query.eq('admin_id', filters.adminId);
      }
      if (filters?.category) {
        query = query.eq('action_category', filters.category);
      }
      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotal(count || 0);
    } catch (error: any) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enregistrer une action admin
   */
  const logAction = async (
    action: string,
    category: 'user_management' | 'financial' | 'security' | 'system',
    details?: {
      targetTable?: string;
      targetId?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: any;
    }
  ): Promise<boolean> => {
    if (!user || profile?.role !== 'admin') {
      return false;
    }

    try {
      // Obtenir IP et user agent si possible
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(data => data.ip)
        .catch(() => null);

      const userAgent = navigator.userAgent;

      const { data, error } = await supabase.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action: action,
        p_action_category: category,
        p_target_table: details?.targetTable,
        p_target_id: details?.targetId,
        p_old_value: details?.oldValue ? JSON.stringify(details.oldValue) : null,
        p_new_value: details?.newValue ? JSON.stringify(details.newValue) : null,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_metadata: details?.metadata ? JSON.stringify(details.metadata) : null
      });

      if (error) throw error;

      console.log('✅ Action admin loguée:', action);
      return true;
    } catch (error: any) {
      console.error('Erreur log action:', error);
      return false;
    }
  };

  /**
   * Rechercher dans les logs
   */
  const searchLogs = async (searchTerm: string) => {
    if (!user || profile?.role !== 'admin') return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('*')
        .or(`action.ilike.%${searchTerm}%,admin_email.ilike.%${searchTerm}%,target_table.ilike.%${searchTerm}%`)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(data || []);
    } catch (error: any) {
      console.error('Erreur recherche logs:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtenir statistiques des logs
   */
  const getStats = async (days: number = 30) => {
    if (!user || profile?.role !== 'admin') return null;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('action_category')
        .gte('timestamp', startDate.toISOString());

      if (error) throw error;

      const stats = {
        total: data.length,
        byCategory: {
          user_management: data.filter(l => l.action_category === 'user_management').length,
          financial: data.filter(l => l.action_category === 'financial').length,
          security: data.filter(l => l.action_category === 'security').length,
          system: data.filter(l => l.action_category === 'system').length
        }
      };

      return stats;
    } catch (error: any) {
      console.error('Erreur stats logs:', error);
      return null;
    }
  };

  // Charger les logs au montage
  useEffect(() => {
    if (user && profile?.role === 'admin') {
      loadLogs();
    }
  }, [user, profile]);

  return {
    logs,
    loading,
    total,
    loadLogs,
    logAction,
    searchLogs,
    getStats
  };
};