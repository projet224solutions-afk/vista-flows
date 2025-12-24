/**
 * 🔄 HybridEventService - Service hybride Kafka + Supabase
 * Combine Pub/Sub (Kafka-like) avec Supabase Realtime et persistence
 */

import { supabase } from '@/integrations/supabase/client';
import { kafkaService, KafkaTopicName, ProduceResult } from './KafkaService';
import { KAFKA_TOPICS } from './KafkaTopics';

export interface HybridEvent<T = unknown> {
  id: string;
  type: KafkaTopicName | string;
  payload: T;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface HybridEventResult {
  success: boolean;
  eventId: string;
  kafkaResult?: ProduceResult;
  dbResult?: { id: string } | null;
  realtimeResult?: boolean;
  errors: string[];
}

export interface EventSubscription {
  channel: any;
  unsubscribe: () => void;
}

class HybridEventService {
  private static instance: HybridEventService;
  private subscriptions: Map<string, EventSubscription> = new Map();

  private constructor() {}

  static getInstance(): HybridEventService {
    if (!HybridEventService.instance) {
      HybridEventService.instance = new HybridEventService();
    }
    return HybridEventService.instance;
  }

  /**
   * Publier un événement hybride (Kafka + Supabase + Realtime)
   */
  async publishEvent<T>(
    eventType: KafkaTopicName | string,
    payload: T,
    options: {
      userId?: string;
      persistToDb?: boolean;
      broadcastRealtime?: boolean;
      kafkaEnabled?: boolean;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<HybridEventResult> {
    const {
      userId,
      persistToDb = true,
      broadcastRealtime = true,
      kafkaEnabled = true,
      metadata = {},
    } = options;

    const eventId = crypto.randomUUID();
    const errors: string[] = [];
    
    const event: HybridEvent<T> = {
      id: eventId,
      type: eventType,
      payload,
      userId,
      metadata,
      createdAt: new Date().toISOString(),
    };

    let kafkaResult: ProduceResult | undefined;
    let dbResult: { id: string } | null = null;
    let realtimeResult = false;

    // 1. Publier sur Kafka (Pub/Sub)
    if (kafkaEnabled) {
      try {
        kafkaResult = await kafkaService.produce({
          topic: eventType,
          key: eventId,
          value: event,
          headers: {
            eventId,
            eventType,
            ...(userId && { userId }),
          },
        });

        if (!kafkaResult.success) {
          errors.push(`Kafka: ${kafkaResult.error}`);
        }
      } catch (error) {
        errors.push(`Kafka: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Persister dans Supabase (optionnel - nécessite table system_events)
    if (persistToDb) {
      // Note: Persistence DB désactivée - créer la table system_events si nécessaire
      // La persistence peut être activée après création de la migration
      console.log('📝 DB persistence skipped (table system_events not configured)');
      dbResult = null;
    }

    // 3. Broadcast via Supabase Realtime
    if (broadcastRealtime) {
      try {
        const channel = supabase.channel(`events:${eventType}`);
        await channel.send({
          type: 'broadcast',
          event: eventType,
          payload: event,
        });
        realtimeResult = true;
      } catch (error) {
        errors.push(`Realtime: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const success = errors.length === 0 || (kafkaResult?.success || false);

    console.log(`📤 Event ${eventType} published:`, {
      eventId,
      kafka: kafkaResult?.success ? '✅' : '❌',
      db: dbResult ? '✅' : '⏭️',
      realtime: realtimeResult ? '✅' : '❌',
    });

    return {
      success,
      eventId,
      kafkaResult,
      dbResult,
      realtimeResult,
      errors,
    };
  }

  /**
   * S'abonner aux événements en temps réel
   */
  subscribeToEvents(
    eventType: KafkaTopicName | string,
    callback: (event: HybridEvent) => void
  ): EventSubscription {
    const channelName = `events:${eventType}`;
    
    if (this.subscriptions.has(channelName)) {
      this.subscriptions.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: eventType }, (payload) => {
        callback(payload.payload as HybridEvent);
      })
      .subscribe();

    const subscription: EventSubscription = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.subscriptions.delete(channelName);
      },
    };

    this.subscriptions.set(channelName, subscription);
    console.log(`📡 Subscribed to ${eventType} events`);

    return subscription;
  }

  /**
   * Se désabonner d'un type d'événement
   */
  unsubscribeFromEvents(eventType: string): void {
    const channelName = `events:${eventType}`;
    const subscription = this.subscriptions.get(channelName);
    
    if (subscription) {
      subscription.unsubscribe();
      console.log(`🔇 Unsubscribed from ${eventType} events`);
    }
  }

  /**
   * Se désabonner de tous les événements
   */
  unsubscribeAll(): void {
    for (const [name, subscription] of this.subscriptions) {
      subscription.unsubscribe();
      console.log(`🔇 Unsubscribed from ${name}`);
    }
    this.subscriptions.clear();
  }

  // ==================== SPECIALIZED EVENT PUBLISHERS ====================

  /**
   * Publier un événement de commande
   */
  async publishOrderEvent(
    action: 'created' | 'updated' | 'confirmed' | 'cancelled' | 'preparing' | 'ready',
    order: {
      orderId: string;
      customerId?: string;
      vendorId?: string;
      items?: unknown[];
      total?: number;
      status?: string;
    }
  ): Promise<HybridEventResult> {
    const topicMap: Record<string, KafkaTopicName> = {
      created: KAFKA_TOPICS.ORDERS_CREATED,
      updated: KAFKA_TOPICS.ORDERS_UPDATED,
      confirmed: KAFKA_TOPICS.ORDERS_CONFIRMED,
      cancelled: KAFKA_TOPICS.ORDERS_CANCELLED,
      preparing: KAFKA_TOPICS.ORDERS_PREPARING,
      ready: KAFKA_TOPICS.ORDERS_READY,
    };

    return this.publishEvent(topicMap[action], order, {
      userId: order.customerId,
      metadata: { vendorId: order.vendorId },
    });
  }

  /**
   * Publier un événement de livraison
   */
  async publishDeliveryEvent(
    action: 'assigned' | 'pickup' | 'in-transit' | 'delivered' | 'failed',
    delivery: {
      deliveryId: string;
      orderId: string;
      driverId?: string;
      customerId?: string;
      location?: { lat: number; lng: number };
      eta?: string;
      status?: string;
    }
  ): Promise<HybridEventResult> {
    const topicMap: Record<string, KafkaTopicName> = {
      assigned: KAFKA_TOPICS.DELIVERY_ASSIGNED,
      pickup: KAFKA_TOPICS.DELIVERY_PICKUP,
      'in-transit': KAFKA_TOPICS.DELIVERY_IN_TRANSIT,
      delivered: KAFKA_TOPICS.DELIVERY_DELIVERED,
      failed: KAFKA_TOPICS.DELIVERY_FAILED,
    };

    return this.publishEvent(topicMap[action], delivery, {
      userId: delivery.customerId,
      metadata: { driverId: delivery.driverId, orderId: delivery.orderId },
    });
  }

  /**
   * Publier un événement de paiement
   */
  async publishPaymentEvent(
    action: 'initiated' | 'completed' | 'failed' | 'refunded',
    payment: {
      paymentId: string;
      userId?: string;
      amount: number;
      currency?: string;
      method?: string;
      orderId?: string;
      status?: string;
    }
  ): Promise<HybridEventResult> {
    const topicMap: Record<string, KafkaTopicName> = {
      initiated: KAFKA_TOPICS.PAYMENTS_INITIATED,
      completed: KAFKA_TOPICS.PAYMENTS_COMPLETED,
      failed: KAFKA_TOPICS.PAYMENTS_FAILED,
      refunded: KAFKA_TOPICS.PAYMENTS_REFUNDED,
    };

    return this.publishEvent(topicMap[action], payment, {
      userId: payment.userId,
      metadata: { orderId: payment.orderId, amount: payment.amount },
    });
  }

  /**
   * Publier un événement de wallet
   */
  async publishWalletEvent(
    action: 'credited' | 'debited' | 'transfer',
    wallet: {
      walletId: string;
      userId: string;
      amount: number;
      balance?: number;
      reason?: string;
      relatedTransactionId?: string;
    }
  ): Promise<HybridEventResult> {
    const topicMap: Record<string, KafkaTopicName> = {
      credited: KAFKA_TOPICS.WALLET_CREDITED,
      debited: KAFKA_TOPICS.WALLET_DEBITED,
      transfer: KAFKA_TOPICS.WALLET_TRANSFER,
    };

    return this.publishEvent(topicMap[action], wallet, {
      userId: wallet.userId,
      metadata: { amount: wallet.amount, reason: wallet.reason },
    });
  }

  /**
   * Publier un événement d'inventaire
   */
  async publishInventoryEvent(
    action: 'updated' | 'low-stock' | 'out-of-stock' | 'restocked',
    inventory: {
      productId: string;
      vendorId?: string;
      quantity: number;
      previousQuantity?: number;
      threshold?: number;
    }
  ): Promise<HybridEventResult> {
    const topicMap: Record<string, KafkaTopicName> = {
      updated: KAFKA_TOPICS.INVENTORY_UPDATED,
      'low-stock': KAFKA_TOPICS.INVENTORY_LOW_STOCK,
      'out-of-stock': KAFKA_TOPICS.INVENTORY_OUT_OF_STOCK,
      restocked: KAFKA_TOPICS.INVENTORY_RESTOCKED,
    };

    return this.publishEvent(topicMap[action], inventory, {
      metadata: { vendorId: inventory.vendorId, productId: inventory.productId },
    });
  }

  /**
   * Publier un événement de notification
   */
  async publishNotificationEvent(
    channel: 'email' | 'sms' | 'push' | 'in-app',
    notification: {
      recipientId: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    }
  ): Promise<HybridEventResult> {
    const topicMap: Record<string, KafkaTopicName> = {
      email: KAFKA_TOPICS.NOTIFICATIONS_EMAIL,
      sms: KAFKA_TOPICS.NOTIFICATIONS_SMS,
      push: KAFKA_TOPICS.NOTIFICATIONS_PUSH,
      'in-app': KAFKA_TOPICS.NOTIFICATIONS_IN_APP,
    };

    return this.publishEvent(topicMap[channel], notification, {
      userId: notification.recipientId,
      metadata: { channel },
    });
  }

  /**
   * Publier un événement analytics
   */
  async publishAnalyticsEvent(
    eventName: string,
    data: Record<string, unknown>,
    userId?: string
  ): Promise<HybridEventResult> {
    return this.publishEvent(KAFKA_TOPICS.USER_PAGE_VIEW, {
      eventName,
      ...data,
      timestamp: new Date().toISOString(),
    }, {
      userId,
      persistToDb: false, // Analytics might not need DB persistence
      metadata: { eventName },
    });
  }

  /**
   * Publier un événement taxi/ride
   */
  async publishRideEvent(
    action: 'requested' | 'accepted' | 'started' | 'completed' | 'cancelled',
    ride: {
      rideId: string;
      customerId: string;
      driverId?: string;
      pickup?: { lat: number; lng: number; address?: string };
      dropoff?: { lat: number; lng: number; address?: string };
      fare?: number;
      status?: string;
    }
  ): Promise<HybridEventResult> {
    const topicMap: Record<string, KafkaTopicName> = {
      requested: KAFKA_TOPICS.RIDE_REQUESTED,
      accepted: KAFKA_TOPICS.RIDE_ACCEPTED,
      started: KAFKA_TOPICS.RIDE_STARTED,
      completed: KAFKA_TOPICS.RIDE_COMPLETED,
      cancelled: KAFKA_TOPICS.RIDE_CANCELLED,
    };

    return this.publishEvent(topicMap[action], ride, {
      userId: ride.customerId,
      metadata: { driverId: ride.driverId, rideId: ride.rideId },
    });
  }
}

export const hybridEventService = HybridEventService.getInstance();
export default hybridEventService;
