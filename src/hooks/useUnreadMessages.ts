/**
 * Hook pour gérer les messages non lus
 * Compte les messages non lus pour l'utilisateur connecté
 * en utilisant Supabase Realtime pour les mises à jour en temps réel
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UnreadMessagesState {
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useUnreadMessages(): UnreadMessagesState {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Compter les messages non lus où l'utilisateur est le destinataire
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('[useUnreadMessages] Erreur comptage:', error);
        setUnreadCount(0);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error('[useUnreadMessages] Erreur inattendue:', err);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchUnreadCount();

    // Écouter les nouveaux messages en temps réel
    const channel = supabase
      .channel('unread-messages-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[useUnreadMessages] 📩 Nouveau message reçu');
          // Incrémenter le compteur pour les nouveaux messages
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          // Quand un message est mis à jour, recompter pour éviter les erreurs de sync
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          if (!oldRecord.read_at && newRecord.read_at) {
            console.log('[useUnreadMessages] ✅ Message marqué lu - recalcul du compteur');
            // Recharger le compteur complet pour assurer la cohérence
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUnreadCount]);

  return {
    unreadCount,
    loading,
    refresh: fetchUnreadCount
  };
}
