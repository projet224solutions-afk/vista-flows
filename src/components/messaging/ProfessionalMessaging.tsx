/**
 * 💬 MESSAGERIE PROFESSIONNELLE - 224SOLUTIONS
 * Interface de messagerie moderne avec Supabase Realtime
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgora } from '@/hooks/useAgora';
import { toast } from 'sonner';
import AgoraVideoCall from '@/components/communication/AgoraVideoCall';
import AgoraAudioCall from '@/components/communication/AgoraAudioCall';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Image as ImageIcon,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Smile,
  X,
  Users,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  type: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'received';
  created_at: string;
  isOwn: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
  participantId?: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export default function ProfessionalMessaging() {
  const { user, profile } = useAuth();
  const { callState, endCall } = useAgora();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchContacts, setSearchContacts] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle starting a call
  const handleStartCall = (type: 'audio' | 'video') => {
    if (!activeConversation?.participantId || !user?.id) {
      toast.error('Impossible de démarrer l\'appel');
      return;
    }

    setCallType(type);
    setShowCallDialog(true);
  };

  const handleEndCall = () => {
    endCall();
    setShowCallDialog(false);
  };

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data: participantsData, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            name,
            last_message,
            last_message_at,
            unread_count,
            type
          )
        `)
        .eq('user_id', user.id)
        .order('conversations(last_message_at)', { ascending: false });

      if (error) throw error;

      const convs: Conversation[] = await Promise.all(
        (participantsData || []).map(async (p: any) => {
          const conv = p.conversations;
          
          // Get other participant info
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              profiles!inner(first_name, last_name, avatar_url)
            `)
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .single();

          const otherProfile = otherParticipant?.profiles as any;
          
          return {
            id: conv.id,
            name: conv.name || (otherProfile 
              ? `${otherProfile.first_name} ${otherProfile.last_name}` 
              : 'Conversation'),
            avatar: otherProfile?.avatar_url,
            lastMessage: conv.last_message || '',
            lastMessageTime: conv.last_message_at,
            unreadCount: conv.unread_count || 0,
            isOnline: false,
            participantId: otherParticipant?.user_id
          };
        })
      );

      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          type,
          file_url,
          file_name,
          status,
          created_at,
          profiles!messages_sender_id_fkey(first_name, last_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const msgs: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        sender_name: m.profiles ? `${m.profiles.first_name} ${m.profiles.last_name}` : '',
        sender_avatar: m.profiles?.avatar_url,
        type: m.type || 'text',
        file_url: m.file_url,
        file_name: m.file_name,
        status: m.status || 'sent',
        created_at: m.created_at,
        isOwn: m.sender_id === user.id
      }));

      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [user?.id]);

  // Search contacts
  const searchForContacts = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setContacts([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, role')
        .neq('id', user?.id)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error searching contacts:', error);
    }
  }, [user?.id]);

  // Create new conversation
  const createConversation = async (contact: Contact) => {
    if (!user?.id) return;

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (existingConv) {
        for (const cp of existingConv) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', cp.conversation_id)
            .eq('user_id', contact.id)
            .single();

          if (otherParticipant) {
            // Conversation exists, open it
            const conv = conversations.find(c => c.id === cp.conversation_id);
            if (conv) {
              setActiveConversation(conv);
              setShowNewChat(false);
              setShowMobileChat(true);
              return;
            }
          }
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: `${contact.first_name} ${contact.last_name}`,
          type: 'private',
          creator_id: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id, role: 'admin' },
          { conversation_id: newConv.id, user_id: contact.id, role: 'member' }
        ]);

      if (partError) throw partError;

      const newConversation: Conversation = {
        id: newConv.id,
        name: `${contact.first_name} ${contact.last_name}`,
        avatar: contact.avatar_url,
        lastMessage: '',
        unreadCount: 0,
        isOnline: false,
        participantId: contact.id
      };

      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      setShowNewChat(false);
      setShowMobileChat(true);
      toast.success('Conversation créée');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
    }
  };

  // Send message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !activeConversation || !user?.id) return;

    setIsSending(true);
    let fileUrl = '';
    let fileName = '';
    let messageType: 'text' | 'image' | 'file' = 'text';

    try {
      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('communication-files')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('communication-files')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = selectedFile.name;
        messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
      }

      // Get recipient
      const { data: recipient } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', activeConversation.id)
        .neq('user_id', user.id)
        .single();

      // Insert message
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          recipient_id: recipient?.user_id,
          content: newMessage.trim() || fileName,
          type: messageType,
          file_url: fileUrl || null,
          file_name: fileName || null,
          status: 'sent'
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage.trim() || `📎 ${fileName}`,
          last_message_at: new Date().toISOString()
        })
        .eq('id', activeConversation.id);

      // Add message to local state
      const newMsg: Message = {
        id: msgData.id,
        content: newMessage.trim() || fileName,
        sender_id: user.id,
        sender_name: `${profile?.first_name} ${profile?.last_name}`,
        type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        status: 'sent',
        created_at: new Date().toISOString(),
        isOwn: true
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setSelectedFile(null);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      setSelectedFile(file);
    }
  };

  // Format message time
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'HH:mm', { locale: fr });
  };

  // Format conversation time
  const formatConversationTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Hier';
    return format(date, 'dd/MM');
  };

  // Real-time subscription
  useEffect(() => {
    if (!activeConversation?.id) return;

    const channel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id !== user?.id) {
            setMessages(prev => [...prev, {
              id: newMsg.id,
              content: newMsg.content,
              sender_id: newMsg.sender_id,
              type: newMsg.type || 'text',
              file_url: newMsg.file_url,
              file_name: newMsg.file_name,
              status: 'received',
              created_at: newMsg.created_at,
              isOwn: false
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation?.id, user?.id]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation?.id) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation?.id, loadMessages]);

  // Search contacts debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchContacts) {
        searchForContacts(searchContacts);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchContacts, searchForContacts]);

  // Message status icon
  const MessageStatus = ({ status }: { status: string }) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  // Filtered conversations
  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card className="w-full h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="w-full h-[600px] overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar - Conversations list */}
        <div className={`w-full md:w-80 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Messages
              </h2>
              <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Rechercher un contact..."
                      value={searchContacts}
                      onChange={(e) => setSearchContacts(e.target.value)}
                    />
                    <ScrollArea className="h-64">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer"
                          onClick={() => createConversation(contact)}
                        >
                          <Avatar>
                            <AvatarImage src={contact.avatar_url} />
                            <AvatarFallback>
                              {contact.first_name?.[0]}{contact.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          </div>
                        </div>
                      ))}
                      {searchContacts && contacts.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Aucun contact trouvé
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations list */}
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p>Aucune conversation</p>
                <Button
                  variant="link"
                  onClick={() => setShowNewChat(true)}
                  className="mt-2"
                >
                  Démarrer une conversation
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-accent ${
                    activeConversation?.id === conv.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setActiveConversation(conv);
                    setShowMobileChat(true);
                  }}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={conv.avatar} />
                      <AvatarFallback>{conv.name[0]}</AvatarFallback>
                    </Avatar>
                    {conv.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conv.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatConversationTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage || 'Pas de message'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge variant="destructive" className="rounded-full">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setShowMobileChat(false)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Avatar>
                    <AvatarImage src={activeConversation.avatar} />
                    <AvatarFallback>{activeConversation.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{activeConversation.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {activeConversation.isOnline ? 'En ligne' : 'Hors ligne'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleStartCall('audio')}
                    disabled={!user?.id || !activeConversation?.participantId}
                    title="Appel audio"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleStartCall('video')}
                    disabled={!user?.id || !activeConversation?.participantId}
                    title="Appel vidéo"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Call Dialog */}
              <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
                <DialogContent className="max-w-lg p-0 overflow-hidden">
                  {callType === 'video' ? (
                    <AgoraVideoCall
                      channel={`dm_${[user?.id, activeConversation?.participantId].filter(Boolean).sort().join('_')}`}
                      isIncoming={false}
                      callerInfo={{
                        name: activeConversation?.name || 'Utilisateur',
                        avatar: activeConversation?.avatar,
                      }}
                      onCallEnd={handleEndCall}
                    />
                  ) : (
                    <AgoraAudioCall
                      channel={`dm_${[user?.id, activeConversation?.participantId].filter(Boolean).sort().join('_')}`}
                      isIncoming={false}
                      callerInfo={{
                        name: activeConversation?.name || 'Utilisateur',
                        avatar: activeConversation?.avatar,
                      }}
                      onCallEnd={handleEndCall}
                    />
                  )}
                </DialogContent>
              </Dialog>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${msg.isOwn ? 'order-2' : 'order-1'}`}>
                        {!msg.isOwn && (
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={msg.sender_avatar} />
                              <AvatarFallback className="text-xs">
                                {msg.sender_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {msg.sender_name}
                            </span>
                          </div>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            msg.isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.type === 'image' && msg.file_url && (
                            <img
                              src={msg.file_url}
                              alt={msg.file_name || 'Image'}
                              className="rounded-lg max-w-full mb-2 cursor-pointer"
                              onClick={() => window.open(msg.file_url, '_blank')}
                            />
                          )}
                          {msg.type === 'file' && msg.file_url && (
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm underline mb-2"
                            >
                              <Paperclip className="w-4 h-4" />
                              {msg.file_name}
                            </a>
                          )}
                          {msg.content && <p className="text-sm">{msg.content}</p>}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(msg.created_at)}
                          </span>
                          {msg.isOwn && <MessageStatus status={msg.status} />}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* File preview */}
              {selectedFile && (
                <div className="px-4 py-2 border-t flex items-center gap-2 bg-muted/50">
                  {selectedFile.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                  <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Input area */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*';
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Écrivez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={isSending || (!newMessage.trim() && !selectedFile)}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Sélectionnez une conversation</p>
              <p className="text-sm">ou démarrez une nouvelle discussion</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowNewChat(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle conversation
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}