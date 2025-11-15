/**
 * 📊 SUPERVISION DES API - INTERFACE PDG
 * Tableau de bord complet pour surveiller toutes les API connectées à 224SOLUTIONS
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, Activity, Key, Plus, RefreshCw, 
  TrendingUp, TrendingDown, Shield, Bell, Settings,
  CheckCircle2, XCircle, Clock, Zap, ArrowLeft
} from 'lucide-react';
import { ApiMonitoringService, ApiConnection, ApiAlert } from '@/services/apiMonitoring';
import { maskApiKey } from '@/services/apiEncryption';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ApiDetailsModal from '@/components/pdg/ApiDetailsModal';
import AddApiModal from '@/components/pdg/AddApiModal';
import ApiAnalytics from '@/components/pdg/ApiAnalytics';
import { supabase } from '@/integrations/supabase/client';

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
  const navigate = useNavigate();
  const [apis, setApis] = useState<ApiConnection[]>([]);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApi, setSelectedApi] = useState<ApiConnection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Charger les données
  const loadData = async () => {
    setLoading(true);
    try {
      // Synchroniser les API système en premier
      await syncSystemApis();
      
      const [apisData, alertsData] = await Promise.all([
        ApiMonitoringService.getAllApiConnections(),
        ApiMonitoringService.getUnresolvedAlerts()
      ]);
      
      setApis(apisData || []);
      setAlerts(alertsData || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement:', error);
      toast.error(error?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Synchroniser les API système automatiquement
  const syncSystemApis = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-system-apis');
      if (error) throw error;
      if (data?.synced?.length > 0) {
        console.log('✅ API système synchronisées:', data.synced);
      }
    } catch (error) {
      console.error('⚠️ Erreur sync API système:', error);
      // Ne pas bloquer si la synchronisation échoue
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
    error: apis.filter(a => a.status === 'error').length,
    working: apis.filter(a => a.metadata?.is_working === true).length,
    broken: apis.filter(a => a.metadata?.is_working === false).length,
    totalTokensUsed: apis.reduce((sum, a) => sum + a.tokens_used, 0),
    totalTokensLimit: apis.reduce((sum, a) => sum + (a.tokens_limit || 0), 0),
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length
  };

  // Séparer les API fonctionnelles et non-fonctionnelles
  const workingApis = apis.filter(a => a.metadata?.is_working === true);
  const brokenApis = apis.filter(a => a.metadata?.is_working === false || a.status === 'error' || a.status === 'expired');
  const notConfiguredApis = apis.filter(a => a.metadata?.key_configured === false);

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
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-12 w-12 text-primary animate-spin" />
          <p className="text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/pdg')}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Supervision des API
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitoring intelligent avec 224Guard
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadData}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button
              className="gap-2"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Ajouter une API
            </Button>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total API</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <Activity className="h-10 w-10 text-primary" />
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-xs text-green-600">{stats.active} actives</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-destructive">{stats.expired} expirées</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Tokens utilisés</p>
                  <p className="text-3xl font-bold mt-1">
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Alertes critiques</p>
                  <p className="text-3xl font-bold mt-1">{stats.criticalAlerts}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {alerts.length} alertes au total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">224Guard</p>
                  <p className="text-lg font-bold text-green-600 mt-1">Actif</p>
                </div>
                <Shield className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Surveillance en temps réel
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="apis">API connectées</TabsTrigger>
            <TabsTrigger value="alerts">Alertes</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Répartition par type */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des API par type</CardTitle>
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
              <Card>
                <CardHeader>
                  <CardTitle>Consommation de tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tokenUsageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
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
          <TabsContent value="apis" className="space-y-6">
            {/* API Fonctionnelles */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold">API Fonctionnelles ({workingApis.length})</h3>
              </div>
              
              {workingApis.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">Aucune API fonctionnelle détectée</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workingApis.map((api) => (
                    <Card key={api.id} className="hover:border-green-500 transition-colors cursor-pointer border-green-200" onClick={() => {
                      setSelectedApi(api);
                      setModalOpen(true);
                    }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{api.api_name}</CardTitle>
                            <CardDescription>
                              {api.api_provider}
                            </CardDescription>
                          </div>
                          <Badge className="bg-green-500 text-white">
                            ✓ Actif
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">
                            {maskApiKey(api.api_key_encrypted)}
                          </span>
                        </div>
                        
                        {api.metadata?.used_in_functions && api.metadata.used_in_functions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Utilisée dans:</p>
                            <div className="flex flex-wrap gap-1">
                              {api.metadata.used_in_functions.slice(0, 3).map((func: string) => (
                                <Badge key={func} variant="outline" className="text-xs">
                                  {func}
                                </Badge>
                              ))}
                              {api.metadata.used_in_functions.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{api.metadata.used_in_functions.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {api.last_request_at && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Dernière requête: {new Date(api.last_request_at).toLocaleString('fr-FR')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Séparateur */}
            <div className="border-t border-border my-8" />

            {/* API Défaillantes / Non configurées */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold">API Défaillantes ou Non Configurées ({brokenApis.length})</h3>
              </div>
              
              {brokenApis.length === 0 ? (
                <Card className="border-green-200">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                      <p className="text-green-600 font-medium">Toutes les API fonctionnent correctement !</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brokenApis.map((api) => (
                    <Card key={api.id} className="hover:border-red-500 transition-colors cursor-pointer border-red-200" onClick={() => {
                      setSelectedApi(api);
                      setModalOpen(true);
                    }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{api.api_name}</CardTitle>
                            <CardDescription>
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
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">
                            {maskApiKey(api.api_key_encrypted)}
                          </span>
                        </div>

                        {/* Raison de l'erreur */}
                        <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-600">
                          {api.metadata?.key_configured === false ? (
                            <span>⚠️ Clé API non configurée dans les variables d'environnement</span>
                          ) : api.status === 'error' ? (
                            <span>❌ Clé invalide ou API non accessible</span>
                          ) : api.status === 'expired' ? (
                            <span>⏰ API expirée - renouvellement nécessaire</span>
                          ) : (
                            <span>⚠️ Statut inconnu</span>
                          )}
                        </div>
                        
                        {api.metadata?.used_in_functions && api.metadata.used_in_functions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Impacte les fonctions:</p>
                            <div className="flex flex-wrap gap-1">
                              {api.metadata.used_in_functions.slice(0, 3).map((func: string) => (
                                <Badge key={func} variant="destructive" className="text-xs">
                                  {func}
                                </Badge>
                              ))}
                              {api.metadata.used_in_functions.length > 3 && (
                                <Badge variant="destructive" className="text-xs">
                                  +{api.metadata.used_in_functions.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApi(api);
                            setModalOpen(true);
                          }}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Diagnostiquer
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Alertes */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-yellow-500" />
                  Alertes actives ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                      <p className="text-muted-foreground">Aucune alerte active</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-4 bg-muted rounded-lg border hover:border-primary transition-colors"
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
                              <span className="font-medium">{alert.title}</span>
                            </div>
                            <p className="text-sm">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(alert.created_at).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-500"
                            onClick={async () => {
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (user) {
                                  await ApiMonitoringService.resolveAlert(alert.id, user.id);
                                  await loadData();
                                }
                              } catch (error) {
                                console.error('Erreur résolution alerte:', error);
                                toast.error('Erreur lors de la résolution');
                              }
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
            <ApiAnalytics apis={apis} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de détails d'API */}
      <ApiDetailsModal
        api={selectedApi}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedApi(null);
          loadData(); // Recharger les données après fermeture
        }}
      />

      {/* Modal d'ajout d'API */}
      <AddApiModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
