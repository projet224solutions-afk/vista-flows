/**
 * 🔧 COMPOSANT: STATUT SYSTÈME D'ID
 * Affiche l'état du système de génération d'IDs et les statistiques
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Hash, TrendingUp, Database, Activity, RefreshCw } from 'lucide-react';

interface IdStats {
  total: number;
  by_scope: Record<string, number>;
  recent: Array<{
    public_id: string;
    scope: string;
    created_at: string;
  }>;
}

export function IdSystemStatus() {
  const [stats, setStats] = useState<IdStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Récupérer les statistiques
      const { data: allIds, error } = await supabase
        .from('ids_reserved')
        .select('public_id, scope, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Grouper par scope
      const byScope: Record<string, number> = {};
      allIds?.forEach(id => {
        byScope[id.scope] = (byScope[id.scope] || 0) + 1;
      });

      setStats({
        total: allIds?.length || 0,
        by_scope: byScope,
        recent: allIds?.slice(0, 5) || []
      });

    } catch (error) {
      console.error('Erreur récupération stats ID:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScopeLabel = (scope: string) => {
    const labels: Record<string, string> = {
      users: 'Utilisateurs',
      vendors: 'Vendeurs',
      products: 'Produits',
      orders: 'Commandes',
      drivers: 'Livreurs',
      transactions: 'Transactions',
      messages: 'Messages',
      demo: 'Démo/Test'
    };
    return labels[scope] || scope;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse" />
            Chargement...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Système d'ID Unique
            </CardTitle>
            <CardDescription>
              Statistiques de génération des IDs LLLDDDD
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total global */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-700">
              {stats?.total.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              IDs générés au total
            </div>
          </div>
        </div>

        {/* Par scope */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Répartition par type
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats?.by_scope || {})
              .sort((a, b) => b[1] - a[1])
              .map(([scope, count]) => (
                <div
                  key={scope}
                  className="p-3 bg-muted/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {getScopeLabel(scope)}
                    </span>
                    <Badge variant="secondary">
                      {count}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* IDs récents */}
        <div className="space-y-3">
          <h4 className="font-semibold">Derniers IDs générés</h4>
          <div className="space-y-2">
            {stats?.recent.map((id, index) => (
              <div
                key={`${id.public_id}-${index}`}
                className="flex items-center justify-between p-2 rounded border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className="font-mono font-semibold"
                  >
                    {id.public_id}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getScopeLabel(id.scope)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(id.created_at).toLocaleString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Informations système */}
        <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Format</span>
            <span className="font-mono font-semibold">LLLDDDD</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Capacité par scope</span>
            <span className="font-semibold">121,670,000 IDs</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Statut</span>
            <Badge variant="default" className="bg-green-600">
              ✓ Opérationnel
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default IdSystemStatus;
