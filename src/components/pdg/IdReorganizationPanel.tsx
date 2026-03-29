import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  TrendingUp,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { RoleType, getIdConfig } from "@/lib/autoIdGenerator";
import { 
  getIdStats, 
  reorganizeIds, 
  reorganizeAllIds,
  analyzeIdGaps 
} from "@/lib/idReorganizer";

interface RoleStats {
  roleType: RoleType;
  label: string;
  total: number;
  maxNumber: number;
  gaps: number[];
  gapCount: number;
  loading: boolean;
}

const ROLE_LABELS: Record<RoleType, string> = {
  vendor: 'Vendeurs (VND)',
  client: 'Clients (CLT)',
  agent: 'Agents (AGT)',
  driver: 'Chauffeurs (DRV)',
  taxi: 'Taxi-Motos (TAX)',
  livreur: 'Livreurs (LIV)',
  bureau: 'Bureaux (BST)',
  pdg: 'PDG',
  transitaire: 'Transitaires (TRS)',
  worker: 'Travailleurs (WRK)'
};

export function IdReorganizationPanel() {
  const [stats, setStats] = useState<RoleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorganizing, setReorganizing] = useState<RoleType | 'all' | null>(null);
  const [lastResults, setLastResults] = useState<{ oldId: string; newId: string }[]>([]);

  const roleTypes: RoleType[] = ['vendor', 'client', 'agent', 'driver', 'bureau', 'transitaire', 'worker'];

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    const newStats: RoleStats[] = [];

    for (const roleType of roleTypes) {
      const stat = await getIdStats(roleType);
      newStats.push({
        roleType,
        label: ROLE_LABELS[roleType],
        ...stat,
        loading: false
      });
    }

    setStats(newStats);
    setLoading(false);
  };

  const handleReorganize = async (roleType: RoleType) => {
    setReorganizing(roleType);
    toast.info(`RÃ©organisation des IDs ${ROLE_LABELS[roleType]}...`);

    try {
      const result = await reorganizeIds(roleType);

      if (result.success) {
        toast.success(`${result.reorganized.length} ID(s) rÃ©organisÃ©(s) avec succÃ¨s`);
        setLastResults(result.reorganized);
      } else {
        toast.error(`Erreurs: ${result.errors.join(', ')}`);
      }

      await loadAllStats();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setReorganizing(null);
    }
  };

  const handleReorganizeAll = async () => {
    setReorganizing('all');
    toast.info('RÃ©organisation de tous les IDs...');

    try {
      const results = await reorganizeAllIds();
      let totalReorganized = 0;
      let totalErrors = 0;

      for (const roleType of Object.keys(results) as RoleType[]) {
        const result = results[roleType];
        totalReorganized += result.reorganized.length;
        totalErrors += result.errors.length;
      }

      if (totalErrors === 0) {
        toast.success(`${totalReorganized} ID(s) rÃ©organisÃ©(s) au total`);
      } else {
        toast.warning(`${totalReorganized} rÃ©organisÃ©(s), ${totalErrors} erreur(s)`);
      }

      await loadAllStats();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setReorganizing(null);
    }
  };

  const totalGaps = stats.reduce((sum, s) => sum + s.gapCount, 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              RÃ©organisation des IDs
            </CardTitle>
            <CardDescription>
              Maintenir une sÃ©quence continue d'IDs sans gaps
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllStats}
              disabled={loading || !!reorganizing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            {totalGaps > 0 && (
              <Button
                size="sm"
                onClick={handleReorganizeAll}
                disabled={loading || !!reorganizing}
              >
                {reorganizing === 'all' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Tout rÃ©organiser
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalGaps === 0 && !loading ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-primary-orange-500" />
            <AlertDescription>
              Tous les IDs sont correctement sÃ©quencÃ©s. Aucun gap dÃ©tectÃ©.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="details">DÃ©tails par rÃ´le</TabsTrigger>
              {lastResults.length > 0 && (
                <TabsTrigger value="history">DerniÃ¨res modifications</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((stat) => (
                  <Card key={stat.roleType} className={stat.gapCount > 0 ? 'border-yellow-500/50' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{stat.label}</span>
                        {stat.gapCount > 0 ? (
                          <Badge variant="destructive" className="bg-yellow-500">
                            {stat.gapCount} gap(s)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-primary-orange-600 border-primary-orange-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Total: {stat.total} IDs</p>
                        <p>Max: {getIdConfig(stat.roleType).prefix}{stat.maxNumber.toString().padStart(4, '0')}</p>
                        {stat.gapCount > 0 && (
                          <p className="text-yellow-600">
                            Gaps: {stat.gaps.slice(0, 5).join(', ')}
                            {stat.gaps.length > 5 && '...'}
                          </p>
                        )}
                      </div>
                      {stat.gapCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-3"
                          onClick={() => handleReorganize(stat.roleType)}
                          disabled={!!reorganizing}
                        >
                          {reorganizing === stat.roleType ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          RÃ©organiser
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details">
              <ScrollArea className="h-[400px]">
                {stats.filter(s => s.gapCount > 0).map((stat) => (
                  <div key={stat.roleType} className="mb-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      {stat.label}
                    </h3>
                    <div className="pl-6 space-y-1">
                      <p className="text-sm text-muted-foreground">
                        IDs manquants dans la sÃ©quence:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {stat.gaps.map((gap) => (
                          <Badge key={gap} variant="outline" className="text-yellow-600">
                            {getIdConfig(stat.roleType).prefix}{gap.toString().padStart(4, '0')}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        La rÃ©organisation dÃ©calera les IDs suivants pour combler ces gaps.
                      </p>
                    </div>
                  </div>
                ))}
                {stats.filter(s => s.gapCount > 0).length === 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-primary-orange-500" />
                    <AlertDescription>
                      Aucun gap Ã  afficher. Tous les IDs sont sÃ©quentiels.
                    </AlertDescription>
                  </Alert>
                )}
              </ScrollArea>
            </TabsContent>

            {lastResults.length > 0 && (
              <TabsContent value="history">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {lastResults.map((result, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <Badge variant="outline" className="font-mono">
                          {result.oldId}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge className="font-mono bg-gradient-to-br from-primary-blue-500 to-primary-orange-500">
                          {result.newId}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
