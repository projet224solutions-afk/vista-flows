import { useState, useEffect } from 'react';
import { errorMonitor } from '@/services/errorMonitor';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DebugPanel() {
  const [errors, setErrors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [errorsData, statsData] = await Promise.all([
        errorMonitor.getRecentErrors(100),
        errorMonitor.getErrorStats(),
      ]);

      setErrors(errorsData);
      setStats(statsData);

      // Charger le dernier statut de santé
      const { data: health } = await supabase
        .from('system_health')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      setHealthStatus(health);
    } catch (error) {
      console.error('Failed to load debug data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données de debug',
        variant: 'destructive',
      });
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critique':
        return 'destructive';
      case 'modérée':
        return 'default';
      case 'mineure':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string, fixApplied: boolean) => {
    if (fixApplied) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'fixing') return <Clock className="h-4 w-4 text-yellow-500" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panneau de Debug & Surveillance</h1>
          <p className="text-muted-foreground">Moniteur système en temps réel</p>
        </div>
        <Button onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Erreurs</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-red-500">Critiques</CardDescription>
              <CardTitle className="text-3xl text-red-500">{stats.critical}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-yellow-500">Modérées</CardDescription>
              <CardTitle className="text-3xl text-yellow-500">{stats.moderate}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-green-500">Corrigées</CardDescription>
              <CardTitle className="text-3xl text-green-500">{stats.fixed}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-orange-500">En Attente</CardDescription>
              <CardTitle className="text-3xl text-orange-500">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* System Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle>État du Système</CardTitle>
            <CardDescription>Dernière mise à jour: {new Date(healthStatus.timestamp).toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}>
                  {healthStatus.status}
                </Badge>
              </div>
              {healthStatus.cpu_usage && (
                <div>
                  <p className="text-sm text-muted-foreground">CPU Usage</p>
                  <p className="text-lg font-semibold">{healthStatus.cpu_usage}%</p>
                </div>
              )}
              {healthStatus.memory_usage && (
                <div>
                  <p className="text-sm text-muted-foreground">Memory Usage</p>
                  <p className="text-lg font-semibold">{healthStatus.memory_usage}%</p>
                </div>
              )}
              {healthStatus.error_rate && (
                <div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className="text-lg font-semibold">{healthStatus.error_rate}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors List */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Erreurs</CardTitle>
          <CardDescription>Erreurs récentes détectées par le système</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="critique">Critiques</TabsTrigger>
              <TabsTrigger value="pending">En Attente</TabsTrigger>
              <TabsTrigger value="fixed">Corrigées</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {errors.map((error) => (
                    <Card key={error.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(error.status, error.fix_applied)}
                            <div>
                              <CardTitle className="text-base">{error.module}</CardTitle>
                              <CardDescription className="text-xs">
                                {new Date(error.created_at).toLocaleString()}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant={getSeverityColor(error.severity)}>{error.severity}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm mb-2">{error.error_message}</p>
                        {error.fix_applied && error.fix_description && (
                          <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-xs text-green-700 dark:text-green-300">
                            ✅ {error.fix_description}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="critique">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {errors
                    .filter((e) => e.severity === 'critique')
                    .map((error) => (
                      <Card key={error.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(error.status, error.fix_applied)}
                              <div>
                                <CardTitle className="text-base">{error.module}</CardTitle>
                                <CardDescription className="text-xs">
                                  {new Date(error.created_at).toLocaleString()}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge variant="destructive">{error.severity}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm">{error.error_message}</p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pending">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {errors
                    .filter((e) => e.status === 'detected' && !e.fix_applied)
                    .map((error) => (
                      <Card key={error.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(error.status, error.fix_applied)}
                              <div>
                                <CardTitle className="text-base">{error.module}</CardTitle>
                                <CardDescription className="text-xs">
                                  {new Date(error.created_at).toLocaleString()}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge variant={getSeverityColor(error.severity)}>{error.severity}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm">{error.error_message}</p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="fixed">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {errors
                    .filter((e) => e.fix_applied)
                    .map((error) => (
                      <Card key={error.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <div>
                                <CardTitle className="text-base">{error.module}</CardTitle>
                                <CardDescription className="text-xs">
                                  {new Date(error.created_at).toLocaleString()}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge variant={getSeverityColor(error.severity)}>{error.severity}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm mb-2">{error.error_message}</p>
                          {error.fix_description && (
                            <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-xs text-green-700 dark:text-green-300">
                              ✅ {error.fix_description}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
