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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  MessageSquare,
  Phone,
  Video,
  Send,
  Paperclip,
  Image,
  FileText,
  X,
  Search,
  Bell,
  Users,
  Check,
  CheckCheck
} from 'lucide-react';
import {
  universalCommunicationService,
  type Conversation,
  type Message,
  type CommunicationNotification
} from '@/services/UniversalCommunicationService';
import AgoraVideoCall from './AgoraVideoCall';
import AgoraAudioCall from './AgoraAudioCall';

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
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<CommunicationNotification[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    try {
      await universalCommunicationService.sendTextMessage(
        selectedConversation.id,
        user.id,
        newMessage
      );
      setNewMessage('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive'
      });
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || !selectedConversation || !user?.id) return;

    setIsUploading(true);
    try {
      const fileType = selectedFile.type.startsWith('image/') ? 'image' :
                      selectedFile.type.startsWith('video/') ? 'video' :
                      selectedFile.type.startsWith('audio/') ? 'audio' : 'file';

      await universalCommunicationService.sendFileMessage(
        selectedConversation.id,
        user.id,
        selectedFile,
        fileType
      );

      setSelectedFile(null);
      toast({
        title: 'Fichier envoyé',
        description: 'Votre fichier a été envoyé avec succès'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le fichier',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
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
    const userId = searchQuery.trim();
    
    if (!userId) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un ID utilisateur",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Vérifier que l'utilisateur existe
      const profile = await universalCommunicationService.getUserById(userId);
      
      if (!profile) {
        toast({
          title: "Erreur",
          description: "Utilisateur introuvable",
          variant: "destructive"
        });
        return;
      }
      
      // Créer une conversation directe
      await handleCreateConversation(userId);
      setShowNewConversation(false);
      setSearchQuery('');
      
      toast({
        title: "Succès",
        description: `Conversation avec ${profile.first_name} ${profile.last_name}`,
      });
    } catch (error) {
      console.error('Erreur recherche par ID:', error);
      toast({
        title: "Erreur",
        description: "Impossible de contacter cet utilisateur",
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

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
      case 'read':
        return <CheckCheck className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.user_id !== user?.id);
  };

  const unreadCount = notifications.length;

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
                    <ScrollArea className="flex-1 p-4">
                      {messages.map((message) => {
                        const isOwn = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {message.type === 'image' && message.file_url && (
                                <img
                                  src={message.file_url}
                                  alt={message.file_name}
                                  className="rounded mb-2 max-w-full"
                                />
                              )}
                              {message.type === 'file' && message.file_url && (
                                <a
                                  href={message.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 mb-2 underline"
                                >
                                  <FileText className="h-4 w-4" />
                                  {message.file_name}
                                </a>
                              )}
                              <p>{message.content}</p>
                              <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                                <span>
                                  {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {isOwn && getMessageStatusIcon(message.status)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </ScrollArea>

                    {/* Input message */}
                    <div className="p-4 border-t">
                      {selectedFile && (
                        <div className="mb-2 p-2 bg-muted rounded flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedFile.type.startsWith('image/') ? (
                              <Image className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            <span className="text-sm">{selectedFile.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setSelectedFile(file);
                          }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                          placeholder="Votre message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (selectedFile) {
                                handleSendFile();
                              } else {
                                handleSendMessage();
                              }
                            }
                          }}
                          disabled={isUploading}
                        />
                        <Button
                          onClick={selectedFile ? handleSendFile : handleSendMessage}
                          disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
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
                  <label className="text-sm font-medium">ID Utilisateur</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Entrez l'ID utilisateur"
                      className="font-mono text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchById();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSearchById}
                      disabled={!searchQuery.trim()}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    💡 Entrez l'ID et cliquez sur rechercher ou appuyez sur Entrée
                  </p>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Comment trouver un ID utilisateur ?</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• L'ID est visible dans le profil de chaque utilisateur</li>
                    <li>• C'est un identifiant unique (UUID ou format personnalisé)</li>
                    <li>• Demandez à l'utilisateur de vous partager son ID</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Dialog appel */}
        {activeCall && (
          <Dialog open={!!activeCall} onOpenChange={() => handleEndCall()}>
            <DialogContent className="max-w-4xl">
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
      </CardContent>
    </Card>
  );
}
