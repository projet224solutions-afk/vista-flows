import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, User, Search, MessageCircle, Phone, Video, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import QuickFooter from "@/components/QuickFooter";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_email?: string;
  other_user_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recipientIdParam = searchParams.get('recipientId');
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation && currentUser) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    if (recipientIdParam && currentUser) {
      setSelectedConversation(recipientIdParam);
      setShowChat(true);
    }
  }, [recipientIdParam, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedConversation || !currentUser) return;

    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === selectedConversation) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Veuillez vous connecter');
        navigate('/auth');
        return;
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversationsMap = new Map<string, any>();
      
      for (const message of messagesData || []) {
        const otherUserId = message.sender_id === currentUser.id 
          ? message.recipient_id 
          : message.sender_id;
        
        if (!conversationsMap.has(otherUserId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, avatar_url')
            .eq('id', otherUserId)
            .maybeSingle();

          const userName = profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.email || 'Utilisateur';

          conversationsMap.set(otherUserId, {
            id: otherUserId,
            other_user_id: otherUserId,
            other_user_name: userName,
            other_user_email: profile?.email || '',
            other_user_avatar: profile?.avatar_url,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0
          });
        }
      }

      if (recipientIdParam && !conversationsMap.has(recipientIdParam)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, avatar_url')
          .eq('id', recipientIdParam)
          .maybeSingle();

        const userName = profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || 'Utilisateur';

        conversationsMap.set(recipientIdParam, {
          id: recipientIdParam,
          other_user_id: recipientIdParam,
          other_user_name: userName,
          other_user_email: profile?.email || '',
          other_user_avatar: profile?.avatar_url,
          last_message: 'Nouvelle conversation',
          last_message_time: new Date().toISOString(),
          unread_count: 0
        });
      }

      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', currentUser.id)
        .eq('sender_id', otherUserId)
        .is('read_at', null);

    } catch (error) {
      console.error('Erreur chargement messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          recipient_id: selectedConversation,
          content: newMessage.trim(),
          type: 'text'
        });

      if (error) throw error;

      setNewMessage("");
      loadMessages(selectedConversation);
      loadConversations();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error("Erreur lors de l'envoi du message");
    }
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConversation(convId);
    setShowChat(true);
  };

  const handleBackToList = () => {
    setShowChat(false);
    setSelectedConversation(null);
  };

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      conv.other_user_name.toLowerCase().includes(query) ||
      (conv.other_user_email && conv.other_user_email.toLowerCase().includes(query)) ||
      conv.last_message.toLowerCase().includes(query)
    );
  });

  const selectedConvData = conversations.find(c => c.id === selectedConversation);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Liste des conversations - visible quand showChat est false sur mobile */}
      <div className={cn(
        "h-screen flex flex-col",
        showChat ? "hidden md:flex" : "flex"
      )}>
        {/* Header liste */}
        <header className="bg-card border-b border-border sticky top-0 z-40 px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>
        </header>

        {/* Liste des conversations */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              Chargement...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aucune conversation</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Commencez une nouvelle conversation depuis le marketplace
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left",
                    selectedConversation === conv.id && "bg-accent"
                  )}
                >
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={conv.other_user_avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conv.other_user_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground truncate">
                        {conv.other_user_name}
                      </p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTime(conv.last_message_time)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {conv.last_message}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {conv.unread_count}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Zone de chat - visible quand showChat est true sur mobile ou toujours visible sur desktop */}
      <div className={cn(
        "h-screen flex flex-col bg-background",
        showChat ? "flex" : "hidden md:flex md:absolute md:right-0 md:top-0 md:w-[calc(100%-320px)]"
      )}>
        {selectedConversation ? (
          <>
            {/* Header conversation */}
            <header className="bg-card border-b border-border px-3 py-3 flex items-center gap-3 sticky top-0 z-40">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBackToList}
                className="md:hidden flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={selectedConvData?.other_user_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedConvData?.other_user_name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {selectedConvData?.other_user_name}
                </p>
                <p className="text-xs text-muted-foreground">En ligne</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Video className="w-5 h-5" />
                </Button>
              </div>
            </header>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3 pb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">
                      Commencez la conversation !
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUser?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn("flex", isOwnMessage ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm",
                            isOwnMessage
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card border border-border text-foreground rounded-bl-md"
                          )}
                        >
                          <p className="text-sm leading-relaxed break-words">{message.content}</p>
                          <p className={cn(
                            "text-[10px] mt-1 text-right",
                            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Zone de saisie - TOUJOURS VISIBLE */}
            <div className="border-t border-border bg-card p-3 sticky bottom-0 z-50">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim()}
                  size="icon"
                  className="flex-shrink-0 rounded-full w-10 h-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center p-8">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="font-medium">Sélectionnez une conversation</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Choisissez un contact pour commencer à discuter
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer navigation - caché quand le chat est ouvert sur mobile */}
      <div className={cn(showChat ? "hidden" : "block")}>
        <QuickFooter />
      </div>
    </div>
  );
}
