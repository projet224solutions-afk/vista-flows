/**
 * SIEM DASHBOARD
 * Security Information and Event Management
 * Corrélation des logs et détection des menaces
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Activity, AlertTriangle, Eye, TrendingUp } from "lucide-react";
import { ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer as RechartsContainer } from 'recharts';

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  description: string;
  correlated: boolean;
}

const recentEvents: SecurityEvent[] = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    type: 'Tentative d\'accès non autorisé',
    severity: 'critical',
    source: '192.168.1.45',
    description: 'Multiple failed login attempts detected',
    correlated: true
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    type: 'Anomalie de trafic',
    severity: 'high',
    source: 'api.224solutions.com',
    description: 'Unusual spike in API requests',
    correlated: true
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    type: 'Modification de configuration',
    severity: 'medium',
    source: 'admin-panel',
    description: 'Security policy updated',
    correlated: false
  }
];

const threatData = [
  { time: '00:00', threats: 12 },
  { time: '04:00', threats: 8 },
  { time: '08:00', threats: 25 },
  { time: '12:00', threats: 35 },
  { time: '16:00', threats: 45 },
  { time: '20:00', threats: 28 },
];

const siemStats = {
  eventsProcessed: 2456789,
  threatsDetected: 1247,
  correlatedIncidents: 89,
  responseTime: '2.3s'
};

export function SIEMDashboard() {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          SIEM - Corrélation des Événements
        </CardTitle>
        <CardDescription>
          Analyse en temps réel des logs et détection des menaces
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques SIEM */}
        <ResponsiveGrid mobileCols={2} tabletCols={4} desktopCols={4} gap="sm">
          <div className="p-4 bg-muted rounded-lg">
            <Activity className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{siemStats.eventsProcessed.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Événements traités</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
            <div className="text-2xl font-bold">{siemStats.threatsDetected.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Menaces détectées</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{siemStats.correlatedIncidents}</div>
            <div className="text-xs text-muted-foreground">Incidents corrélés</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <Eye className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{siemStats.responseTime}</div>
            <div className="text-xs text-muted-foreground">Temps de réponse</div>
          </div>
        </ResponsiveGrid>

        {/* Graphique des menaces */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Détection des menaces (24h)</h4>
          <div className="h-48">
            <RechartsContainer width="100%" height="100%">
              <LineChart data={threatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="threats" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </RechartsContainer>
          </div>
        </div>

        {/* Événements récents */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Événements de sécurité récents</h4>
            <Button variant="outline" size="sm">
              Voir tout
            </Button>
          </div>
          {recentEvents.map((event) => (
            <div key={event.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityColor(event.severity)}>
                    {event.severity}
                  </Badge>
                  {event.correlated && (
                    <Badge variant="outline" className="text-xs">
                      Corrélé
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleTimeString('fr-FR')}
                </span>
              </div>
              <h5 className="font-medium text-sm mb-1">{event.type}</h5>
              <p className="text-xs text-muted-foreground mb-1">{event.description}</p>
              <p className="text-xs text-muted-foreground">Source: {event.source}</p>
            </div>
          ))}
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-sm">Système SIEM opérationnel</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tous les services de surveillance sont actifs. Corrélation automatique des événements activée.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
