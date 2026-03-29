/**
 * ðŸ”„ COMPOSANT DE SYNCHRONISATION PDG - 224SOLUTIONS
 * 
 * Affiche l'Ã©tat de synchronisation des donnÃ©es et permet de lancer une sync manuelle
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePDGSyncStatus } from '@/hooks/usePDGSyncStatus';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Database,
  Users,
  Wallet,
  ArrowRightLeft,
  Loader2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function PDGSyncDashboard() {
  const { 
    lastCheck, 
    isHealthy, 
    checks, 
    recommendations, 
    loading, 
    syncing, 
    refresh, 
    runSync 
  } = usePDGSyncStatus();

  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="w-4 h-4 text-primary-orange-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok':
        return 'bg-primary-blue-600/10 text-primary-orange-600 border-primary-orange-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
    }
  };

  const getTableIcon = (table: string) => {
    if (table.includes('profiles') || table.includes('user')) return <Users className="w-4 h-4" />;
    if (table.includes('wallet') || table.includes('transactions')) return <Wallet className="w-4 h-4" />;
    if (table.includes('vendor') || table.includes('agents')) return <Database className="w-4 h-4" />;
    return <ArrowRightLeft className="w-4 h-4" />;
  };

  const healthScore = checks.length > 0 
    ? Math.round((checks.filter(c => c.status === 'ok').length / checks.length) * 100)
    : 100;

  const handleSync = async () => {
    const result = await runSync();
    if (result.success) {
      toast.success(`Synchronisation terminÃ©e: ${result.totalSynced} Ã©lÃ©ments synchronisÃ©s`);
    } else if (result.totalSynced > 0) {
      toast.warning(`Synchronisation partielle: ${result.totalSynced} rÃ©ussis, ${result.totalErrors} erreurs (conflits possibles)`);
    } else if (result.totalErrors > 0) {
      toast.error(`Des conflits empÃªchent la synchronisation. VÃ©rifiez les recommandations.`);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Analyse de la cohÃ©rence des donnÃ©es...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isHealthy ? 'bg-primary-blue-600/10' : 'bg-yellow-500/10'}`}>
                <Database className={`w-6 h-6 ${isHealthy ? 'text-primary-orange-500' : 'text-yellow-500'}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Synchronisation des DonnÃ©es
                  <Badge variant="outline" className={isHealthy ? 'border-primary-orange-500/30 bg-primary-blue-600/10 text-primary-orange-600' : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600'}>
                    {isHealthy ? 'Sain' : 'Attention requise'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  DerniÃ¨re vÃ©rification: {lastCheck ? new Date(lastCheck).toLocaleString('fr-FR') : 'Jamais'}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                VÃ©rifier
              </Button>
              <Button 
                size="sm" 
                onClick={handleSync}
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Synchroniser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Health Score */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Score de santÃ©</span>
              <span className={`text-lg font-bold ${
                healthScore >= 80 ? 'text-primary-orange-500' : 
                healthScore >= 50 ? 'text-yellow-500' : 
                'text-red-500'
              }`}>
                {healthScore}%
              </span>
            </div>
            <Progress 
              value={healthScore} 
              className="h-2"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-primary-orange-500">
                {checks.filter(c => c.status === 'ok').length}
              </div>
              <div className="text-xs text-muted-foreground">VÃ©rifications OK</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {checks.filter(c => c.status === 'warning').length}
              </div>
              <div className="text-xs text-muted-foreground">Avertissements</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-red-500">
                {checks.filter(c => c.status === 'error').length}
              </div>
              <div className="text-xs text-muted-foreground">Erreurs</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-2xl font-bold text-primary">
                {checks.reduce((sum, c) => sum + (c.discrepancies || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">Ã‰lÃ©ments Ã  sync</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Checks */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">DÃ©tails des vÃ©rifications</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Masquer' : 'Afficher'} dÃ©tails
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checks.map((check, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl border ${getStatusColor(check.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getTableIcon(check.table)}
                  <div>
                    <div className="font-medium text-sm">{check.table}</div>
                    <div className="text-xs text-muted-foreground">{check.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {check.discrepancies !== undefined && check.discrepancies > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {check.discrepancies} Ã  corriger
                    </Badge>
                  )}
                  {getStatusIcon(check.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Recommandations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-0.5">â€¢</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
