import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Users, Bell, Phone, Video, 
  Mail, Megaphone, Settings, Activity, TrendingUp,
  CheckCircle, Clock, AlertCircle, UserPlus
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'call' | 'announcement' | 'system';
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
  priority: 'normal' | 'important' | 'urgent';
  isRead: boolean;
}

export default function CommunicationModule() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('notifications');

  // Données mockées
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Nouveau message',
      message: 'Marie Diallo vous a envoyé un message',
      type: 'message',
      timestamp: 'Il y a 5 minutes',
      isRead: false,
      priority: 'medium'
    },
    {
      id: '2',
      title: 'Appel manqué',
      message: 'Amadou Ba a essayé de vous appeler',
      type: 'call',
      timestamp: 'Il y a 1 heure',
      isRead: false,
      priority: 'high'
    },
    {
      id: '3',
      title: 'Annonce importante',
      message: 'Nouvelle politique de l\'entreprise publiée',
      type: 'announcement',
      timestamp: 'Il y a 2 heures',
      isRead: true,
      priority: 'high'
    },
    {
      id: '4',
      title: 'Système',
      message: 'Mise à jour du système terminée',
      type: 'system',
      timestamp: 'Hier',
      isRead: true,
      priority: 'low'
    }
  ]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      title: 'Nouvelle politique de sécurité',
      content: 'Nous mettons en place de nouvelles mesures de sécurité pour protéger vos données...',
      author: 'Administrateur',
      timestamp: 'Il y a 2 heures',
      priority: 'urgent',
      isRead: false
    },
    {
      id: '2',
      title: 'Formation obligatoire',
      content: 'Une session de formation sur les nouvelles fonctionnalités aura lieu vendredi...',
      author: 'RH',
      timestamp: 'Il y a 1 jour',
      priority: 'important',
      isRead: true
    },
    {
      id: '3',
      title: 'Maintenance système',
      content: 'Le système sera en maintenance dimanche de 2h à 6h...',
      author: 'IT',
      timestamp: 'Il y a 2 jours',
      priority: 'normal',
      isRead: true
    }
  ]);

  const markAsRead = (id: string, type: 'notification' | 'announcement') => {
    if (type === 'notification') {
      setNotifications(prev => prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      ));
    } else {
      setAnnouncements(prev => prev.map(ann => 
        ann.id === id ? { ...ann, isRead: true } : ann
      ));
    }
    
    toast({
      title: "Marqué comme lu",
      description: "L'élément a été marqué comme lu",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'important':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'normal':
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      case 'system':
        return <Settings className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const unreadAnnouncements = announcements.filter(a => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="mt-2">
                {unreadCount} non lues
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Annonces</p>
                <p className="text-2xl font-bold">{announcements.length}</p>
              </div>
              <Megaphone className="w-8 h-8 text-orange-600" />
            </div>
            {unreadAnnouncements > 0 && (
              <Badge variant="destructive" className="mt-2">
                {unreadAnnouncements} non lues
              </Badge>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Messages</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Appels</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <Phone className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interface à onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="w-4 h-4 mr-2" />
            Annonces
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </TabsTrigger>
        </TabsList>

        {/* Onglet Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications récentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">{notification.timestamp}</span>
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(notification.id, 'notification')}
                            >
                              Marquer comme lu
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Annonces */}
        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Annonces
                </CardTitle>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Nouvelle annonce
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                      !announcement.isRead ? 'bg-orange-50 border-orange-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{announcement.title}</h3>
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority}
                          </Badge>
                          {!announcement.isRead && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{announcement.content}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Par {announcement.author} • {announcement.timestamp}
                          </div>
                          {!announcement.isRead && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(announcement.id, 'announcement')}
                            >
                              Marquer comme lu
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Messages */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Messages récents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Utilisez l'onglet "Communication" pour accéder aux messages</p>
                <Button className="mt-4">
                  Ouvrir les messages
                </Button>
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
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notifications push</p>
                      <p className="text-sm text-gray-600">Recevoir des notifications sur votre appareil</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Bell className="w-4 h-4 mr-2" />
                      Activé
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notifications email</p>
                      <p className="text-sm text-gray-600">Recevoir des notifications par email</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Activé
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Son des notifications</p>
                      <p className="text-sm text-gray-600">Jouer un son pour les nouvelles notifications</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Activé
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold">Messages</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Statut en ligne</p>
                      <p className="text-sm text-gray-600">Afficher votre statut en ligne</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Activity className="w-4 h-4 mr-2" />
                      Visible
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Confirmation de lecture</p>
                      <p className="text-sm text-gray-600">Confirmer la lecture des messages</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Activé
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}