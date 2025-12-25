/**
 * 🎯 SERVICE DE COMMUNICATION UNIVERSEL - 224SOLUTIONS
 * Service professionnel pour la gestion des communications
 * Version: 2.0.0
 * 
 * Features:
 * - Gestion des conversations (création, récupération)
 * - Gestion des messages (texte, fichiers, audio, vidéo)
 * - Gestion des appels (audio, vidéo)
 * - Notifications et audit
 * - Recherche utilisateurs
 * - Subscriptions temps réel
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Message,
  Conversation,
  Call,
  CommunicationNotification,
  UserProfile,
  MessageType,
} from '@/types/communication.types';

// Re-export des types pour compatibilité
export type {
  Message,
  Conversation,
  Call,
  CommunicationNotification,
  UserProfile,
};

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_MESSAGE_LENGTH = 5000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const STORAGE_BUCKET = 'communication-files';

// ============================================================================
// HELPERS
// ============================================================================

function isDirectConversation(conversationId: string): boolean {
  return conversationId.startsWith('direct_');
}

function extractRecipientFromDirectId(conversationId: string): string {
  return conversationId.replace('direct_', '');
}

function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function getFileType(mimeType: string, fileName: string): MessageType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/') || fileName.startsWith('audio_')) return 'audio';
  return 'file';
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class UniversalCommunicationService {
  
  // ==========================================================================
  // CONVERSATIONS
  // ==========================================================================

  /**
   * Récupérer toutes les conversations de l'utilisateur
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    if (!validateUUID(userId)) {
      throw new Error('ID utilisateur invalide');
    }

    try {
      console.log('[Communication] Chargement conversations pour:', userId);

      // Récupérer les conversations avec conversation_id
      const { data: normalConvs, error: convError } = await supabase.rpc(
        'get_user_conversations',
        { p_user_id: userId }
      );

      if (convError) {
        console.error('[Communication] Erreur RPC get_user_conversations:', convError);
        throw convError;
      }

      // Récupérer les conversations directes (sans conversation_id)
      const { data: directConvs, error: directError } = await supabase.rpc(
        'get_user_direct_message_conversations',
        { p_user_id: userId }
      );

      if (directError) {
        console.error('[Communication] Erreur RPC get_user_direct_message_conversations:', directError);
        // Ne pas throw, continuer avec les conversations normales
      }

      // Fusionner et trier par date
      const allConversations = [
        ...(normalConvs || []),
        ...(directConvs || [])
      ].sort((a, b) => {
        const dateA = new Date(a.last_message_at || a.created_at);
        const dateB = new Date(b.last_message_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      console.log('[Communication] Conversations chargées:', allConversations.length);
      return allConversations as unknown as Conversation[];
    } catch (error) {
      console.error('[Communication] Erreur getConversations:', error);
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
    if (!validateUUID(creatorId)) {
      throw new Error('ID créateur invalide');
    }

    for (const id of participantIds) {
      if (!validateUUID(id)) {
        throw new Error(`ID participant invalide: ${id}`);
      }
    }

    try {
      console.log('[Communication] Création conversation:', { participantIds, creatorId, type });

      // Créer la conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type,
          name: name || null,
          creator_id: creatorId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) throw convError;

      // Ajouter les participants
      const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
      const participants = allParticipantIds.map((userId, index) => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: index === 0 ? 'admin' : 'member',
        joined_at: new Date().toISOString()
      }));

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) {
        // Rollback: supprimer la conversation
        await supabase.from('conversations').delete().eq('id', conversation.id);
        throw participantsError;
      }

      // Log audit
      await this.logAudit(creatorId, 'conversation_created', conversation.id);

      // Récupérer la conversation complète
      return await this.getConversationById(conversation.id);
    } catch (error) {
      console.error('[Communication] Erreur createConversation:', error);
      throw error;
    }
  }

  /**
   * Récupérer une conversation par ID
   */
  async getConversationById(conversationId: string): Promise<Conversation> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Non authentifié');
      }

      const conversations = await this.getConversations(session.session.user.id);
      const conversation = conversations.find(c => c.id === conversationId);

      if (!conversation) {
        throw new Error('Conversation non trouvée');
      }

      return conversation;
    } catch (error) {
      console.error('[Communication] Erreur getConversationById:', error);
      throw error;
    }
  }

  // ==========================================================================
  // MESSAGES
  // ==========================================================================

  /**
   * Récupérer les messages d'une conversation
   */
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    try {
      console.log('[Communication] Chargement messages pour:', conversationId);

      let query;

      if (isDirectConversation(conversationId)) {
        // Conversation directe
        const otherUserId = extractRecipientFromDirectId(conversationId);
        const { data: session } = await supabase.auth.getSession();
        
        if (!session?.session?.user) {
          throw new Error('Non authentifié');
        }

        const currentUserId = session.session.user.id;

        query = supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
              id, first_name, last_name, email, avatar_url
            )
          `)
          .is('conversation_id', null)
          .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
          .order('created_at', { ascending: false })
          .limit(limit);
      } else {
        // Conversation normale
        query = supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (
              id, first_name, last_name, email, avatar_url
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      const messages = (data || []).reverse();
      console.log('[Communication] Messages chargés:', messages.length);
      
      return messages as Message[];
    } catch (error) {
      console.error('[Communication] Erreur getMessages:', error);
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
    if (!content.trim()) {
      throw new Error('Le message ne peut pas être vide');
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères`);
    }

    try {
      console.log('[Communication] Envoi message texte:', { conversationId, senderId });

      let recipientId: string;
      let dbConversationId: string | null;

      if (isDirectConversation(conversationId)) {
        recipientId = extractRecipientFromDirectId(conversationId);
        dbConversationId = null;
      } else {
        const conversation = await this.getConversationById(conversationId);
        const recipient = conversation.participants.find(p => p.user_id !== senderId);
        recipientId = recipient?.user_id || senderId;
        dbConversationId = conversationId;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: dbConversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          topic: 'chat',
          extension: 'txt',
          type: 'text',
          status: 'sent',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAudit(senderId, 'message_sent', data.id);
      
      console.log('[Communication] Message envoyé:', data.id);
      return data as Message;
    } catch (error) {
      console.error('[Communication] Erreur sendTextMessage:', error);
      throw error;
    }
  }

  /**
   * Envoyer un fichier
   */
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    file: File,
    type?: 'image' | 'video' | 'file' | 'audio'
  ): Promise<Message> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Le fichier ne peut pas dépasser ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    try {
      console.log('[Communication] Envoi fichier:', { 
        conversationId, 
        senderId, 
        fileName: file.name,
        fileSize: file.size 
      });

      // Déterminer le type de fichier
      const fileType = type || getFileType(file.type, file.name);

      // Upload du fichier
      const fileExt = file.name.split('.').pop() || 'bin';
      const fileName = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
      const filePath = `communication/${conversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        console.error('[Communication] Erreur upload:', uploadError);
        throw new Error(`Échec upload: ${uploadError.message}`);
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Déterminer le destinataire
      let recipientId: string;
      let dbConversationId: string | null;

      if (isDirectConversation(conversationId)) {
        recipientId = extractRecipientFromDirectId(conversationId);
        dbConversationId = null;
      } else {
        const conversation = await this.getConversationById(conversationId);
        const recipient = conversation.participants.find(p => p.user_id !== senderId);
        recipientId = recipient?.user_id || senderId;
        dbConversationId = conversationId;
      }

      // Créer le message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content: file.name,
          topic: 'chat',
          extension: fileExt,
          type: fileType,
          status: 'sent',
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size
        } as any)
        .select()
        .single();

      if (error) throw error;

      await this.logAudit(senderId, 'message_sent', data.id);
      
      console.log('[Communication] Fichier envoyé:', data.id);
      return data as Message;
    } catch (error) {
      console.error('[Communication] Erreur sendFileMessage:', error);
      throw error;
    }
  }

  /**
   * Marquer les messages comme lus
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      if (isDirectConversation(conversationId)) {
        const otherUserId = extractRecipientFromDirectId(conversationId);

        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .is('conversation_id', null)
          .eq('sender_id', otherUserId)
          .eq('recipient_id', userId)
          .is('read_at', null);
      } else {
        await supabase.rpc('mark_messages_as_read', {
          p_conversation_id: conversationId,
          p_user_id: userId
        });
      }

      await this.logAudit(userId, 'message_read', conversationId);
    } catch (error) {
      console.error('[Communication] Erreur markMessagesAsRead:', error);
      throw error;
    }
  }

  /**
   * Supprimer un message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      // Vérifier l'auteur
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
      console.error('[Communication] Erreur deleteMessage:', error);
      throw error;
    }
  }

  /**
   * Modifier un message
   */
  async editMessage(messageId: string, userId: string, newContent: string): Promise<void> {
    if (!newContent.trim()) {
      throw new Error('Le message ne peut pas être vide');
    }

    try {
      // Vérifier l'auteur
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
        .update({ 
          content: newContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      
      await this.logAudit(userId, 'message_edited', messageId);
    } catch (error) {
      console.error('[Communication] Erreur editMessage:', error);
      throw error;
    }
  }

  // ==========================================================================
  // CALLS
  // ==========================================================================

  /**
   * Démarrer un appel
   */
  async startCall(
    callerId: string,
    receiverId: string,
    callType: 'audio' | 'video'
  ): Promise<Call> {
    if (!validateUUID(callerId) || !validateUUID(receiverId)) {
      throw new Error('IDs invalides');
    }

    try {
      // Générer un channel unique pour Agora
      const agoraChannel = `call_${callerId.substring(0, 8)}_${receiverId.substring(0, 8)}_${Date.now()}`;
      
      console.log('[Communication] Création appel avec channel Agora:', agoraChannel);

      const { data, error } = await supabase
        .from('calls')
        .insert({
          caller_id: callerId,
          receiver_id: receiverId,
          call_type: callType,
          status: 'ringing',
          started_at: new Date().toISOString(),
          metadata: {
            agora_channel: agoraChannel,
            initiated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Ajouter le channel au résultat
      const callWithChannel = {
        ...data,
        agora_channel: agoraChannel
      };

      await this.logAudit(callerId, 'call_started', data.id);
      console.log('[Communication] Appel créé:', callWithChannel);
      
      return callWithChannel as Call;
    } catch (error) {
      console.error('[Communication] Erreur startCall:', error);
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

      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await this.logAudit(session.session.user.id, 'call_ended', callId);
      }
    } catch (error) {
      console.error('[Communication] Erreur endCall:', error);
      throw error;
    }
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

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
      return (data || []) as CommunicationNotification[];
    } catch (error) {
      console.error('[Communication] Erreur getUnreadNotifications:', error);
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
      console.error('[Communication] Erreur markNotificationAsRead:', error);
      throw error;
    }
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(query: string): Promise<UserProfile[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, public_id')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return (data || []) as UserProfile[];
    } catch (error) {
      console.error('[Communication] Erreur searchUsers:', error);
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par UUID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    if (!validateUUID(userId)) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, public_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Communication] Erreur getUserById:', error);
        return null;
      }

      return data as UserProfile | null;
    } catch (error) {
      console.error('[Communication] Erreur getUserById:', error);
      return null;
    }
  }

  /**
   * Récupérer un utilisateur par ID personnalisé
   */
  async getUserByCustomId(customId: string): Promise<UserProfile | null> {
    const normalizedId = customId.toUpperCase().trim();
    console.log('[Communication] Recherche utilisateur par custom ID:', normalizedId);

    try {
      // Format: 3 lettres + 4 chiffres (USR0001, VEN0001, etc.)
      const customIdRegex = /^[A-Z]{3}\d{4}$/;
      if (customIdRegex.test(normalizedId)) {
        // Chercher dans user_ids
        const { data: userIdData } = await supabase
          .from('user_ids')
          .select('user_id')
          .eq('custom_id', normalizedId)
          .maybeSingle();

        if (userIdData?.user_id) {
          return await this.getUserById(userIdData.user_id);
        }

        // Fallback: profiles.public_id
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url, public_id')
          .eq('public_id', normalizedId)
          .maybeSingle();

        if (profileData) {
          return profileData as UserProfile;
        }
      }

      // Format: 224-XXX-XXX
      const publicIdRegex = /^224-[A-Z]{3}-\d{3}$/;
      if (publicIdRegex.test(normalizedId)) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url, public_id')
          .eq('public_id', normalizedId)
          .maybeSingle();

        if (profileData) {
          return profileData as UserProfile;
        }
      }

      console.log('[Communication] Utilisateur non trouvé pour ID:', normalizedId);
      return null;
    } catch (error) {
      console.error('[Communication] Erreur getUserByCustomId:', error);
      return null;
    }
  }

  // ==========================================================================
  // SUBSCRIPTIONS
  // ==========================================================================

  /**
   * S'abonner aux nouveaux messages d'une conversation
   */
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    console.log('[Communication] Subscription messages:', conversationId);

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
          // Récupérer le message complet avec le profil
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey (
                id, first_name, last_name, email, avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(data as Message);
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
    console.log('[Communication] Subscription notifications:', userId);

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

  // ==========================================================================
  // AUDIT
  // ==========================================================================

  /**
   * Enregistrer un log d'audit
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
        metadata: {},
        created_at: new Date().toISOString()
      });
    } catch (error) {
      // Ne pas faire échouer l'opération principale
      console.warn('[Communication] Échec audit log:', error);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const universalCommunicationService = new UniversalCommunicationService();
