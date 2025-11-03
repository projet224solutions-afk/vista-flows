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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/pdg')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Surveillance & Debug - PDG</h1>
            <p className="text-muted-foreground">Panneau de contrôle système 224SOLUTIONS</p>
          </div>
        </div>
        <Button onClick={loadErrors} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
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
              <CardDescription>Mineures</CardDescription>
              <CardTitle className="text-3xl">{stats.minor}</CardTitle>
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

      {/* Errors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Erreurs Système</CardTitle>
          <CardDescription>Liste complète des erreurs détectées et leur statut</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Statut</th>
                    <th className="p-3 text-left">Module</th>
                    <th className="p-3 text-left">Message d'erreur</th>
                    <th className="p-3 text-left">Gravité</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((error) => (
                    <tr key={error.id} className="border-t hover:bg-muted/50">
                      <td className="p-3">
                        {getStatusIcon(error.status, error.fix_applied)}
                      </td>
                      <td className="p-3 font-medium">{error.module}</td>
                      <td className="p-3 max-w-md truncate" title={error.error_message}>
                        {error.error_message}
                      </td>
                      <td className="p-3">
                        <Badge variant={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(error.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {!error.fix_applied && (
                            <Button
                              size="sm"
                              onClick={() => fixManually(error.id)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Corriger
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restartModule(error.module)}
                            className="gap-1"
                          >
                            <Zap className="h-3 w-3" />
                            Redémarrer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
