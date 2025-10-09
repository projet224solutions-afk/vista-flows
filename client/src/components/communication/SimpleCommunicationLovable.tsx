/**
 * Version ultra-simplifiée pour Lovable
 * 224SOLUTIONS - Communication Interface for Lovable
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Send, Users, Bell, Phone, Video, 
  Search, Plus, CheckCircle, Clock, User, Settings
} from "lucide-react";

export default function SimpleCommunicationLovable() {
  const [activeTab, setActiveTab] = useState('chat');
  const [newMessage, setNewMessage] = useState('');

  // Données mockées statiques
  const conversations = [
    {
      id: '1',
      name: 'Marie Diallo',
      lastMessage: 'Salut ! Comment ça va ?',
      timestamp: '14:30',
      unreadCount: 0,
      status: 'online'
    },
    {
      id: '2',
      name: 'Amadou Ba',
      lastMessage: 'Merci pour l\'information',
      timestamp: '13:45',
      unreadCount: 2,
      status: 'busy'
    },
    {
      id: '3',
      name: 'Fatou Sall',
      lastMessage: 'À bientôt !',
      timestamp: 'Hier 18:30',
      unreadCount: 0,
      status: 'offline'
    }
  ];

  const messages = [
    {
      id: '1',
      sender: 'Marie Diallo',
      content: 'Salut ! Comment ça va ?',
      timestamp: '14:30',
      isOwn: false
    },
    {
      id: '2',
      sender: 'Vous',
      content: 'Ça va bien, merci ! Et toi ?',
      timestamp: '14:32',
      isOwn: true
    },
    {
      id: '3',
      sender: 'Marie Diallo',
      content: 'Très bien aussi ! J\'ai une question sur le projet...',
      timestamp: '14:35',
      isOwn: false
    }
  ];

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    console.log('Message envoyé:', newMessage);
    setNewMessage('');
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

  return (
    <div className="h-full bg-white">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">💬 Chat</TabsTrigger>
          <TabsTrigger value="contacts">👥 Contacts</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Paramètres</TabsTrigger>
        </TabsList>

        {/* Onglet Chat */}
        <TabsContent value="chat" className="space-y-4">
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
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            {getStatusIcon(conversation.status)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {conversation.name}
                            </p>
                            <span className="text-xs text-gray-500">
                              {conversation.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.lastMessage}
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
              </CardContent>
            </Card>

            {/* Zone de chat */}
            <Card className="lg:col-span-2 flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      {getStatusIcon('online')}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Marie Diallo</h3>
                    <p className="text-sm text-green-600">En ligne</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0">
                <div className="h-80 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.isOwn
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-70">
                              {message.timestamp}
                            </span>
                            {message.isOwn && (
                              <div className="ml-2">
                                <CheckCircle className="w-3 h-3 text-blue-300" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>

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
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
                {conversations.map((contact) => (
                  <div key={contact.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                          {getStatusIcon(contact.status)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{contact.name}</h3>
                        <p className={`text-xs ${getStatusColor(contact.status)}`}>
                          {contact.status === 'online' ? 'En ligne' : 
                           contact.status === 'busy' ? 'Occupé' : 'Hors ligne'}
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
