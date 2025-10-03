/**
 * 📞 MODULE COMMUNICATION - 224SOLUTIONS
 * Module principal de communication intégré dans l'interface utilisateur
 * Chat + Appels + Notifications + Gestion des contacts
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Bell,
  Settings,
  UserPlus,
  History,
  TrendingUp,
  Zap,
  Shield,
  Globe,
  Activity,
  Send
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCommunication, useConversations, useCalls, useUserPresence } from "@/hooks/useCommunication";
import { useWallet } from "@/hooks/useWallet";
import ChatInterface from './ChatInterface';
import CallHistory from './CallHistory';
import ContactManager from './ContactManager';
import NotificationCenter from './NotificationCenter';
import CommunicationStats from './CommunicationStats';
import CommunicationPreview from './CommunicationPreview';
import { toast } from "sonner";

interface CommunicationModuleProps {
  className?: string;
}

export default function CommunicationModule({ className }: CommunicationModuleProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('preview');
  const [showSettings, setShowSettings] = useState(false);
  
  // Hooks de communication
  const { isInitialized } = useCommunication();
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { isInCall, currentCall } = useCalls();
  const { presence } = useUserPresence();
  
  // Hook wallet pour création automatique
  const { wallet, isLoading: walletLoading, isInitialized: walletInitialized } = useWallet();

  // Statistiques rapides
  const totalConversations = conversations.length;
  const unreadCount = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);
  const onlineUsers = presence.filter(p => p.status === 'online').length;

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Communication</h3>
          <p className="text-muted-foreground">
            Connectez-vous pour accéder aux fonctionnalités de communication
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isInitialized || walletLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Initialisation...</h3>
          <p className="text-muted-foreground">
            Configuration du système de communication et portefeuille en cours
          </p>
          {walletInitialized && (
            <p className="text-sm text-green-600 mt-2">
              ✅ Portefeuille 224Solutions activé
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{totalConversations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Bell className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Non lus</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En ligne</p>
                <p className="text-2xl font-bold">{onlineUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isInCall ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <Phone className={`w-5 h-5 ${isInCall ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="text-sm font-medium">
                  {isInCall ? 'En appel' : 'Disponible'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerte si en appel */}
      {isInCall && currentCall && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  {currentCall.type === 'video' ? (
                    <Video className="w-5 h-5 text-orange-600" />
                  ) : (
                    <Phone className="w-5 h-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Appel {currentCall.type} en cours</p>
                  <p className="text-sm text-muted-foreground">
                    Canal: {currentCall.channel_name}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Actif
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interface principale avec onglets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Communication</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Paramètres de Communication</DialogTitle>
                  </DialogHeader>
                  <CommunicationSettings />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Aperçu</span>
              </TabsTrigger>
              
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger value="calls" className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Appels</span>
              </TabsTrigger>
              
              <TabsTrigger value="contacts" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
              
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              
              <TabsTrigger value="stats" className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="p-6">
              <CommunicationPreview />
            </TabsContent>

            <TabsContent value="chat" className="p-0">
              <div className="h-[600px]">
                <ChatInterface />
              </div>
            </TabsContent>

            <TabsContent value="calls" className="p-6">
              <CallHistory />
            </TabsContent>

            <TabsContent value="contacts" className="p-6">
              <ContactManager />
            </TabsContent>

            <TabsContent value="notifications" className="p-6">
              <NotificationCenter />
            </TabsContent>

            <TabsContent value="stats" className="p-6">
              <CommunicationStats />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => {
            setActiveTab('chat');
            toast.success('Ouverture du chat');
          }}
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-sm">Nouveau Chat</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => {
            setActiveTab('contacts');
            toast.success('Ouverture des contacts');
          }}
        >
          <UserPlus className="w-6 h-6" />
          <span className="text-sm">Ajouter Contact</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => {
            setActiveTab('calls');
            toast.success('Historique des appels');
          }}
        >
          <History className="w-6 h-6" />
          <span className="text-sm">Historique</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => {
            setActiveTab('stats');
            toast.success('Statistiques de communication');
          }}
        >
          <TrendingUp className="w-6 h-6" />
          <span className="text-sm">Statistiques</span>
        </Button>
      </div>

      {/* Indicateurs de statut */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Système actif</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Connexion sécurisée</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Agora connecté</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Temps réel</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant des paramètres de communication
function CommunicationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Paramètres Audio/Vidéo</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Qualité vidéo</label>
            <select className="border rounded px-3 py-1">
              <option>HD (720p)</option>
              <option>Full HD (1080p)</option>
              <option>4K</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Réduction de bruit</label>
            <input type="checkbox" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Écho cancellation</label>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Notifications push</label>
            <input type="checkbox" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Sons de notification</label>
            <input type="checkbox" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Notifications d'appel</label>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Confidentialité</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Statut en ligne visible</label>
            <input type="checkbox" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Accusés de lecture</label>
            <input type="checkbox" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Partage de localisation</label>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
}
