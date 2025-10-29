/**
 * HOOK DELIVERY NOTIFICATIONS - 224SOLUTIONS
 * Hook React pour gérer les notifications de livraison en temps réel
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

export interface DeliveryNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  delivery_id?: string;
  read: boolean;
  created_at: string;
}

export function useDeliveryNotifications() {
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Charger les notifications non lues au démarrage
  useEffect(() => {
    loadUnreadNotifications();
  }, []);

  const loadUnreadNotifications = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('delivery_notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const notifs = (data || []) as DeliveryNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    } catch (error) {
      console.error('[useDeliveryNotifications] Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // S'abonner aux nouvelles notifications en temps réel
  useEffect(() => {
    const { data: user } = supabase.auth.getUser();

    user.then(({ data }) => {
      if (!data.user) return;

      const channel = supabase
        .channel('delivery-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'delivery_notifications',
            filter: `user_id=eq.${data.user.id}`
          },
          (payload) => {
            const newNotif = payload.new as DeliveryNotification;
            
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Afficher un toast selon le type de notification
            const icon = <Package className="h-4 w-4" />;
            
            switch (newNotif.type) {
              case 'new_delivery':
                toast.info(newNotif.title, {
                  description: newNotif.message,
                  icon
                });
                // Jouer un son pour les nouvelles livraisons
                playNotificationSound();
                break;
              case 'delivery_cancelled':
                toast.error(newNotif.title, {
                  description: newNotif.message,
                  icon
                });
                break;
              default:
                toast.success(newNotif.title, {
                  description: newNotif.message,
                  icon
                });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, []);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Could not play notification sound:', err));
    } catch (error) {
      console.log('Notification sound not available');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[useDeliveryNotifications] Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('delivery_notifications')
        .update({ read: true })
        .eq('user_id', user.user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[useDeliveryNotifications] Error marking all as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
}
