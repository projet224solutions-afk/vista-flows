/**
 * 💬 INTERFACE DE COMMUNICATION SIMPLIFIÉE - 224SOLUTIONS
 * Interface de communication fonctionnelle avec chat et appels
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Search,
  Send,
  PhoneOff,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import SimpleCommunicationService, { 
  SimpleConversation, 
  SimpleMessage, 
  SimpleCall 
} from "@/services/SimpleCommunicationService";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SimpleCommunicationInterfaceProps {
  className?: string;
}

export default function SimpleCommunicationInterface({ className }: SimpleCommunicationInterfaceProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SimpleConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SimpleConversation | null>(null);
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; first_name?: string; last_name?: string }>>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [currentCall, setCurrentCall] = useState<SimpleCall | null>(null);
  const [callHistory, setCallHistory] = useState<SimpleCall[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les conversations
  useEffect(() => {
    if (user) {
      loadConversations();
      loadCallHistory();
    }
  }, [user]);

  // Charger les messages de la conversation sélectionnée
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const convs = await SimpleCommunicationService.getConversations(user.id);
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await SimpleCommunicationService.getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const loadCallHistory = async () => {
    if (!user) return;
    
    try {
      const history = await SimpleCommunicationService.getCallHistory(user.id);
      setCallHistory(history);
    } catch (error) {
      console.error('Error loading call history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      const message = await SimpleCommunicationService.sendMessage(
        selectedConversation.id,
        user.id,
        newMessage.trim()
      );

      if (message) {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        await loadConversations(); // Rafraîchir la liste
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await SimpleCommunicationService.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleStartConversation = async (userId: string) => {
    if (!user) return;

    try {
      const conversation = await SimpleCommunicationService.createPrivateConversation(user.id, userId);
      if (conversation) {
        setSelectedConversation(conversation);
        setConversations(prev => [conversation, ...prev]);
        setShowNewChatDialog(false);
        setSearchQuery('');
        setSearchResults([]);
        toast.success('Conversation créée');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
    }
  };

  const handleInitiateCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation || !user) return;

    const otherParticipant = selectedConversation.participants.find(p => p !== user.id);
    if (!otherParticipant) return;

    try {
      const call = await SimpleCommunicationService.initiateCall(
        selectedConversation.id,
        user.id,
        otherParticipant,
        type
      );

      if (call) {
        setCurrentCall(call);
        setIsInCall(true);
        toast.success(`${type === 'video' ? 'Appel vidéo' : 'Appel audio'} initié`);
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Erreur lors de l\'initiation de l\'appel');
    }
  };

  const handleEndCall = async () => {
    if (!currentCall) return;

    try {
      await SimpleCommunicationService.updateCallStatus(currentCall.id, 'ended');
      setCurrentCall(null);
      setIsInCall(false);
      await loadCallHistory();
      toast.success('Appel terminé');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    return conv.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Veuillez vous connecter pour accéder à la communication</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="calls">Appels</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </TabsList>

            {/* ONGLET CHAT */}
            <TabsContent value="chat" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Liste des conversations */}
                <div className="lg:col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Input
                      placeholder="Rechercher une conversation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Users className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nouvelle conversation</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Rechercher un utilisateur..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              handleSearchUsers(e.target.value);
                            }}
                          />
                          <ScrollArea className="h-48">
                            <div className="space-y-2">
                              {searchResults.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                                  onClick={() => handleStartConversation(user.id)}
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {user.first_name?.[0] || user.email[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">
                                      {user.first_name} {user.last_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {isLoading ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">Chargement...</p>
                        </div>
                      ) : filteredConversations.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">Aucune conversation</p>
                        </div>
                      ) : (
                        filteredConversations.map((conversation) => (
                          <div
                            key={conversation.id}
                            className={`p-3 rounded cursor-pointer hover:bg-muted ${
                              selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {conversation.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{conversation.name}</p>
                                {conversation.last_message && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {conversation.last_message}
                                  </p>
                                )}
                              </div>
                              {conversation.unread_count > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Zone de chat */}
                <div className="lg:col-span-2">
                  {selectedConversation ? (
                    <div className="border rounded-lg h-96 flex flex-col">
                      {/* En-tête de la conversation */}
                      <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {selectedConversation.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{selectedConversation.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedConversation.type === 'private' ? 'Conversation privée' : 'Groupe'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInitiateCall('audio')}
                            disabled={isInCall}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInitiateCall('video')}
                            disabled={isInCall}
                          >
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.sender_id === user.id ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-xs p-3 rounded-lg ${
                                  message.sender_id === user.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>

                      {/* Zone de saisie */}
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Tapez votre message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSendMessage();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96 flex items-center justify-center border rounded-lg">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Sélectionnez une conversation</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ONGLET APPELS */}
            <TabsContent value="calls" className="space-y-4">
              <div className="space-y-4">
                {isInCall && currentCall && (
                  <Card className="border-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                          <div>
                            <p className="font-medium">
                              {currentCall.type === 'video' ? 'Appel vidéo' : 'Appel audio'} en cours
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Depuis {format(new Date(currentCall.started_at), 'HH:mm', { locale: fr })}
                            </p>
                          </div>
                        </div>
                        <Button onClick={handleEndCall} variant="destructive">
                          <PhoneOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <h3 className="font-medium mb-3">Historique des appels</h3>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {callHistory.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">Aucun appel dans l'historique</p>
                        </div>
                      ) : (
                        callHistory.map((call) => (
                          <div key={call.id} className="flex items-center gap-3 p-3 border rounded">
                            <div className="flex-shrink-0">
                              {call.type === 'video' ? (
                                <Video className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Phone className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {call.type === 'video' ? 'Appel vidéo' : 'Appel audio'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(call.started_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={call.status === 'ended' ? 'secondary' : 'default'}>
                                {call.status === 'ended' ? 'Terminé' : call.status}
                              </Badge>
                              {call.duration && (
                                <p className="text-sm text-muted-foreground">
                                  {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            {/* ONGLET CONTACTS */}
            <TabsContent value="contacts" className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Rechercher des utilisateurs</h3>
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                />
                <ScrollArea className="h-64 mt-4">
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 border rounded">
                        <Avatar>
                          <AvatarFallback>
                            {user.first_name?.[0] || user.email[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStartConversation(user.id)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
