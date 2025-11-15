/**
 * SYSTÈME DE COMMUNICATION SYNDICALE ULTRA PROFESSIONNEL
 * Interface complète pour la messagerie et annonces
 * 224Solutions - Bureau Syndicat System
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Bell, Users, Megaphone, Mail, Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface SyndicateCommunicationProps {
    bureauId: string;
}

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    type: 'message' | 'announcement' | 'claim';
    read: boolean;
}

interface Announcement {
    id: string;
    title: string;
    content: string;
    author: string;
    timestamp: string;
    priority: 'low' | 'medium' | 'high';
}

export default function SyndicateCommunication({ bureauId }: SyndicateCommunicationProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
    const [activeTab, setActiveTab] = useState<'messages' | 'announcements' | 'claims'>('messages');
    const [searchTerm, setSearchTerm] = useState('');

    // Statistiques en temps réel
    const [commStats, setCommStats] = useState({
        totalMessages: 0,
        unreadMessages: 0,
        announcements: 0,
        claims: 0
    });

    useEffect(() => {
        loadCommunicationData();
    }, [bureauId]);

    const loadCommunicationData = async () => {
        try {
            // Simuler le chargement des données
            const mockMessages: Message[] = [
                {
                    id: '1',
                    sender: 'Président Bureau',
                    content: 'Réunion mensuelle prévue pour le 15 octobre',
                    timestamp: new Date().toISOString(),
                    type: 'message',
                    read: false
                },
                {
                    id: '2',
                    sender: 'Secrétaire',
                    content: 'Nouveaux membres ajoutés au syndicat',
                    timestamp: new Date().toISOString(),
                    type: 'message',
                    read: true
                }
            ];

            const mockAnnouncements: Announcement[] = [
                {
                    id: '1',
                    title: 'Réunion Extraordinaire',
                    content: 'Une réunion extraordinaire est prévue le 20 octobre pour discuter des nouvelles réglementations.',
                    author: 'Président',
                    timestamp: new Date().toISOString(),
                    priority: 'high'
                }
            ];

            setMessages(mockMessages);
            setAnnouncements(mockAnnouncements);

            setCommStats({
                totalMessages: mockMessages.length,
                unreadMessages: mockMessages.filter(m => !m.read).length,
                announcements: mockAnnouncements.length,
                claims: 0
            });
        } catch (error) {
            console.error('Erreur chargement communication:', error);
            toast.error('Erreur lors du chargement des données');
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const message: Message = {
                id: Date.now().toString(),
                sender: 'Vous',
                content: newMessage,
                timestamp: new Date().toISOString(),
                type: 'message',
                read: true
            };

            setMessages(prev => [message, ...prev]);
            setNewMessage('');
            setCommStats(prev => ({ ...prev, totalMessages: prev.totalMessages + 1 }));
            toast.success('Message envoyé avec succès');
        } catch (error) {
            console.error('Erreur envoi message:', error);
            toast.error('Erreur lors de l\'envoi du message');
        }
    };

    const publishAnnouncement = async () => {
        if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }

        try {
            const announcement: Announcement = {
                id: Date.now().toString(),
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                author: 'Président',
                timestamp: new Date().toISOString(),
                priority: 'medium'
            };

            setAnnouncements(prev => [announcement, ...prev]);
            setNewAnnouncement({ title: '', content: '' });
            setCommStats(prev => ({ ...prev, announcements: prev.announcements + 1 }));
            toast.success('Annonce publiée avec succès');
        } catch (error) {
            console.error('Erreur publication annonce:', error);
            toast.error('Erreur lors de la publication');
        }
    };

    return (
        <div className="space-y-6">
            {/* Statistiques en temps réel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 text-center">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-blue-600">{commStats.totalMessages}</div>
                        <div className="text-sm text-gray-600">Messages</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold text-orange-600">{commStats.unreadMessages}</div>
                        <div className="text-sm text-gray-600">Non lus</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Megaphone className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-green-600">{commStats.announcements}</div>
                        <div className="text-sm text-gray-600">Annonces</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <div className="text-2xl font-bold text-red-600">{commStats.claims}</div>
                        <div className="text-sm text-gray-600">Revendications</div>
                    </CardContent>
                </Card>
            </div>

            {/* Onglets de navigation */}
            <div className="flex space-x-4 border-b">
                <Button
                    variant={activeTab === 'messages' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('messages')}
                >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                </Button>
                <Button
                    variant={activeTab === 'announcements' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('announcements')}
                >
                    <Megaphone className="w-4 h-4 mr-2" />
                    Annonces
                </Button>
                <Button
                    variant={activeTab === 'claims' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('claims')}
                >
                    <Users className="w-4 h-4 mr-2" />
                    Revendications
                </Button>
            </div>

            {/* Contenu des onglets */}
            {activeTab === 'messages' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Liste des messages */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Messages Récents
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <Input
                                            placeholder="Rechercher..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-48"
                                        />
                                    </div>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {messages
                                    .filter(msg =>
                                        searchTerm === '' ||
                                        msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        msg.sender.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((message) => (
                                        <div key={message.id} className={`p-4 rounded-lg border ${!message.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm text-gray-700">{message.sender}</div>
                                                    <div className="text-gray-600 mt-1">{message.content}</div>
                                                </div>
                                                <div className="text-xs text-gray-500 ml-2">
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Envoi de nouveau message */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Nouveau Message</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Textarea
                                    placeholder="Tapez votre message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    rows={4}
                                />
                                <Button onClick={sendMessage} className="w-full">
                                    <Send className="w-4 h-4 mr-2" />
                                    Envoyer Message
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'announcements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Liste des annonces */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Annonces Publiées</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {announcements.map((announcement) => (
                                    <div key={announcement.id} className="p-4 rounded-lg border bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm text-gray-700">{announcement.title}</div>
                                                <div className="text-gray-600 mt-1 text-sm">{announcement.content}</div>
                                                <div className="text-xs text-gray-500 mt-2">
                                                    Par {announcement.author} • {new Date(announcement.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            <Badge variant={announcement.priority === 'high' ? 'destructive' : 'secondary'}>
                                                {announcement.priority}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Publication d'annonce */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Publier une Annonce</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Titre de l'annonce"
                                    value={newAnnouncement.title}
                                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                                />
                                <Textarea
                                    placeholder="Contenu de l'annonce..."
                                    value={newAnnouncement.content}
                                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                                    rows={4}
                                />
                                <Button onClick={publishAnnouncement} className="w-full">
                                    <Megaphone className="w-4 h-4 mr-2" />
                                    Publier Annonce
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'claims' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Revendications Collectives</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                Dialogue Social
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Canal officiel pour les revendications et négociations
                            </p>
                            <div className="space-y-2">
                                <Badge variant="outline">Médiation automatique</Badge>
                                <Badge variant="outline">Suivi des négociations</Badge>
                                <Badge variant="outline">Historique inviolable</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
