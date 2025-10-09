import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, Phone, Video, Send, MapPin, Image as ImageIcon, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export const ChatInterface = () => {
  const { user } = useAuth();
  const { 
    messages, 
    activeChat, 
    chatUsers, 
    currentCall, 
    loading, 
    sendMessage, 
    openChat, 
    closeChat, 
    initiateCall, 
    acceptCall, 
    rejectCall, 
    endCall 
  } = useChat();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [showCallDialog, setShowCallDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentCall) {
      setShowCallDialog(true);
    }
  }, [currentCall]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;

    await sendMessage(activeChat, newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startCall = async (receiverId: string, type: 'audio' | 'video') => {
    await initiateCall(receiverId, type);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  const activeUser = chatUsers.find(u => u.id === activeChat);

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Liste des conversations */}
      <div className="w-1/3 border-r bg-muted/30">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </h3>
        </div>
        <div className="overflow-y-auto h-full">
          {chatUsers.length > 0 ? (
            chatUsers.map((chatUser) => (
              <div
                key={chatUser.id}
                onClick={() => openChat(chatUser.id)}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  activeChat === chatUser.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={chatUser.avatar_url} />
                    <AvatarFallback>
                      {getInitials(chatUser.first_name, chatUser.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {chatUser.first_name} {chatUser.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {chatUser.email}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col">
        {activeChat && activeUser ? (
          <>
            {/* En-tête de conversation */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeUser.avatar_url} />
                    <AvatarFallback>
                      {getInitials(activeUser.first_name, activeUser.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {activeUser.first_name} {activeUser.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">En ligne</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startCall(activeChat, 'audio')}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startCall(activeChat, 'video')}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeChat}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="text-center text-muted-foreground">
                  Chargement des messages...
                </div>
              ) : messages.length > 0 ? (
                messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="break-words">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {formatTime(message.created_at)}
                          {message.type !== 'text' && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {message.type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun message. Commencez la conversation !</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zone de saisie */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" disabled>
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Image
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <FileText className="h-4 w-4 mr-1" />
                  Fichier
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <MapPin className="h-4 w-4 mr-1" />
                  Position
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Sélectionnez une conversation</h3>
              <p>Choisissez une conversation pour commencer à chatter</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog d'appel */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentCall?.status === 'ringing' ? 'Appel en cours...' : 'Appel actif'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentCall && (
              <>
                <div className="text-center">
                  <div className="text-lg font-medium">
                    Appel {currentCall.call_type === 'video' ? 'vidéo' : 'audio'}
                  </div>
                  <Badge className="mt-2">
                    {currentCall.status}
                  </Badge>
                </div>
                <div className="flex justify-center gap-4">
                  {currentCall.status === 'ringing' && currentCall.receiver_id === user?.id && (
                    <>
                      <Button
                        onClick={() => acceptCall(currentCall.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Accepter
                      </Button>
                      <Button
                        onClick={() => rejectCall(currentCall.id)}
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Refuser
                      </Button>
                    </>
                  )}
                  {currentCall.status === 'accepted' && (
                    <Button
                      onClick={() => endCall(currentCall.id)}
                      variant="destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Raccrocher
                    </Button>
                  )}
                  {currentCall.status === 'ringing' && currentCall.caller_id === user?.id && (
                    <Button
                      onClick={() => endCall(currentCall.id)}
                      variant="destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annuler
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};