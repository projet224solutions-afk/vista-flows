import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, User, Search, MessageCircle, Phone, Video, MoreVertical, Shield, Check, CheckCheck, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import QuickFooter from "@/components/QuickFooter";
import { universalCommunicationService } from "@/services/UniversalCommunicationService";
import AgoraVideoCall from "@/components/communication/AgoraVideoCall";
import AgoraAudioCall from "@/components/communication/AgoraAudioCall";
import MessageInput from "@/components/communication/MessageInput";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'call';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  conversation_id?: string;
  public_id?: string;
  metadata?: any;
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
  is_vendor?: boolean;
  is_certified?: boolean;
  vendor_phone?: string;
  vendor_shop_slug?: string;
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
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAudioCall, setShowAudioCall] = useState(false);
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
      
      // Utiliser le service professionnel
      const conversationsData = await universalCommunicationService.getConversations(currentUser.id);
      
      // Enrichir avec infos vendeur
      const enrichedConversations = await Promise.all(
        conversationsData.map(async (conv: any) => {
          const otherUserId = conv.participants?.find((p: any) => p.user_id !== currentUser.id)?.user_id;
          if (!otherUserId) return conv;

          // Récupérer profil avec infos vendeur
          const { data: profile } = await supabase
            .from('profiles')
            .select(`
              first_name,
              last_name,
              email,
              avatar_url,
              vendors!inner(
                business_name,
                shop_slug,
                phone,
                certification_status:vendor_certifications(status)
              )
            `)
            .eq('id', otherUserId)
            .maybeSingle();

          const isVendor = profile?.vendors && typeof profile.vendors === 'object';
          const vendorInfo = isVendor ? profile.vendors[0] : null;
          const isCertified = vendorInfo?.certification_status?.status === 'CERTIFIE';

          const userName = vendorInfo?.business_name
            ? vendorInfo.business_name
            : (profile?.first_name && profile?.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : profile?.email || 'Utilisateur');

          return {
            id: conv.id,
            other_user_id: otherUserId,
            other_user_name: userName,
            other_user_email: profile?.email || '',
            other_user_avatar: profile?.avatar_url,
            last_message: conv.last_message_preview || 'Nouvelle conversation',
            last_message_time: conv.last_message_at || conv.created_at,
            unread_count: conv.unread_count || 0,
            is_vendor: isVendor,
            is_certified: isCertified,
            vendor_phone: vendorInfo?.phone,
            vendor_shop_slug: vendorInfo?.shop_slug
          };
        })
      );

      setConversations(enrichedConversations);
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
      
      // Caster les données pour correspondre à l'interface Message
      const messagesData = (data || []).map(msg => ({
        ...msg,
        status: msg.status as 'sent' | 'delivered' | 'read' | 'failed' | undefined,
        type: msg.type as 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'call' | undefined
      }));
      
      setMessages(messagesData);

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
      // Utiliser le service professionnel
      const conversationId = `direct_${selectedConversation}`;
      await universalCommunicationService.sendTextMessage(
        conversationId,
        currentUser.id,
        newMessage.trim()
      );

      setNewMessage("");
      loadMessages(selectedConversation);
      loadConversations();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error("Erreur lors de l'envoi du message");
    }
  };

  const handleSendFile = async (file: File) => {
    if (!selectedConversation || !currentUser) {
      toast.error('Impossible d\'envoyer le fichier');
      return;
    }

    try {
      const conversationId = `direct_${selectedConversation}`;
      await universalCommunicationService.sendFileMessage(
        conversationId,
        currentUser.id,
        file
      );

      loadMessages(selectedConversation);
      loadConversations();
    } catch (error: any) {
      console.error('Erreur envoi fichier:', error);
      throw error; // Re-throw pour que MessageInput affiche l'erreur
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

  const formatDetailedTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Liste des conversations - visible quand showChat est false sur mobile */}
      <div className={cn(
        "h-screen flex flex-col",
        showChat ? "hidden md:flex" : "flex"
      )}>
        {/* Header liste */}
        <header className="bg-gradient-to-r from-card to-card/95 border-b border-border sticky top-0 z-40 px-4 py-4 shadow-sm backdrop-blur-sm">
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
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm">Chargement des conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center animate-in fade-in duration-500">
              <div className="bg-primary/5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Aucune conversation</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Commencez une nouvelle conversation depuis le marketplace ou contactez un vendeur
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conv, index) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-all duration-200 text-left animate-in fade-in slide-in-from-left-3",
                    selectedConversation === conv.id && "bg-accent shadow-sm"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
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
                      <span 
                        className="text-xs text-muted-foreground flex-shrink-0 cursor-help"
                        title={formatDetailedTime(conv.last_message_time)}
                      >
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
            <header className="bg-gradient-to-r from-card to-card/95 border-b border-border px-3 py-3 flex items-center gap-3 sticky top-0 z-40 shadow-sm backdrop-blur-sm">
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
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">
                    {selectedConvData?.other_user_name}
                  </p>
                  {selectedConvData?.is_certified && (
                    <Badge variant="default" className="gap-1 flex-shrink-0">
                      <Shield className="w-3 h-3" />
                      Certifié
                    </Badge>
                  )}
                </div>
                {selectedConvData?.is_vendor ? (
                  <p className="text-xs text-muted-foreground">
                    Vendeur {selectedConvData?.vendor_phone ? `• ${selectedConvData.vendor_phone}` : '• En ligne'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">En ligne</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground"
                  onClick={() => setShowAudioCall(true)}
                  title="Appel audio"
                >
                  <Phone className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground"
                  onClick={() => setShowVideoCall(true)}
                  title="Appel vidéo"
                >
                  <Video className="w-5 h-5" />
                </Button>
              </div>
            </header>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3 pb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-16 animate-in fade-in duration-500">
                    <div className="bg-primary/5 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-12 h-12 text-primary" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Démarrez la conversation
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Envoyez votre premier message à {selectedConvData?.other_user_name}
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === currentUser?.id;
                    const messageStatus = message.status || (message.read_at ? 'read' : 'delivered');
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                          isOwnMessage ? "justify-end" : "justify-start"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-md transition-all hover:shadow-lg",
                            isOwnMessage
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md"
                              : "bg-card border border-border text-foreground rounded-bl-md"
                          )}
                        >
                          <p className="text-sm leading-relaxed break-words">{message.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <p 
                              className={cn(
                                "text-[10px] cursor-help",
                                isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                              title={formatDetailedTime(message.created_at)}
                            >
                              {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {isOwnMessage && (
                              <span className="flex-shrink-0" title={messageStatus === 'read' ? 'Lu' : messageStatus === 'delivered' ? 'Délivré' : messageStatus === 'sent' ? 'Envoyé' : 'Échec'}>
                                {messageStatus === 'read' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                                {messageStatus === 'delivered' && <CheckCheck className="w-3 h-3 text-primary-foreground/50" />}
                                {messageStatus === 'sent' && <Check className="w-3 h-3 text-primary-foreground/50" />}
                                {messageStatus === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Zone de saisie avec MessageInput */}
            <MessageInput
              onSendText={async (text) => {
                if (!currentUser || !selectedConversation) return;
                const conversationId = `direct_${selectedConversation}`;
                await universalCommunicationService.sendTextMessage(
                  conversationId,
                  currentUser.id,
                  text
                );
                loadMessages(selectedConversation);
                loadConversations();
              }}
              onSendFile={handleSendFile}
              disabled={!selectedConversation}
              placeholder="Écrivez votre message..."
              className="sticky bottom-0 z-50"
            />
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

      {/* Dialogs Appels Agora */}
      {showAudioCall && selectedConversation && (
        <Dialog open={showAudioCall} onOpenChange={setShowAudioCall}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Appel Audio</DialogTitle>
            </DialogHeader>
            <AgoraAudioCall 
              channel={`audio_${selectedConversation}_${currentUser?.id}`}
              callerInfo={{
                name: selectedConvData?.other_user_name || 'Utilisateur',
                avatar: selectedConvData?.other_user_avatar,
                userId: selectedConversation
              }}
              onCallEnd={() => setShowAudioCall(false)} 
            />
          </DialogContent>
        </Dialog>
      )}

      {showVideoCall && selectedConversation && (
        <Dialog open={showVideoCall} onOpenChange={setShowVideoCall}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Appel Vidéo</DialogTitle>
            </DialogHeader>
            <AgoraVideoCall 
              channel={`video_${selectedConversation}_${currentUser?.id}`}
              callerInfo={{
                name: selectedConvData?.other_user_name || 'Utilisateur',
                avatar: selectedConvData?.other_user_avatar,
                userId: selectedConversation
              }}
              onCallEnd={() => setShowVideoCall(false)} 
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
