/**
 * MODULE RESTAURANT - Interface complète
 * Utilise serviceId pour afficher les données spécifiques au restaurant
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UtensilsCrossed, ClipboardList, Users, Calendar,
  TrendingUp, RefreshCw, Clock, CheckCircle, XCircle,
  DollarSign, ShoppingBag, Package, Truck, MapPin, Eye,
  Sparkles, Settings, Plus
} from 'lucide-react';
import { useServiceRestaurantStats } from '@/hooks/useServiceRestaurantStats';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface RestaurantModuleProps {
  serviceId: string;
  businessName?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-GN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FG';
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  preparing: 'En préparation',
  ready: 'Prête',
  delivered: 'Livrée',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

const orderTypeIcons: Record<string, React.ReactNode> = {
  dine_in: <MapPin className="w-3 h-3" />,
  sur_place: <MapPin className="w-3 h-3" />,
  delivery: <Truck className="w-3 h-3" />,
  livraison: <Truck className="w-3 h-3" />,
  takeaway: <ShoppingBag className="w-3 h-3" />,
  emporter: <ShoppingBag className="w-3 h-3" />,
};

const orderTypeLabels: Record<string, string> = {
  dine_in: 'Sur place',
  sur_place: 'Sur place',
  delivery: 'Livraison',
  livraison: 'Livraison',
  takeaway: 'À emporter',
  emporter: 'À emporter',
};

export function RestaurantModule({ serviceId, businessName }: RestaurantModuleProps) {
  const { stats, recentOrders, loading, error, refresh } = useServiceRestaurantStats(serviceId);
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

  // Message d'onboarding si pas de données
  if (!stats?.hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="w-7 h-7 text-primary" />
              {businessName || 'Restaurant'}
            </h2>
            <p className="text-muted-foreground">Gérez votre restaurant</p>
          </div>
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Bienvenue dans votre espace Restaurant !</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configurez votre menu, gérez vos commandes et suivez vos performances en temps réel.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button variant="outline" className="gap-2 justify-start">
                    <Plus className="w-4 h-4" />
                    Ajouter un plat
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start">
                    <Settings className="w-4 h-4" />
                    Configurer
                  </Button>
                  <Button variant="outline" className="gap-2 justify-start">
                    <ClipboardList className="w-4 h-4" />
                    Voir le menu
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
            <UtensilsCrossed className="w-7 h-7 text-primary" />
            {businessName || 'Restaurant'}
          </h2>
          <p className="text-muted-foreground">Gérez vos commandes et votre menu</p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders.total || 0}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {(stats?.orders.pending || 0) + (stats?.orders.preparing || 0) > 0 && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                  <Clock className="w-3 h-3 mr-1" />
                  {(stats?.orders.pending || 0) + (stats?.orders.preparing || 0)} actives
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Menu</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.menuItems.total || 0}</div>
            <span className="text-xs text-green-600">{stats?.menuItems.active || 0} plats actifs</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Réservations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.reservations.today || 0}</div>
            <span className="text-xs text-muted-foreground">aujourd'hui</span>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(stats?.sales.totalRevenue || 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(stats?.sales.todayRevenue || 0)} aujourd'hui
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
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2 hidden md:block" />
            Commandes
          </TabsTrigger>
          <TabsTrigger value="menu">
            <UtensilsCrossed className="w-4 h-4 mr-2 hidden md:block" />
            Menu
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
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold text-primary">{formatCurrency(stats?.sales.totalRevenue || 0)}</span>
                </div>
                
                {/* Par type */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                    <MapPin className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-amber-700">Sur place</div>
                    <div className="text-lg font-bold text-amber-600">{formatCurrency(stats?.salesDineIn.totalRevenue || 0)}</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                    <Truck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-blue-700">Livraison</div>
                    <div className="text-lg font-bold text-blue-600">{formatCurrency(stats?.salesDelivery.totalRevenue || 0)}</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
                    <ShoppingBag className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-purple-700">À emporter</div>
                    <div className="text-lg font-bold text-purple-600">{formatCurrency(stats?.salesTakeaway.totalRevenue || 0)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Aujourd'hui</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.todayRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Ce mois</span>
                  <span className="font-semibold">{formatCurrency(stats?.sales.monthRevenue || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Orders by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Commandes par type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg text-center">
                    <MapPin className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-amber-700">Sur place</div>
                    <div className="text-xl font-bold text-amber-600">{stats?.ordersDineIn.total || 0}</div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg text-center">
                    <Truck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-blue-700">Livraison</div>
                    <div className="text-xl font-bold text-blue-600">{stats?.ordersDelivery.total || 0}</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 rounded-lg text-center">
                    <ShoppingBag className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                    <div className="text-xs font-medium text-purple-700">À emporter</div>
                    <div className="text-xl font-bold text-purple-600">{stats?.ordersTakeaway.total || 0}</div>
                  </div>
                </div>

                {/* Statuts */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex justify-between items-center p-2 rounded bg-yellow-50">
                    <span className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" /> En attente
                    </span>
                    <span className="font-semibold text-yellow-700">{stats?.orders.pending || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-blue-50">
                    <span className="text-sm flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-blue-500" /> En préparation
                    </span>
                    <span className="font-semibold text-blue-700">{stats?.orders.preparing || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-cyan-50">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-cyan-500" /> Prêtes
                    </span>
                    <span className="font-semibold text-cyan-700">{stats?.orders.ready || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-green-50">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Terminées
                    </span>
                    <span className="font-semibold text-green-700">{stats?.orders.delivered || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Commandes récentes</CardTitle>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">#{order.order_number}</span>
                          <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                          {order.order_type && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              {orderTypeIcons[order.order_type]}
                              {orderTypeLabels[order.order_type] || order.order_type}
                            </Badge>
                          )}
                          {order.table_number && (
                            <Badge variant="secondary" className="text-xs">
                              Table {order.table_number}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.customer_name || 'Client'} • {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(order.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>La gestion du menu sera disponible prochainement</p>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un plat
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RestaurantModule;
