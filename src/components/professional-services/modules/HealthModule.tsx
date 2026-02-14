/**
 * MODULE SANTÉ / PHARMACIE - Interface complète
 * Gestion de stock, ventes, ordonnances et clients
 */

import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Stethoscope, Users, Package, DollarSign,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye, Plus,
  TrendingUp, Settings, ShoppingCart, PackageX
} from 'lucide-react';
import { useServiceHealthStats } from '@/hooks/useServiceHealthStats';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface HealthModuleProps {
  serviceId: string;
  businessName?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  processing: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  completed: 'Terminée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  processing: 'En cours',
};

export function HealthModule({ serviceId, businessName }: HealthModuleProps) {
  const formatCurrency = useFormatCurrency();
  const { stats, recentSales, loading, error, refresh } = useServiceHealthStats(serviceId);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
          <Button onClick={refresh} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats?.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="w-7 h-7 text-primary" />
              {businessName || 'Pharmacie'}
            </h2>
            <p className="text-muted-foreground">Gérez votre pharmacie</p>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Bienvenue dans votre espace Santé !</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajoutez vos produits, gérez votre stock et suivez vos ventes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => navigate('/vendeur/products')}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un produit
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => navigate('/vendeur/orders')}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Voir les commandes
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => navigate('/vendeur/settings')}
                  >
                    <Settings className="w-4 h-4" />
                    Configurer
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-7 h-7 text-primary" />
            {businessName || 'Pharmacie'}
          </h2>
          <p className="text-muted-foreground">Gestion stock, ventes et clients</p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stock.totalProducts}</div>
            <span className="text-xs text-green-600">{stats.stock.activeProducts} actifs</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock bas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.stock.lowStockCount}</div>
            <div className="flex items-center gap-1">
              {stats.stock.outOfStockCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.stock.outOfStockCount} en rupture
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sales.totalOrders}</div>
            <span className="text-xs text-muted-foreground">{stats.clients.total} clients</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(stats.sales.totalRevenue)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(stats.sales.monthRevenue)} ce mois
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">
            <DollarSign className="w-4 h-4 mr-2 hidden md:block" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="sales">
            <ShoppingCart className="w-4 h-4 mr-2 hidden md:block" />
            Ventes
          </TabsTrigger>
          <TabsTrigger value="stock">
            <Package className="w-4 h-4 mr-2 hidden md:block" />
            Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Résumé des revenus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold text-primary">{formatCurrency(stats.sales.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Aujourd'hui</span>
                  <span className="font-semibold">{formatCurrency(stats.sales.todayRevenue)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Cette semaine</span>
                  <span className="font-semibold">{formatCurrency(stats.sales.weekRevenue)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Ce mois</span>
                  <span className="font-semibold">{formatCurrency(stats.sales.monthRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Stock Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  État du stock
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg text-center">
                    <div className="text-xs font-medium text-emerald-700">Produits actifs</div>
                    <div className="text-xl font-bold text-emerald-600">{stats.stock.activeProducts}</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg text-center">
                    <div className="text-xs font-medium text-blue-700">Total</div>
                    <div className="text-xl font-bold text-blue-600">{stats.stock.totalProducts}</div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between items-center p-2 rounded bg-orange-50 dark:bg-orange-900/20">
                    <span className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" /> Stock bas (≤5)
                    </span>
                    <span className="font-semibold text-orange-700">{stats.stock.lowStockCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-red-50 dark:bg-red-900/20">
                    <span className="text-sm flex items-center gap-2">
                      <PackageX className="w-4 h-4 text-red-500" /> En rupture
                    </span>
                    <span className="font-semibold text-red-700">{stats.stock.outOfStockCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-green-50 dark:bg-green-900/20">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" /> En stock
                    </span>
                    <span className="font-semibold text-green-700">
                      {stats.stock.totalProducts - stats.stock.outOfStockCount - stats.stock.lowStockCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Ventes récentes</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/vendeur/orders')}>
                <Eye className="w-4 h-4 mr-2" />
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune vente pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{sale.customer_name || 'Client'}</span>
                          <Badge className={statusColors[sale.status] || 'bg-gray-100'}>
                            {statusLabels[sale.status] || sale.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(sale.created_at), 'PPP', { locale: fr })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(sale.total_amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Gestion du stock
              </CardTitle>
              <Button onClick={() => navigate('/vendeur/products')} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un produit
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Gérez vos médicaments et produits de santé</p>
                <p className="text-sm">Les produits ajoutés seront visibles sur le marketplace</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate('/vendeur/products')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Voir tous mes produits
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HealthModule;
