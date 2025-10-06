import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Send, Users, Bell, Phone, Video, 
  Search, Plus, MoreHorizontal, CheckCircle, Clock,
  AlertCircle, User, Mail, Settings
} from "lucide-react";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  status: 'sent' | 'delivered' | 'read';
}

interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen?: string;
}

interface Conversation {
  id: string;
  contact: Contact;
  lastMessage: Message;
  unreadCount: number;
  isActive: boolean;
}

export default function SimpleCommunicationInterface() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Données mockées pour la démo
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      contact: {
        id: '1',
        name: 'Marie Diallo',
        email: 'marie@example.com',
        status: 'online',
        lastSeen: 'Il y a 2 minutes'
      },
      lastMessage: {
        id: '1',
        sender: 'Marie Diallo',
        content: 'Salut ! Comment ça va ?',
        timestamp: '14:30',
        type: 'text',
        status: 'read'
      },
      unreadCount: 0,
      isActive: false
    },
    {
      id: '2',
      contact: {
        id: '2',
        name: 'Amadou Ba',
        email: 'amadou@example.com',
        status: 'busy',
        lastSeen: 'Il y a 1 heure'
      },
      lastMessage: {
        id: '2',
        sender: 'Amadou Ba',
        content: 'Merci pour l\'information',
        timestamp: '13:45',
        type: 'text',
        status: 'delivered'
      },
      unreadCount: 2,
      isActive: false
    },
    {
      id: '3',
      contact: {
        id: '3',
        name: 'Fatou Sall',
        email: 'fatou@example.com',
        status: 'offline',
        lastSeen: 'Hier'
      },
      lastMessage: {
        id: '3',
        sender: 'Fatou Sall',
        content: 'À bientôt !',
        timestamp: 'Hier 18:30',
        type: 'text',
        status: 'read'
      },
      unreadCount: 0,
      isActive: false
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'Marie Diallo',
      content: 'Salut ! Comment ça va ?',
      timestamp: '14:30',
      type: 'text',
      status: 'read'
    },
    {
      id: '2',
      sender: 'Vous',
      content: 'Ça va bien, merci ! Et toi ?',
      timestamp: '14:32',
      type: 'text',
      status: 'read'
    },
    {
      id: '3',
      sender: 'Marie Diallo',
      content: 'Très bien aussi ! J\'ai une question sur le projet...',
      timestamp: '14:35',
      type: 'text',
      status: 'read'
    }
  ]);

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Marie Diallo',
      email: 'marie@example.com',
      status: 'online',
      lastSeen: 'Il y a 2 minutes'
    },
    {
      id: '2',
      name: 'Amadou Ba',
      email: 'amadou@example.com',
      status: 'busy',
      lastSeen: 'Il y a 1 heure'
    },
    {
      id: '3',
      name: 'Fatou Sall',
      email: 'fatou@example.com',
      status: 'offline',
      lastSeen: 'Hier'
    },
    {
      id: '4',
      name: 'Ibrahim Traoré',
      email: 'ibrahim@example.com',
      status: 'online',
      lastSeen: 'Maintenant'
    }
  ]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      sender: 'Vous',
      content: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: 'text',
      status: 'sent'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simuler une réponse automatique
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: conversations.find(c => c.id === selectedConversation)?.contact.name || 'Contact',
        content: 'Message reçu, merci !',
        timestamp: new Date().toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        type: 'text',
        status: 'read'
      };
      setMessages(prev => [...prev, response]);
    }, 1000);

    toast({
      title: "Message envoyé",
      description: "Votre message a été envoyé avec succès",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    setConversations(prev => prev.map(conv => ({
      ...conv,
      isActive: conv.id === conversationId,
      unreadCount: conv.id === conversationId ? 0 : conv.unreadCount
    })));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case 'busy':
        return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      case 'offline':
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'busy':
        return 'text-red-600';
      case 'offline':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find(conv => conv.isActive);

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">💬 Chat</TabsTrigger>
          <TabsTrigger value="contacts">👥 Contacts</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Paramètres</TabsTrigger>
        </TabsList>

        {/* Onglet Chat */}
        <TabsContent value="chat" className="h-full space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Liste des conversations */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <div className="space-y-1">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => selectConversation(conversation.id)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          conversation.isActive ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={conversation.contact.avatar} />
                              <AvatarFallback>
                                {conversation.contact.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1">
                              {getStatusIcon(conversation.contact.status)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">
                                {conversation.contact.name}
                              </p>
                              <span className="text-xs text-gray-500">
                                {conversation.lastMessage.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {conversation.lastMessage.content}
                            </p>
                          </div>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Zone de chat */}
            <Card className="lg:col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* En-tête de conversation */}
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={activeConversation?.contact.avatar} />
                          <AvatarFallback>
                            {activeConversation?.contact.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          {getStatusIcon(activeConversation?.contact.status || 'offline')}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold">{activeConversation?.contact.name}</h3>
                        <p className={`text-sm ${getStatusColor(activeConversation?.contact.status || 'offline')}`}>
                          {activeConversation?.contact.status === 'online' ? 'En ligne' : 
                           activeConversation?.contact.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                        </p>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-80 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'Vous' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.sender === 'Vous'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs opacity-70">
                                  {message.timestamp}
                                </span>
                                {message.sender === 'Vous' && (
                                  <div className="ml-2">
                                    {message.status === 'read' ? (
                                      <CheckCircle className="w-3 h-3 text-blue-300" />
                                    ) : message.status === 'delivered' ? (
                                      <div className="flex">
                                        <CheckCircle className="w-3 h-3 text-blue-300" />
                                        <CheckCircle className="w-3 h-3 text-blue-300 -ml-1" />
                                      </div>
                                    ) : (
                                      <Clock className="w-3 h-3 text-blue-300" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>

                  {/* Zone de saisie */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Tapez votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Sélectionnez une conversation pour commencer à chatter</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Onglet Contacts */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contacts</CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback>
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          {getStatusIcon(contact.status)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{contact.name}</h3>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                        <p className={`text-xs ${getStatusColor(contact.status)}`}>
                          {contact.status === 'online' ? 'En ligne' : 
                           contact.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                          {contact.lastSeen && ` • ${contact.lastSeen}`}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Paramètres */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-sm text-gray-600">Recevoir des notifications pour les nouveaux messages</p>
                </div>
                <Button variant="outline" size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Activées
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Son des messages</h3>
                  <p className="text-sm text-gray-600">Jouer un son lors de la réception de messages</p>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Activé
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Statut en ligne</h3>
                  <p className="text-sm text-gray-600">Afficher votre statut en ligne aux autres utilisateurs</p>
                </div>
                <Button variant="outline" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Visible
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}