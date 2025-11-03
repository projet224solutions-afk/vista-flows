import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SecurityAlert {
  id: string;
  user_id: string;
  alert_type: string;
  alert_level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  ip_address?: string;
  location?: string;
  device_info?: string;
  metadata?: any;
  email_sent: boolean;
  sms_sent: boolean;
  read: boolean;
  created_at: string;
}

/**
 * Hook pour gérer les alertes de sécurité
 * Notifie les utilisateurs des activités suspectes
 */
export const useSecurityAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /**
   * Charger les alertes de l'utilisateur
   */
  const loadAlerts = async (limit: number = 50) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setAlerts(data || []);
      setUnreadCount(data?.filter(a => !a.read).length || 0);
    } catch (error: any) {
      console.error('Erreur chargement alertes:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Créer une alerte de sécurité
   */
  const createAlert = async (
    alertType: string,
    alertLevel: 'info' | 'warning' | 'critical',
    title: string,
    description: string,
    metadata?: any
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // Obtenir infos de contexte
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(data => data.ip)
        .catch(() => null);

      const deviceInfo = navigator.userAgent;

      const { error } = await supabase.functions.invoke('send-security-alert', {
        body: {
          userId: user.id,
          alertType,
          alertLevel,
          title,
          description,
          ipAddress,
          deviceInfo,
          metadata
        }
      });

      if (error) throw error;

      // Recharger les alertes
      await loadAlerts();

      return true;
    } catch (error: any) {
      console.error('Erreur création alerte:', error);
      return false;
    }
  };

  /**
   * Marquer une alerte comme lue
   */
  const markAsRead = async (alertId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ read: true })
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Mettre à jour localement
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, read: true } : a
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      return true;
    } catch (error: any) {
      console.error('Erreur marquage alerte:', error);
      return false;
    }
  };

  /**
   * Marquer toutes les alertes comme lues
   */
  const markAllAsRead = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      setUnreadCount(0);

      return true;
    } catch (error: any) {
      console.error('Erreur marquage alertes:', error);
      return false;
    }
  };

  /**
   * Supprimer une alerte
   */
  const deleteAlert = async (alertId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('security_alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (error) throw error;

      setAlerts(prev => prev.filter(a => a.id !== alertId));
      return true;
    } catch (error: any) {
      console.error('Erreur suppression alerte:', error);
      return false;
    }
  };

  // Charger les alertes au montage et s'abonner aux changements
  useEffect(() => {
    if (user) {
      loadAlerts();

      // S'abonner aux nouvelles alertes en temps réel
      const channel = supabase
        .channel('security_alerts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'security_alerts',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setAlerts(prev => [payload.new as SecurityAlert, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    alerts,
    unreadCount,
    loading,
    loadAlerts,
    createAlert,
    markAsRead,
    markAllAsRead,
    deleteAlert
  };
};