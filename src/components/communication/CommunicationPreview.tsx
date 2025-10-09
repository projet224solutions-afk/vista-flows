/**
 * 👁️ APERÇU COMMUNICATION - 224SOLUTIONS
 * Composant d'aperçu pour corriger les problèmes d'affichage
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Bell,
  Activity,
  TrendingUp,
  Clock
} from "lucide-react";

interface CommunicationPreviewProps {
  className?: string;
}

export default function CommunicationPreview({ className }: CommunicationPreviewProps) {
  // Données d'aperçu
  const previewStats = {
    totalMessages: 1247,
    totalCalls: 89,
    activeConversations: 23,
    onlineUsers: 12
  };

  const recentMessages = [
    {
      id: '1',
      sender: 'Jean Dupont',
      role: 'Vendeur',
      message: 'Bonjour, avez-vous reçu ma commande ?',
      time: '10:30',
      unread: true
    },
    {
      id: '2',
      sender: 'Marie Martin',
      role: 'Cliente',
      message: 'Merci pour la livraison rapide !',
      time: '09:15',
      unread: false
    },
    {
      id: '3',
      sender: 'Pierre Durand',
      role: 'Transitaire',
      message: 'Le colis est en route vers Conakry',
      time: '08:45',
      unread: true
    }
  ];

  const recentCalls = [
    {
      id: '1',
      contact: 'Sophie Bernard',
      role: 'Agent',
      type: 'video' as const,
      duration: '15:30',
      status: 'completed' as const
    },
    {
      id: '2',
      contact: 'Paul Moreau',
      role: 'Client',
      type: 'audio' as const,
      duration: '08:20',
      status: 'completed' as const
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-2xl font-bold">{previewStats.totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Phone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Appels</p>
                <p className="text-2xl font-bold">{previewStats.totalCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{previewStats.activeConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En ligne</p>
                <p className="text-2xl font-bold">{previewStats.onlineUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages récents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Messages récents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {message.sender.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm">{message.sender}</p>
                        <Badge variant="secondary" className="text-xs">
                          {message.role}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">{message.time}</span>
                        {message.unread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {message.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appels récents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Appels récents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      {call.type === 'video' ? (
                        <Video className="w-4 h-4 text-green-600" />
                      ) : (
                        <Phone className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm">{call.contact}</p>
                        <Badge variant="outline" className="text-xs">
                          {call.role}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{call.duration}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {call.status === 'completed' ? 'Terminé' : 'Manqué'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fonctionnalités disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Fonctionnalités de Communication</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <MessageSquare className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-medium text-sm">Chat Temps Réel</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Messages, fichiers, localisation
              </p>
            </div>
            
            <div className="p-4 border rounded-lg text-center">
              <Phone className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-medium text-sm">Appels Audio</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Qualité HD, contrôles avancés
              </p>
            </div>
            
            <div className="p-4 border rounded-lg text-center">
              <Video className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-medium text-sm">Appels Vidéo</h3>
              <p className="text-xs text-muted-foreground mt-1">
                1:1 et conférences
              </p>
            </div>
            
            <div className="p-4 border rounded-lg text-center">
              <Users className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <h3 className="font-medium text-sm">Contacts Universels</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Tous les utilisateurs 224Solutions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statut du système */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Système actif</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Notifications activées</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Temps réel</span>
              </div>
            </div>
            
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Opérationnel
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
