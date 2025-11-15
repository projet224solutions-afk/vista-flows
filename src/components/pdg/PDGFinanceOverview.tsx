import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Shield, AlertTriangle } from 'lucide-react';

interface PDGFinanceOverviewProps {
  data: {
    users: {
      total: number;
      vendeurs: number;
      clients: number;
    };
    transactions: {
      total: number;
      totalAmount: number;
      avgAmount: number;
    };
    orders: {
      total: number;
      pending: number;
      completed: number;
      cancelled: number;
    };
    escrow: {
      total: number;
      held: number;
      released: number;
      totalAmount: number;
    };
    products: {
      total: number;
      active: number;
    };
    errors: {
      total: number;
      critical: number;
      fixed: number;
    };
  };
}

export default function PDGFinanceOverview({ data }: PDGFinanceOverviewProps) {
  const completionRate = data.orders.total > 0 
    ? ((data.orders.completed / data.orders.total) * 100).toFixed(1) 
    : 0;

  const escrowPendingAmount = (data.escrow.totalAmount / 1000).toFixed(0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Vue Financière Globale - Données en Temps Réel
        </h2>
        <p className="text-muted-foreground mt-1">
          Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
        </p>
      </div>

      {/* Finance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Revenus 30j
              </span>
            </CardTitle>
            <CardDescription>{data.transactions.total} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {(data.transactions.totalAmount / 1000).toFixed(0)}k GNF
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Moyenne: {data.transactions.avgAmount.toFixed(0)} GNF/transaction
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                Fonds Escrow
              </span>
            </CardTitle>
            <CardDescription>{data.escrow.total} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {escrowPendingAmount}k GNF
            </div>
            <div className="mt-2 flex gap-2">
              <Badge variant="secondary">{data.escrow.held} en attente</Badge>
              <Badge variant="default" className="bg-green-500">{data.escrow.released} libérés</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                Commandes
              </span>
            </CardTitle>
            <CardDescription>Taux de complétion: {completionRate}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {data.orders.total}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
              <div>
                <span className="text-yellow-600 font-semibold">{data.orders.pending}</span>
                <div className="text-muted-foreground">En attente</div>
              </div>
              <div>
                <span className="text-green-600 font-semibold">{data.orders.completed}</span>
                <div className="text-muted-foreground">Complété</div>
              </div>
              <div>
                <span className="text-red-600 font-semibold">{data.orders.cancelled}</span>
                <div className="text-muted-foreground">Annulé</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Utilisateurs Actifs
            </CardTitle>
            <CardDescription>Répartition par rôle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total utilisateurs</span>
                <Badge variant="outline" className="text-lg">{data.users.total}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{data.users.vendeurs}</div>
                  <div className="text-xs text-muted-foreground">Vendeurs</div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{data.users.clients}</div>
                  <div className="text-xs text-muted-foreground">Clients</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Santé Système
            </CardTitle>
            <CardDescription>Erreurs et correctifs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total erreurs</span>
                <Badge variant={data.errors.critical > 0 ? 'destructive' : 'outline'}>
                  {data.errors.total}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{data.errors.critical}</div>
                  <div className="text-xs text-muted-foreground">Critiques</div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{data.errors.fixed}</div>
                  <div className="text-xs text-muted-foreground">Corrigées</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Catalogue Produits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{data.products.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Total produits</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{data.products.active}</div>
              <div className="text-sm text-muted-foreground mt-1">Actifs</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
