/**
 * HOOK: Notifications Taxi-Moto temps réel
 * Subscribe aux notifications avec gestion du son et affichage toast
 */

import { useState, useEffect } from 'react';
import { NotificationsService, type TaxiNotification } from '@/services/taxi/notificationsService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useTaxiNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TaxiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Charger les notifications au démarrage
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      const unread = await NotificationsService.getUnreadNotifications(user.id);
      setNotifications(unread);
      setUnreadCount(unread.length);
      setLoading(false);
    };

    loadNotifications();
  }, [user]);

  // Subscribe au temps réel
  useEffect(() => {
    if (!user) return;

    const unsubscribe = NotificationsService.subscribeToNotifications(
      user.id,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Afficher toast selon le type
        if (notification.type === 'new_ride_request') {
          toast.info(notification.title, {
            description: notification.body,
            duration: 10000,
            action: {
              label: 'Voir',
              onClick: () => {
                // Navigation vers la course
                window.location.href = `/taxi-moto/driver`;
              }
            }
          });

          // Jouer un son
          playNotificationSound();
        } else if (notification.type === 'ride_accepted') {
          toast.success(notification.title, {
            description: notification.body
          });
        } else if (notification.type === 'payment_received') {
          toast.success(notification.title, {
            description: notification.body,
            icon: '💰'
          });
        }
      }
    );

    return unsubscribe;
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    await NotificationsService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await NotificationsService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
};

// Helper pour jouer un son de notification
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore si l'autoplay est bloqué
    });
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};