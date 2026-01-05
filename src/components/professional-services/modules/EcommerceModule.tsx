/**
 * MODULE E-COMMERCE - Complet
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShoppingCart, Package, Users, TrendingUp, 
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Eye, Clock, CheckCircle, XCircle, DollarSign,
  BarChart3, ShoppingBag, AlertTriangle
} from 'lucide-react';
import { useEcommerceStats } from '@/hooks/useEcommerceStats';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface EcommerceModuleProps {
  serviceId: string;
  businessName?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-cyan-100 text-cyan-800',
  in_transit: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  ready: 'Prête',
  in_transit: 'En transit',
  delivered: 'Livrée',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-GN', {
    style: 'currency',
    currency: 'GNF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EcommerceModule({ serviceId, businessName }: EcommerceModuleProps) {
  const { stats, recentOrders, topProducts, loading, error, refresh } = useEcommerceStats();
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary" />
            {businessName || 'Module E-commerce'}
          </h2>
          <p className="text-muted-foreground">Gérez vos ventes, produits et clients</p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/vendeur/orders')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders.total || 0}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {stats?.orders.pending || 0} en attente
              </Badge>
              {(stats?.orders.pending || 0) > 0 && (
                <Clock className="w-3 h-3 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/vendeur/products')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.products.total || 0}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-green-600">{stats?.products.active || 0} actifs</span>
              {(stats?.products.lowStock || 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {stats?.products.lowStock} stock bas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clients.total || 0}</div>
            <div className="flex items-center gap-1 text-xs">
              {(stats?.clients.newThisMonth || 0) > 0 ? (
                <>
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">+{stats?.clients.newThisMonth} ce mois</span>
                </>
              ) : (
                <span className="text-muted-foreground">Aucun nouveau ce mois</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats?.sales.totalRevenue || 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(stats?.sales.monthRevenue || 0)} ce mois
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Commandes récentes
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Top produits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Résumé des ventes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Aujourd'hui</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.todayRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Cette semaine</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.weekRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Ce mois</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.monthRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">Panier moyen</span>
                  <span className="font-bold text-primary">{formatCurrency(stats?.sales.averageOrderValue || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  État des commandes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">En attente</span>
                  </div>
                  <Badge variant="secondary">{stats?.orders.pending || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">En cours</span>
                  </div>
                  <Badge variant="secondary">{stats?.orders.confirmed || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Livrées</span>
                  </div>
                  <Badge variant="secondary">{stats?.orders.delivered || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm">Annulées</span>
                  </div>
                  <Badge variant="secondary">{stats?.orders.cancelled || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Commandes récentes</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/vendeur/orders')}>
                <Eye className="w-4 h-4 mr-2" />
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune commande pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{order.order_number}</span>
                          <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.customer_name} • {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(order.total_amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Produits les plus vendus</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/vendeur/products')}>
                <Eye className="w-4 h-4 mr-2" />
                Gérer les produits
              </Button>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune vente enregistrée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div 
                      key={product.id} 
                      className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.total_sold} vendus
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">{formatCurrency(product.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EcommerceModule;
