/**
 * SERVICE DE NOTIFICATIONS TAXI MOTO
 * Gestion des notifications en temps réel pour le système taxi moto
 * 224Solutions - Taxi-Moto System
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaxiNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    category: 'trip' | 'payment' | 'rating' | 'system';
    isRead: boolean;
    createdAt: string;
    tripId?: string;
}

export interface NotificationSubscription {
    unsubscribe: () => void;
}

class TaxiMotoNotificationService {
    private subscriptions: Map<string, NotificationSubscription> = new Map();
    private isConnected = false;

    /**
     * Initialise le service de notifications
     */
    async initialize(): Promise<void> {
        try {
            // Vérifier la connexion Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('Utilisateur non connecté pour les notifications');
                return;
            }

            this.isConnected = true;
            console.log('🔔 Service de notifications taxi moto initialisé');
        } catch (error) {
            console.error('Erreur initialisation notifications:', error);
        }
    }

    /**
     * S'abonne aux notifications en temps réel
     */
    subscribeToNotifications(
        userId: string,
        onNotification: (notification: TaxiNotification) => void
    ): NotificationSubscription {
        if (!this.isConnected) {
            console.warn('Service de notifications non initialisé');
            return { unsubscribe: () => { } };
        }

        const subscription = supabase
            .channel(`taxi-notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'taxi_notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const notification = payload.new as TaxiNotification;
                    onNotification(notification);
                    this.showToastNotification(notification);
                }
            )
            .subscribe();

        const unsubscribe = () => {
            subscription.unsubscribe();
            this.subscriptions.delete(userId);
        };

        this.subscriptions.set(userId, { unsubscribe });
        return { unsubscribe };
    }

    /**
     * S'abonne aux mises à jour de statut de course
     */
    subscribeToTripUpdates(
        tripId: string,
        onUpdate: (trip: any) => void
    ): NotificationSubscription {
        if (!this.isConnected) {
            return { unsubscribe: () => { } };
        }

        const subscription = supabase
            .channel(`trip-updates-${tripId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'taxi_trips',
                    filter: `id=eq.${tripId}`
                },
                (payload) => {
                    onUpdate(payload.new);
                }
            )
            .subscribe();

        const unsubscribe = () => {
            subscription.unsubscribe();
        };

        return { unsubscribe };
    }

    /**
     * S'abonne aux mises à jour de position du conducteur
     */
    subscribeToDriverLocation(
        driverId: string,
        onLocationUpdate: (location: { lat: number; lng: number; timestamp: string }) => void
    ): NotificationSubscription {
        if (!this.isConnected) {
            return { unsubscribe: () => { } };
        }

        const subscription = supabase
            .channel(`driver-location-${driverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'taxi_trip_tracking',
                    filter: `driver_id=eq.${driverId}`
                },
                (payload) => {
                    const tracking = payload.new;
                    onLocationUpdate({
                        lat: tracking.latitude,
                        lng: tracking.longitude,
                        timestamp: tracking.timestamp
                    });
                }
            )
            .subscribe();

        const unsubscribe = () => {
            subscription.unsubscribe();
        };

        return { unsubscribe };
    }

    /**
     * Envoie une notification
     */
    async sendNotification(
        userId: string,
        title: string,
        message: string,
        type: TaxiNotification['type'] = 'info',
        category: TaxiNotification['category'] = 'trip',
        tripId?: string
    ): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('taxi_notifications')
                .insert({
                    user_id: userId,
                    title,
                    message,
                    type,
                    category,
                    trip_id: tripId,
                    is_read: false,
                    is_sent: true
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erreur envoi notification:', error);
            return false;
        }
    }

    /**
     * Marque une notification comme lue
     */
    async markAsRead(notificationId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('taxi_notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erreur marquage notification:', error);
            return false;
        }
    }

    /**
     * Récupère les notifications non lues
     */
    async getUnreadNotifications(userId: string): Promise<TaxiNotification[]> {
        try {
            const { data, error } = await supabase
                .from('taxi_notifications')
                .select('*')
                .eq('user_id', userId)
                .eq('is_read', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur récupération notifications:', error);
            return [];
        }
    }

    /**
     * Récupère toutes les notifications
     */
    async getAllNotifications(
        userId: string,
        limit: number = 50
    ): Promise<TaxiNotification[]> {
        try {
            const { data, error } = await supabase
                .from('taxi_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erreur récupération notifications:', error);
            return [];
        }
    }

    /**
     * Supprime les anciennes notifications
     */
    async cleanupOldNotifications(daysOld: number = 30): Promise<boolean> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const { error } = await supabase
                .from('taxi_notifications')
                .delete()
                .lt('created_at', cutoffDate.toISOString());

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erreur nettoyage notifications:', error);
            return false;
        }
    }

    /**
     * Affiche une notification toast
     */
    private showToastNotification(notification: TaxiNotification): void {
        const toastOptions = {
            duration: notification.type === 'error' ? 8000 : 5000,
        };

        switch (notification.type) {
            case 'success':
                toast.success(notification.title, {
                    description: notification.message,
                    ...toastOptions
                });
                break;
            case 'error':
                toast.error(notification.title, {
                    description: notification.message,
                    ...toastOptions
                });
                break;
            case 'warning':
                toast.warning(notification.title, {
                    description: notification.message,
                    ...toastOptions
                });
                break;
            default:
                toast.info(notification.title, {
                    description: notification.message,
                    ...toastOptions
                });
        }
    }

    /**
     * Notifications spécifiques au taxi moto
     */
    async notifyTripRequested(tripId: string, customerName: string): Promise<void> {
        // Notifier les conducteurs à proximité
        console.log(`🚗 Nouvelle demande de course: ${customerName} (${tripId})`);
    }

    async notifyTripAccepted(tripId: string, driverName: string): Promise<void> {
        console.log(`✅ Course acceptée par ${driverName} (${tripId})`);
    }

    async notifyDriverArriving(tripId: string, eta: string): Promise<void> {
        console.log(`🚀 Conducteur en route - Arrivée dans ${eta} (${tripId})`);
    }

    async notifyTripCompleted(tripId: string, amount: number): Promise<void> {
        console.log(`💰 Course terminée - Gains: ${amount} GNF (${tripId})`);
    }

    /**
     * Nettoie les abonnements
     */
    cleanup(): void {
        this.subscriptions.forEach(({ unsubscribe }) => {
            unsubscribe();
        });
        this.subscriptions.clear();
        this.isConnected = false;
    }
}

// Instance singleton
export const taxiNotificationService = new TaxiMotoNotificationService();
