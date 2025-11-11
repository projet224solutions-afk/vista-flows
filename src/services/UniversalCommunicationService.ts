/**
 * Service de Communication Universel pour 224SOLUTIONS
 * Gère messagerie, appels audio/vidéo, notifications et audit
 */

import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  type: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  status: string;
  metadata?: any;
  created_at: string;
  read_at?: string;
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  id: string;
  name?: string;
  type: string;
  creator_id: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  participants: any;
  created_at: string;
}

export interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: string;
  status: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  quality_rating?: number;
  metadata?: any;
}

export interface CommunicationNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  conversation_id?: string;
  message_id?: string;
  call_id?: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

class UniversalCommunicationService {
  /**
   * Récupérer toutes les conversations de l'utilisateur
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      // Récupérer les conversations normales (avec conversation_id)
      const { data: normalConvs, error: convError } = await supabase.rpc('get_user_conversations', {
        p_user_id: userId
      });

      if (convError) throw convError;

      // Récupérer les conversations de messages directs (sans conversation_id)
      const { data: directConvs, error: directError } = await supabase.rpc('get_user_direct_message_conversations', {
        p_user_id: userId
      });

      if (directError) throw directError;

      // Fusionner et trier par date de dernier message
      const allConversations = [
        ...(normalConvs || []),
        ...(directConvs || [])
      ].sort((a, b) => {
        const dateA = new Date(a.last_message_at || a.created_at);
        const dateB = new Date(b.last_message_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      return allConversations;
    } catch (error) {
      console.error('Erreur récupération conversations:', error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle conversation
   */
  async createConversation(
    participantIds: string[],
    creatorId: string,
    name?: string,
    type: 'private' | 'group' = 'private'
  ): Promise<Conversation> {
    try {
      // Créer la conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type,
          name,
          creator_id: creatorId
        })
        .select()
        .single();

      if (convError) throw convError;

      // Ajouter les participants (incluant le créateur)
      const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
      const participants = allParticipantIds.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId
      }));

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      // Audit log
      await this.logAudit(creatorId, 'conversation_created', conversation.id);

      return await this.getConversationById(conversation.id);
    } catch (error) {
      console.error('Erreur création conversation:', error);
      throw error;
    }
  }

  /**
   * Récupérer une conversation par ID
   */
  async getConversationById(conversationId: string): Promise<Conversation> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Non authentifié');

      const conversations = await this.getConversations(session.session.user.id);
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) throw new Error('Conversation non trouvée');
      return conversation;
    } catch (error) {
      console.error('Erreur récupération conversation:', error);
      throw error;
    }
  }

  /**
   * Récupérer les messages d'une conversation
   */
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    try {
      // Si c'est une conversation directe (ID commence par "direct_")
      if (conversationId.startsWith('direct_')) {
        const otherUserId = conversationId.replace('direct_', '');
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) throw new Error('Non authentifié');
        
        const currentUserId = session.session.user.id;
        
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
              first_name,
              last_name,
              email,
              avatar_url
            )
          `)
          .is('conversation_id', null)
          .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return ((data || []) as any[]).reverse();
      }
      
      // Conversation normale avec conversation_id
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return ((data || []) as any[]).reverse();
    } catch (error) {
      console.error('Erreur récupération messages:', error);
      throw error;
    }
  }

  /**
   * Envoyer un message texte
   */
  async sendTextMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<Message> {
    try {
      console.log('sendTextMessage appelé:', { conversationId, senderId, contentLength: content.length });
      
      // Si c'est une conversation directe (ID commence par "direct_")
      if (conversationId.startsWith('direct_')) {
        const recipientId = conversationId.replace('direct_', '');
        console.log('Conversation directe détectée, recipient:', recipientId);
        
        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: senderId,
            recipient_id: recipientId,
            content,
            type: 'text',
            status: 'sent'
          } as any)
          .select()
          .single();

        if (error) {
          console.error('Erreur insert message direct:', error);
          throw error;
        }
        console.log('Message direct inséré:', data.id);
        await this.logAudit(senderId, 'message_sent', data.id);
        return data as any;
      }
      
      // Obtenir le destinataire pour conversation normale
      console.log('Récupération de la conversation:', conversationId);
      const conversation = await this.getConversationById(conversationId);
      const recipientId = conversation.participants.find((p: any) => p.user_id !== senderId)?.user_id || senderId;
      console.log('Recipient trouvé:', recipientId);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          type: 'text',
          status: 'sent'
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Erreur insert message conversation:', error);
        throw error;
      }
      console.log('Message conversation inséré:', data.id);
      await this.logAudit(senderId, 'message_sent', data.id);
      return data as any;
    } catch (error) {
      console.error('Erreur envoi message (catch global):', error);
      throw error;
    }
  }

  /**
   * Upload fichier et envoyer message
   */
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    file: File,
    type: 'image' | 'video' | 'file' | 'audio' = 'file'
  ): Promise<Message> {
    try {
      // Upload du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `communication/${conversationId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('communication-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('communication-files')
        .getPublicUrl(filePath);

      // Obtenir le destinataire
      let recipientId: string;
      
      if (conversationId.startsWith('direct_')) {
        // Conversation directe
        recipientId = conversationId.replace('direct_', '');
      } else {
        // Conversation normale
        const conversation = await this.getConversationById(conversationId);
        recipientId = conversation.participants.find((p: any) => p.user_id !== senderId)?.user_id || senderId;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId.startsWith('direct_') ? null : conversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          content: file.name,
          type,
          status: 'sent',
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        } as any)
        .select()
        .single();

      if (error) throw error;
      await this.logAudit(senderId, 'message_sent', data.id);
      return data as any;
    } catch (error) {
      console.error('Erreur envoi fichier:', error);
      throw error;
    }
  }

  /**
   * Marquer les messages comme lus
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      // Si c'est une conversation directe (ID commence par "direct_")
      if (conversationId.startsWith('direct_')) {
        const otherUserId = conversationId.replace('direct_', '');
        
        // Marquer comme lus les messages reçus de l'autre utilisateur
        const { error } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .is('conversation_id', null)
          .eq('sender_id', otherUserId)
          .eq('recipient_id', userId)
          .is('read_at', null);

        if (error) throw error;
      } else {
        // Conversation normale avec conversation_id
        const { error } = await supabase.rpc('mark_messages_as_read', {
          p_conversation_id: conversationId,
          p_user_id: userId
        });

        if (error) throw error;
      }

      // Audit log
      await this.logAudit(userId, 'message_read', conversationId);
    } catch (error) {
      console.error('Erreur marquage messages lus:', error);
      throw error;
    }
  }

  /**
   * Démarrer un appel
   */
  async startCall(
    callerId: string,
    receiverId: string,
    callType: 'audio' | 'video'
  ): Promise<Call> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .insert({
          caller_id: callerId,
          receiver_id: receiverId,
          call_type: callType,
          status: 'ringing'
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await this.logAudit(callerId, 'call_started', data.id);

      return data as any;
    } catch (error) {
      console.error('Erreur démarrage appel:', error);
      throw error;
    }
  }

  /**
   * Terminer un appel
   */
  async endCall(callId: string, duration: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('calls')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration
        })
        .eq('id', callId);

      if (error) throw error;

      // Audit log
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await this.logAudit(session.session.user.id, 'call_ended', callId);
      }
    } catch (error) {
      console.error('Erreur fin appel:', error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications non lues
   */
  async getUnreadNotifications(userId: string): Promise<CommunicationNotification[]> {
    try {
      const { data, error } = await supabase
        .from('communication_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('communication_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur marquage notification:', error);
      throw error;
    }
  }

  /**
   * Supprimer un message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      // Vérifier que l'utilisateur est l'auteur du message
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;
      if (message.sender_id !== userId) {
        throw new Error('Vous ne pouvez supprimer que vos propres messages');
      }

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      await this.logAudit(userId, 'message_deleted', messageId);
    } catch (error) {
      console.error('Erreur suppression message:', error);
      throw error;
    }
  }

  /**
   * Modifier un message
   */
  async editMessage(messageId: string, userId: string, newContent: string): Promise<void> {
    try {
      // Vérifier que l'utilisateur est l'auteur du message
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;
      if (message.sender_id !== userId) {
        throw new Error('Vous ne pouvez modifier que vos propres messages');
      }

      const { error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId);

      if (error) throw error;
      await this.logAudit(userId, 'message_edited', messageId);
    } catch (error) {
      console.error('Erreur modification message:', error);
      throw error;
    }
  }

  /**
   * Chercher des utilisateurs pour démarrer une conversation
   */
  async searchUsers(query: string): Promise<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return (data || []) as any;
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par ID (UUID)
   */
  async getUserById(userId: string): Promise<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }
      return data as any;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
  }

  /**
   * Récupérer un utilisateur par custom_id (format: 3 lettres + 4 chiffres)
   * Exemples: USR0001, VEN0001, PDG0001, DRV0001
   */
  async getUserByCustomId(customId: string): Promise<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  } | null> {
    try {
      // Rechercher dans user_ids pour trouver le user_id correspondant au custom_id
      const { data: userIdData, error: userIdError } = await supabase
        .from('user_ids')
        .select('user_id')
        .eq('custom_id', customId.toUpperCase())
        .single();

      if (userIdError) {
        if (userIdError.code === 'PGRST116') {
          return null;
        }
        throw userIdError;
      }

      if (!userIdData) return null;

      // Récupérer le profil complet de l'utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .eq('id', userIdData.user_id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          return null;
        }
        throw profileError;
      }

      return profileData as any;
    } catch (error) {
      console.error('Erreur récupération utilisateur par custom_id:', error);
      return null;
    }
  }

  /**
   * S'abonner aux nouveaux messages d'une conversation
   */
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Récupérer les détails complets du message
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey (
                first_name,
                last_name,
                email,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data);
          }
        }
      )
      .subscribe();
  }

  /**
   * S'abonner aux notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: CommunicationNotification) => void
  ) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as CommunicationNotification);
        }
      )
      .subscribe();
  }

  /**
   * Enregistrer un audit log
   */
  private async logAudit(
    userId: string,
    actionType: string,
    targetId?: string
  ): Promise<void> {
    try {
      await supabase.from('communication_audit_logs').insert({
        user_id: userId,
        action_type: actionType,
        target_id: targetId,
        metadata: {}
      });
    } catch (error) {
      console.error('Erreur audit log:', error);
    }
  }
}

export const universalCommunicationService = new UniversalCommunicationService();
