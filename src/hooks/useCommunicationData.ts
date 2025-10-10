/**
 * HOOK DONNÉES COMMUNICATION - DONNÉES RÉELLES
 * Gestion des données réelles pour la messagerie
 * 224Solutions - Communication Opérationnelle
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: 'online' | 'busy' | 'offline';
  avatar?: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  type: 'text' | 'image' | 'file' | 'voice';
  status: 'sent' | 'delivered' | 'read';
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'online' | 'busy' | 'offline';
  avatar?: string;
  lastSeen?: string;
}

export function useCommunicationData() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les conversations depuis Supabase
  const loadConversations = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          last_message,
          updated_at,
          unread_count,
          participants!inner(
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

      if (conversationsError) {
        console.error('❌ Erreur chargement conversations:', conversationsError);
        throw conversationsError;
      }

      const formattedConversations: Conversation[] = conversationsData?.map(conv => ({
        id: conv.id,
        name: conv.name || 'Conversation',
        lastMessage: conv.last_message || 'Aucun message',
        timestamp: new Date(conv.updated_at).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        unreadCount: conv.unread_count || 0,
        status: (conv.participants?.[0] as any)?.profiles?.status || 'offline',
        avatar: (conv.participants?.[0] as any)?.profiles?.avatar_url
      })) || [];

      setConversations(formattedConversations);
    } catch (error) {
      console.error('❌ Erreur chargement conversations:', error);
      setError('Erreur lors du chargement des conversations');
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les messages d'une conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          type,
          status,
          created_at,
          sender_id,
          profiles!inner(
            first_name,
            last_name
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Erreur chargement messages:', messagesError);
        throw messagesError;
      }

      const formattedMessages: Message[] = messagesData?.map(msg => {
        const profile = (msg.profiles as any);
        return {
          id: msg.id,
          sender: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Utilisateur',
          content: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          isOwn: false, // TODO: Vérifier si c'est l'utilisateur actuel
          type: msg.type || 'text',
          status: msg.status || 'sent'
        };
      }) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      setError('Erreur lors du chargement des messages');
    }
  }, []);

  // Charger les contacts
  const loadContacts = useCallback(async (userId: string) => {
    try {
      const { data: contactsData, error: contactsError } = await supabase
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

      if (contactsError) {
        console.error('❌ Erreur chargement contacts:', contactsError);
        throw contactsError;
      }

      const formattedContacts: Contact[] = contactsData?.map(contact => ({
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email,
        phone: contact.phone,
        status: contact.status || 'offline',
        avatar: contact.avatar_url,
        lastSeen: new Date(contact.updated_at).toLocaleString('fr-FR')
      })) || [];

      setContacts(formattedContacts);
    } catch (error) {
      console.error('❌ Erreur chargement contacts:', error);
      setError('Erreur lors du chargement des contacts');
    }
  }, []);

  // Envoyer un message
  const sendMessage = useCallback(async (conversationId: string, content: string, senderId: string) => {
    try {
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content,
          type: 'text',
          status: 'sent'
        })
        .select()
        .single();

      if (messageError) {
        throw messageError;
      }

      // Recharger les messages
      await loadMessages(conversationId);

      toast.success('Message envoyé');
      return messageData;
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  }, [loadMessages]);

  // Créer une nouvelle conversation
  const createConversation = useCallback(async (participantIds: string[], name?: string) => {
    try {
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          name: name || 'Nouvelle conversation',
          participants: participantIds.map(id => ({ user_id: id }))
        })
        .select()
        .single();

      if (conversationError) {
        throw conversationError;
      }

      toast.success('Conversation créée');
      return conversationData;
    } catch (error) {
      console.error('❌ Erreur création conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
    }
  }, []);

  // Marquer les messages comme lus
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) {
        throw error;
      }

      // Recharger les conversations
      // await loadConversations(userId);
    } catch (error) {
      console.error('❌ Erreur marquage lu:', error);
    }
  }, []);

  // Charger toutes les données
  const loadAllData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadConversations(userId),
        loadContacts(userId)
      ]);

      console.log('✅ Données communication chargées avec succès');
    } catch (error) {
      console.error('❌ Erreur chargement données communication:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [loadConversations, loadContacts]);

  // Charger les données au montage
  useEffect(() => {
    // loadAllData sera appelé avec l'userId depuis le composant parent
  }, []);

  /**
   * Rechercher des utilisateurs
   */
  const searchUsers = useCallback(async (query: string) => {
    try {
      setLoading(true);
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
        .limit(10);

      if (error) throw error;

      const searchResults = data?.map(profile => ({
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
        status: profile.status || 'offline',
        avatar_url: profile.avatar_url,
        last_seen: profile.updated_at
      })) || [];

      return searchResults;
    } catch (error) {
      console.error('❌ Erreur recherche utilisateurs:', error);
      setError('Erreur lors de la recherche');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Ajouter un contact
   */
  const addContact = useCallback(async (contactId: string) => {
    try {
      // Get current user from auth
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('contacts')
        .insert({
          user_id: currentUser.id,
          contact_id: contactId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erreur ajout contact:', error);
      throw error;
    }
  }, []);

  return {
    conversations,
    messages,
    contacts,
    activeConversation,
    loading,
    error,
    loadConversations,
    loadMessages,
    loadContacts,
    sendMessage,
    createConversation,
    markAsRead,
    setActiveConversation,
    loadAllData,
    refetch: loadAllData,
    searchUsers,
    addContact
  };
}
