/**
 * 📊 STATISTIQUES DE COMMUNICATION - 224SOLUTIONS
 * Composant pour afficher les statistiques et analyses de communication
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  MessageSquare,
  Phone,
  Video,
  Users,
  Clock,
  Calendar,
  Download,
  Filter,
  Activity,
  Target,
  Zap
} from "lucide-react";

// Mock data pour les statistiques
const mockStats = {
  overview: {
    totalMessages: 1247,
    totalCalls: 89,
    totalConversations: 23,
    averageResponseTime: 145, // en secondes
    activeUsers: 12,
    peakHour: '14:00'
  },
  messagesPerDay: [
    { date: '01/01', messages: 45, calls: 3 },
    { date: '02/01', messages: 67, calls: 5 },
    { date: '03/01', messages: 89, calls: 7 },
    { date: '04/01', messages: 123, calls: 12 },
    { date: '05/01', messages: 156, calls: 8 },
    { date: '06/01', messages: 134, calls: 6 },
    { date: '07/01', messages: 178, calls: 9 }
  ],
  callTypes: [
    { name: 'Audio', value: 65, color: '#8884d8' },
    { name: 'Vidéo', value: 35, color: '#82ca9d' }
  ],
  hourlyActivity: [
    { hour: '00h', activity: 2 },
    { hour: '02h', activity: 1 },
    { hour: '04h', activity: 0 },
    { hour: '06h', activity: 3 },
    { hour: '08h', activity: 15 },
    { hour: '10h', activity: 25 },
    { hour: '12h', activity: 35 },
    { hour: '14h', activity: 45 },
    { hour: '16h', activity: 38 },
    { hour: '18h', activity: 28 },
    { hour: '20h', activity: 18 },
    { hour: '22h', activity: 8 }
  ],
  topContacts: [
    { name: 'Jean Dupont', messages: 234, calls: 12, lastContact: '2025-01-02' },
    { name: 'Marie Martin', messages: 189, calls: 8, lastContact: '2025-01-02' },
    { name: 'Pierre Durand', messages: 156, calls: 15, lastContact: '2025-01-01' },
    { name: 'Sophie Bernard', messages: 123, calls: 6, lastContact: '2025-01-01' },
    { name: 'Paul Moreau', messages: 98, calls: 4, lastContact: '2024-12-31' }
  ]
};

export default function CommunicationStats() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('messages');

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Statistiques de Communication</h2>
          <p className="text-muted-foreground">
            Analyse de votre activité de communication
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 heures</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages envoyés</p>
                <p className="text-2xl font-bold">{mockStats.overview.totalMessages.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+12% vs période précédente</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Appels passés</p>
                <p className="text-2xl font-bold">{mockStats.overview.totalCalls}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+8% vs période précédente</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversations actives</p>
                <p className="text-2xl font-bold">{mockStats.overview.totalConversations}</p>
                <div className="flex items-center mt-1">
                  <Activity className="w-3 h-3 text-blue-500 mr-1" />
                  <span className="text-xs text-blue-500">{mockStats.overview.activeUsers} utilisateurs actifs</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Temps de réponse moyen</p>
                <p className="text-2xl font-bold">{formatDuration(mockStats.overview.averageResponseTime)}</p>
                <div className="flex items-center mt-1">
                  <Target className="w-3 h-3 text-orange-500 mr-1" />
                  <span className="text-xs text-orange-500">Heure de pointe: {mockStats.overview.peakHour}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique d'activité */}
        <Card>
          <CardHeader>
            <CardTitle>Activité quotidienne</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockStats.messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition des types d'appels */}
        <Card>
          <CardHeader>
            <CardTitle>Types d'appels</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockStats.callTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockStats.callTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activité par heure */}
        <Card>
          <CardHeader>
            <CardTitle>Activité par heure</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockStats.hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts les plus actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStats.topContacts.map((contact, index) => (
                <div key={contact.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Dernier contact: {contact.lastContact}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <span>{contact.messages}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span>{contact.calls}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights et recommandations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span>Insights et Recommandations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Tendance positive</span>
              </div>
              <p className="text-sm text-blue-800">
                Votre activité de communication a augmenté de 12% cette semaine.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Objectif atteint</span>
              </div>
              <p className="text-sm text-green-800">
                Temps de réponse moyen sous les 3 minutes. Excellent travail !
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-900">Heure optimale</span>
              </div>
              <p className="text-sm text-orange-800">
                14h est votre heure de pointe. Planifiez vos appels importants à ce moment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
