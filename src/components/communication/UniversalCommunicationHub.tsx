/**
 * Hub de Communication Universel pour 224SOLUTIONS
 * Interface mobile-first optimisée
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Phone,
  Video,
  Search,
  Bell,
  Users,
  Hash,
  Plus,
  ArrowLeft,
  Send,
  MoreVertical,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
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
import ContactUserById from './ContactUserById';
import type { UserProfile } from '@/types/communication.types';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [showMobileChat, setShowMobileChat] = useState(false);
  
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
        toast({
          title: notification.title,
          description: notification.body
        });
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

      if (user?.id) {
        await universalCommunicationService.markMessagesAsRead(conversationId, user.id);
        loadConversations();
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
    setShowMobileChat(true);
  };

  const handleSendMessage = async (message: string, attachments?: File[]) => {
    if (!selectedConversation || !user?.id) return;
    if (!message.trim() && (!attachments || attachments.length === 0)) return;

    try {
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          let fileType: 'image' | 'video' | 'file' | 'audio' = 'file';
          if (file.type.startsWith('image/')) fileType = 'image';
          else if (file.type.startsWith('video/')) fileType = 'video';
          else if (file.type.startsWith('audio/') || file.name.startsWith('audio_')) fileType = 'audio';

          await universalCommunicationService.sendFileMessage(
            selectedConversation.id,
            user.id,
            file,
            fileType
          );
        }
      }

      if (message.trim()) {
        await universalCommunicationService.sendTextMessage(
          selectedConversation.id,
          user.id,
          message
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
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
      toast({ title: "Erreur", description: "Veuillez entrer un ID", variant: "destructive" });
      return;
    }

    const customIdRegex = /^[A-Z]{3}\d{4}$/;
    const publicIdRegex = /^224-[A-Z]{3}-\d{3}$/;
    
    if (!customIdRegex.test(customId) && !publicIdRegex.test(customId)) {
      toast({ title: "Format invalide", description: "Formats: USR0001 ou 224-XXX-XXX", variant: "destructive" });
      return;
    }
    
    try {
      const profile = await universalCommunicationService.getUserByCustomId(customId);
      if (!profile) {
        toast({ title: "Introuvable", description: `Aucun utilisateur: ${customId}`, variant: "destructive" });
        return;
      }

      if (profile.id === user?.id) {
        toast({ title: "Erreur", description: "Vous ne pouvez pas vous contacter", variant: "destructive" });
        return;
      }
      
      await handleCreateConversation(profile.id);
      setShowNewConversation(false);
      setUserIdSearch('');
      toast({ title: "Succès", description: `Conversation avec ${profile.first_name} ${profile.last_name}` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de contacter cet utilisateur", variant: "destructive" });
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
      setShowMobileChat(true);
      toast({ title: 'Conversation créée', description: 'Vous pouvez maintenant discuter' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de créer la conversation', variant: 'destructive' });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p.user_id !== user?.id);
  };

  const handleUserSelectedById = async (selectedUser: UserProfile) => {
    try {
      const directConvId = `direct_${selectedUser.id}`;
      const existingConv = conversations.find(c => c.id === directConvId);
      
      if (existingConv) {
        setSelectedConversation(existingConv);
        loadMessages(existingConv.id);
      } else {
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
      setShowMobileChat(true);
      toast({ title: 'Conversation ouverte', description: `Avec ${selectedUser.first_name} ${selectedUser.last_name}` });
    } catch (error) {
      console.error('Erreur ouverture conversation:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Hier';
    return format(date, 'dd/MM', { locale: fr });
  };

  const unreadCount = notifications.length;
  const filteredConversations = searchQuery
    ? conversations.filter(c => {
        const other = getOtherParticipant(c);
        const name = `${other?.user?.first_name || ''} ${other?.user?.last_name || ''}`;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Liste des conversations */}
      <div className={cn(
        "flex flex-col border-r border-border bg-card",
        "w-full md:w-80 lg:w-96",
        showMobileChat && selectedConversation ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </h1>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setShowSearchById(true)}
                className="h-9 w-9"
              >
                <Hash className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setShowNewConversation(true)}
                className="h-9 w-9"
              >
                <Plus className="w-4 h-4" />
              </Button>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-6 min-w-6 px-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
        </div>
        
        {/* Liste */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm">Aucune conversation</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const name = `${other?.user?.first_name || ''} ${other?.user?.last_name || ''}`.trim() || 'Conversation';
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                      "hover:bg-accent/50 active:scale-[0.98]",
                      selectedConversation?.id === conv.id && "bg-accent"
                    )}
                  >
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={other?.user?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {other?.user?.first_name?.[0]}{other?.user?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{name}</span>
                        {conv.last_message_at && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-sm text-muted-foreground truncate">
                          {conv.last_message_preview || 'Aucun message'}
                        </span>
                        {(conv.unread_count ?? 0) > 0 && (
                          <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Zone de chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-background",
        !showMobileChat && !selectedConversation ? "hidden md:flex" : "flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Header chat */}
            <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowMobileChat(false)}
                className="md:hidden h-9 w-9"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <Avatar className="w-10 h-10">
                <AvatarImage src={getOtherParticipant(selectedConversation)?.user?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getOtherParticipant(selectedConversation)?.user?.first_name?.[0]}
                  {getOtherParticipant(selectedConversation)?.user?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">
                  {getOtherParticipant(selectedConversation)?.user?.first_name}{' '}
                  {getOtherParticipant(selectedConversation)?.user?.last_name}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {getOtherParticipant(selectedConversation)?.user?.email}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleStartCall('audio')}
                  className="h-9 w-9"
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleStartCall('video')}
                  className="h-9 w-9"
                >
                  <Video className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
                  <p>Aucun message</p>
                  <p className="text-sm">Commencez la conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div 
                        key={msg.id} 
                        className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}
                      >
                        <div className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                          isOwn 
                            ? "bg-primary text-primary-foreground rounded-br-md" 
                            : "bg-muted rounded-bl-md"
                        )}>
                          {msg.file_url && msg.type === 'image' && (
                            <img src={msg.file_url} alt="Image" className="rounded-lg max-w-full mb-2" />
                          )}
                          {msg.file_url && msg.type === 'audio' && (
                            <audio controls src={msg.file_url} className="max-w-full mb-2" />
                          )}
                          {msg.file_url && msg.type === 'file' && (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" 
                              className="flex items-center gap-2 text-sm underline mb-2">
                              <Paperclip className="w-4 h-4" />
                              {msg.file_name || 'Fichier'}
                            </a>
                          )}
                          {msg.content && (
                            <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                          )}
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            <span className="text-[10px]">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>
                            {isOwn && <CheckCheck className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </ScrollArea>
            
            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
              <ImprovedMessageInput
                onSendMessage={handleSendMessage}
                placeholder="Écrivez votre message..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-20 h-20 mb-4 opacity-20" />
            <p className="text-lg">Sélectionnez une conversation</p>
          </div>
        )}
      </div>

      {/* Dialog nouvelle conversation */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
            <DialogDescription>
              Recherchez un utilisateur pour démarrer une conversation
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Par nom</TabsTrigger>
              <TabsTrigger value="id">Par ID</TabsTrigger>
            </TabsList>
            
            <TabsContent value="search" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Search className="h-5 w-5 mt-2" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                />
              </div>
              <ScrollArea className="h-[300px]">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 mb-2 border rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => handleCreateConversation(u.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{u.first_name?.[0]}{u.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.first_name} {u.last_name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="id" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input
                  placeholder="CLT0001 ou 224-ABC-123"
                  className="font-mono uppercase"
                  value={userIdSearch}
                  onChange={(e) => setUserIdSearch(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
                />
                <Button onClick={handleSearchById} disabled={!userIdSearch.trim()}>
                  <Search className="w-4 h-4" />
                </Button>
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
              <AgoraVideoCall channel={activeCall.id} isIncoming={false} onCallEnd={handleEndCall} />
            ) : (
              <AgoraAudioCall channel={activeCall.id} isIncoming={false} onCallEnd={handleEndCall} />
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Recherche par ID */}
      <Dialog open={showSearchById} onOpenChange={setShowSearchById}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Rechercher par ID
            </DialogTitle>
            <DialogDescription>
              Trouvez un utilisateur par son ID
            </DialogDescription>
          </DialogHeader>
          <ContactUserById onUserSelected={handleUserSelectedById} showNavigation={false} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
