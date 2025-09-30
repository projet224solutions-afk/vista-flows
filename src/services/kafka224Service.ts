/**
 * 🔄 Service Kafka pour 224Solutions
 * 
 * Ce service gère tous les événements de messaging
 * pour la plateforme 224Solutions avec intégration Supabase.
 */

import { Kafka, Producer, Consumer, logLevel, EachMessagePayload } from 'kafkajs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderEvent {
    orderId: string;
    customerId: string;
    vendorId: string;
    amount: number;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    timestamp: string;
    source: string;
}

export interface DeliveryTrackingEvent {
    deliveryId: string;
    orderId: string;
    latitude: number;
    longitude: number;
    status: string;
    timestamp: string;
    accuracy?: number;
}

export interface PaymentEvent {
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    timestamp: string;
}

export interface NotificationEvent {
    userId: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
    timestamp: string;
}

export class Kafka224Service {
    private kafka: Kafka;
    private producer: Producer | null = null;
    private consumers: Map<string, Consumer> = new Map();
    private isConnected = false;

    constructor() {
        this.kafka = new Kafka({
            clientId: '224solutions-app',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
            logLevel: logLevel.ERROR,
        });
    }

    // 🔌 Initialiser le service
    async connect(): Promise<void> {
        if (this.isConnected) return;

        try {
            console.log('🔄 Connexion à Kafka...');

            this.producer = this.kafka.producer({
                maxInFlightRequests: 1,
                idempotent: true,
                transactionTimeout: 30000,
            });

            await this.producer.connect();
            this.isConnected = true;

            console.log('✅ Kafka connecté avec succès');
            toast.success('Service Kafka opérationnel');

        } catch (error) {
            console.error('❌ Erreur connexion Kafka:', error);
            toast.error('Impossible de se connecter à Kafka');
            throw error;
        }
    }

    // 🛒 ÉVÉNEMENTS COMMANDES
    async publishOrderCreated(order: Partial<OrderEvent>): Promise<void> {
        if (!this.producer || !this.isConnected) {
            throw new Error('Kafka non connecté');
        }

        const orderEvent: OrderEvent = {
            orderId: order.orderId || '',
            customerId: order.customerId || '',
            vendorId: order.vendorId || '',
            amount: order.amount || 0,
            items: order.items || [],
            timestamp: new Date().toISOString(),
            source: '224solutions-webapp'
        };

        try {
            // 1. Publier sur Kafka pour traitement asynchrone
            await this.producer.send({
                topic: 'orders.created',
                messages: [{
                    key: orderEvent.orderId,
                    value: JSON.stringify(orderEvent),
                    headers: {
                        'content-type': 'application/json',
                        'source': '224solutions',
                        'version': '1.0'
                    }
                }]
            });

            // 2. Enregistrer l'événement dans Supabase pour persistance
            await supabase.from('kafka_events').insert({
                topic: 'orders.created',
                event_key: orderEvent.orderId,
                event_data: orderEvent,
                processed: false
            });

            // 3. Notification temps réel via Supabase
            await supabase.channel('orders').send({
                type: 'broadcast',
                event: 'order_created',
                payload: { orderId: orderEvent.orderId, status: 'created' }
            });

            console.log(`📦 Commande créée: ${orderEvent.orderId}`);

        } catch (error) {
            console.error('❌ Erreur publication commande:', error);
            throw error;
        }
    }

    async publishOrderUpdated(orderId: string, status: string, metadata: Record<string, any> = {}): Promise<void> {
        if (!this.producer || !this.isConnected) {
            throw new Error('Kafka non connecté');
        }

        const updateEvent = {
            orderId,
            status,
            updatedAt: new Date().toISOString(),
            metadata
        };

        try {
            await this.producer.send({
                topic: 'orders.updated',
                messages: [{
                    key: orderId,
                    value: JSON.stringify(updateEvent)
                }]
            });

            // Mise à jour Supabase
            await supabase.from('orders').update({
                status,
                updated_at: new Date().toISOString(),
                metadata
            }).eq('id', orderId);

            // Notification temps réel
            await supabase.channel('orders').send({
                type: 'broadcast',
                event: 'order_updated',
                payload: { orderId, status }
            });

            console.log(`📝 Commande mise à jour: ${orderId} → ${status}`);

        } catch (error) {
            console.error('❌ Erreur mise à jour commande:', error);
            throw error;
        }
    }

    // 🚚 ÉVÉNEMENTS LIVRAISON
    async publishDeliveryTracking(deliveryData: Partial<DeliveryTrackingEvent>): Promise<void> {
        if (!this.producer || !this.isConnected) {
            throw new Error('Kafka non connecté');
        }

        const trackingEvent: DeliveryTrackingEvent = {
            deliveryId: deliveryData.deliveryId || '',
            orderId: deliveryData.orderId || '',
            latitude: deliveryData.latitude || 0,
            longitude: deliveryData.longitude || 0,
            status: deliveryData.status || 'unknown',
            timestamp: new Date().toISOString(),
            accuracy: deliveryData.accuracy || 10
        };

        try {
            await this.producer.send({
                topic: 'delivery.tracking',
                messages: [{
                    key: trackingEvent.deliveryId,
                    value: JSON.stringify(trackingEvent)
                }]
            });

            // Mise à jour position dans Supabase
            await supabase.from('trackings').insert({
                order_id: trackingEvent.orderId,
                latitude: trackingEvent.latitude,
                longitude: trackingEvent.longitude,
                timestamp: trackingEvent.timestamp,
                user_id: trackingEvent.deliveryId // Simplification pour l'exemple
            });

            // Notification temps réel pour le client
            await supabase.channel(`delivery-${trackingEvent.orderId}`).send({
                type: 'broadcast',
                event: 'location_update',
                payload: {
                    orderId: trackingEvent.orderId,
                    location: {
                        lat: trackingEvent.latitude,
                        lng: trackingEvent.longitude
                    },
                    status: trackingEvent.status
                }
            });

            console.log(`📍 Tracking mis à jour: ${trackingEvent.deliveryId}`);

        } catch (error) {
            console.error('❌ Erreur tracking livraison:', error);
            throw error;
        }
    }

    // 💰 ÉVÉNEMENTS PAIEMENT
    async publishPaymentCompleted(payment: Partial<PaymentEvent>): Promise<void> {
        if (!this.producer || !this.isConnected) {
            throw new Error('Kafka non connecté');
        }

        const paymentEvent: PaymentEvent = {
            paymentId: payment.paymentId || '',
            orderId: payment.orderId || '',
            amount: payment.amount || 0,
            currency: payment.currency || 'XOF',
            method: payment.method || 'unknown',
            timestamp: new Date().toISOString()
        };

        try {
            await this.producer.send({
                topic: 'payments.completed',
                messages: [{
                    key: paymentEvent.orderId,
                    value: JSON.stringify(paymentEvent)
                }]
            });

            // Enregistrer le paiement dans Supabase
            await supabase.from('payments').insert({
                id: paymentEvent.paymentId,
                order_id: paymentEvent.orderId,
                amount: paymentEvent.amount,
                currency: paymentEvent.currency,
                payment_method: paymentEvent.method,
                status: 'completed',
                created_at: paymentEvent.timestamp
            });

            // Mettre à jour le statut de la commande
            await this.publishOrderUpdated(paymentEvent.orderId, 'paid', {
                paymentId: paymentEvent.paymentId,
                paymentMethod: paymentEvent.method
            });

            console.log(`💰 Paiement confirmé: ${paymentEvent.paymentId}`);

        } catch (error) {
            console.error('❌ Erreur paiement:', error);
            throw error;
        }
    }

    // 🔔 ÉVÉNEMENTS NOTIFICATIONS
    async publishNotification(userId: string, notification: Partial<NotificationEvent>): Promise<void> {
        if (!this.producer || !this.isConnected) {
            throw new Error('Kafka non connecté');
        }

        const notificationEvent: NotificationEvent = {
            userId,
            title: notification.title || '',
            body: notification.body || '',
            type: notification.type || 'info',
            data: notification.data || {},
            timestamp: new Date().toISOString()
        };

        try {
            await this.producer.send({
                topic: 'notifications.push',
                messages: [{
                    key: userId,
                    value: JSON.stringify(notificationEvent)
                }]
            });

            // Enregistrer la notification dans Supabase
            await supabase.from('notifications').insert({
                user_id: userId,
                title: notificationEvent.title,
                body: notificationEvent.body,
                type: notificationEvent.type,
                data: notificationEvent.data,
                read: false,
                created_at: notificationEvent.timestamp
            });

            // Notification temps réel pour l'utilisateur
            await supabase.channel(`user-${userId}`).send({
                type: 'broadcast',
                event: 'new_notification',
                payload: notificationEvent
            });

            console.log(`🔔 Notification envoyée à: ${userId}`);

        } catch (error) {
            console.error('❌ Erreur notification:', error);
            throw error;
        }
    }

    // 📊 CONSUMER POUR ANALYTICS
    async subscribeToAnalytics(): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Kafka non connecté');
        }

        const consumer = this.kafka.consumer({
            groupId: '224solutions-analytics'
        });

        try {
            await consumer.connect();
            await consumer.subscribe({
                topics: ['orders.created', 'delivery.tracking', 'payments.completed']
            });

            await consumer.run({
                eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
                    try {
                        const data = JSON.parse(message.value?.toString() || '{}');

                        // Traitement analytics selon le topic
                        switch (topic) {
                            case 'orders.created':
                                await this.updateOrderAnalytics(data);
                                break;
                            case 'delivery.tracking':
                                await this.updateDeliveryAnalytics(data);
                                break;
                            case 'payments.completed':
                                await this.updatePaymentAnalytics(data);
                                break;
                        }

                        // Marquer l'événement comme traité
                        await supabase.from('kafka_events')
                            .update({ processed: true, processed_at: new Date().toISOString() })
                            .eq('event_key', message.key?.toString() || '');

                    } catch (error) {
                        console.error(`❌ Erreur traitement message ${topic}:`, error);
                    }
                },
            });

            this.consumers.set('analytics', consumer);
            console.log('📊 Consumer analytics démarré');

        } catch (error) {
            console.error('❌ Erreur consumer analytics:', error);
            throw error;
        }
    }

    // 📈 Méthodes analytics
    private async updateOrderAnalytics(orderData: OrderEvent): Promise<void> {
        try {
            // Calculer les métriques de commandes
            const dailyOrders = await supabase
                .from('orders')
                .select('count')
                .gte('created_at', new Date().toISOString().split('T')[0])
                .single();

            // Mettre à jour les KPIs dans le dashboard
            await supabase.from('analytics_kpis').upsert({
                metric_name: 'daily_orders',
                metric_value: (dailyOrders.data?.count || 0) + 1,
                date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            });

            console.log('📊 Analytics commande mise à jour:', orderData.orderId);

        } catch (error) {
            console.error('❌ Erreur analytics commande:', error);
        }
    }

    private async updateDeliveryAnalytics(deliveryData: DeliveryTrackingEvent): Promise<void> {
        try {
            // Calculer la distance parcourue, temps de livraison, etc.
            console.log('📊 Analytics livraison:', deliveryData.deliveryId);

            // Exemple : mettre à jour la position moyenne des livreurs
            await supabase.from('analytics_kpis').upsert({
                metric_name: 'active_deliveries',
                metric_value: 1, // Increment
                date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Erreur analytics livraison:', error);
        }
    }

    private async updatePaymentAnalytics(paymentData: PaymentEvent): Promise<void> {
        try {
            // Calculer le chiffre d'affaires quotidien
            const { data: todayRevenue } = await supabase
                .from('analytics_kpis')
                .select('metric_value')
                .eq('metric_name', 'daily_revenue')
                .eq('date', new Date().toISOString().split('T')[0])
                .single();

            const newRevenue = (todayRevenue?.metric_value || 0) + paymentData.amount;

            await supabase.from('analytics_kpis').upsert({
                metric_name: 'daily_revenue',
                metric_value: newRevenue,
                date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            });

            console.log('📊 Analytics paiement mise à jour:', paymentData.paymentId);

        } catch (error) {
            console.error('❌ Erreur analytics paiement:', error);
        }
    }

    // 🔍 Méthodes de monitoring
    async getKafkaHealth(): Promise<{ status: string; topics: string[]; errors: string[] }> {
        try {
            const admin = this.kafka.admin();
            await admin.connect();

            const topics = await admin.listTopics();
            await admin.disconnect();

            return {
                status: this.isConnected ? 'healthy' : 'disconnected',
                topics,
                errors: []
            };

        } catch (error) {
            return {
                status: 'error',
                topics: [],
                errors: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    }

    // 🔄 Fermer toutes les connexions
    async disconnect(): Promise<void> {
        try {
            console.log('🔄 Fermeture des connexions Kafka...');

            // Fermer tous les consumers
            for (const [name, consumer] of this.consumers) {
                await consumer.disconnect();
                console.log(`✅ Consumer ${name} fermé`);
            }
            this.consumers.clear();

            // Fermer le producer
            if (this.producer) {
                await this.producer.disconnect();
                console.log('✅ Producer fermé');
            }

            this.isConnected = false;
            toast.info('Service Kafka déconnecté');

        } catch (error) {
            console.error('❌ Erreur fermeture Kafka:', error);
        }
    }
}

// Instance singleton
export const kafka224 = new Kafka224Service();

// Hook React pour utiliser Kafka
export const useKafka = () => {
    return {
        publishOrderCreated: kafka224.publishOrderCreated.bind(kafka224),
        publishOrderUpdated: kafka224.publishOrderUpdated.bind(kafka224),
        publishDeliveryTracking: kafka224.publishDeliveryTracking.bind(kafka224),
        publishPaymentCompleted: kafka224.publishPaymentCompleted.bind(kafka224),
        publishNotification: kafka224.publishNotification.bind(kafka224),
        getHealth: kafka224.getKafkaHealth.bind(kafka224),
        connect: kafka224.connect.bind(kafka224),
        disconnect: kafka224.disconnect.bind(kafka224)
    };
};
