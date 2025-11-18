/**
 * 💬 SERVICE COMMUNICATION RÉEL - 224SOLUTIONS
 * Service opérationnel pour communication avec Supabase
 */

import { supabase } from '@/lib/supabase';

export interface Conversation {
  id: string;
  name: string;
  last_message: string;
  updated_at: string;
  unread_count: number;
  participants: Array<{
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
      status: string;
    };
  }>;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: 'online' | 'busy' | 'offline';
  avatar_url?: string;
  last_seen?: string;
}

class CommunicationService {
  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(query: string, limit: number = 10): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          avatar_url,
          updated_at
        `)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return data?.map(profile => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        status: profile.status || 'offline',
        avatar_url: profile.avatar_url,
        last_seen: profile.updated_at
      })) || [];
    } catch (error) {
      console.error('❌ Erreur recherche utilisateurs:', error);
      throw error;
    }
  }

  /**
   * Créer une conversation
   */
  async createConversation(participantIds: string[], name?: string): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          name: name || 'Nouvelle conversation',
          participants: participantIds.map(id => ({ user_id: id }))
        })
        .select(`
          id,
          name,
          last_message,
          updated_at,
          unread_count,
          participants!inner(
            user_id,
            profiles!inner(
              first_name,
              last_name,
              avatar_url,
              status
            )
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erreur création conversation:', error);
      throw error;
    }
  }

  /**
   * Charger les conversations d'un utilisateur
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          last_message,
          updated_at,
          unread_count,
          participants!inner(
            user_id,
            profiles!inner(
              first_name,
              last_name,
              avatar_url,
              status
            )
          )
        `)
        .eq('participants.user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur chargement conversations:', error);
      throw error;
    }
  }

  /**
   * Charger les messages d'une conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          type,
          status,
          created_at,
          profiles!inner(
            first_name,
            last_name
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      throw error;
    }
  }

  /**
   * Envoyer un message
   */
  async sendMessage(conversationId: string, senderId: string, content: string, type: string = 'text'): Promise<Message> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content,
          type: type,
          status: 'sent'
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          type,
          status,
          created_at,
          profiles!inner(
            first_name,
            last_name
          )
        `)
        .single();

      if (error) throw error;

      // Mettre à jour la conversation
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return data;
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      throw error;
    }
  }

  /**
   * Marquer les messages comme lus
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);
    } catch (error) {
      console.error('❌ Erreur marquage lu:', error);
      throw error;
    }
  }

  /**
   * Obtenir les contacts d'un utilisateur
   */
  async getContacts(userId: string): Promise<Contact[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          avatar_url,
          updated_at
        `)
        .neq('id', userId)
        .order('first_name');

      if (error) throw error;

      return data?.map(profile => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        status: profile.status || 'offline',
        avatar_url: profile.avatar_url,
        last_seen: profile.updated_at
      })) || [];
    } catch (error) {
      console.error('❌ Erreur chargement contacts:', error);
      throw error;
    }
  }
}

export const communicationService = new CommunicationService();