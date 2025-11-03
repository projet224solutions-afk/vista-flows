import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePdgMonitoring } from '@/hooks/usePdgMonitoring';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Zap,
  RefreshCw,
  Brain,
  Shield,
  Database,
  Users,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PdgCommandCenter() {
  const navigate = useNavigate();
  const {
    systemHealth,
    interfaceMetrics,
    autoFixes,
    stats,
    loading,
    realTimeEnabled,
    setRealTimeEnabled,
    loadMonitoringData,
    askAICopilot,
    detectAnomalies
  } = usePdgMonitoring();

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    const response = await askAICopilot(aiQuery);
    setAiLoading(false);
    
    if (response) {
      setAiResponse(response.answer || 'Pas de réponse');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'default';
      case 'warning':
      case 'degraded':
        return 'secondary';
      case 'critical':
      case 'offline':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'offline':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/pdg')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Centre de Commande PDG</h1>
              <p className="text-muted-foreground">
                Surveillance & Debug - 224SOLUTIONS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={realTimeEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            >
              <Activity className="h-4 w-4 mr-2" />
              {realTimeEnabled ? 'Temps réel actif' : 'Temps réel désactivé'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMonitoringData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Santé Système</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.systemHealth.toFixed(1)}%</div>
                {getHealthIcon(systemHealth.status)}
              </div>
              <Badge variant={getStatusColor(systemHealth.status)} className="mt-2">
                {systemHealth.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Erreurs Critiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.criticalErrors}</div>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.pendingErrors} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Corrections Auto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.autoFixedErrors}</div>
                <Zap className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {autoFixes.length} correctifs actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Temps moyen: {stats.avgResponseTime.toFixed(0)}ms
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs principales */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="services">
              <Database className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="interfaces">
              <Users className="h-4 w-4 mr-2" />
              Interfaces
            </TabsTrigger>
            <TabsTrigger value="fixes">
              <Zap className="h-4 w-4 mr-2" />
              Auto-Fixes
            </TabsTrigger>
            <TabsTrigger value="copilot">
              <Brain className="h-4 w-4 mr-2" />
              IA Copilote
            </TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>État des Services</CardTitle>
                  <CardDescription>
                    Dernière vérification: {new Date(systemHealth.lastCheck).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemHealth.services.map((service) => (
                      <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getHealthIcon(service.status)}
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {service.responseTime}ms • Erreurs: {service.errorRate}%
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                  <CardDescription>Outils de diagnostic et correction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={detectAnomalies}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Détecter les Anomalies
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => navigate('/pdg/debug')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Voir les Erreurs Détaillées
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => navigate('/pdg/security')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Centre de Sécurité
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Monitoring des Services</CardTitle>
                <CardDescription>État détaillé de tous les services connectés</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {systemHealth.services.map((service) => (
                      <Card key={service.name}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {getHealthIcon(service.status)}
                                <h4 className="font-semibold">{service.name}</h4>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Temps de réponse: {service.responseTime}ms</p>
                                <p>Taux d'erreur: {service.errorRate}%</p>
                                <p>Uptime: {systemHealth.uptime}%</p>
                              </div>
                            </div>
                            <Badge variant={getStatusColor(service.status)}>
                              {service.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interfaces */}
          <TabsContent value="interfaces">
            <Card>
              <CardHeader>
                <CardTitle>Métriques des Interfaces Utilisateur</CardTitle>
                <CardDescription>Performance et utilisation par interface</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {interfaceMetrics.map((metric) => (
                      <Card key={metric.interface}>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{metric.interface}</h4>
                              <Badge variant={metric.errors > 5 ? 'destructive' : 'default'}>
                                {metric.errors} erreurs
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Utilisateurs actifs</p>
                                <p className="font-medium">{metric.activeUsers}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Transactions</p>
                                <p className="font-medium">{metric.transactions}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-muted-foreground">Performance</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-secondary rounded-full h-2">
                                    <div
                                      className="bg-primary rounded-full h-2 transition-all"
                                      style={{ width: `${metric.performance}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">
                                    {metric.performance.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Fixes */}
          <TabsContent value="fixes">
            <Card>
              <CardHeader>
                <CardTitle>Correctifs Automatiques</CardTitle>
                <CardDescription>
                  {autoFixes.length} correctifs actifs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {autoFixes.map((fix) => (
                      <Card key={fix.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <h4 className="font-semibold">{fix.fix_description}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Pattern: {fix.error_pattern}
                                </p>
                              </div>
                              <Badge variant={fix.is_active ? 'default' : 'secondary'}>
                                {fix.is_active ? 'Actif' : 'Inactif'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Appliqué: {fix.times_applied} fois</span>
                              <span>Taux de réussite: {fix.success_rate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IA Copilote */}
          <TabsContent value="copilot">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  IA Copilote
                </CardTitle>
                <CardDescription>
                  Posez vos questions sur l'état du système et obtenez des recommandations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Quelles sont les erreurs les plus fréquentes ?"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                  />
                  <Button onClick={handleAskAI} disabled={aiLoading}>
                    {aiLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Demander'
                    )}
                  </Button>
                </div>

                {aiResponse && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Questions suggérées:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Quel est l\'état global du système ?',
                      'Quelles interfaces ont le plus d\'erreurs ?',
                      'Recommande des optimisations',
                      'Analyse les performances'
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAiQuery(suggestion);
                          handleAskAI();
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
