/**
 * 💬 Chat de Livraison - Communication Client ↔ Livreur
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Phone, MapPin, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeliveryChatProps {
  deliveryId: string;
  recipientId: string;
  recipientName: string;
  recipientRole: 'client' | 'livreur' | 'vendeur';
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function DeliveryChat({ 
  deliveryId, 
  recipientId, 
  recipientName,
  recipientRole 
}: DeliveryChatProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les messages
  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('delivery_messages')
        .select('*')
        .eq('delivery_id', deliveryId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Marquer comme lu
      await supabase
        .from('delivery_messages')
        .update({ is_read: true })
        .eq('delivery_id', deliveryId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);

    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  // Envoyer un message
  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('delivery_messages')
        .insert({
          delivery_id: deliveryId,
          sender_id: user.id,
          recipient_id: recipientId,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      loadMessages();
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!user) return;

    loadMessages();

    const channel = supabase
      .channel(`delivery_chat_${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_messages',
          filter: `delivery_id=eq.${deliveryId}`
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, deliveryId]);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {recipientName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{recipientName}</CardTitle>
              <Badge variant="outline" className="text-xs">
                {recipientRole === 'livreur' ? '🚴 Livreur' : 
                 recipientRole === 'vendeur' ? '🏪 Vendeur' : '👤 Client'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-50" />
            <p>Aucun message pour cette livraison</p>
            <p className="text-sm">Commencez la conversation</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
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
      </CardContent>

      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}