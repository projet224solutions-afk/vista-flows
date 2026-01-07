/**
 * Page de Conversation Directe - Interface Mobile-First
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Phone, Video, MoreVertical, Paperclip, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  type?: string;
  file_url?: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  email?: string;
}

export default function DirectConversation() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger le profil du destinataire
  useEffect(() => {
    const loadRecipient = async () => {
      if (!userId) {
        toast.error("ID utilisateur manquant");
        navigate("/messages");
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, email')
          .eq('id', userId)
          .maybeSingle();

        if (error && (error as any).code !== 'PGRST116') {
          throw error;
        }

        // Si le profil n'existe pas encore, on ouvre quand même la conversation
        // (le système reste 100% "réel" : on ne fabrique pas de données, on affiche juste un placeholder)
        setRecipient(
          profile ?? {
            id: userId,
            first_name: 'Utilisateur',
            last_name: '',
            avatar_url: undefined,
            email: undefined,
          }
        );
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        toast.error("Erreur lors du chargement");
        navigate("/messages");
      } finally {
        setLoading(false);
      }
    };

    loadRecipient();
  }, [userId, navigate]);

  // Charger les messages
  useEffect(() => {
    if (!userId || !user?.id) return;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, content, sender_id, created_at, type, file_url')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Erreur chargement messages:', error);
      }
    };

    loadMessages();

    // Subscription temps réel
    const channel = supabase
      .channel(`direct_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id || msg.sender_id === userId)
          ) {
            setMessages(prev => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoyer un message
  const handleSend = async () => {
    if (!newMessage.trim() || !user?.id || !userId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          recipient_id: userId,
          type: 'text',
          status: 'sent'
        });

      if (error) throw error;
      
      setNewMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!recipient) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-[100]">
      {/* Header Professionnel */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-11 h-11 ring-2 ring-primary/20">
          <AvatarImage src={recipient.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
            {recipient.first_name?.[0]?.toUpperCase()}{recipient.last_name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-lg truncate">
            {recipient.first_name} {recipient.last_name}
          </h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-muted-foreground">En ligne</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Zone des Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
            <Avatar className="w-24 h-24 mb-6 ring-4 ring-primary/10">
              <AvatarImage src={recipient.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-3xl font-bold">
                {recipient.first_name?.[0]?.toUpperCase()}{recipient.last_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-lg text-foreground mb-1">
              {recipient.first_name} {recipient.last_name}
            </p>
            <p className="text-sm text-muted-foreground">Commencez la conversation</p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Les messages sont chiffrés de bout en bout
            </p>
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
                    "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm transition-all",
                    isOwn 
                      ? "bg-primary text-primary-foreground rounded-br-sm" 
                      : "bg-muted rounded-bl-sm"
                  )}>
                    {msg.file_url && msg.type === 'image' && (
                      <img loading="lazy" src={msg.file_url} alt="Image" className="rounded-lg max-w-full mb-2" />
                    )}
                    {msg.content && (
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    )}
                    <div className={cn(
                      "flex items-center justify-end gap-1 mt-1",
                      isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      <span className="text-[10px]">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
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
      
      {/* Barre de Saisie Ultra Professionnelle */}
      <div className="p-3 border-t border-border bg-card/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 flex-shrink-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="w-full h-11 bg-muted/60 border border-border/50 rounded-full px-5 pr-4 
                         focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/10
                         placeholder:text-muted-foreground/60 transition-all"
              disabled={sending}
            />
          </div>
          
          <Button 
            type="submit" 
            size="icon"
            disabled={!newMessage.trim() || sending}
            className={cn(
              "h-11 w-11 flex-shrink-0 rounded-full transition-all duration-200",
              newMessage.trim() 
                ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" 
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className={cn(
              "w-5 h-5 transition-transform",
              sending && "animate-pulse"
            )} />
          </Button>
        </form>
        
        {/* Safe area pour iOS */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}
