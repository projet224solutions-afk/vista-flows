import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, RefreshCw, XCircle, Zap, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PdgDebugPanel() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingAll, setFixingAll] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const loadErrors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setErrors(data || []);

      // Calculer les stats
      const total = data?.length || 0;
      const critical = data?.filter((e) => e.severity === 'critique').length || 0;
      const moderate = data?.filter((e) => e.severity === 'modérée').length || 0;
      const minor = data?.filter((e) => e.severity === 'mineure').length || 0;
      const fixed = data?.filter((e) => e.fix_applied).length || 0;
      const pending = data?.filter((e) => e.status === 'detected').length || 0;

      setStats({ total, critical, moderate, minor, fixed, pending });
    } catch (error) {
      console.error('Failed to load errors:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les erreurs système',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const fixManually = async (errorId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Non authentifié',
          description: 'Vous devez être connecté pour effectuer cette action',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(
        `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/fix-error`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ errorId }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Succès',
          description: data.message || 'Correction appliquée avec succès',
        });

        // Mettre à jour l'erreur localement
        setErrors(
          errors.map((e) =>
            e.id === errorId
              ? { ...e, fix_applied: true, status: 'fixed', fix_description: data.fix_description }
              : e
          )
        );
      } else {
        throw new Error(data.error || 'Erreur lors de la correction');
      }
    } catch (error) {
      console.error('Error fixing manually:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la correction',
        variant: 'destructive',
      });
    }
  };

  const fixAllCritical = async () => {
    setFixingAll(true);
    
    try {
      console.log('Toutes les erreurs:', errors.map(e => ({
        id: e.id,
        severity: e.severity,
        fix_applied: e.fix_applied,
        module: e.module
      })));

      const criticalErrors = errors.filter(
        (e) => !e.fix_applied && (e.severity === 'critique' || e.severity === 'modérée')
      );

      console.log('Erreurs critiques/modérées non corrigées:', criticalErrors.length);
      console.log('Détail:', criticalErrors);

      if (criticalErrors.length === 0) {
        toast({
          title: 'Aucune erreur à corriger',
          description: 'Toutes les erreurs critiques et modérées sont déjà corrigées',
        });
        return;
      }

      toast({
        title: 'Correction en cours...',
        description: `${criticalErrors.length} erreur(s) en cours de correction`,
      });

      let fixed = 0;
      let failed = 0;

      for (const error of criticalErrors) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            console.error('Pas de session pour corriger:', error.id);
            failed++;
            continue;
          }

          const response = await fetch(
            `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/fix-error`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ errorId: error.id }),
            }
          );

          if (response.ok) {
            fixed++;
            console.log('Erreur corrigée:', error.id);
            // Mettre à jour localement
            setErrors(prev =>
              prev.map((e) =>
                e.id === error.id
                  ? { ...e, fix_applied: true, status: 'fixed' }
                  : e
              )
            );
          } else {
            const errorData = await response.json();
            console.error('Échec correction:', error.id, errorData);
            failed++;
          }
        } catch (err) {
          failed++;
          console.error('Erreur lors de la correction:', error.id, err);
        }
      }

      toast({
        title: 'Correction terminée',
        description: `✅ ${fixed} corrigée(s) • ❌ ${failed} échouée(s)`,
        variant: fixed > 0 ? 'default' : 'destructive',
      });

      // Recharger les erreurs
      await loadErrors();
    } finally {
      setFixingAll(false);
    }
  };

  const restartModule = async (moduleName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Non authentifié',
          description: 'Vous devez être connecté pour effectuer cette action',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(
        `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/restart-module`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ moduleName }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Succès',
          description: data.message || `Module ${moduleName} redémarré`,
        });
        loadErrors(); // Recharger les erreurs
      } else {
        throw new Error(data.error || 'Erreur lors du redémarrage');
      }
    } catch (error) {
      console.error('Error restarting module:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors du redémarrage',
        variant: 'destructive',
      });
    }
  };

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
    if (status === 'fixing') return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-col sm:flex-row w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => navigate('/pdg')}
              className="gap-2 w-full sm:w-auto"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold">Surveillance & Debug - PDG</h1>
              <p className="text-sm text-muted-foreground">Panneau de contrôle système 224SOLUTIONS</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={fixAllCritical} 
              disabled={fixingAll || loading}
              variant="default"
              className="gap-2 flex-1 sm:flex-none"
              size="sm"
            >
              <Zap className={`h-4 w-4 ${fixingAll ? 'animate-pulse' : ''}`} />
              <span className="hidden md:inline">
                {fixingAll ? 'Correction...' : 'Corriger Tout (Critiques)'}
              </span>
              <span className="md:hidden">
                {fixingAll ? 'En cours...' : 'Tout Corriger'}
              </span>
            </Button>
            <Button 
              onClick={loadErrors} 
              disabled={loading || fixingAll} 
              className="gap-2 flex-1 sm:flex-none" 
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Actualiser</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            <Card>
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardDescription className="text-xs">Total</CardDescription>
                <CardTitle className="text-2xl md:text-3xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardDescription className="text-red-500 text-xs">Critiques</CardDescription>
                <CardTitle className="text-2xl md:text-3xl text-red-500">{stats.critical}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardDescription className="text-yellow-500 text-xs">Modérées</CardDescription>
                <CardTitle className="text-2xl md:text-3xl text-yellow-500">{stats.moderate}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardDescription className="text-xs">Mineures</CardDescription>
                <CardTitle className="text-2xl md:text-3xl">{stats.minor}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardDescription className="text-green-500 text-xs">Corrigées</CardDescription>
                <CardTitle className="text-2xl md:text-3xl text-green-500">{stats.fixed}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 md:p-4">
                <CardDescription className="text-orange-500 text-xs">En Attente</CardDescription>
                <CardTitle className="text-2xl md:text-3xl text-orange-500">{stats.pending}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Errors Table */}
        <Card className="flex flex-col h-[calc(100vh-20rem)] sm:h-auto">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-lg md:text-xl">Erreurs Système</CardTitle>
            <CardDescription className="text-sm">Liste complète des erreurs détectées et leur statut</CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6 flex-1 overflow-hidden">
            <div className="h-full overflow-x-auto overflow-y-auto">
              <div className="rounded-md border min-w-[800px] md:min-w-0">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Statut</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Module</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Message</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Gravité</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap hidden sm:table-cell">Date</th>
                      <th className="p-2 md:p-3 text-left whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          <p>Aucune erreur détectée</p>
                        </td>
                      </tr>
                    ) : (
                      errors.map((error) => (
                        <tr key={error.id} className="border-t hover:bg-muted/50">
                          <td className="p-2 md:p-3">
                            {getStatusIcon(error.status, error.fix_applied)}
                          </td>
                          <td className="p-2 md:p-3 font-medium text-xs md:text-sm whitespace-nowrap">
                            {error.module}
                          </td>
                          <td className="p-2 md:p-3 max-w-[120px] sm:max-w-[200px] md:max-w-md truncate" title={error.error_message}>
                            {error.error_message}
                          </td>
                          <td className="p-2 md:p-3">
                            <Badge variant={getSeverityColor(error.severity)} className="text-xs whitespace-nowrap">
                              {error.severity}
                            </Badge>
                          </td>
                          <td className="p-2 md:p-3 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                            {new Date(error.created_at).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-2 md:p-3">
                            <div className="flex flex-col sm:flex-row gap-1 md:gap-2 whitespace-nowrap">
                              {!error.fix_applied && (
                                <Button
                                  size="sm"
                                  onClick={() => fixManually(error.id)}
                                  className="gap-1 text-xs h-7"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="hidden md:inline">Corriger</span>
                                  <span className="md:hidden">Fix</span>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restartModule(error.module)}
                                className="gap-1 text-xs h-7"
                              >
                                <Zap className="h-3 w-3" />
                                <span className="hidden md:inline">Redémarrer</span>
                                <span className="md:hidden">Reset</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
