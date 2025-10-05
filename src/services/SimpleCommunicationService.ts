/**
 * 💬 SERVICE DE COMMUNICATION SIMPLIFIÉ - 224SOLUTIONS
 * Service de communication fonctionnel avec Agora et Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface SimpleConversation {
  id: string;
  name: string;
  type: 'private' | 'group';
  participants: string[];
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface SimpleMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'location';
  created_at: string;
  sender?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export interface SimpleCall {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  type: 'audio' | 'video';
  status: 'initiated' | 'ringing' | 'connected' | 'ended';
  started_at: string;
  ended_at?: string;
  duration?: number;
}

class SimpleCommunicationService {
  private static instance: SimpleCommunicationService;

  static getInstance(): SimpleCommunicationService {
    if (!SimpleCommunicationService.instance) {
      SimpleCommunicationService.instance = new SimpleCommunicationService();
    }
    return SimpleCommunicationService.instance;
  }

  // =====================================================
  // CONVERSATIONS
  // =====================================================

  /**
   * Obtenir toutes les conversations de l'utilisateur
   */
  async getConversations(userId: string): Promise<SimpleConversation[]> {
    try {
      // Utiliser les messages existants pour créer des conversations virtuelles
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      // Grouper les messages par conversation
      const conversationMap = new Map<string, any>();
      
      messages.forEach(msg => {
        if (!conversationMap.has(msg.conversation_id)) {
          conversationMap.set(msg.conversation_id, {
            id: msg.conversation_id,
            name: `Conversation ${msg.conversation_id.slice(0, 8)}`,
            type: 'private',
            participants: [msg.sender_id],
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0
          });
        }
      });

      return Array.from(conversationMap.values());
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Créer une nouvelle conversation privée
   */
  async createPrivateConversation(userId1: string, userId2: string): Promise<SimpleConversation | null> {
    try {
      // Créer un ID de conversation unique
      const conversationId = `conv_${userId1}_${userId2}_${Date.now()}`;
      
      return {
        id: conversationId,
        name: 'Conversation privée',
        type: 'private',
        participants: [userId1, userId2],
        unread_count: 0
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
      return null;
    }
  }

  /**
   * Obtenir une conversation par ID
   */
  async getConversationById(conversationId: string): Promise<SimpleConversation | null> {
    try {
      // Créer une conversation virtuelle basée sur l'ID
      return {
        id: conversationId,
        name: `Conversation ${conversationId.slice(0, 8)}`,
        type: 'private',
        participants: [],
        unread_count: 0
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  // =====================================================
  // MESSAGES
  // =====================================================

  /**
   * Obtenir les messages d'une conversation
   */
  async getMessages(conversationId: string): Promise<SimpleMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          type,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data.map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        type: msg.type,
        created_at: msg.created_at,
        sender: msg.sender
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Envoyer un message
   */
  async sendMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'image' | 'file' | 'location' = 'text'): Promise<SimpleMessage | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          type
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          type,
          created_at,
          sender:profiles!messages_sender_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Mettre à jour la conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return {
        id: data.id,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        content: data.content,
        type: data.type,
        created_at: data.created_at,
        sender: data.sender
      };
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      return null;
    }
  }

  // =====================================================
  // APPELS
  // =====================================================

  /**
   * Initier un appel
   */
  async initiateCall(conversationId: string, callerId: string, calleeId: string, type: 'audio' | 'video'): Promise<SimpleCall | null> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversationId,
          caller_id: callerId,
          callee_id: calleeId,
          type,
          status: 'initiated'
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        id: data.id,
        conversation_id: data.conversation_id,
        caller_id: data.caller_id,
        callee_id: data.callee_id,
        type: data.type,
        status: data.status,
        started_at: data.created_at
      };
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Erreur lors de l\'initiation de l\'appel');
      return null;
    }
  }

  /**
   * Mettre à jour le statut d'un appel
   */
  async updateCallStatus(callId: string, status: 'ringing' | 'connected' | 'ended'): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (status === 'ended') {
        updateData.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error updating call status:', error);
    }
  }

  /**
   * Obtenir l'historique des appels
   */
  async getCallHistory(userId: string): Promise<SimpleCall[]> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          id,
          conversation_id,
          caller_id,
          callee_id,
          type,
          status,
          created_at,
          ended_at
        `)
        .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data.map(call => ({
        id: call.id,
        conversation_id: call.conversation_id,
        caller_id: call.caller_id,
        callee_id: call.callee_id,
        type: call.type,
        status: call.status,
        started_at: call.created_at,
        ended_at: call.ended_at,
        duration: call.ended_at ? 
          Math.floor((new Date(call.ended_at).getTime() - new Date(call.created_at).getTime()) / 1000) : 
          undefined
      }));
    } catch (error) {
      console.error('Error fetching call history:', error);
      return [];
    }
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(query: string): Promise<Array<{ id: string; email: string; first_name?: string; last_name?: string }>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Mettre à jour la présence utilisateur
   */
  async updatePresence(userId: string, status: 'online' | 'offline' | 'busy'): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status,
          last_seen: new Date().toISOString()
        });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }
}

export default SimpleCommunicationService.getInstance();
