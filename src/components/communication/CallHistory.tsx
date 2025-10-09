/**
 * 📞 HISTORIQUE DES APPELS - 224SOLUTIONS
 * Composant pour afficher l'historique des appels avec statistiques
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Search,
  Filter,
  Download,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Mock data pour l'historique des appels
const mockCallHistory = [
  {
    id: '1',
    type: 'video' as const,
    status: 'ended' as const,
    caller_id: 'user1',
    callee_id: 'user2',
    caller_name: 'Jean Dupont',
    callee_name: 'Marie Martin',
    initiated_at: '2025-01-02T10:30:00Z',
    answered_at: '2025-01-02T10:30:05Z',
    ended_at: '2025-01-02T10:45:30Z',
    duration_seconds: 925,
    quality_rating: 4,
    direction: 'outgoing' as const
  },
  {
    id: '2',
    type: 'audio' as const,
    status: 'missed' as const,
    caller_id: 'user3',
    callee_id: 'user1',
    caller_name: 'Pierre Durand',
    callee_name: 'Vous',
    initiated_at: '2025-01-02T09:15:00Z',
    duration_seconds: 0,
    direction: 'incoming' as const
  },
  {
    id: '3',
    type: 'audio' as const,
    status: 'ended' as const,
    caller_id: 'user1',
    callee_id: 'user4',
    caller_name: 'Vous',
    callee_name: 'Sophie Bernard',
    initiated_at: '2025-01-01T16:20:00Z',
    answered_at: '2025-01-01T16:20:03Z',
    ended_at: '2025-01-01T16:35:45Z',
    duration_seconds: 942,
    quality_rating: 5,
    direction: 'outgoing' as const
  }
];

export default function CallHistory() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filtrer l'historique
  const filteredHistory = mockCallHistory.filter(call => {
    const matchesSearch = searchQuery === '' || 
      call.caller_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.callee_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || call.type === filterType;
    const matchesStatus = filterStatus === 'all' || call.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Formater la durée
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Obtenir l'icône selon le type et la direction
  const getCallIcon = (call: any) => {
    if (call.status === 'missed') {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    }
    
    if (call.direction === 'incoming') {
      return call.type === 'video' 
        ? <Video className="w-4 h-4 text-blue-500" />
        : <PhoneIncoming className="w-4 h-4 text-green-500" />;
    }
    
    return call.type === 'video'
      ? <Video className="w-4 h-4 text-blue-500" />
      : <PhoneOutgoing className="w-4 h-4 text-gray-500" />;
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ended':
        return <Badge variant="secondary">Terminé</Badge>;
      case 'missed':
        return <Badge variant="destructive">Manqué</Badge>;
      case 'rejected':
        return <Badge variant="outline">Rejeté</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total appels</p>
                <p className="text-2xl font-bold">{mockCallHistory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <PhoneIncoming className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Reçus</p>
                <p className="text-2xl font-bold">
                  {mockCallHistory.filter(c => c.direction === 'incoming').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <PhoneMissed className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Manqués</p>
                <p className="text-2xl font-bold">
                  {mockCallHistory.filter(c => c.status === 'missed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Durée totale</p>
                <p className="text-2xl font-bold">
                  {formatDuration(mockCallHistory.reduce((acc, call) => acc + call.duration_seconds, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historique des Appels</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Période
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher un contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type d'appel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Vidéo</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ended">Terminés</SelectItem>
                <SelectItem value="missed">Manqués</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Liste des appels */}
          <ScrollArea className="h-[400px]">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun appel trouvé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((call) => (
                  <Card key={call.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getCallIcon(call)}
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>
                                {call.direction === 'incoming' 
                                  ? call.caller_name[0] 
                                  : call.callee_name[0]}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                {call.direction === 'incoming' 
                                  ? call.caller_name 
                                  : call.callee_name}
                              </h4>
                              {getStatusBadge(call.status)}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                              <span>
                                {format(new Date(call.initiated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </span>
                              
                              {call.duration_seconds > 0 && (
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDuration(call.duration_seconds)}</span>
                                </span>
                              )}
                              
                              {call.quality_rating && (
                                <span className="flex items-center space-x-1">
                                  <span>Qualité:</span>
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <span
                                        key={i}
                                        className={`text-xs ${
                                          i < call.quality_rating! ? 'text-yellow-500' : 'text-gray-300'
                                        }`}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Phone className="w-4 h-4" />
                          </Button>
                          {call.type === 'video' && (
                            <Button variant="outline" size="sm">
                              <Video className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
