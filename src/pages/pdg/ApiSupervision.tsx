/**
 * 📊 SUPERVISION DES API - INTERFACE PDG
 * Tableau de bord complet pour surveiller toutes les API connectées à 224SOLUTIONS
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, Activity, Key, Plus, RefreshCw, 
  TrendingUp, TrendingDown, Shield, Bell, Settings,
  CheckCircle2, XCircle, Clock, Zap
} from 'lucide-react';
import { ApiMonitoringService, ApiConnection, ApiAlert } from '@/services/apiMonitoring';
import { maskApiKey } from '@/services/apiEncryption';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STATUS_COLORS = {
  active: 'bg-green-500',
  suspended: 'bg-yellow-500',
  expired: 'bg-red-500',
  error: 'bg-orange-500'
};

const STATUS_LABELS = {
  active: 'Actif',
  suspended: 'Suspendu',
  expired: 'Expiré',
  error: 'Erreur'
};

const API_TYPE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ApiSupervision() {
  const [apis, setApis] = useState<ApiConnection[]>([]);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApi, setSelectedApi] = useState<ApiConnection | null>(null);

  // Charger les données
  const loadData = async () => {
    setLoading(true);
    try {
      const [apisData, alertsData] = await Promise.all([
        ApiMonitoringService.getAllApiConnections(),
        ApiMonitoringService.getUnresolvedAlerts()
      ]);
      
      setApis(apisData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Statistiques globales
  const stats = {
    total: apis.length,
    active: apis.filter(a => a.status === 'active').length,
    suspended: apis.filter(a => a.status === 'suspended').length,
    expired: apis.filter(a => a.status === 'expired').length,
    totalTokensUsed: apis.reduce((sum, a) => sum + a.tokens_used, 0),
    totalTokensLimit: apis.reduce((sum, a) => sum + (a.tokens_limit || 0), 0),
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length
  };

  // Données pour les graphiques
  const apiTypeData = [
    { name: 'Paiement', value: apis.filter(a => a.api_type === 'payment').length },
    { name: 'SMS', value: apis.filter(a => a.api_type === 'sms').length },
    { name: 'Email', value: apis.filter(a => a.api_type === 'email').length },
    { name: 'Stockage', value: apis.filter(a => a.api_type === 'storage').length },
    { name: 'Autre', value: apis.filter(a => a.api_type === 'other').length }
  ].filter(item => item.value > 0);

  const tokenUsageData = apis
    .filter(a => a.tokens_limit)
    .map(a => ({
      name: a.api_name,
      utilisés: a.tokens_used,
      restants: a.tokens_remaining || 0,
      limite: a.tokens_limit
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
          <p className="text-white text-lg">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-500" />
              Supervision des API
            </h1>
            <p className="text-slate-400 mt-1">
              Monitoring intelligent avec 224Guard
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadData}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une API
            </Button>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total API</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <Activity className="h-10 w-10 text-blue-500" />
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs text-green-500">{stats.active} actives</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-red-500">{stats.expired} expirées</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Tokens utilisés</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {stats.totalTokensUsed.toLocaleString()}
                  </p>
                </div>
                <Zap className="h-10 w-10 text-yellow-500" />
              </div>
              <Progress 
                value={(stats.totalTokensUsed / stats.totalTokensLimit) * 100} 
                className="mt-4"
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Alertes critiques</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.criticalAlerts}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-xs text-slate-500 mt-4">
                {alerts.length} alertes au total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">224Guard</p>
                  <p className="text-lg font-bold text-green-500 mt-1">Actif</p>
                </div>
                <Shield className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Surveillance en temps réel
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="apis">API connectées</TabsTrigger>
            <TabsTrigger value="alerts">Alertes</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Répartition par type */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Répartition des API par type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={apiTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {apiTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={API_TYPE_COLORS[index % API_TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Consommation de tokens */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Consommation de tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tokenUsageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="utilisés" fill="#3B82F6" />
                      <Bar dataKey="restants" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Liste des API */}
          <TabsContent value="apis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apis.map((api) => (
                <Card key={api.id} className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">{api.api_name}</CardTitle>
                        <CardDescription className="text-slate-400">
                          {api.api_provider}
                        </CardDescription>
                      </div>
                      <Badge className={`${STATUS_COLORS[api.status]} text-white`}>
                        {STATUS_LABELS[api.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-300 font-mono">
                        {maskApiKey(api.api_key_encrypted)}
                      </span>
                    </div>
                    
                    {api.tokens_limit && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Tokens</span>
                          <span className="text-white">
                            {api.tokens_used.toLocaleString()} / {api.tokens_limit.toLocaleString()}
                          </span>
                        </div>
                        <Progress 
                          value={(api.tokens_used / api.tokens_limit) * 100}
                          className="h-2"
                        />
                      </div>
                    )}

                    {api.last_request_at && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        Dernière requête: {new Date(api.last_request_at).toLocaleString('fr-FR')}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                        <Settings className="h-3 w-3 mr-1" />
                        Config
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                        <Activity className="h-3 w-3 mr-1" />
                        Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Alertes */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-500" />
                  Alertes actives ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-slate-400">Aucune alerte active</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 bg-slate-700 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={
                                alert.severity === 'critical' ? 'bg-red-600' :
                                alert.severity === 'high' ? 'bg-orange-500' :
                                alert.severity === 'medium' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }>
                                {alert.severity.toUpperCase()}
                              </Badge>
                              <span className="text-white font-medium">{alert.title}</span>
                            </div>
                            <p className="text-slate-300 text-sm">{alert.message}</p>
                            <p className="text-slate-500 text-xs mt-2">
                              {new Date(alert.created_at).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-500 hover:text-green-400 hover:bg-slate-600"
                            onClick={() => {
                              // Marquer comme résolue
                              toast.success('Alerte résolue');
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytiques */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Statistiques détaillées</CardTitle>
                <CardDescription className="text-slate-400">
                  Analyse de performance sur les 30 derniers jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-center py-8">
                  Graphiques d'analytiques disponibles prochainement
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
