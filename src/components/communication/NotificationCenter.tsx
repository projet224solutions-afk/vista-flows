/**
 * 🔔 CENTRE DE NOTIFICATIONS - 224SOLUTIONS
 * Composant pour gérer les notifications de communication
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  MessageSquare,
  Phone,
  Video,
  Users,
  Settings,
  Check,
  X,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Mock data pour les notifications
const mockNotifications = [
  {
    id: '1',
    type: 'message' as const,
    title: 'Nouveau message de Jean Dupont',
    body: 'Salut ! Comment ça va ?',
    timestamp: '2025-01-02T10:30:00Z',
    read: false,
    data: {
      conversation_id: 'conv1',
      sender_name: 'Jean Dupont'
    }
  },
  {
    id: '2',
    type: 'call' as const,
    title: 'Appel manqué de Marie Martin',
    body: 'Appel vidéo manqué',
    timestamp: '2025-01-02T09:15:00Z',
    read: false,
    data: {
      call_type: 'video',
      caller_name: 'Marie Martin'
    }
  },
  {
    id: '3',
    type: 'system' as const,
    title: 'Nouveau membre dans le groupe',
    body: 'Pierre Durand a rejoint le groupe "Équipe Vente"',
    timestamp: '2025-01-01T18:20:00Z',
    read: true,
    data: {
      group_name: 'Équipe Vente',
      member_name: 'Pierre Durand'
    }
  }
];

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    soundEnabled: true,
    emailNotifications: false,
    callNotifications: true,
    messageNotifications: true,
    groupNotifications: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00'
  });

  // Marquer comme lu
  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  // Marquer tout comme lu
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  // Supprimer une notification
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  // Obtenir l'icône selon le type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'call':
        return <Phone className="w-5 h-5 text-green-500" />;
      case 'system':
        return <Settings className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Bell className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Non lues</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Appels</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'call').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Système</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'system').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Notifications récentes</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <Check className="w-4 h-4 mr-2" />
                  Tout marquer lu
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-sm">
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <Badge variant="destructive" className="text-xs">
                                    Nouveau
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.body}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(notification.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Paramètres de notification */}
        <Card>
          <CardHeader>
            <CardTitle>Paramètres de notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notifications générales */}
            <div>
              <h3 className="text-lg font-medium mb-4">Général</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Notifications push</p>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des notifications sur cet appareil
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {settings.soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium">Sons de notification</p>
                      <p className="text-sm text-muted-foreground">
                        Jouer un son lors des notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, soundEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Notifications email</p>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des résumés par email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Types de notifications */}
            <div>
              <h3 className="text-lg font-medium mb-4">Types de notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Messages</span>
                  </div>
                  <Switch
                    checked={settings.messageNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, messageNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Appels</span>
                  </div>
                  <Switch
                    checked={settings.callNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, callNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Groupes</span>
                  </div>
                  <Switch
                    checked={settings.groupNotifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, groupNotifications: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Heures silencieuses */}
            <div>
              <h3 className="text-lg font-medium mb-4">Heures silencieuses</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Activer les heures silencieuses</span>
                  <Switch
                    checked={settings.quietHours}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, quietHours: checked }))
                    }
                  />
                </div>

                {settings.quietHours && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Début</label>
                      <input
                        type="time"
                        value={settings.quietStart}
                        onChange={(e) =>
                          setSettings(prev => ({ ...prev, quietStart: e.target.value }))
                        }
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Fin</label>
                      <input
                        type="time"
                        value={settings.quietEnd}
                        onChange={(e) =>
                          setSettings(prev => ({ ...prev, quietEnd: e.target.value }))
                        }
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
