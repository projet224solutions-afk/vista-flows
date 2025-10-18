/**
 * ⚙️ SYSTÈME & MAINTENANCE - 224SOLUTIONS
 * Interface de maintenance système pour PDG
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  RefreshCw, 
  Download, 
  Upload, 
  Shield, 
  Database, 
  Server, 
  Monitor,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Globe
} from 'lucide-react';

interface SystemStatus {
  database: 'operational' | 'maintenance' | 'error';
  api_services: 'operational' | 'maintenance' | 'error';
  payments: 'operational' | 'maintenance' | 'error';
  version: string;
  last_backup: string;
  uptime: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
}

interface BackupInfo {
  id: string;
  version: string;
  date: string;
  size: string;
  status: 'completed' | 'in_progress' | 'failed';
}

export default function PDGSystemMaintenance() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'operational',
    api_services: 'operational',
    payments: 'maintenance',
    version: 'v2.1.4',
    last_backup: '2024-10-05 14:30:00',
    uptime: '15 jours, 8 heures',
    cpu_usage: 45,
    memory_usage: 67,
    disk_usage: 78
  });

  const [backups, setBackups] = useState<BackupInfo[]>([
    {
      id: '1',
      version: 'v2.1.4',
      date: '2024-10-05 14:30:00',
      size: '2.3 GB',
      status: 'completed'
    },
    {
      id: '2',
      version: 'v2.1.3',
      date: '2024-09-10 09:15:00',
      size: '2.1 GB',
      status: 'completed'
    },
    {
      id: '3',
      version: 'v2.1.2',
      date: '2024-08-28 16:45:00',
      size: '1.9 GB',
      status: 'completed'
    }
  ]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const { toast } = useToast();

  // Charger le statut système
  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/system/status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Erreur chargement statut système:', error);
    }
  };

  // Mettre à jour le système
  const updateSystem = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/admin/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 'v2.1.5' })
      });

      if (response.ok) {
        toast({
          title: "🔄 Mise à jour en cours",
          description: "Le système se met à jour vers la version v2.1.5",
        });
        
        // Simuler la mise à jour
        setTimeout(() => {
          setSystemStatus(prev => ({ ...prev, version: 'v2.1.5' }));
          setIsUpdating(false);
          toast({
            title: "✅ Mise à jour terminée",
            description: "Le système a été mis à jour avec succès",
          });
        }, 5000);
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast({
        title: "❌ Erreur mise à jour",
        description: "Impossible de mettre à jour le système",
        variant: "destructive"
      });
      setIsUpdating(false);
    }
  };

  // Rollback système
  const rollbackSystem = async (backupId: string) => {
    setIsRollingBack(true);
    try {
      const response = await fetch('/api/admin/system/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_id: backupId })
      });

      if (response.ok) {
        toast({
          title: "🔄 Rollback en cours",
          description: "Restauration de l'ancien système...",
        });
        
        // Simuler le rollback
        setTimeout(() => {
          setIsRollingBack(false);
          toast({
            title: "✅ Rollback terminé",
            description: "Le système a été restauré avec succès",
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Erreur rollback:', error);
      toast({
        title: "❌ Erreur rollback",
        description: "Impossible de restaurer le système",
        variant: "destructive"
      });
      setIsRollingBack(false);
    }
  };

  // Créer une sauvegarde
  const createBackup = async () => {
    try {
      const response = await fetch('/api/admin/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast({
          title: "💾 Sauvegarde créée",
          description: "Une nouvelle sauvegarde a été créée",
        });
        
        // Ajouter la nouvelle sauvegarde
        const newBackup: BackupInfo = {
          id: Date.now().toString(),
          version: systemStatus.version,
          date: new Date().toLocaleString('fr-FR'),
          size: '2.4 GB',
          status: 'completed'
        };
        setBackups(prev => [newBackup, ...prev]);
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: "❌ Erreur sauvegarde",
        description: "Impossible de créer la sauvegarde",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4" />;
      case 'maintenance': return <Clock className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statut système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            État du Système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Base de données</span>
              </div>
              <Badge className={getStatusColor(systemStatus.database)}>
                {getStatusIcon(systemStatus.database)}
                <span className="ml-1 capitalize">{systemStatus.database}</span>
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-green-600" />
                <span className="font-medium">API Services</span>
              </div>
              <Badge className={getStatusColor(systemStatus.api_services)}>
                {getStatusIcon(systemStatus.api_services)}
                <span className="ml-1 capitalize">{systemStatus.api_services}</span>
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Paiements</span>
              </div>
              <Badge className={getStatusColor(systemStatus.payments)}>
                {getStatusIcon(systemStatus.payments)}
                <span className="ml-1 capitalize">{systemStatus.payments}</span>
              </Badge>
            </div>
          </div>

          {/* Métriques système */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CPU</span>
                <span className="text-sm text-gray-600">{systemStatus.cpu_usage}%</span>
              </div>
              <Progress value={systemStatus.cpu_usage} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mémoire</span>
                <span className="text-sm text-gray-600">{systemStatus.memory_usage}%</span>
              </div>
              <Progress value={systemStatus.memory_usage} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Disque</span>
                <span className="text-sm text-gray-600">{systemStatus.disk_usage}%</span>
              </div>
              <Progress value={systemStatus.disk_usage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mise à jour système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Mise à jour Système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium">Version actuelle</h4>
              <p className="text-sm text-gray-600">{systemStatus.version}</p>
            </div>
            <Button 
              onClick={updateSystem}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              La mise à jour peut prendre quelques minutes. Le système sera temporairement indisponible.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Sauvegardes et rollback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Sauvegardes & Rollback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Dernière sauvegarde</h4>
              <p className="text-sm text-gray-600">{systemStatus.last_backup}</p>
            </div>
            <Button onClick={createBackup} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Créer sauvegarde
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Sauvegardes disponibles</h4>
            <div className="space-y-2">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{backup.version}</Badge>
                    <span className="text-sm text-gray-600">{backup.date}</span>
                    <span className="text-sm text-gray-500">({backup.size})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rollbackSystem(backup.id)}
                    disabled={isRollingBack}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Restaurer
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Le rollback restaure le système à un état antérieur. Toutes les données récentes seront perdues.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
