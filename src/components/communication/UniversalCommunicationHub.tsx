/**
 * Hub de Communication Universel pour 224SOLUTIONS
 * Composant réutilisable pour toutes les interfaces
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  MessageSquare,
  Phone,
  Video,
  Search,
  Bell,
  Users,
  Hash,
  UserPlus,
} from 'lucide-react';
import {
  universalCommunicationService,
  type Conversation,
  type Message,
  type CommunicationNotification
} from '@/services/UniversalCommunicationService';
import AgoraVideoCall from './AgoraVideoCall';
import AgoraAudioCall from './AgoraAudioCall';
import ImprovedMessageInput from './ImprovedMessageInput';
import MessageItem from './MessageItem';
import ContactUserById from './ContactUserById';
import type { UserProfile } from '@/types/communication.types';

interface UniversalCommunicationHubProps {
  className?: string;
  selectedConversationId?: string | null;
  refreshTrigger?: number;
}

export default function UniversalCommunicationHub({ 
  className,
  selectedConversationId,
  refreshTrigger 
}: UniversalCommunicationHubProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSearchById, setShowSearchById] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userIdSearch, setUserIdSearch] = useState('');
  const [notifications, setNotifications] = useState<CommunicationNotification[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les conversations
  useEffect(() => {
    if (user?.id) {
      loadConversations();
      loadNotifications();
    }
  }, [user, refreshTrigger]);

  // Sélectionner automatiquement une conversation
  useEffect(() => {
    if (selectedConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === selectedConversationId);
      if (conv) {
        handleSelectConversation(conv);
      }
    }
  }, [selectedConversationId, conversations]);

  // S'abonner aux notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = universalCommunicationService.subscribeToNotifications(
      user.id,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        
        // Toast notification
        toast({
          title: notification.title,
          description: notification.body
        });

        // Son de notification
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // S'abonner aux messages de la conversation active
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = universalCommunicationService.subscribeToMessages(
      selectedConversation.id,
      (message) => {
        setMessages(prev => [...prev, message]);
        scrollToBottom();

        // Marquer comme lu si ce n'est pas notre message
        if (message.sender_id !== user?.id) {
          universalCommunicationService.markMessagesAsRead(
            selectedConversation.id,
            user!.id
          );
        }
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [selectedConversation, user]);

  const loadConversations = async () => {
    try {
      if (!user?.id) return;
      const data = await universalCommunicationService.getConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await universalCommunicationService.getMessages(conversationId);
      setMessages(data);
      scrollToBottom();

      // Marquer comme lu
      if (user?.id) {
        await universalCommunicationService.markMessagesAsRead(conversationId, user.id);
        loadConversations(); // Rafraîchir pour mettre à jour les compteurs
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      if (!user?.id) return;
      const data = await universalCommunicationService.getUnreadNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  // Sélectionner automatiquement une conversation
  useEffect(() => {
    if (selectedConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === selectedConversationId);
      if (conv) {
        handleSelectConversation(conv);
      }
    }
  }, [selectedConversationId, conversations]);

  const handleSendMessage = async (message: string, attachments?: File[]) => {
    if (!selectedConversation || !user?.id) {
      console.error('Conversation ou utilisateur non défini', { selectedConversation, userId: user?.id });
      return;
    }
    if (!message.trim() && (!attachments || attachments.length === 0)) {
      console.log('Message vide sans pièces jointes');
      return;
    }

    try {
      console.log('Envoi message:', { message, attachments, conversationId: selectedConversation.id });
      
      // Envoyer les pièces jointes
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          // Déterminer le type de fichier
          let fileType: 'image' | 'video' | 'file' | 'audio' = 'file';
          
          if (file.type.startsWith('image/')) {
            fileType = 'image';
          } else if (file.type.startsWith('video/')) {
            fileType = 'video';
          } else if (file.type.startsWith('audio/') || file.name.startsWith('audio_')) {
            // Les enregistrements vocaux et fichiers audio utilisent le type "audio"
            fileType = 'audio';
          }

          console.log('Envoi fichier:', { fileName: file.name, fileType, fileSize: file.size });
          await universalCommunicationService.sendFileMessage(
            selectedConversation.id,
            user.id,
            file,
            fileType
          );
        }
      }

      // Envoyer le message texte si présent
      if (message.trim()) {
        console.log('Envoi message texte:', message);
        await universalCommunicationService.sendTextMessage(
          selectedConversation.id,
          user.id,
          message
        );
      }
      
      console.log('Message envoyé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;

    try {
      await universalCommunicationService.deleteMessage(messageId, user.id);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le message',
        variant: 'destructive'
      });
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!user?.id) return;

    try {
      await universalCommunicationService.editMessage(messageId, user.id, newContent);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, content: newContent } : m
      ));
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le message',
        variant: 'destructive'
      });
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation || !user?.id) return;

    const otherParticipant = selectedConversation.participants.find(
      p => p.user_id !== user.id
    );

    if (!otherParticipant) return;

    try {
      const call = await universalCommunicationService.startCall(
        user.id,
        otherParticipant.user_id,
        type
      );

      setActiveCall(call);
      setCallType(type);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de démarrer l\'appel',
        variant: 'destructive'
      });
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;

    const duration = Math.floor(
      (Date.now() - new Date(activeCall.started_at).getTime()) / 1000
    );

    await universalCommunicationService.endCall(activeCall.id, duration);
    setActiveCall(null);
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await universalCommunicationService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const handleSearchById = async () => {
    const customId = userIdSearch.trim().toUpperCase();
    
    if (!customId) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un ID utilisateur",
        variant: "destructive"
      });
      return;
    }

    // Validation du format: 3 lettres + 4 chiffres (ex: USR0001, VEN0001, PDG0001)
    const customIdRegex = /^[A-Z]{3}\d{4}$/;
    if (!customIdRegex.test(customId)) {
      toast({
        title: "Format invalide",
        description: "L'ID doit être au format 3 lettres + 4 chiffres (ex: USR0001, VEN0001)",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Rechercher l'utilisateur par custom_id
      const profile = await universalCommunicationService.getUserByCustomId(customId);
      
      if (!profile) {
        toast({
          title: "Utilisateur introuvable",
          description: `Aucun utilisateur ne correspond à l'ID ${customId}`,
          variant: "destructive"
        });
        return;
      }

      // Vérifier qu'on ne s'ajoute pas soi-même
      if (profile.id === user?.id) {
        toast({
          title: "Erreur",
          description: "Vous ne pouvez pas créer une conversation avec vous-même",
          variant: "destructive"
        });
        return;
      }
      
      // Créer une conversation directe avec le user_id (UUID) récupéré
      await handleCreateConversation(profile.id);
      setShowNewConversation(false);
      setUserIdSearch('');
      
      toast({
        title: "Succès",
        description: `Conversation créée avec ${profile.first_name} ${profile.last_name}`,
      });
    } catch (error) {
      console.error('Erreur recherche par ID:', error);
      toast({
        title: "Erreur",
        description: "Impossible de contacter cet utilisateur. Vérifiez l'ID et réessayez.",
        variant: "destructive"
      });
    }
  };

  const handleCreateConversation = async (participantId: string) => {
    if (!user?.id) return;

    try {
      const conversation = await universalCommunicationService.createConversation(
        [user.id, participantId],
        user.id
      );

      setConversations(prev => [conversation, ...prev]);
      setSelectedConversation(conversation);
      setShowNewConversation(false);
      setSearchQuery('');
      setSearchResults([]);

      toast({
        title: 'Conversation créée',
        description: 'Vous pouvez maintenant discuter'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la conversation',
        variant: 'destructive'
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.user_id !== user?.id);
  };

  const unreadCount = notifications.length;

  // Gérer la sélection d'un utilisateur depuis la recherche par ID
  const handleUserSelectedById = async (selectedUser: UserProfile) => {
    try {
      // Créer ou ouvrir conversation directe
      const directConvId = `direct_${selectedUser.id}`;
      
      // Vérifier si conversation existe déjà
      const existingConv = conversations.find(c => c.id === directConvId);
      
      if (existingConv) {
        setSelectedConversation(existingConv);
        loadMessages(existingConv.id);
      } else {
        // Créer une nouvelle conversation directe
        const newConv: Conversation = {
          id: directConvId,
          type: 'private',
          creator_id: user?.id || '',
          unread_count: 0,
          participants: [
            { user_id: user?.id || '', conversation_id: directConvId },
            { user_id: selectedUser.id, conversation_id: directConvId, user: selectedUser }
          ],
          created_at: new Date().toISOString()
        };
        
        setConversations(prev => [newConv, ...prev]);
        setSelectedConversation(newConv);
      }
      
      setShowSearchById(false);
      
      toast({
        title: 'Conversation ouverte',
        description: `Avec ${selectedUser.first_name} ${selectedUser.last_name}`
      });
    } catch (error) {
      console.error('Erreur ouverture conversation:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span>Communication</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearchById(true)}
              title="Rechercher par ID"
            >
              <Hash className="h-4 w-4 mr-2" />
              Ajouter par ID
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewConversation(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
            <Badge variant={unreadCount > 0 ? 'default' : 'secondary'}>
              <Bell className="h-3 w-3 mr-1" />
              {unreadCount}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-4">
            <div className="grid grid-cols-3 gap-4 h-[600px]">
              {/* Liste des conversations */}
              <ScrollArea className="col-span-1 border rounded-lg p-2">
                {conversations.map((conversation) => {
                  const other = getOtherParticipant(conversation);
                  return (
                    <div
                      key={conversation.id}
                      className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={other?.avatar_url} />
                          <AvatarFallback>
                            {other?.first_name?.[0]}{other?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {other?.first_name} {other?.last_name}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          {conversation.last_message_preview && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.last_message_preview}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {conversations.length === 0 && (
                  <div className="text-center text-muted-foreground p-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune conversation</p>
                    <p className="text-sm">Démarrez une nouvelle conversation</p>
                  </div>
                )}
              </ScrollArea>

              {/* Messages */}
              <div className="col-span-2 border rounded-lg flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Header conversation */}
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={getOtherParticipant(selectedConversation)?.avatar_url} />
                          <AvatarFallback>
                            {getOtherParticipant(selectedConversation)?.first_name?.[0]}
                            {getOtherParticipant(selectedConversation)?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {getOtherParticipant(selectedConversation)?.first_name}{' '}
                            {getOtherParticipant(selectedConversation)?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getOtherParticipant(selectedConversation)?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleStartCall('audio')}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleStartCall('video')}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full p-4">
                        <div className="space-y-4">
                          {messages.map((message) => {
                          const isOwn = message.sender_id === user?.id;
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          
                          // Préparer les pièces jointes avec le bon type
                          let attachments: { type: string; url: string; name: string }[] | undefined;
                          if (message.file_url) {
                            let displayType = message.type;
                            // Normaliser le type pour l'affichage
                            if (message.type === 'audio') {
                              displayType = 'audio/webm';
                            }
                            attachments = [{
                              type: displayType,
                              url: message.file_url,
                              name: message.file_name || message.content
                            }];
                          }
                          
                          return (
                            <MessageItem
                              key={message.id}
                              message={{
                                id: message.id,
                                content: message.content,
                                timestamp: new Date(message.created_at).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }),
                                isOwn,
                                senderName: isOwn ? undefined : `${otherParticipant?.first_name} ${otherParticipant?.last_name}`,
                                attachments
                              }}
                              onDelete={handleDeleteMessage}
                              onEdit={handleEditMessage}
                            />
                          );
                          })}
                        </div>
                        <div ref={messagesEndRef} />
                      </ScrollArea>
                    </div>

                    {/* Input message */}
                    <div className="p-4 border-t">
                      <ImprovedMessageInput
                        onSendMessage={handleSendMessage}
                        placeholder="Tapez votre message..."
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez une conversation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <ScrollArea className="h-[600px]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 mb-2 border rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => {
                    universalCommunicationService.markNotificationAsRead(notification.id);
                    setNotifications(prev => prev.filter(n => n.id !== notification.id));
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-primary mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center text-muted-foreground p-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune notification</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Dialog nouvelle conversation */}
        <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle conversation</DialogTitle>
              <DialogDescription>
                Recherchez un utilisateur par nom ou ID pour démarrer une conversation
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search">Rechercher par nom</TabsTrigger>
                <TabsTrigger value="id">Rechercher par ID</TabsTrigger>
              </TabsList>
              
              <TabsContent value="search" className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Search className="h-5 w-5 mt-2" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearchUsers(e.target.value);
                    }}
                  />
                </div>
                <ScrollArea className="h-[300px]">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 mb-2 border rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => handleCreateConversation(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {searchResults.length === 0 && searchQuery && (
                    <div className="text-center text-muted-foreground p-8">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun utilisateur trouvé</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="id" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ID Utilisateur (Custom ID)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="USR0001"
                      className="font-mono text-sm uppercase"
                      value={userIdSearch}
                      onChange={(e) => setUserIdSearch(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchById();
                        }
                      }}
                      maxLength={7}
                    />
                    <Button 
                      onClick={handleSearchById}
                      disabled={!userIdSearch.trim()}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Format: 3 lettres + 4 chiffres. Appuyez sur Entrée ou cliquez sur rechercher
                  </p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">📋 Exemples de format d'ID</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <span className="font-mono font-semibold">USR0001</span> - ID Client</li>
                    <li>• <span className="font-mono font-semibold">VEN0001</span> - ID Vendeur</li>
                    <li>• <span className="font-mono font-semibold">PDG0001</span> - ID PDG</li>
                    <li>• <span className="font-mono font-semibold">DRV0001</span> - ID Chauffeur</li>
                    <li className="mt-2 pt-2 border-t">💡 Demandez à l'utilisateur de partager son ID personnalisé visible dans son profil</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Dialog appel */}
        {activeCall && (
          <Dialog open={!!activeCall} onOpenChange={() => handleEndCall()}>
            <DialogContent className="max-w-4xl" aria-describedby="call-dialog-description">
              <span id="call-dialog-description" className="sr-only">
                {callType === 'video' ? 'Appel vidéo en cours' : 'Appel audio en cours'}
              </span>
              {callType === 'video' ? (
                <AgoraVideoCall
                  channel={activeCall.id}
                  isIncoming={false}
                  onCallEnd={handleEndCall}
                />
              ) : (
                <AgoraAudioCall
                  channel={activeCall.id}
                  isIncoming={false}
                  onCallEnd={handleEndCall}
                />
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog Recherche par ID */}
        <Dialog open={showSearchById} onOpenChange={setShowSearchById}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-orange-500" />
                Rechercher par ID
              </DialogTitle>
              <DialogDescription>
                Trouvez et contactez un utilisateur par son ID standardisé
              </DialogDescription>
            </DialogHeader>
            
            <ContactUserById 
              onUserSelected={handleUserSelectedById}
              showNavigation={false}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
