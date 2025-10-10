/**
 * 💬 INTERFACE COMMUNICATION AGORA COMPLÈTE - 224SOLUTIONS
 * Interface unifiée pour messagerie, appels audio et vidéo
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAgora } from '@/hooks/useAgora';
import { useCommunicationData } from '@/hooks/useCommunicationData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AgoraVideoCall from './AgoraVideoCall';
import AgoraAudioCall from './AgoraAudioCall';
import { 
  MessageSquare, 
  Phone, 
  Video, 
  Users, 
  Search, 
  Plus,
  Settings,
  Bell,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Send,
  CheckCircle,
  Clock,
  Wifi
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'online' | 'busy' | 'offline';
  avatar?: string;
  lastSeen?: string;
}

export default function AgoraCommunicationInterface() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [newMessage, setNewMessage] = useState('');
  const [localActiveConv, setLocalActiveConv] = useState<string | null>(null);

  // Hooks pour les données
  const {
    conversations,
    messages,
    contacts,
    loading: dataLoading,
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation
  } = useCommunicationData();

  const {
    callState,
    isInitialized,
    isLoading: agoraLoading,
    initializeAgora,
    startCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useAgora();

  // Initialiser Agora au montage
  useEffect(() => {
    if (user?.id && !isInitialized) {
      // Configuration Agora (à remplacer par les vraies clés du vault)
      const agoraConfig = {
        appId: process.env.REACT_APP_AGORA_APP_ID || 'your-app-id',
        appCertificate: process.env.REACT_APP_AGORA_APP_CERTIFICATE || 'your-app-certificate'
      };
      
      initializeAgora(agoraConfig);
    }
  }, [user?.id, isInitialized, initializeAgora]);

  // Charger les conversations
  useEffect(() => {
    if (user?.id) {
      loadConversations(user.id);
    }
  }, [user?.id, loadConversations]);

  const handleStartCall = async (contact: any, type: 'audio' | 'video') => {
    if (!isInitialized) {
      toast({
        title: "❌ Erreur",
        description: "Service de communication non initialisé",
        variant: "destructive"
      });
      return;
    }

    setSelectedContact(contact);
    setCallType(type);
    setShowCallDialog(true);

    try {
      await startCall(contact.id, type === 'video');
    } catch (error) {
      console.error('Erreur démarrage appel:', error);
      toast({
        title: "❌ Erreur appel",
        description: "Impossible de démarrer l'appel",
        variant: "destructive"
      });
    }
  };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !localActiveConv) return;

        try {
            await sendMessage(localActiveConv, newMessage.trim(), user?.id || '');
            setNewMessage('');
        } catch (error) {
            console.error('Erreur envoi message:', error);
            toast({
                title: "❌ Erreur",
                description: "Impossible d'envoyer le message",
                variant: "destructive"
            });
        }
    };

    const handleCreateConversation = async (contact: Contact) => {
        try {
            const conversation = await createConversation([contact.id], `Chat avec ${contact.name}`);
            if (conversation?.id) {
                setLocalActiveConv(conversation.id);
                setActiveTab('chat');
            }
        } catch (error) {
            console.error('Erreur création conversation:', error);
        }
    };

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="w-full h-full flex flex-col">
      {/* En-tête */}
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Communication 224SOLUTIONS
          {isInitialized && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Agora connecté
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">💬 Chat</TabsTrigger>
            <TabsTrigger value="contacts">👥 Contacts</TabsTrigger>
            <TabsTrigger value="calls">📞 Appels</TabsTrigger>
          </TabsList>

          {/* Onglet Chat */}
          <TabsContent value="chat" className="flex-1 flex flex-col">
            <div className="flex-1 flex">
              {/* Liste des conversations */}
              <div className="w-1/3 border-r p-4">
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        localActiveConv === conv.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setLocalActiveConv(conv.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={conv.avatar} />
                          <AvatarFallback>
                            {conv.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{conv.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage}
                          </div>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone de chat active */}
              <div className="flex-1 flex flex-col">
                {localActiveConv ? (
                  <>
                    {/* En-tête de conversation */}
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={conversations.find(c => c.id === localActiveConv)?.avatar} />
                          <AvatarFallback>
                            {conversations.find(c => c.id === localActiveConv)?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{conversations.find(c => c.id === localActiveConv)?.name}</div>
                          <div className="text-sm text-muted-foreground">En ligne</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!isInitialized}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          disabled={!isInitialized}
                        >
                          <Video className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs p-3 rounded-lg ${
                              message.isOwn
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100'
                            }`}
                          >
                            <div className="text-sm">{message.content}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {message.timestamp}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Zone de saisie */}
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Tapez votre message..."
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Sélectionnez une conversation
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Onglet Contacts */}
          <TabsContent value="contacts" className="flex-1">
            <div className="space-y-4">
              {/* Barre de recherche */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Liste des contacts */}
              <div className="grid gap-3">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback>
                          {contact.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {contact.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contact.status === 'online' ? 'En ligne' : 
                           contact.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateConversation(contact)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall(contact, 'audio')}
                        disabled={!isInitialized}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartCall(contact, 'video')}
                        disabled={!isInitialized}
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Onglet Appels */}
          <TabsContent value="calls" className="flex-1">
            <div className="text-center text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Historique des appels</p>
              <p className="text-sm">Fonctionnalité en développement</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog d'appel */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {callType === 'video' ? 'Appel vidéo' : 'Appel vocal'}
            </DialogTitle>
          </DialogHeader>
              {selectedContact && (
                <>
                  {callType === 'video' ? (
                    <AgoraVideoCall
                      channel={`call_${user?.id}_${selectedContact.id}_${Date.now()}`}
                      callerInfo={{
                        name: selectedContact.name,
                        avatar: selectedContact.avatar,
                        userId: selectedContact.id
                      }}
                      onCallEnd={() => setShowCallDialog(false)}
                    />
                  ) : (
                    <AgoraAudioCall
                      channel={`call_${user?.id}_${selectedContact.id}_${Date.now()}`}
                      callerInfo={{
                        name: selectedContact.name,
                        avatar: selectedContact.avatar,
                        userId: selectedContact.id
                      }}
                      onCallEnd={() => setShowCallDialog(false)}
                    />
                  )}
                </>
              )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
