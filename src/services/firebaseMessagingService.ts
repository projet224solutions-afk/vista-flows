/**
 * SERVICE DE MESSAGERIE FIREBASE
 * Gestion des notifications push et messages en temps réel
 * 224Solutions - Taxi-Moto System
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebaseConfig';
import { toast } from 'sonner';

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: {
        rideId?: string;
        driverId?: string;
        customerId?: string;
        type: 'ride_request' | 'ride_accepted' | 'ride_started' | 'ride_completed' | 'payment_confirmed';
        [key: string]: any;
    };
}

class FirebaseMessagingService {
    private isInitialized = false;
    private currentToken: string | null = null;

    /**
     * Initialise le service de messagerie
     */
    async initialize(): Promise<string | null> {
        if (this.isInitialized) return this.currentToken;

        if (!messaging) {
            console.warn('Firebase Messaging not available');
            return null;
        }

        try {
            // Demander la permission pour les notifications
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                // Obtenir le token FCM
                this.currentToken = await getToken(messaging, {
                    vapidKey: process.env.VITE_FIREBASE_VAPID_KEY || 'your-vapid-key'
                });

                if (this.currentToken) {
                    console.log('FCM Token:', this.currentToken);

                    // Écouter les messages en arrière-plan
                    this.setupMessageListener();

                    this.isInitialized = true;
                    return this.currentToken;
                }
            } else {
                console.warn('Notification permission denied');
            }
        } catch (error) {
            console.error('Erreur initialisation FCM:', error);
        }

        return null;
    }

    /**
     * Configure l'écoute des messages
     */
    private setupMessageListener(): void {
        if (!messaging) return;

        // Messages reçus quand l'app est au premier plan
        onMessage(messaging, (payload) => {
            console.log('Message reçu:', payload);

            const notification = payload.notification;
            const data = payload.data as NotificationPayload['data'];

            if (notification) {
                // Afficher une notification toast
                this.showNotificationToast(notification.title, notification.body, data);
            }
        });
    }

    /**
     * Affiche une notification toast
     */
    private showNotificationToast(title: string, body: string, data?: any): void {
        const notificationType = data?.type || 'info';

        switch (notificationType) {
            case 'ride_request':
                toast.info(title, {
                    description: body,
                    duration: 5000,
                    action: {
                        label: 'Voir',
                        onClick: () => {
                            // Rediriger vers la demande de course
                            console.log('Redirection vers demande:', data?.rideId);
                        }
                    }
                });
                break;

            case 'ride_accepted':
                toast.success(title, {
                    description: body,
                    duration: 5000,
                    action: {
                        label: 'Suivre',
                        onClick: () => {
                            // Rediriger vers le suivi de course
                            console.log('Redirection vers suivi:', data?.rideId);
                        }
                    }
                });
                break;

            case 'ride_started':
                toast.info(title, {
                    description: body,
                    duration: 5000
                });
                break;

            case 'ride_completed':
                toast.success(title, {
                    description: body,
                    duration: 5000,
                    action: {
                        label: 'Noter',
                        onClick: () => {
                            // Ouvrir le formulaire de notation
                            console.log('Ouverture notation:', data?.rideId);
                        }
                    }
                });
                break;

            case 'payment_confirmed':
                toast.success(title, {
                    description: body,
                    duration: 5000
                });
                break;

            default:
                toast.info(title, {
                    description: body,
                    duration: 5000
                });
        }
    }

    /**
     * Envoie une notification à un utilisateur spécifique
     */
    async sendNotificationToUser(
        userId: string,
        notification: NotificationPayload
    ): Promise<boolean> {
        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    userId,
                    notification
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Erreur envoi notification:', error);
            return false;
        }
    }

    /**
     * Envoie une notification à tous les conducteurs en ligne
     */
    async sendNotificationToDrivers(notification: NotificationPayload): Promise<boolean> {
        try {
            const response = await fetch('/api/notifications/broadcast-drivers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    notification
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Erreur envoi notification conducteurs:', error);
            return false;
        }
    }

    /**
     * Envoie une notification à tous les clients dans une zone
     */
    async sendNotificationToArea(
        latitude: number,
        longitude: number,
        radius: number,
        notification: NotificationPayload
    ): Promise<boolean> {
        try {
            const response = await fetch('/api/notifications/broadcast-area', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({
                    latitude,
                    longitude,
                    radius,
                    notification
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Erreur envoi notification zone:', error);
            return false;
        }
    }

    /**
     * Obtient le token FCM actuel
     */
    getCurrentToken(): string | null {
        return this.currentToken;
    }

    /**
     * Vérifie si les notifications sont supportées
     */
    isSupported(): boolean {
        return 'Notification' in window && 'serviceWorker' in navigator;
    }

    /**
     * Vérifie si les notifications sont autorisées
     */
    async hasPermission(): Promise<boolean> {
        if (!this.isSupported()) return false;

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
}

// Instance singleton
export const firebaseMessagingService = new FirebaseMessagingService();
