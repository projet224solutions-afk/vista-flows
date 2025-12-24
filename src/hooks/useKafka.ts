/**
 * 🔄 useKafka - Hook React pour le messaging Kafka-like
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  kafkaService, 
  hybridEventService,
  KAFKA_TOPICS, 
  KafkaTopicName, 
  TOPIC_CATEGORIES,
  ALL_TOPIC_NAMES,
  ProducerRecord,
  ConsumerMessage,
  HybridEvent,
  HybridEventResult,
} from '@/services/kafka';
import { toast } from 'sonner';

interface UseKafkaReturn {
  // Connection
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => void;

  // Producing
  produce: <T>(record: ProducerRecord<T>) => Promise<boolean>;
  produceEvent: <T>(
    eventType: KafkaTopicName | string,
    payload: T,
    options?: { userId?: string; broadcast?: boolean }
  ) => Promise<HybridEventResult | null>;
  isProducing: boolean;

  // Consuming
  consume: <T>(subscription: string, maxMessages?: number) => Promise<ConsumerMessage<T>[]>;
  isConsuming: boolean;
  messages: ConsumerMessage[];

  // Real-time subscriptions
  subscribe: (eventType: KafkaTopicName | string, callback: (event: HybridEvent) => void) => void;
  unsubscribe: (eventType: string) => void;
  unsubscribeAll: () => void;

  // Topic Management
  createTopic: (topicName: string) => Promise<boolean>;
  deleteTopic: (topicName: string) => Promise<boolean>;
  listTopics: () => Promise<string[]>;
  topics: string[];

  // Subscription Management
  createSubscription: (topicName: string, subscriptionName: string) => Promise<boolean>;
  deleteSubscription: (subscriptionName: string) => Promise<boolean>;
  listSubscriptions: () => Promise<string[]>;
  subscriptions: string[];

  // Initialization
  initializeAllTopics: () => Promise<{ success: boolean; created: number; errors: number }>;
  initializeCategoryTopics: (category: keyof typeof TOPIC_CATEGORIES) => Promise<boolean>;
  isInitializing: boolean;

  // Utils
  getCategories: () => (keyof typeof TOPIC_CATEGORIES)[];
  getTopicsByCategory: (category: keyof typeof TOPIC_CATEGORIES) => string[];
  isLoading: boolean;

  // Constants
  TOPICS: typeof KAFKA_TOPICS;
}

export function useKafka(): UseKafkaReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isProducing, setIsProducing] = useState(false);
  const [isConsuming, setIsConsuming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ConsumerMessage[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  // Auto-connect on mount
  useEffect(() => {
    kafkaService.connect().then(setIsConnected);
    
    return () => {
      hybridEventService.unsubscribeAll();
    };
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    const result = await kafkaService.connect();
    setIsConnected(result);
    return result;
  }, []);

  const disconnect = useCallback((): void => {
    kafkaService.disconnect();
    hybridEventService.unsubscribeAll();
    setIsConnected(false);
  }, []);

  const produce = useCallback(async <T>(record: ProducerRecord<T>): Promise<boolean> => {
    setIsProducing(true);
    try {
      const result = await kafkaService.produce(record);
      if (result.success) {
        console.log(`✅ Message produit sur ${record.topic}`);
        return true;
      } else {
        console.error(`❌ Échec production sur ${record.topic}:`, result.error);
        toast.error(`Échec: ${result.error}`);
        return false;
      }
    } finally {
      setIsProducing(false);
    }
  }, []);

  const produceEvent = useCallback(async <T>(
    eventType: KafkaTopicName | string,
    payload: T,
    options: { userId?: string; broadcast?: boolean } = {}
  ): Promise<HybridEventResult | null> => {
    setIsProducing(true);
    try {
      const result = await hybridEventService.publishEvent(eventType, payload, {
        userId: options.userId,
        broadcastRealtime: options.broadcast ?? true,
        kafkaEnabled: true,
        persistToDb: false,
      });

      if (result.success) {
        console.log(`✅ Event ${eventType} publié`);
      } else {
        console.error(`❌ Échec event ${eventType}:`, result.errors);
        toast.error(`Erreurs: ${result.errors.join(', ')}`);
      }

      return result;
    } catch (error) {
      console.error('Produce event error:', error);
      return null;
    } finally {
      setIsProducing(false);
    }
  }, []);

  const consume = useCallback(async <T>(
    subscription: string,
    maxMessages: number = 10
  ): Promise<ConsumerMessage<T>[]> => {
    setIsConsuming(true);
    try {
      const result = await kafkaService.consume<T>(subscription, maxMessages);
      if (result.success) {
        setMessages(prev => [...prev, ...result.messages] as ConsumerMessage[]);
        console.log(`📥 ${result.count} messages consommés de ${subscription}`);
        return result.messages;
      } else {
        console.error(`❌ Échec consommation de ${subscription}:`, result.error);
        return [];
      }
    } finally {
      setIsConsuming(false);
    }
  }, []);

  const subscribe = useCallback((
    eventType: KafkaTopicName | string,
    callback: (event: HybridEvent) => void
  ): void => {
    hybridEventService.subscribeToEvents(eventType, callback);
    console.log(`📡 Abonné aux événements ${eventType}`);
  }, []);

  const unsubscribe = useCallback((eventType: string): void => {
    hybridEventService.unsubscribeFromEvents(eventType);
  }, []);

  const unsubscribeAll = useCallback((): void => {
    hybridEventService.unsubscribeAll();
  }, []);

  const createTopic = useCallback(async (topicName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await kafkaService.createTopic(topicName);
      if (result.success) {
        if (result.created) {
          setTopics(prev => [...prev, topicName]);
          toast.success(`Topic "${topicName}" créé`);
        } else {
          toast.info(`Topic "${topicName}" existe déjà`);
        }
        return true;
      } else {
        toast.error(`Échec création: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTopic = useCallback(async (topicName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await kafkaService.deleteTopic(topicName);
      if (result.success) {
        setTopics(prev => prev.filter(t => t !== topicName));
        toast.success(`Topic "${topicName}" supprimé`);
        return true;
      } else {
        toast.error(`Échec suppression: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listTopics = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    try {
      const result = await kafkaService.listTopics();
      if (result.success) {
        setTopics(result.topics);
        return result.topics;
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSubscription = useCallback(async (
    topicName: string,
    subscriptionName: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await kafkaService.createSubscription(topicName, subscriptionName);
      if (result.success) {
        setSubscriptions(prev => [...prev, subscriptionName]);
        toast.success(`Subscription "${subscriptionName}" créée`);
        return true;
      } else {
        toast.error(`Échec création: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSubscription = useCallback(async (subscriptionName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await kafkaService.deleteSubscription(subscriptionName);
      if (result.success) {
        setSubscriptions(prev => prev.filter(s => s !== subscriptionName));
        toast.success(`Subscription "${subscriptionName}" supprimée`);
        return true;
      } else {
        toast.error(`Échec suppression: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listSubscriptions = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    try {
      const result = await kafkaService.listSubscriptions();
      if (result.success) {
        setSubscriptions(result.subscriptions);
        return result.subscriptions;
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeAllTopics = useCallback(async (): Promise<{
    success: boolean;
    created: number;
    errors: number;
  }> => {
    setIsInitializing(true);
    try {
      const result = await kafkaService.initializeAllTopics();
      
      if (result.success) {
        toast.success(`${result.created.length} topics créés sur ${result.total}`);
      } else {
        toast.warning(`${result.created.length} créés, ${result.errors.length} erreurs`);
      }

      await listTopics();

      return {
        success: result.success,
        created: result.created.length,
        errors: result.errors.length,
      };
    } finally {
      setIsInitializing(false);
    }
  }, [listTopics]);

  const initializeCategoryTopics = useCallback(async (
    category: keyof typeof TOPIC_CATEGORIES
  ): Promise<boolean> => {
    setIsInitializing(true);
    try {
      const result = await kafkaService.initializeCategoryTopics(category);
      
      if (result.success) {
        toast.success(`Topics ${category} initialisés (${result.created.length} créés)`);
      } else {
        toast.warning(`${result.created.length} créés, ${result.errors.length} erreurs`);
      }

      await listTopics();
      return result.success;
    } finally {
      setIsInitializing(false);
    }
  }, [listTopics]);

  const getCategories = useCallback((): (keyof typeof TOPIC_CATEGORIES)[] => {
    return kafkaService.getCategories();
  }, []);

  const getTopicsByCategory = useCallback((
    category: keyof typeof TOPIC_CATEGORIES
  ): string[] => {
    return kafkaService.getTopicsByCategory(category);
  }, []);

  return {
    // Connection
    isConnected,
    connect,
    disconnect,

    // Producing
    produce,
    produceEvent,
    isProducing,

    // Consuming
    consume,
    isConsuming,
    messages,

    // Real-time subscriptions
    subscribe,
    unsubscribe,
    unsubscribeAll,

    // Topic Management
    createTopic,
    deleteTopic,
    listTopics,
    topics,

    // Subscription Management
    createSubscription,
    deleteSubscription,
    listSubscriptions,
    subscriptions,

    // Initialization
    initializeAllTopics,
    initializeCategoryTopics,
    isInitializing,

    // Utils
    getCategories,
    getTopicsByCategory,
    isLoading,

    // Constants
    TOPICS: KAFKA_TOPICS,
  };
}

export { KAFKA_TOPICS, TOPIC_CATEGORIES, ALL_TOPIC_NAMES };
export type { KafkaTopicName };
