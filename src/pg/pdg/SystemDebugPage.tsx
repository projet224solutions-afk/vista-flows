import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  Server,
  Activity,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TableCheck {
  name: string;
  exists: boolean;
  rowCount?: number;
  error?: string;
}

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'critical' | 'unknown';
  database: 'healthy' | 'degraded' | 'critical';
  auth: 'healthy' | 'degraded' | 'critical';
  storage: 'healthy' | 'degraded' | 'critical';
  tables: TableCheck[];
  timestamp: string;
}

export default function SystemDebugPage() {
  const [status, setStatus] = React.useState<SystemStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [_applying, setApplying] = React.useState(false);

  const checkTables = async (): Promise<TableCheck[]> => {
    const requiredTables = [
      'secure_logs',
      'error_logs',
      'system_health_logs',
      'performance_metrics',
      'alerts',
      'health_check_reports',
      'csp_violations'
    ];

    const results: TableCheck[] = [];

    for (const tableName of requiredTables) {
      try {
        const { count, error } = await supabase
          .from(tableName as any)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results.push({
            name: tableName,
            exists: false,
            error: error.message
          });
        } else {
          results.push({
            name: tableName,
            exists: true,
            rowCount: count || 0
          });
        }
      } catch (err) {
        results.push({
          name: tableName,
          exists: false,
          error: String(err)
        });
      }
    }

    return results;
  };

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      // Check database
      const dbStart = Date.now();
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();
      const dbTime = Date.now() - dbStart;

      // Check auth
      const { data: { _session }, error: authError } = await supabase.auth.getSession();

      // Check storage
      const { data: _buckets, error: storageError } = await supabase.storage.listBuckets();

      // Check tables
      const tables = await checkTables();

      const databaseStatus = dbError ? 'critical' : dbTime > 1000 ? 'degraded' : 'healthy';
      const authStatus = authError ? 'degraded' : 'healthy';
      const storageStatus = storageError ? 'degraded' : 'healthy';

      const missingTables = tables.filter(t => !t.exists).length;
      const overall = missingTables > 0 ? 'degraded'
                    : databaseStatus === 'critical' ? 'critical'
                    : databaseStatus === 'degraded' || authStatus === 'degraded' ? 'degraded'
                    : 'healthy';

      setStatus({
        overall,
        database: databaseStatus,
        auth: authStatus,
        storage: storageStatus,
        tables,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking system status:', error);
      setStatus({
        overall: 'critical',
        database: 'critical',
        auth: 'critical',
        storage: 'critical',
        tables: [],
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const _applyMigration = async () => {
    setApplying(true);
    try {
      // Lire le contenu de la migration
      const migrationUrl = '/supabase/migrations/20240130_security_services_infrastructure.sql';

      console.log('Migration à appliquer :', migrationUrl);
      alert('Migration à appliquer manuellement via Supabase Dashboard ou via la CLI : supabase db push');

    } catch (error) {
      console.error('Error applying migration:', error);
    } finally {
      setApplying(false);
    }
  };

  React.useEffect(() => {
    checkSystemStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Vérification du système...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de vérifier l'état du système
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const missingTables = status.tables.filter(t => !t.exists);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Diagnostic système</h1>
          <p className="text-gray-600 mt-1">
            Vérification de l'état du système de monitoring et des services de sécurité
          </p>
        </div>
        <Button onClick={checkSystemStatus} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Rafraîchir
        </Button>
      </div>

      {/* Statut Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Statut global du système
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {getStatusIcon(status.overall)}
            <div>
              <div className="text-2xl font-bold capitalize">{status.overall}</div>
              <div className="text-sm text-gray-600">
                Dernière vérification : {new Date(status.timestamp).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerte si tables manquantes */}
      {missingTables.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Migration requise</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              {missingTables.length} table(s) manquante(s) pour les services de sécurité.
              Le système de monitoring est dégradé car ces tables sont nécessaires.
            </p>
            <div className="space-y-2">
              <p className="font-semibold">Pour corriger:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Ouvrir un terminal dans le projet</li>
                <li>Exécuter : <code className="bg-red-200 px-2 py-1 rounded">supabase db push</code></li>
                <li>Ou appliquer manuellement la migration dans Supabase Dashboard</li>
              </ol>
              <p className="text-sm mt-3">
                Fichier : <code className="bg-red-200 px-2 py-1 rounded">
                  supabase/migrations/20240130_security_services_infrastructure.sql
                </code>
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Composants système */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Base de données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.database)}
              <Badge className={getStatusColor(status.database)}>
                {status.database}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Authentification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.auth)}
              <Badge className={getStatusColor(status.auth)}>
                {status.auth}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.storage)}
              <Badge className={getStatusColor(status.storage)}>
                {status.storage}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables de sécurité */}
      <Card>
        <CardHeader>
          <CardTitle>Tables des services de sécurité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {status.tables.map((table) => (
              <div
                key={table.name}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {table.exists ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">{table.name}</div>
                    {table.exists ? (
                      <div className="text-sm text-gray-600">
                        {table.rowCount} ligne(s)
                      </div>
                    ) : (
                      <div className="text-sm text-red-600">
                        {table.error || 'Table manquante'}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={table.exists ? 'default' : 'destructive'}>
                  {table.exists ? 'OK' : 'MANQUANTE'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions de Correction */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions de correction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Étape 1 : Vérifier Supabase CLI</h3>
            <code className="block bg-gray-100 p-3 rounded text-sm">
              supabase --version
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Étape 2 : Appliquer la migration</h3>
            <code className="block bg-gray-100 p-3 rounded text-sm">
              supabase db push
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Étape 3 : Vérifier le résultat</h3>
            <p className="text-sm text-gray-600">
              Rafraîchir cette page après l'application de la migration.
              Toutes les tables doivent être marquées comme "OK" en vert.
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Alternative: Application manuelle</AlertTitle>
            <AlertDescription>
              Si vous n'avez pas Supabase CLI, vous pouvez:
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Ouvrir Supabase Dashboard</li>
                <li>Aller dans "SQL Editor"</li>
                <li>Copier le contenu de <code>supabase/migrations/20240130_security_services_infrastructure.sql</code></li>
                <li>Coller et exécuter le SQL</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Guides Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <p className="font-semibold mb-2">Guides disponibles:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><code>QUICK_START_SECURITY.md</code> - Installation rapide (30 min)</li>
              <li><code>SECURITY_SERVICES_GUIDE.md</code> - Guide complet utilisation</li>
              <li><code>SECURITY_IMPLEMENTATION_REPORT.md</code> - Rapport d'implémentation</li>
              <li><code>SECURITY_AUDIT_REPORT.md</code> - Rapport audit initial</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
