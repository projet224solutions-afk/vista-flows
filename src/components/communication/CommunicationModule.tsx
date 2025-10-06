import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Megaphone, Users, Settings, MessageSquare, 
  Send, Plus, CheckCircle, Clock, AlertCircle
} from "lucide-react";

export default function CommunicationModule() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('notifications');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  // Données mockées
  const notifications = [
    {
      id: '1',
      title: 'Nouveau message reçu',
      message: 'Vous avez reçu un message de Marie Diallo',
      timestamp: 'Il y a 5 minutes',
      isRead: false,
      type: 'message'
    },
    {
      id: '2',
      title: 'Annonce importante',
      message: 'Réunion du bureau syndical demain à 14h',
      timestamp: 'Il y a 1 heure',
      isRead: true,
      type: 'announcement'
    },
    {
      id: '3',
      title: 'Système mis à jour',
      message: 'Le système a été mis à jour avec de nouvelles fonctionnalités',
      timestamp: 'Il y a 2 heures',
      isRead: true,
      type: 'system'
    }
  ];

  const announcements = [
    {
      id: '1',
      title: 'Réunion du bureau syndical',
      content: 'La prochaine réunion du bureau syndical aura lieu demain à 14h dans la salle de conférence.',
      author: 'Président du Bureau',
      timestamp: 'Il y a 2 heures',
      priority: 'high'
    },
    {
      id: '2',
      title: 'Nouvelles procédures',
      content: 'Veuillez noter les nouvelles procédures de communication qui entrent en vigueur cette semaine.',
      author: 'Secrétaire Général',
      timestamp: 'Il y a 1 jour',
      priority: 'medium'
    }
  ];

  const handleSendAnnouncement = () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Annonce publiée",
      description: "Votre annonce a été publiée avec succès",
    });

    setAnnouncementTitle('');
    setAnnouncementContent('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      case 'system':
        return <Settings className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">🔔 Notifications</TabsTrigger>
          <TabsTrigger value="announcements">📢 Annonces</TabsTrigger>
          <TabsTrigger value="statistics">📊 Statistiques</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Paramètres</TabsTrigger>
        </TabsList>

        {/* Onglet Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Notifications récentes</CardTitle>
                <Badge variant="outline">
                  {notifications.filter(n => !n.isRead).length} non lues
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.isRead 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {notification.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {!notification.isRead && (
                          <div className="mt-2">
                            <Badge variant="destructive" className="text-xs">
                              Nouveau
                            </Badge>
                          </div>
                        )}
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
          {/* Formulaire d'annonce */}
          <Card>
            <CardHeader>
              <CardTitle>Publier une annonce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Titre de l'annonce</label>
                <Input
                  placeholder="Entrez le titre..."
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contenu</label>
                <Textarea
                  placeholder="Entrez le contenu de l'annonce..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={handleSendAnnouncement} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Publier l'annonce
              </Button>
            </CardContent>
          </Card>

          {/* Liste des annonces */}
          <Card>
            <CardHeader>
              <CardTitle>Annonces récentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{announcement.title}</h3>
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority === 'high' ? 'Urgent' :
                             announcement.priority === 'medium' ? 'Important' : 'Normal'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Par {announcement.author}</span>
                          <span>{announcement.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Statistiques */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Messages envoyés</p>
                    <p className="text-2xl font-bold">1,234</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Utilisateurs actifs</p>
                    <p className="text-2xl font-bold">89</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Bell className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Notifications</p>
                    <p className="text-2xl font-bold">456</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Message envoyé avec succès</p>
                    <p className="text-xs text-gray-500">Il y a 2 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Annonce programmée</p>
                    <p className="text-xs text-gray-500">Il y a 15 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Notification en attente</p>
                    <p className="text-xs text-gray-500">Il y a 1 heure</p>
                  </div>
                </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Notifications push</h3>
                  <p className="text-sm text-gray-600">Recevoir des notifications sur votre appareil</p>
                </div>
                <Button variant="outline" size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Activées
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Notifications email</h3>
                  <p className="text-sm text-gray-600">Recevoir des notifications par email</p>
                </div>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Activées
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Annonces automatiques</h3>
                  <p className="text-sm text-gray-600">Recevoir automatiquement les annonces importantes</p>
                </div>
                <Button variant="outline" size="sm">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Activées
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Button className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Sauvegarder les paramètres
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}