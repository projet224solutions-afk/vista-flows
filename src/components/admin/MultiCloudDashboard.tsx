/**
 * Dashboard Multi-Cloud Health Check
 * Vue temps réel de l'état de tous les services cloud
 */
import { useMultiCloudHealth } from '@/hooks/useMultiCloudHealth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Cloud, Database, Shield, Bell, Server, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { ServiceStatus, CloudProvider } from '@/services/MultiCloudHealthService';

const statusConfig: Record<ServiceStatus, { color: string; icon: typeof CheckCircle; label: string }> = {
  operational: { color: 'bg-emerald-500', icon: CheckCircle, label: 'Opérationnel' },
  degraded: { color: 'bg-amber-500', icon: AlertTriangle, label: 'Dégradé' },
  outage: { color: 'bg-red-500', icon: XCircle, label: 'Panne' },
  unknown: { color: 'bg-slate-400', icon: HelpCircle, label: 'Inconnu' }
};

const providerConfig: Record<CloudProvider, { label: string; icon: typeof Cloud; color: string }> = {
  supabase: { label: 'Supabase', icon: Database, color: 'text-emerald-600' },
  aws: { label: 'AWS', icon: Server, color: 'text-orange-500' },
  google_cloud: { label: 'Google Cloud', icon: Cloud, color: 'text-blue-500' },
  firebase: { label: 'Firebase', icon: Bell, color: 'text-yellow-500' }
};

export default function MultiCloudDashboard() {
  const { report, isChecking, refresh } = useMultiCloudHealth(60000);

  if (!report) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Vérification des services...</span>
      </div>
    );
  }

  const OverallStatus = statusConfig[report.overall];

  return (
    <div className="space-y-6">
      {/* Header global */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusConfig[report.overall].color} animate-pulse`} />
          <h2 className="text-lg font-semibold">Infrastructure Multi-Cloud</h2>
          <Badge variant="outline" className="text-xs">
            {report.uptimePercent}% opérationnel
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isChecking}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Score global */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <OverallStatus.icon className={`h-5 w-5 ${report.overall === 'operational' ? 'text-emerald-500' : report.overall === 'degraded' ? 'text-amber-500' : 'text-red-500'}`} />
              <span className="font-medium">{OverallStatus.label}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {report.healthyChecks}/{report.totalChecks} services OK
            </span>
          </div>
          <Progress value={report.uptimePercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Dernière vérification : {new Date(report.timestamp).toLocaleTimeString('fr-FR')}
          </p>
        </CardContent>
      </Card>

      {/* Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(report.providers) as CloudProvider[]).map(provider => {
          const prov = report.providers[provider];
          const config = providerConfig[provider];
          const ProvIcon = config.icon;

          return (
            <Card key={provider}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ProvIcon className={`h-5 w-5 ${config.color}`} />
                    <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{prov.avgResponseTime}ms</span>
                    <div className={`w-2 h-2 rounded-full ${statusConfig[prov.status].color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {prov.services.map((svc, i) => {
                    const SvcStatus = statusConfig[svc.status];
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <SvcStatus.icon className={`h-3.5 w-3.5 ${svc.status === 'operational' ? 'text-emerald-500' : svc.status === 'degraded' ? 'text-amber-500' : svc.status === 'outage' ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className="text-xs">{svc.service}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{svc.responseTime}ms</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
