// @ts-nocheck
/**
 * 💬 INTERFACE COMMUNICATION RÉELLE - 224SOLUTIONS
 * Interface opérationnelle avec vraies données utilisateurs
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCommunicationData } from '@/hooks/useCommunicationData';
import { useAgora } from '@/hooks/useAgora';
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
    Wifi,
    UserPlus,
    MoreVertical
} from 'lucide-react';

export default function RealCommunicationInterface() {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('chat');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContact, setSelectedContact] = useState<unknown>(null);
    const [showCallDialog, setShowCallDialog] = useState(false);
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [newMessage, setNewMessage] = useState('');
    const [showAddContact, setShowAddContact] = useState(false);

    // Hooks pour les vraies données
    const {
        conversations,
        messages,
        contacts,
        activeConversation,
        loading: dataLoading,
        error: dataError,
        loadConversations,
        loadMessages,
        sendMessage,
        createConversation,
        setActiveConversation,
        searchUsers,
        addContact
    } = useCommunicationData();

    const {
        callState,
        isInitialized,
        isLoading: agoraLoading,
        startCall,
        endCall,
        toggleMute,
        toggleVideo
    } = useAgora();

    // Agora s'initialise désormais à la demande (useAgora.joinCall/startCall).
    // On évite d'appeler l'edge function au montage afin de ne pas générer
    // des erreurs "Non autorisé" quand il n'y a pas de session Supabase.

    // Charger les vraies données
    useEffect(() => {
        if (user?.id) {
            loadConversations(user.id);
        }
    }, [user?.id, loadConversations]);

    const handleStartCall = async (contact: unknown, type: 'audio' | 'video') => {
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
        if (!newMessage.trim() || !activeConversation || !user?.id) return;

        try {
            await sendMessage(activeConversation.id, newMessage.trim(), user.id);
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

    const handleCreateConversation = async (contact: unknown) => {
        try {
            const conversation = await createConversation([contact.id], `Chat avec ${contact.first_name} ${contact.last_name}`);
            setActiveConversation(conversation);
            setActiveTab('chat');
        } catch (error) {
            console.error('Erreur création conversation:', error);
        }
    };

    const handleSearchUsers = async () => {
        if (!searchQuery.trim()) return;

        try {
            await searchUsers(searchQuery);
        } catch (error) {
            console.error('Erreur recherche utilisateurs:', error);
        }
    };

    const handleAddContact = async (contact: unknown) => {
        try {
            await addContact(contact.id);
            toast({
                title: "✅ Contact ajouté",
                description: `${contact.first_name} ${contact.last_name} ajouté à vos contacts`
            });
            setShowAddContact(false);
        } catch (error) {
            console.error('Erreur ajout contact:', error);
            toast({
                title: "❌ Erreur",
                description: "Impossible d'ajouter le contact",
                variant: "destructive"
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500';
            case 'busy': return 'bg-yellow-500';
            case 'offline': return 'bg-gray-400';
            default: return 'bg-gray-400';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'online': return 'En ligne';
            case 'busy': return 'Occupé';
            case 'offline': return 'Hors ligne';
            default: return 'Inconnu';
        }
    };

    if (dataLoading) {
        return (
            <Card className="w-full h-96">
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Chargement des communications...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (dataError) {
        return (
            <Card className="w-full h-96">
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center text-red-600">
                        <p>❌ Erreur de chargement</p>
                        <p className="text-sm">{dataError}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* En-tête */}
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
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
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddContact(true)}
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Ajouter contact
                        </Button>
                        <Button size="sm" variant="outline">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="chat">💬 Chat</TabsTrigger>
                        <TabsTrigger value="contacts">👥 Contacts</TabsTrigger>
                        <TabsTrigger value="calls">📞 Appels</TabsTrigger>
                    </TabsList>

                    {/* Onglet Chat */}
                    <TabsContent value="chat" className="flex-1 flex">
                        {/* Liste des conversations */}
                        <div className="w-1/3 border-r p-4">
                            <div className="space-y-2">
                                {conversations.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Aucune conversation</p>
                                        <p className="text-sm">Commencez par ajouter des contacts</p>
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div
                                            key={conv.id}
                                            className={`p-3 rounded-lg cursor-pointer transition-colors ${activeConversation?.id === conv.id
                                                    ? 'bg-blue-100 border-blue-300'
                                                    : 'hover:bg-gray-100'
                                                }`}
                                            onClick={() => setActiveConversation(conv)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={conv.avatar} />
                                                        <AvatarFallback>
                                                            {conv.name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(conv.status)}`}></div>
                                                </div>
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
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Zone de chat active */}
                        <div className="flex-1 flex flex-col">
                            {activeConversation ? (
                                <>
                                    {/* En-tête de conversation */}
                                    <div className="p-4 border-b flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar>
                                                    <AvatarImage src={activeConversation.avatar} />
                                                    <AvatarFallback>
                                                        {activeConversation.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(activeConversation.status)}`}></div>
                                            </div>
                                            <div>
                                                <div className="font-medium">{activeConversation.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {getStatusText(activeConversation.status)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleStartCall({ id: activeConversation.id, name: activeConversation.name }, 'audio')}
                                                disabled={!isInitialized}
                                            >
                                                <Phone className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleStartCall({ id: activeConversation.id, name: activeConversation.name }, 'video')}
                                                disabled={!isInitialized}
                                            >
                                                <Video className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.length === 0 ? (
                                            <div className="text-center text-muted-foreground py-8">
                                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p>Aucun message</p>
                                                <p className="text-sm">Commencez la conversation</p>
                                            </div>
                                        ) : (
                                            messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-xs p-3 rounded-lg ${message.isOwn
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
                                            ))
                                        )}
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
                                    <div className="text-center">
                                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg">Sélectionnez une conversation</p>
                                        <p className="text-sm">Ou commencez par ajouter des contacts</p>
                                    </div>
                                </div>
                            )}
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
                                <Button onClick={handleSearchUsers} disabled={!searchQuery.trim()}>
                                    Rechercher
                                </Button>
                            </div>

                            {/* Liste des contacts */}
                            <div className="grid gap-3">
                                {contacts.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>Aucun contact</p>
                                        <p className="text-sm">Ajoutez des contacts pour commencer</p>
                                    </div>
                                ) : (
                                    contacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar>
                                                        <AvatarImage src={contact.avatar} />
                                                        <AvatarFallback>
                                                            {contact.name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(contact.status)}`}></div>
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {contact.name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {getStatusText(contact.status)}
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
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Onglet Appels */}
                    <TabsContent value="calls" className="flex-1">
                        <div className="text-center text-muted-foreground py-8">
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
                                        name: `${selectedContact.first_name} ${selectedContact.last_name}`,
                                        avatar: selectedContact.avatar_url,
                                        userId: selectedContact.id
                                    }}
                                    onCallEnd={() => setShowCallDialog(false)}
                                />
                            ) : (
                                <AgoraAudioCall
                                    channel={`call_${user?.id}_${selectedContact.id}_${Date.now()}`}
                                    callerInfo={{
                                        name: `${selectedContact.first_name} ${selectedContact.last_name}`,
                                        avatar: selectedContact.avatar_url,
                                        userId: selectedContact.id
                                    }}
                                    onCallEnd={() => setShowCallDialog(false)}
                                />
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog ajouter contact */}
            <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Rechercher par nom ou email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button onClick={handleSearchUsers}>
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Recherchez des utilisateurs pour les ajouter à vos contacts
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
