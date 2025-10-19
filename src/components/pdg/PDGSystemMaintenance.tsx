import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, Server, HardDrive, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface SystemStatus {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: string;
  lastCheck: string;
}

export default function PDGSystemMaintenance() {
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([
    { service: 'Base de données', status: 'operational', uptime: '99.9%', lastCheck: 'Il y a 2 min' },
    { service: 'Serveur principal', status: 'operational', uptime: '99.8%', lastCheck: 'Il y a 1 min' },
    { service: 'Stockage fichiers', status: 'operational', uptime: '100%', lastCheck: 'Il y a 5 min' },
    { service: 'API externe', status: 'degraded', uptime: '95.5%', lastCheck: 'Il y a 10 min' }
  ]);

  const handleRefreshStatus = async () => {
    setLoading(true);
    try {
      // Simuler une vérification du statut système
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Statut système mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenance = async (action: string) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Maintenance ${action} effectuée avec succès`);
    } catch (error) {
      toast.error(`Erreur lors de la maintenance ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-500">Opérationnel</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Dégradé</Badge>;
      case 'down':
        return <Badge className="bg-red-500">Hors ligne</Badge>;
      default:
        return <Badge>Inconnu</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Maintenance Système</h2>
          <p className="text-muted-foreground mt-1">Surveillance et gestion de l'infrastructure</p>
        </div>
        <Button onClick={handleRefreshStatus} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Statut des services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Statut des Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemStatus.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="font-medium">{service.service}</h3>
                    <p className="text-sm text-muted-foreground">
                      Uptime: {service.uptime} • {service.lastCheck}
                    </p>
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions de maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Base de données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('nettoyage DB')}
              disabled={loading}
            >
              Nettoyage
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('optimisation DB')}
              disabled={loading}
            >
              Optimisation
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('backup DB')}
              disabled={loading}
            >
              Sauvegarde
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Serveurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('redémarrage serveurs')}
              disabled={loading}
            >
              Redémarrer
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('mise à jour serveurs')}
              disabled={loading}
            >
              Mettre à jour
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('monitoring serveurs')}
              disabled={loading}
            >
              Surveiller
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Stockage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('nettoyage stockage')}
              disabled={loading}
            >
              Nettoyer
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('analyse stockage')}
              disabled={loading}
            >
              Analyser
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleMaintenance('compression stockage')}
              disabled={loading}
            >
              Compresser
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
