/**
 * 💬 INTERFACE CHAT - 224SOLUTIONS
 * Interface de chat moderne et professionnelle avec Agora
 * Support texte, fichiers, localisation, audio/vidéo
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Send,
  Paperclip,
  Image,
  Video,
  Phone,
  VideoIcon,
  MapPin,
  Smile,
  MoreVertical,
  Users,
  Search,
  Plus,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Volume2,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useMessages, useCalls, useUserPresence } from "@/hooks/useCommunication";
import { Conversation, Message } from "@/services/communicationService";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks de communication
  const { conversations, isLoading: conversationsLoading, createPrivateConversation } = useConversations();
  const { messages, sendMessage, sendFile, sendLocation, isSending } = useMessages(selectedConversation?.id);
  const { 
    isInCall, 
    currentCall, 
    callStatus, 
    isMuted, 
    isVideoEnabled,
    initiateCall, 
    endCall, 
    toggleMicrophone, 
    toggleCamera 
  } = useCalls();

  // Filtrer les conversations selon la recherche
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.name?.toLowerCase().includes(searchLower) ||
      conv.participants?.some(p => 
        p.user?.first_name?.toLowerCase().includes(searchLower) ||
        p.user?.last_name?.toLowerCase().includes(searchLower) ||
        p.user?.email?.toLowerCase().includes(searchLower)
      )
    );
  });

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gestion de l'envoi de message
  const handleSendMessage = () => {
    if (!messageInput.trim() || isSending) return;
    
    sendMessage({ content: messageInput.trim() });
    setMessageInput('');
  };

  // Gestion de l'upload de fichier
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'video' | 'audio' | 'file' = 'file';
    
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    sendFile({ file, type });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Gestion du partage de localisation
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationName: 'Ma position actuelle'
        });
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        toast.error('Erreur lors de la récupération de la position');
      }
    );
  };

  // Initier un appel
  const handleInitiateCall = (type: 'audio' | 'video') => {
    if (!selectedConversation || !user) return;

    const targetUserId = selectedConversation.type === 'private' 
      ? (selectedConversation.participant_1 === user.id 
          ? selectedConversation.participant_2 
          : selectedConversation.participant_1)
      : null;

    if (!targetUserId) {
      toast.error('Impossible d\'initier un appel dans ce type de conversation');
      return;
    }

    initiateCall({
      conversationId: selectedConversation.id,
      calleeId: targetUserId,
      type
    });
  };

  // Rendu d'un message
  const renderMessage = (message: Message) => {
    const isOwn = message.sender_id === user?.id;
    const timestamp = format(new Date(message.created_at), 'HH:mm', { locale: fr });

    return (
      <div
        key={message.id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
          {!isOwn && (
            <div className="flex items-center mb-1">
              <Avatar className="w-6 h-6 mr-2">
                <AvatarImage src={message.sender?.avatar_url} />
                <AvatarFallback>
                  {message.sender?.first_name?.[0]}{message.sender?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {message.sender?.first_name} {message.sender?.last_name}
              </span>
            </div>
          )}
          
          <div
            className={`px-4 py-2 rounded-lg ${
              isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {message.type === 'text' && (
              <p className="text-sm">{message.content}</p>
            )}
            
            {message.type === 'image' && (
              <div className="space-y-2">
                <img
                  src={message.file_url}
                  alt={message.file_name}
                  className="max-w-full h-auto rounded"
                />
                {message.content && (
                  <p className="text-sm">{message.content}</p>
                )}
              </div>
            )}
            
            {message.type === 'file' && (
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">{message.file_name}</p>
                  <p className="text-xs opacity-70">
                    {message.file_size ? `${(message.file_size / 1024).toFixed(1)} KB` : ''}
                  </p>
                </div>
              </div>
            )}
            
            {message.type === 'location' && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">{message.location_name || 'Position partagée'}</p>
                  <p className="text-xs opacity-70">
                    {message.latitude?.toFixed(6)}, {message.longitude?.toFixed(6)}
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs opacity-70">{timestamp}</span>
              {isOwn && (
                <Badge variant="secondary" className="text-xs">
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && '✓✓'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Interface d'appel
  const renderCallInterface = () => {
    if (!isInCall || !currentCall) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarFallback>
                {currentCall.type === 'video' ? <VideoIcon className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold">
              {callStatus === 'calling' && 'Appel en cours...'}
              {callStatus === 'ringing' && 'Sonnerie...'}
              {callStatus === 'connected' && 'En communication'}
            </h3>
            <p className="text-muted-foreground">
              Appel {currentCall.type === 'video' ? 'vidéo' : 'audio'}
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="lg"
              onClick={toggleMicrophone}
              className="rounded-full w-12 h-12"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {currentCall.type === 'video' && (
              <Button
                variant={isVideoEnabled ? "outline" : "destructive"}
                size="lg"
                onClick={toggleCamera}
                className="rounded-full w-12 h-12"
              >
                {isVideoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            )}

            <Button
              variant="destructive"
              size="lg"
              onClick={() => endCall()}
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Interface d'appel */}
      {renderCallInterface()}

      {/* Liste des conversations */}
      <div className="w-1/3 border-r bg-muted/30">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    // Implémentation de la recherche d'utilisateurs
                  />
                  {/* Liste des utilisateurs trouvés */}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Chargement des conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Aucune conversation trouvée
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {conversation.type === 'group' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        conversation.name?.[0] || '?'
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">
                        {conversation.name || 'Conversation privée'}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conversation.last_message_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message?.content || 'Aucun message'}
                    </p>
                  </div>
                  {conversation.unread_count && conversation.unread_count > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Zone de chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* En-tête de conversation */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {selectedConversation.type === 'group' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        selectedConversation.name?.[0] || '?'
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {selectedConversation.name || 'Conversation privée'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.type === 'group' ? 'Groupe' : 'En ligne'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInitiateCall('audio')}
                    disabled={isInCall}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInitiateCall('video')}
                    disabled={isInCall}
                  >
                    <VideoIcon className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Settings className="w-4 h-4 mr-2" />
                        Paramètres
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Aucun message dans cette conversation
                </div>
              ) : (
                messages.map(renderMessage)
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Zone de saisie */}
            <div className="p-4 border-t bg-background">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareLocation}
                    disabled={isSending}
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <Input
                    placeholder="Tapez votre message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSending}
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">Sélectionnez une conversation</h3>
              <p>Choisissez une conversation pour commencer à discuter</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
