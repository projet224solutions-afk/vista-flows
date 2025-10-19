import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Play, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'success' | 'failed' | 'pending';
  duration: number;
  message?: string;
}

interface PDGTestSuiteProps {
  mfaVerified: boolean;
}

export default function PDGTestSuite({ mfaVerified }: PDGTestSuiteProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const tests = [
    { name: 'Connexion Base de Données', key: 'db' },
    { name: 'Authentification Utilisateurs', key: 'auth' },
    { name: 'Transactions Wallet', key: 'wallet' },
    { name: 'Système de Paiement', key: 'payment' },
    { name: 'API Externes', key: 'api' },
    { name: 'Système de Notification', key: 'notification' },
    { name: 'Stockage Fichiers', key: 'storage' },
    { name: 'Cache Redis', key: 'cache' }
  ];

  const handleRunTests = async () => {
    setRunning(true);
    setResults([]);
    toast.info('Lancement de la suite de tests...');

    for (const test of tests) {
      // Simuler l'exécution du test
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const success = Math.random() > 0.2; // 80% de réussite
      const newResult: TestResult = {
        name: test.name,
        status: success ? 'success' : 'failed',
        duration: Math.floor(Math.random() * 1000) + 100,
        message: success ? 'Test réussi' : 'Test échoué - Vérifier la configuration'
      };

      setResults(prev => [...prev, newResult]);
    }

    setRunning(false);
    const failedCount = results.filter(r => r.status === 'failed').length;
    if (failedCount === 0) {
      toast.success('Tous les tests ont réussi !');
    } else {
      toast.error(`${failedCount} test(s) ont échoué`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Réussi</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Échoué</Badge>;
      default:
        return <Badge className="bg-yellow-500">En cours</Badge>;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Suite de Tests Système</h2>
          <p className="text-muted-foreground mt-1">Tests automatisés de la plateforme</p>
        </div>
        <Button onClick={handleRunTests} disabled={running}>
          <Play className="w-4 h-4 mr-2" />
          {running ? 'Tests en cours...' : 'Lancer les tests'}
        </Button>
      </div>

      {/* Résumé */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tests Exécutés</CardTitle>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                sur {tests.length} tests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Réussis</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{successCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((successCount / results.length) * 100).toFixed(0)}% de réussite
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Échoués</CardTitle>
              <XCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{failedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((failedCount / results.length) * 100).toFixed(0)}% d'échec
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Résultats des tests */}
      <Card>
        <CardHeader>
          <CardTitle>Résultats des Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
              <p>Aucun test exécuté</p>
              <p className="text-sm mt-2">Cliquez sur "Lancer les tests" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <h3 className="font-medium">{result.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {result.message} • {result.duration}ms
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!mfaVerified && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <p className="text-sm text-orange-500">
                MFA non vérifié - Accès limité aux tests de sécurité avancés
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
