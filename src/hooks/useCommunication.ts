/**
 * 🎣 HOOKS COMMUNICATION - 224SOLUTIONS
 * Hooks React optimisés pour la gestion des communications
 * Intégration Agora + Supabase + React Query
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import communicationService, { 
  Conversation, 
  Message, 
  Call, 
  UserPresence 
} from '@/services/communicationService';
import agoraService, { MessageData } from '@/services/agoraService';
import { toast } from 'sonner';

// =====================================================
// HOOK PRINCIPAL COMMUNICATION
// =====================================================

export function useCommunication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);

  // Initialisation du service Agora
  useEffect(() => {
    if (user && !isInitialized) {
      initializeCommunication();
    }
  }, [user, isInitialized]);

  const initializeCommunication = useCallback(async () => {
    if (!user) return;

    try {
      // Mettre à jour la présence
      await communicationService.updatePresence(user.id, 'online');
      
      setIsInitialized(true);
      console.log('✅ Communication initialisée');
    } catch (error) {
      console.error('❌ Erreur initialisation communication:', error);
      toast.error('Erreur d\'initialisation de la communication');
    }
  }, [user]);

  // Nettoyage à la déconnexion
  useEffect(() => {
    return () => {
      if (user) {
        communicationService.updatePresence(user.id, 'offline');
        agoraService.cleanup();
      }
    };
  }, [user]);

  return {
    isInitialized,
    currentConversation,
    setCurrentConversation,
    isInCall,
    setIsInCall,
    currentCall,
    setCurrentCall
  };
}

// =====================================================
// HOOK CONVERSATIONS
// =====================================================

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les conversations
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => user ? communicationService.getUserConversations(user.id) : [],
    enabled: !!user,
    refetchInterval: 30000, // Actualiser toutes les 30 secondes
  });

  // Créer une conversation privée
  const createPrivateConversation = useMutation({
    mutationFn: ({ targetUserId }: { targetUserId: string }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      return communicationService.createOrGetPrivateConversation(user.id, targetUserId);
    },
    onSuccess: (conversation) => {
      if (conversation) {
        queryClient.setQueryData(['conversations', user?.id], (old: Conversation[] = []) => {
          const exists = old.find(c => c.id === conversation.id);
          return exists ? old : [conversation, ...old];
        });
        toast.success('Conversation créée');
      }
    },
    onError: (error) => {
      console.error('❌ Erreur création conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
    }
  });

  // Créer un groupe
  const createGroup = useMutation({
    mutationFn: ({ 
      name, 
      description, 
      participantIds 
    }: { 
      name: string; 
      description?: string; 
      participantIds: string[] 
    }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      return communicationService.createGroupConversation(
        user.id, 
        name, 
        description, 
        participantIds
      );
    },
    onSuccess: (conversation) => {
      if (conversation) {
        queryClient.setQueryData(['conversations', user?.id], (old: Conversation[] = []) => 
          [conversation, ...old]
        );
        toast.success('Groupe créé avec succès');
      }
    },
    onError: (error) => {
      console.error('❌ Erreur création groupe:', error);
      toast.error('Erreur lors de la création du groupe');
    }
  });

  return {
    conversations,
    isLoading,
    error,
    refetch,
    createPrivateConversation: createPrivateConversation.mutate,
    createGroup: createGroup.mutate,
    isCreatingConversation: createPrivateConversation.isPending,
    isCreatingGroup: createGroup.isPending
  };
}

// =====================================================
// HOOK MESSAGES
// =====================================================

export function useMessages(conversationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessages, setNewMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);

  // Récupérer les messages
  const {
    data: messages = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationId ? communicationService.getConversationMessages(conversationId) : [],
    enabled: !!conversationId,
    refetchInterval: 10000, // Actualiser toutes les 10 secondes
  });

  // Combiner messages existants et nouveaux
  const allMessages = [...messages, ...newMessages];
  messagesRef.current = allMessages;

  // Écouter les nouveaux messages via Agora
  useEffect(() => {
    if (!conversationId) return;

    const handleNewMessage = (messageData: MessageData) => {
      // Éviter les doublons
      const exists = messagesRef.current.find(m => m.id === messageData.id);
      if (exists) return;

      const newMessage: Message = {
        id: messageData.id,
        conversation_id: conversationId,
        sender_id: messageData.senderId,
        type: messageData.type as any,
        content: messageData.content,
        status: 'delivered',
        created_at: new Date(messageData.timestamp).toISOString(),
        updated_at: new Date(messageData.timestamp).toISOString(),
        metadata: messageData.metadata
      };

      setNewMessages(prev => [...prev, newMessage]);
      
      // Marquer comme lu si c'est notre conversation active
      if (user && messageData.senderId !== user.id) {
        communicationService.markMessageAsRead(messageData.id, user.id);
      }
    };

    agoraService.onMessage(handleNewMessage);

    return () => {
      // Nettoyer les callbacks (Agora service gère déjà cela)
    };
  }, [conversationId, user]);

  // Envoyer un message texte
  const sendMessage = useMutation({
    mutationFn: ({ content, replyTo }: { content: string; replyTo?: string }) => {
      if (!user || !conversationId) throw new Error('Paramètres manquants');
      return communicationService.sendTextMessage(conversationId, user.id, content, replyTo);
    },
    onSuccess: (message) => {
      if (message) {
        setNewMessages(prev => [...prev, message]);
      }
    },
    onError: (error) => {
      console.error('❌ Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  });

  // Envoyer un fichier
  const sendFile = useMutation({
    mutationFn: ({ file, type }: { file: File; type?: 'image' | 'video' | 'audio' | 'file' }) => {
      if (!user || !conversationId) throw new Error('Paramètres manquants');
      return communicationService.sendFileMessage(conversationId, user.id, file, type);
    },
    onSuccess: (message) => {
      if (message) {
        setNewMessages(prev => [...prev, message]);
      }
    },
    onError: (error) => {
      console.error('❌ Erreur envoi fichier:', error);
      toast.error('Erreur lors de l\'envoi du fichier');
    }
  });

  // Envoyer une localisation
  const sendLocation = useMutation({
    mutationFn: ({ 
      latitude, 
      longitude, 
      locationName 
    }: { 
      latitude: number; 
      longitude: number; 
      locationName?: string 
    }) => {
      if (!user || !conversationId) throw new Error('Paramètres manquants');
      return communicationService.sendLocationMessage(
        conversationId, 
        user.id, 
        latitude, 
        longitude, 
        locationName
      );
    },
    onSuccess: (message) => {
      if (message) {
        setNewMessages(prev => [...prev, message]);
      }
    },
    onError: (error) => {
      console.error('❌ Erreur envoi localisation:', error);
      toast.error('Erreur lors du partage de position');
    }
  });

  return {
    messages: allMessages,
    isLoading,
    error,
    refetch,
    sendMessage: sendMessage.mutate,
    sendFile: sendFile.mutate,
    sendLocation: sendLocation.mutate,
    isSending: sendMessage.isPending || sendFile.isPending || sendLocation.isPending
  };
}

// =====================================================
// HOOK APPELS
// =====================================================

export function useCalls() {
  const { user } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Initier un appel
  const initiateCall = useMutation({
    mutationFn: async ({ 
      conversationId, 
      calleeId, 
      type 
    }: { 
      conversationId: string; 
      calleeId: string; 
      type: 'audio' | 'video' 
    }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      
      const call = await communicationService.initiateCall(
        conversationId, 
        user.id, 
        calleeId, 
        type
      );
      
      if (!call) throw new Error('Échec création appel');

      // Initialiser Agora pour l'appel
      const tokens = await agoraService.getTokens(call.channel_name, user.id);
      await agoraService.initializeRTC(tokens);
      await agoraService.joinCall({
        channelName: call.channel_name,
        isVideo: type === 'video',
        userId: user.id
      });

      return call;
    },
    onSuccess: (call) => {
      setCurrentCall(call);
      setIsInCall(true);
      setCallStatus('calling');
      toast.success('Appel initié');
    },
    onError: (error) => {
      console.error('❌ Erreur initiation appel:', error);
      toast.error('Erreur lors de l\'initiation de l\'appel');
    }
  });

  // Répondre à un appel
  const answerCall = useCallback(async (call: Call) => {
    try {
      if (!user) throw new Error('Utilisateur non connecté');

      // Mettre à jour le statut de l'appel
      await communicationService.updateCallStatus(call.id, 'answered');

      // Rejoindre l'appel Agora
      const tokens = await agoraService.getTokens(call.channel_name, user.id);
      await agoraService.initializeRTC(tokens);
      await agoraService.joinCall({
        channelName: call.channel_name,
        isVideo: call.type === 'video',
        userId: user.id
      });

      setCurrentCall(call);
      setIsInCall(true);
      setCallStatus('connected');
      toast.success('Appel accepté');
    } catch (error) {
      console.error('❌ Erreur réponse appel:', error);
      toast.error('Erreur lors de la réponse à l\'appel');
    }
  }, [user]);

  // Terminer un appel
  const endCall = useCallback(async (reason: string = 'normal') => {
    try {
      if (currentCall) {
        await communicationService.updateCallStatus(currentCall.id, 'ended', reason);
      }

      await agoraService.leaveRTCCall();
      
      setCurrentCall(null);
      setIsInCall(false);
      setCallStatus('idle');
      setIsMuted(false);
      setIsVideoEnabled(true);
      
      toast.success('Appel terminé');
    } catch (error) {
      console.error('❌ Erreur fin appel:', error);
      toast.error('Erreur lors de la fin de l\'appel');
    }
  }, [currentCall]);

  // Basculer le microphone
  const toggleMicrophone = useCallback(async () => {
    try {
      const newMutedState = await agoraService.toggleMicrophone();
      setIsMuted(newMutedState);
    } catch (error) {
      console.error('❌ Erreur toggle microphone:', error);
    }
  }, []);

  // Basculer la caméra
  const toggleCamera = useCallback(async () => {
    try {
      const newVideoState = await agoraService.toggleCamera();
      setIsVideoEnabled(newVideoState);
    } catch (error) {
      console.error('❌ Erreur toggle caméra:', error);
    }
  }, []);

  return {
    isInCall,
    currentCall,
    callStatus,
    isMuted,
    isVideoEnabled,
    initiateCall: initiateCall.mutate,
    answerCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    isInitiatingCall: initiateCall.isPending
  };
}

// =====================================================
// HOOK PRÉSENCE UTILISATEUR
// =====================================================

export function useUserPresence(userIds: string[] = []) {
  const { user } = useAuth();
  const [presenceData, setPresenceData] = useState<UserPresence[]>([]);

  // Récupérer la présence des utilisateurs
  const {
    data: presence = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['presence', userIds],
    queryFn: () => communicationService.getUsersPresence(userIds),
    enabled: userIds.length > 0,
    refetchInterval: 15000, // Actualiser toutes les 15 secondes
  });

  // Mettre à jour notre propre présence
  const updateMyPresence = useCallback(async (
    status: UserPresence['status'], 
    customStatus?: string
  ) => {
    if (!user) return;
    
    try {
      await communicationService.updatePresence(user.id, status, customStatus);
      refetch();
    } catch (error) {
      console.error('❌ Erreur mise à jour présence:', error);
    }
  }, [user, refetch]);

  // Écouter les changements de présence via Agora
  useEffect(() => {
    const handlePresenceChange = (presenceUpdate: any) => {
      setPresenceData(prev => {
        const updated = [...prev];
        const index = updated.findIndex(p => p.user_id === presenceUpdate.userId);
        
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            status: presenceUpdate.status,
            updated_at: new Date().toISOString()
          };
        } else {
          updated.push({
            user_id: presenceUpdate.userId,
            status: presenceUpdate.status,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        return updated;
      });
    };

    agoraService.onPresenceChange(handlePresenceChange);
  }, []);

  return {
    presence: [...presence, ...presenceData],
    isLoading,
    updateMyPresence,
    refetch
  };
}

// =====================================================
// HOOK RECHERCHE UTILISATEURS
// =====================================================

export function useUserSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await communicationService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Erreur recherche utilisateurs:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching
  };
}
