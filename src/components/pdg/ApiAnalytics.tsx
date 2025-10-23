/**
 * 📊 ANALYTIQUES API - GRAPHIQUES EN TEMPS RÉEL
 * Affiche les statistiques détaillées d'utilisation des API
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { ApiConnection, ApiUsageLog, ApiMonitoringService } from '@/services/apiMonitoring';
import { 
  TrendingUp, TrendingDown, Activity, Zap, 
  Clock, AlertTriangle, CheckCircle2, DollarSign 
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiAnalyticsProps {
  apis: ApiConnection[];
}

export default function ApiAnalytics({ apis }: ApiAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<ApiUsageLog[]>([]);

  useEffect(() => {
    loadAllLogs();
  }, [apis]);

  const loadAllLogs = async () => {
    setLoading(true);
    try {
      const logsPromises = apis.map(api => 
        ApiMonitoringService.getApiUsageLogs(api.id, 500)
      );
      const logsArrays = await Promise.all(logsPromises);
      const combined = logsArrays.flat();
      setAllLogs(combined);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      toast.error('Erreur lors du chargement des analytiques');
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const stats = {
    totalRequests: allLogs.length,
    successRate: allLogs.length > 0 
      ? ((allLogs.filter(log => log.status_code && log.status_code < 400).length / allLogs.length) * 100).toFixed(1)
      : '0',
    avgResponseTime: allLogs.length > 0
      ? Math.round(allLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / allLogs.length)
      : 0,
    totalTokens: allLogs.reduce((sum, log) => sum + log.tokens_consumed, 0),
    errorRate: allLogs.length > 0
      ? ((allLogs.filter(log => log.status_code && log.status_code >= 400).length / allLogs.length) * 100).toFixed(1)
      : '0'
  };

  // Données pour graphique temporel (derniers 30 jours)
  const getLast30Days = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  };

  const timeSeriesData = getLast30Days().map(date => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayLogs = allLogs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= date && logDate < nextDate;
    });

    return {
      date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      requetes: dayLogs.length,
      tokens: dayLogs.reduce((sum, log) => sum + log.tokens_consumed, 0),
      erreurs: dayLogs.filter(log => log.status_code && log.status_code >= 400).length,
      tempsReponse: dayLogs.length > 0
        ? Math.round(dayLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / dayLogs.length)
        : 0
    };
  });

  // Répartition par API
  const apiUsageData = apis.map(api => {
    const apiLogs = allLogs.filter(log => log.api_connection_id === api.id);
    return {
      name: api.api_name,
      requests: apiLogs.length,
      tokens: apiLogs.reduce((sum, log) => sum + log.tokens_consumed, 0),
      avgTime: apiLogs.length > 0
        ? Math.round(apiLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / apiLogs.length)
        : 0
    };
  }).filter(d => d.requests > 0);

  // Performance par API (radar chart)
  const performanceData = apis.slice(0, 5).map(api => {
    const apiLogs = allLogs.filter(log => log.api_connection_id === api.id);
    const successRate = apiLogs.length > 0
      ? (apiLogs.filter(log => log.status_code && log.status_code < 400).length / apiLogs.length) * 100
      : 0;
    
    return {
      api: api.api_name.substring(0, 15),
      fiabilite: Math.round(successRate),
      vitesse: apiLogs.length > 0 ? Math.max(0, 100 - (apiLogs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / apiLogs.length / 50)) : 0,
      utilisation: Math.min(100, (apiLogs.length / 100) * 100),
    };
  });

  // Distribution des codes de statut
  const statusDistribution = [
    { name: '2xx Succès', value: allLogs.filter(log => log.status_code && log.status_code >= 200 && log.status_code < 300).length, color: '#10B981' },
    { name: '4xx Client', value: allLogs.filter(log => log.status_code && log.status_code >= 400 && log.status_code < 500).length, color: '#F59E0B' },
    { name: '5xx Serveur', value: allLogs.filter(log => log.status_code && log.status_code >= 500).length, color: '#EF4444' }
  ].filter(item => item.value > 0);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Chargement des analytiques...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requêtes</p>
                <p className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de succès</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temps moyen</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}ms</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tokens totaux</p>
                <p className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux d'erreur</p>
                <p className="text-2xl font-bold text-red-600">{stats.errorRate}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques détaillés */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Chronologie</TabsTrigger>
          <TabsTrigger value="apis">Par API</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="status">Statuts HTTP</TabsTrigger>
        </TabsList>

        {/* Chronologie */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activité sur 30 jours</CardTitle>
              <CardDescription>Évolution des requêtes et tokens consommés</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorRequetes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="requetes" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRequetes)" />
                  <Area type="monotone" dataKey="tokens" stroke="#10B981" fillOpacity={1} fill="url(#colorTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Temps de réponse et erreurs</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="tempsReponse" stroke="#3B82F6" strokeWidth={2} name="Temps (ms)" />
                  <Line yAxisId="right" type="monotone" dataKey="erreurs" stroke="#EF4444" strokeWidth={2} name="Erreurs" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Par API */}
        <TabsContent value="apis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisation par API</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={apiUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="requests" fill="#3B82F6" name="Requêtes" />
                  <Bar dataKey="tokens" fill="#10B981" name="Tokens" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Radar de performance</CardTitle>
              <CardDescription>Comparaison des API principales</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={performanceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="api" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Fiabilité" dataKey="fiabilite" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Radar name="Vitesse" dataKey="vitesse" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Radar name="Utilisation" dataKey="utilisation" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statuts HTTP */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution des codes HTTP</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
