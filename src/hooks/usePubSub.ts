import { useState, useCallback } from 'react';
import { pubsubService, TOPICS, TopicName, PubSubMessage } from '@/services/pubsub/PubSubService';
import { toast } from 'sonner';

interface UsePubSubReturn {
  // Publishing
  publish: (topic: TopicName | string, data: Record<string, unknown>, attributes?: Record<string, string>) => Promise<boolean>;
  isPublishing: boolean;
  
  // Pulling
  pull: (subscription: string, maxMessages?: number) => Promise<PubSubMessage[]>;
  isPulling: boolean;
  messages: PubSubMessage[];
  
  // Topic Management
  createTopic: (topicName: string) => Promise<boolean>;
  deleteTopic: (topicName: string) => Promise<boolean>;
  listTopics: () => Promise<string[]>;
  
  // Subscription Management
  createSubscription: (topicName: string, subscriptionName: string) => Promise<boolean>;
  deleteSubscription: (subscriptionName: string) => Promise<boolean>;
  listSubscriptions: () => Promise<string[]>;
  
  // Initialization
  initializeAllTopics: () => Promise<void>;
  isInitializing: boolean;
  
  // State
  topics: string[];
  subscriptions: string[];
  isLoading: boolean;
}

export function usePubSub(): UsePubSubReturn {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<PubSubMessage[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);

  const publish = useCallback(async (
    topic: TopicName | string, 
    data: Record<string, unknown>,
    attributes?: Record<string, string>
  ): Promise<boolean> => {
    setIsPublishing(true);
    try {
      const result = await pubsubService.publish(topic, data, attributes);
      if (result.success) {
        console.log(`✅ Message publié sur ${topic}:`, result.messageId);
        return true;
      } else {
        console.error(`❌ Échec publication sur ${topic}:`, result.error);
        toast.error(`Échec de la publication: ${result.error}`);
        return false;
      }
    } finally {
      setIsPublishing(false);
    }
  }, []);

  const pull = useCallback(async (
    subscription: string, 
    maxMessages: number = 10
  ): Promise<PubSubMessage[]> => {
    setIsPulling(true);
    try {
      const result = await pubsubService.pull(subscription, maxMessages);
      if (result.success) {
        setMessages(prev => [...prev, ...result.messages]);
        console.log(`📥 ${result.count} messages reçus de ${subscription}`);
        return result.messages;
      } else {
        console.error(`❌ Échec pull de ${subscription}:`, result.error);
        toast.error(`Échec de la réception: ${result.error}`);
        return [];
      }
    } finally {
      setIsPulling(false);
    }
  }, []);

  const createTopic = useCallback(async (topicName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await pubsubService.createTopic(topicName);
      if (result.success) {
        setTopics(prev => [...prev, topicName]);
        toast.success(`Topic "${topicName}" créé`);
        return true;
      } else {
        toast.error(`Échec création topic: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteTopic = useCallback(async (topicName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await pubsubService.deleteTopic(topicName);
      if (result.success) {
        setTopics(prev => prev.filter(t => t !== topicName));
        toast.success(`Topic "${topicName}" supprimé`);
        return true;
      } else {
        toast.error(`Échec suppression topic: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listTopics = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    try {
      const result = await pubsubService.listTopics();
      if (result.success && result.topics) {
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
      const result = await pubsubService.createSubscription(topicName, subscriptionName);
      if (result.success) {
        setSubscriptions(prev => [...prev, subscriptionName]);
        toast.success(`Subscription "${subscriptionName}" créée`);
        return true;
      } else {
        toast.error(`Échec création subscription: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSubscription = useCallback(async (subscriptionName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await pubsubService.deleteSubscription(subscriptionName);
      if (result.success) {
        setSubscriptions(prev => prev.filter(s => s !== subscriptionName));
        toast.success(`Subscription "${subscriptionName}" supprimée`);
        return true;
      } else {
        toast.error(`Échec suppression subscription: ${result.error}`);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const listSubscriptions = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    try {
      const result = await pubsubService.listSubscriptions();
      if (result.success && result.subscriptions) {
        setSubscriptions(result.subscriptions);
        return result.subscriptions;
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeAllTopics = useCallback(async (): Promise<void> => {
    setIsInitializing(true);
    try {
      const result = await pubsubService.initializeTopics();
      if (result.success) {
        toast.success(`${result.created.length} topics initialisés`);
      } else {
        toast.warning(`Topics créés: ${result.created.length}, Erreurs: ${result.errors.length}`);
      }
      await listTopics();
    } finally {
      setIsInitializing(false);
    }
  }, [listTopics]);

  return {
    // Publishing
    publish,
    isPublishing,
    
    // Pulling
    pull,
    isPulling,
    messages,
    
    // Topic Management
    createTopic,
    deleteTopic,
    listTopics,
    
    // Subscription Management
    createSubscription,
    deleteSubscription,
    listSubscriptions,
    
    // Initialization
    initializeAllTopics,
    isInitializing,
    
    // State
    topics,
    subscriptions,
    isLoading,
  };
}

export { TOPICS };
export type { TopicName, PubSubMessage };
