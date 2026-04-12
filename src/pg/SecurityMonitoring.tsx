/**
 * SECURITY MONITORING DASHBOARD
 * 224Solutions - Dashboard complet monitoring s├®curit├® et sant├® syst├¿me
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Activity, 
  Database,
  Server,
  Shield,
  Clock,
  Users,
  TrendingUp,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { monitoringService } from '@/services/MonitoringService';
import { healthCheckService } from '@/services/HealthCheckService';
import { cspService } from '@/services/ContentSecurityPolicy';
import type { SystemHealth } from '@/services/MonitoringService';
import type { SystemHealthReport, HealthCheckResult } from '@/services/HealthCheckService';

export default function SecurityMonitoring() {
  const [health, setHealth] = React.useState<SystemHealth | null>(null);
  const [healthReport, setHealthReport] = React.useState<SystemHealthReport | null>(null);
  const [violations, setViolations] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  // Charger donn├®es monitoring
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [systemHealth, healthCheckReport] = await Promise.all([
        monitoringService.getCurrentHealth(),
        healthCheckService.checkNow()
      ]);

      setHealth(systemHealth);
      setHealthReport(healthCheckReport);
      setViolations(cspService.getRecentViolations(20));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur chargement donn├®es monitoring:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger au montage
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh toutes les 10 secondes si activ├®
  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Fonction helper pour obtenir couleur badge selon status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Fonction helper pour obtenir ic├┤ne selon status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading && !health) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring S├®curit├®</h1>
          <p className="text-gray-500">
            Derni├¿re mise ├á jour: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Rafra├«chir
          </Button>
        </div>
      </div>

      {/* Alerte si syst├¿me d├®grad├® ou critique */}
      {health && (health.overall === 'degraded' || health.overall === 'critical') && (
        <Alert variant={health.overall === 'critical' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {health.overall === 'critical' ? 'Syst├¿me Critique' : 'Syst├¿me D├®grad├®'}
          </AlertTitle>
          <AlertDescription>
            Le syst├¿me n├®cessite une attention imm├®diate. V├®rifiez les composants ci-dessous.
          </AlertDescription>
        </Alert>
      )}

      {/* Statut Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {health && getStatusIcon(health.overall)}
            Statut Global du Syst├¿me
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Overall */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Global</p>
              <Badge className={getStatusColor(health?.overall || 'unknown')}>
                {health?.overall?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            {/* Security */}
            <div className="text-center">
              <Shield className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500 mb-2">S├®curit├®</p>
              <Badge className={getStatusColor(health?.security || 'unknown')}>
                {health?.security?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            {/* Database */}
            <div className="text-center">
              <Database className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500 mb-2">Base de Donn├®es</p>
              <Badge className={getStatusColor(health?.database || 'unknown')}>
                {health?.database?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            {/* API */}
            <div className="text-center">
              <Server className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500 mb-2">API</p>
              <Badge className={getStatusColor(health?.api || 'unknown')}>
                {health?.api?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>

            {/* Frontend */}
            <div className="text-center">
              <Activity className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm text-gray-500 mb-2">Frontend</p>
              <Badge className={getStatusColor(health?.frontend || 'unknown')}>
                {health?.frontend?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* M├®triques Cl├®s */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Erreurs Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {health?.metrics.criticalErrors || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              N├®cessitent action imm├®diate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Erreurs En Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {health?.metrics.pendingErrors || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ├Ç traiter prochainement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Temps de R├®ponse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {health?.metrics.responseTime || 0}ms
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Moyenne derni├¿re heure
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Utilisateurs Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {health?.metrics.activeUsers || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Connect├®s derni├¿re heure
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs pour d├®tails */}
      <Tabs defaultValue="health-checks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health-checks">Health Checks</TabsTrigger>
          <TabsTrigger value="violations">Violations CSP</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        {/* Health Checks */}
        <TabsContent value="health-checks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>V├®rifications Sant├® D├®taill├®es</CardTitle>
              <CardDescription>
                {healthReport?.checksPerformed || 0} checks effectu├®s - 
                {healthReport?.checksPassed || 0} r├®ussis - 
                {healthReport?.checksFailed || 0} ├®chou├®s
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthReport?.checks.map((check: HealthCheckResult, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium">{check.name}</p>
                        <p className="text-sm text-gray-500">{check.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">
                        {check.responseTime}ms
                      </p>
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations CSP */}
        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Violations Content Security Policy</CardTitle>
              <CardDescription>
                {violations.length} violations d├®tect├®es r├®cemment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
                  <p>Aucune violation CSP d├®tect├®e</p>
                  <p className="text-sm">Le syst├¿me est s├®curis├®</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {violations.map((violation, index) => (
                    <div
                      key={index}
                      className="p-3 border border-red-200 rounded-lg bg-red-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-red-900">
                            {violation.violatedDirective}
                          </p>
                          <p className="text-sm text-red-700 mt-1 break-all">
                            URI bloqu├®e: {violation.blockedUri}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {new Date(violation.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostics */}
        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Syst├¿me</CardTitle>
              <CardDescription>
                Informations d├®taill├®es sur l'├®tat du syst├¿me
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Uptime */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Uptime Syst├¿me</p>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold">
                  {healthReport ? Math.floor(healthReport.uptime / 3600) : 0}h 
                  {healthReport ? Math.floor((healthReport.uptime % 3600) / 60) : 0}m
                </p>
              </div>

              {/* Services Status */}
              <div className="p-4 border rounded-lg">
                <p className="font-medium mb-3">Services S├®curit├®</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Monitoring Service</span>
                    <Badge className="bg-green-500">Actif</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Health Check Service</span>
                    <Badge className="bg-green-500">Actif</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Content Security Policy</span>
                    <Badge className="bg-green-500">Actif</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Secure Logger</span>
                    <Badge className="bg-green-500">Actif</Badge>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <p className="font-medium text-blue-900 mb-2">
                  Recommandations
                </p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  {health?.metrics.criticalErrors > 0 && (
                    <li>R├®soudre imm├®diatement les {health.metrics.criticalErrors} erreurs critiques</li>
                  )}
                  {health?.metrics.pendingErrors > 10 && (
                    <li>Traiter les {health.metrics.pendingErrors} erreurs en attente</li>
                  )}
                  {violations.length > 5 && (
                    <li>Investiguer les {violations.length} violations CSP</li>
                  )}
                  {health?.overall === 'healthy' && (
                    <li>Syst├¿me en bon ├®tat, continuer la surveillance</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
