import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, Info, RefreshCw, FileJson } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalysisResult {
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export function PDGPermissionsAnalyzer() {
  const [analysis, setAnalysis] = useState<Record<string, AnalysisResult[]>>({});
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState<any>(null);

  const runAnalysis = async () => {
    setLoading(true);
    const results: Record<string, AnalysisResult[]> = {};

    try {
      // 1. Vérifier les tables
      results['Tables'] = await checkTables();
      
      // 2. Vérifier les fonctions
      results['Fonctions'] = await checkFunctions();
      
      // 3. Vérifier les politiques RLS
      results['Politiques RLS'] = await checkPolicies();
      
      // 4. Vérifier les permissions du catalogue
      results['Catalogue'] = await checkCatalog();
      
      // 5. Vérifier les permissions déléguées
      results['Permissions déléguées'] = await checkDelegatedPermissions();
      
      setAnalysis(results);
    } catch (error) {
      console.error('Erreur analyse:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  };

  const checkTables = async (): Promise<AnalysisResult[]> => {
    const results: AnalysisResult[] = [];
    const tables = ['pdg_access_permissions', 'pdg_permissions_audit', 'pdg_permission_catalog'];

    for (const table of tables) {
      try {
        const { error, data } = await supabase
          .from(table as any)
          .select('count')
          .limit(0);

        if (error?.message?.includes('does not exist')) {
          results.push({
            status: 'error',
            message: `Table '${table}' manquante`,
            severity: 'critical'
          });
        } else if (error) {
          results.push({
            status: 'warning',
            message: `Erreur accès '${table}': ${error.message}`,
            severity: 'high'
          });
        } else {
          results.push({
            status: 'ok',
            message: `Table '${table}' présente et accessible`
          });
        }
      } catch (err) {
        results.push({
          status: 'error',
          message: `Erreur vérification table '${table}'`,
          severity: 'high'
        });
      }
    }

    return results;
  };

  const checkFunctions = async (): Promise<AnalysisResult[]> => {
    const results: AnalysisResult[] = [];
    const functions = [
      'grant_pdg_permission_to_agent',
      'revoke_pdg_permission_from_agent',
      'agent_has_permission'
    ];

    for (const fn of functions) {
      try {
        const { error } = await supabase.rpc(fn as any, {});
        
        if (error?.message?.includes('does not exist')) {
          results.push({
            status: 'error',
            message: `Fonction '${fn}' manquante`,
            severity: 'critical'
          });
        } else {
          results.push({
            status: 'ok',
            message: `Fonction '${fn}' disponible`
          });
        }
      } catch (err) {
        results.push({
          status: 'ok',
          message: `Fonction '${fn}' existe (erreur d'exécution attendue)`
        });
      }
    }

    return results;
  };

  const checkPolicies = async (): Promise<AnalysisResult[]> => {
    const results: AnalysisResult[] = [];
    
    // Vérifier si on peut accéder aux politiques via information_schema
    try {
      const { data, error } = await supabase
        .from('information_schema.policies' as any)
        .select('policyname')
        .filter('tablename', 'eq', 'pdg_access_permissions');

      if (error?.message?.includes('does not exist')) {
        results.push({
          status: 'warning',
          message: 'Impossible de vérifier les politiques RLS (information_schema non accessible)',
          severity: 'low'
        });
      } else {
        results.push({
          status: 'ok',
          message: 'Politiques RLS vérifiées'
        });
      }
    } catch (err) {
      results.push({
        status: 'warning',
        message: 'Vérification des politiques RLS non possible',
        severity: 'low'
      });
    }

    return results;
  };

  const checkCatalog = async (): Promise<AnalysisResult[]> => {
    const results: AnalysisResult[] = [];

    try {
      const { data, error, count } = await supabase
        .from('pdg_permission_catalog')
        .select('*', { count: 'exact' });

      if (error) {
        results.push({
          status: 'error',
          message: 'Erreur accès catalogue permissions',
          severity: 'high'
        });
      } else if (!count || count === 0) {
        results.push({
          status: 'warning',
          message: 'Catalogue permissions vide',
          severity: 'high'
        });
      } else {
        results.push({
          status: 'ok',
          message: `Catalogue permissions: ${count} entrées`
        });

        // Vérifier la diversité des catégories
        const categories = new Set(data?.map((p: any) => p.category) || []);
        results.push({
          status: 'ok',
          message: `Catégories de permissions: ${Array.from(categories).join(', ')}`
        });
      }
    } catch (err) {
      results.push({
        status: 'error',
        message: 'Erreur vérification catalogue',
        severity: 'high'
      });
    }

    return results;
  };

  const checkDelegatedPermissions = async (): Promise<AnalysisResult[]> => {
    const results: AnalysisResult[] = [];

    try {
      const { data, error, count } = await supabase
        .from('pdg_access_permissions')
        .select('*', { count: 'exact' });

      if (error) {
        results.push({
          status: 'error',
          message: 'Erreur accès permissions déléguées',
          severity: 'high'
        });
      } else {
        results.push({
          status: 'ok',
          message: `Permissions déléguées: ${count || 0} enregistrements`
        });

        if (data && data.length > 0) {
          const expired = data.filter((p: any) => p.expires_at && new Date(p.expires_at) < new Date());
          if (expired.length > 0) {
            results.push({
              status: 'warning',
              message: `${expired.length} permissions expirées détectées`,
              severity: 'medium'
            });
          }
        }
      }
    } catch (err) {
      results.push({
        status: 'error',
        message: 'Erreur vérification permissions déléguées',
        severity: 'high'
      });
    }

    return results;
  };

  const exportAnalysis = () => {
    const data = JSON.stringify({ analysis, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdg-permissions-analysis-${Date.now()}.json`;
    a.click();
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'ok': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch(severity) {
      case 'low': return 'bg-blue-50 text-blue-900';
      case 'medium': return 'bg-yellow-50 text-yellow-900';
      case 'high': return 'bg-orange-50 text-orange-900';
      case 'critical': return 'bg-red-50 text-red-900';
      default: return 'bg-gray-50 text-gray-900';
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analyseur de Permissions PDG</CardTitle>
              <CardDescription>
                Vérifie l'intégrité du système de permissions déléguées
              </CardDescription>
            </div>
            <Button 
              onClick={runAnalysis}
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyse...' : 'Analyser'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(analysis).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Cliquez sur "Analyser" pour démarrer
            </div>
          ) : (
            <Tabs defaultValue={Object.keys(analysis)[0]}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  {Object.keys(analysis).map(category => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button variant="outline" size="sm" onClick={exportAnalysis}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </div>

              {Object.entries(analysis).map(([category, results]) => (
                <TabsContent key={category} value={category} className="space-y-2">
                  <ScrollArea className="h-[400px]">
                    <div className="pr-4 space-y-2">
                      {results.map((result, idx) => (
                        <Alert key={idx} className={getSeverityColor(result.severity)}>
                          <div className="flex items-start gap-2">
                            {getStatusIcon(result.status)}
                            <div className="flex-1">
                              <AlertTitle className="text-sm">{result.message}</AlertTitle>
                              {result.details && (
                                <AlertDescription className="text-xs mt-1">
                                  {result.details}
                                </AlertDescription>
                              )}
                            </div>
                            {result.severity && (
                              <Badge variant="outline" className="text-xs">
                                {result.severity}
                              </Badge>
                            )}
                          </div>
                        </Alert>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
