/**
 * 💬 SERVICE DE COMMUNICATION - 224SOLUTIONS
 * Service professionnel pour la gestion des conversations, messages et appels
 * Intégration avec Supabase et Agora
 */

import { supabase } from '@/integrations/supabase/client';
import { mockCommunicationService } from './mockCommunicationService';
import { toast } from 'sonner';
import agoraService, { MessageData } from './agoraService';

// Types
export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name?: string;
  description?: string;
  channel_name: string;
  participant_1?: string;
  participant_2?: string;
  status: 'active' | 'archived' | 'deleted';
  last_message_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Relations
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  left_at?: string;
  is_active: boolean;

  // Relations
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'system';
  content?: string;
  metadata?: any;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  reply_to?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;

  // Relations
  sender?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  read_by?: MessageReadStatus[];
}

export interface MessageReadStatus {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface Call {
  id: string;
  conversation_id: string;
  channel_name: string;
  caller_id: string;
  callee_id: string;
  type: 'audio' | 'video';
  status: 'initiated' | 'ringing' | 'answered' | 'ended' | 'missed' | 'rejected' | 'failed';
  initiated_at: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds: number;
  end_reason?: string;
  quality_rating?: number;
  created_at: string;
  updated_at: string;
}

export interface UserPresence {
  user_id: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'in_call';
  last_seen: string;
  current_call_id?: string;
  custom_status?: string;
  updated_at: string;
}

class CommunicationService {
  // Vérifier si on est en mode démo
  private isDemoMode(): boolean {
    return !import.meta.env.VITE_SUPABASE_URL || 
           import.meta.env.VITE_SUPABASE_URL === 'https://demo.supabase.co';
  }
  private static instance: CommunicationService;

  static getInstance(): CommunicationService {
    if (!CommunicationService.instance) {
      CommunicationService.instance = new CommunicationService();
    }
    return CommunicationService.instance;
  }

  // =====================================================
  // GESTION DES CONVERSATIONS
  // =====================================================

  /**
   * Récupère toutes les conversations de l'utilisateur
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            user:profiles(id, email, first_name, last_name, avatar_url)
          )
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération conversations:', error);
      toast.error('Erreur lors du chargement des conversations');
      return [];
    }
  }

  /**
   * Crée ou récupère une conversation privée
   */
  async createOrGetPrivateConversation(user1Id: string, user2Id: string): Promise<Conversation | null> {
    try {
      // Utiliser la fonction SQL pour créer/récupérer la conversation
      const { data, error } = await supabase
        .rpc('create_private_conversation', {
          user1_id: user1Id,
          user2_id: user2Id
        });

      if (error) throw error;

      // Récupérer la conversation complète
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            *,
            user:profiles(id, email, first_name, last_name, avatar_url)
          )
        `)
        .eq('id', data)
        .single();

      if (fetchError) throw fetchError;

      return conversation;
    } catch (error) {
      console.error('❌ Erreur création conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
      return null;
    }
  }

  /**
   * Crée une conversation de groupe
   */
  async createGroupConversation(
    creatorId: string,
    name: string,
    description?: string,
    participantIds: string[] = []
  ): Promise<Conversation | null> {
    try {
      const channelName = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Créer la conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name,
          description,
          channel_name: channelName,
          created_by: creatorId,
          status: 'active'
        })
        .select()
        .single();

      if (convError) throw convError;

      // Ajouter le créateur comme admin
      const participants = [
        {
          conversation_id: conversation.id,
          user_id: creatorId,
          role: 'admin',
          is_active: true
        },
        // Ajouter les autres participants comme membres
        ...participantIds.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
          role: 'member' as const,
          is_active: true
        }))
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast.success('Groupe créé avec succès');
      return conversation;
    } catch (error) {
      console.error('❌ Erreur création groupe:', error);
      toast.error('Erreur lors de la création du groupe');
      return null;
    }
  }

  // =====================================================
  // GESTION DES MESSAGES
  // =====================================================

  /**
   * Récupère les messages d'une conversation
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, email, first_name, last_name, avatar_url),
          read_by:message_read_status(*)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).reverse(); // Inverser pour avoir l'ordre chronologique
    } catch (error) {
      console.error('❌ Erreur récupération messages:', error);
      toast.error('Erreur lors du chargement des messages');
      return [];
    }
  }

  /**
   * Envoie un message texte
   */
  async sendTextMessage(
    conversationId: string,
    senderId: string,
    content: string,
    replyTo?: string
  ): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          type: 'text',
          content,
          reply_to: replyTo,
          status: 'sent'
        })
        .select(`
          *,
          sender:profiles(id, email, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Envoyer via Agora RTM
      await this.sendAgoraMessage(conversationId, data);

      return data;
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      return null;
    }
  }

  /**
   * Envoie un message avec fichier
   */
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    file: File,
    type: 'image' | 'video' | 'audio' | 'file' = 'file'
  ): Promise<Message | null> {
    try {
      // Upload du fichier vers Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `conversations/${conversationId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('communication-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('communication-files')
        .getPublicUrl(filePath);

      // Créer le message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          type,
          content: `Fichier partagé: ${file.name}`,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          status: 'sent'
        })
        .select(`
          *,
          sender:profiles(id, email, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Envoyer via Agora RTM
      await this.sendAgoraMessage(conversationId, data);

      toast.success('Fichier envoyé avec succès');
      return data;
    } catch (error) {
      console.error('❌ Erreur envoi fichier:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
      return null;
    }
  }

  /**
   * Envoie un message de localisation
   */
  async sendLocationMessage(
    conversationId: string,
    senderId: string,
    latitude: number,
    longitude: number,
    locationName?: string
  ): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          type: 'location',
          content: locationName || `Position: ${latitude}, ${longitude}`,
          latitude,
          longitude,
          location_name: locationName,
          status: 'sent'
        })
        .select(`
          *,
          sender:profiles(id, email, first_name, last_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Envoyer via Agora RTM
      await this.sendAgoraMessage(conversationId, data);

      toast.success('Position partagée');
      return data;
    } catch (error) {
      console.error('❌ Erreur envoi localisation:', error);
      toast.error('Erreur lors du partage de position');
      return null;
    }
  }

  /**
   * Marque un message comme lu
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('mark_message_as_read', {
          message_id_param: messageId,
          user_id_param: userId
        });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erreur marquer comme lu:', error);
    }
  }

  /**
   * Envoie un message via Agora RTM
   */
  private async sendAgoraMessage(conversationId: string, message: Message): Promise<void> {
    try {
      const messageData: MessageData = {
        id: message.id,
        senderId: message.sender_id,
        content: message.content || '',
        timestamp: new Date(message.created_at).getTime(),
        type: message.type as any,
        metadata: {
          file_url: message.file_url,
          file_name: message.file_name,
          latitude: message.latitude,
          longitude: message.longitude,
          location_name: message.location_name
        }
      };

      // Envoyer via Agora si connecté
      if (agoraService.isRTMReady()) {
        await agoraService.sendMessage(JSON.stringify(messageData));
      }
    } catch (error) {
      console.error('❌ Erreur envoi Agora:', error);
    }
  }

  // =====================================================
  // GESTION DES APPELS
  // =====================================================

  /**
   * Initie un appel
   */
  async initiateCall(
    conversationId: string,
    callerId: string,
    calleeId: string,
    type: 'audio' | 'video'
  ): Promise<Call | null> {
    try {
      const channelName = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversationId,
          channel_name: channelName,
          caller_id: callerId,
          callee_id: calleeId,
          type,
          status: 'initiated'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Appel ${type} initié`);
      return data;
    } catch (error) {
      console.error('❌ Erreur initiation appel:', error);
      toast.error('Erreur lors de l\'initiation de l\'appel');
      return null;
    }
  }

  /**
   * Met à jour le statut d'un appel
   */
  async updateCallStatus(
    callId: string,
    status: Call['status'],
    endReason?: string
  ): Promise<void> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };

      if (status === 'answered') {
        updateData.answered_at = new Date().toISOString();
      } else if (status === 'ended') {
        updateData.ended_at = new Date().toISOString();
        updateData.end_reason = endReason;
      }

      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', callId);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erreur mise à jour appel:', error);
    }
  }

  // =====================================================
  // GESTION DE LA PRÉSENCE
  // =====================================================

  /**
   * Met à jour le statut de présence
   */
  async updatePresence(
    userId: string,
    status: UserPresence['status'],
    customStatus?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('update_user_presence', {
          user_id_param: userId,
          status_param: status,
          custom_status_param: customStatus
        });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erreur mise à jour présence:', error);
    }
  }

  /**
   * Récupère le statut de présence des utilisateurs
   */
  async getUsersPresence(userIds: string[]): Promise<UserPresence[]> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération présence:', error);
      return [];
    }
  }

  // =====================================================
  // UTILITAIRES
  // =====================================================

  /**
   * Recherche des utilisateurs pour créer des conversations (TOUS les utilisateurs)
   */
  async searchUsers(query: string, limit: number = 10): Promise<any[]> {
    if (this.isDemoMode()) {
      console.error('Mode Agora requis');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          avatar_url,
          role,
          phone,
          created_at
        `)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur recherche utilisateurs:', error);
      console.error('Erreur recherche utilisateurs:', error);
      return [];
    }
  }

  /**
   * Récupère tous les utilisateurs de la plateforme pour communication universelle
   */
  async getAllUsers(limit: number = 50, offset: number = 0): Promise<any[]> {
    if (this.isDemoMode()) {
      console.error('Mode Agora requis');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          avatar_url,
          role,
          phone,
          created_at,
          last_seen
        `)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération utilisateurs:', error);
      console.error('Erreur récupération utilisateurs:', error);
      return [];
    }
  }

  /**
   * Récupère les utilisateurs par rôle
   */
  async getUsersByRole(role: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          avatar_url,
          role,
          phone,
          created_at
        `)
        .eq('role', role)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération utilisateurs par rôle:', error);
      return [];
    }
  }

  /**
   * Obtient les statistiques de communication
   */
  async getCommunicationStats(userId: string): Promise<any> {
    try {
      const [conversationsResult, messagesResult, callsResult] = await Promise.all([
        supabase
          .from('conversations')
          .select('id', { count: 'exact' })
          .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
          .eq('status', 'active'),

        supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('sender_id', userId),

        supabase
          .from('calls')
          .select('id', { count: 'exact' })
          .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
      ]);

      return {
        totalConversations: conversationsResult.count || 0,
        totalMessages: messagesResult.count || 0,
        totalCalls: callsResult.count || 0
      };
    } catch (error) {
      console.error('❌ Erreur statistiques:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalCalls: 0
      };
    }
  }
}

export const communicationService = CommunicationService.getInstance();
export default communicationService;
