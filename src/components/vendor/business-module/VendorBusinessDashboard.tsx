/**
 * VENDOR BUSINESS DASHBOARD
 * Interface principale du module métier avec vue complète de la boutique
 * Design inspiré de l'image de référence avec KPIs, ventes POS/Online, et commandes
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, Package, Users, TrendingUp, 
  RefreshCw, Clock, CheckCircle, XCircle, 
  DollarSign, BarChart3, ShoppingBag, Plus,
  Store, Briefcase, ArrowUpRight, Info,
  Sparkles, Settings, BookOpen
} from 'lucide-react';
import { useVendorStats } from '@/hooks/useVendorStats';
import { useEcommerceStats } from '@/hooks/useEcommerceStats';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AddServiceModal } from './AddServiceModal';

interface VendorBusinessDashboardProps {
  businessName: string;
  serviceId: string;
  serviceTypeName?: string;
  onRefresh?: () => void;
  professionalService?: any;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-GN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FG';
}

export function VendorBusinessDashboard({
  businessName,
  serviceId,
  serviceTypeName,
  onRefresh,
  professionalService
}: VendorBusinessDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddService, setShowAddService] = useState(false);
  
  const { stats: vendorStats, loading: vendorLoading, refresh: refreshVendor } = useVendorStats();
  const { stats, recentOrders, topProducts, loading, refresh: refreshEcommerce } = useEcommerceStats();

  const handleRefresh = () => {
    refreshVendor();
    refreshEcommerce();
    onRefresh?.();
  };

  if (loading || vendorLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

  return (
    <div className="space-y-6">
      {/* Header avec nom de la boutique */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {businessName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez vos ventes, produits et clients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddService(true)}
            className="hidden md:flex gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau service
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      {/* 🆕 Status Banners */}
      {professionalService?.status === 'pending' && (
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20">
          <Clock className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Service en cours de validation
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Votre service professionnel est en attente de validation par notre équipe.
            Vous pourrez commencer à vendre une fois validé.
          </AlertDescription>
        </Alert>
      )}

      {professionalService?.verification_status === 'rejected' && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertTitle>Service rejeté</AlertTitle>
          <AlertDescription>
            Votre service n'a pas été approuvé. Contactez le support pour plus d'informations.
          </AlertDescription>
        </Alert>
      )}

      {!professionalService && (
        <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Créez votre premier service professionnel
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Configurez votre activité pour débloquer toutes les fonctionnalités du module métier.
            <Button 
              variant="link" 
              className="p-0 h-auto ml-1 text-blue-600"
              onClick={() => setShowAddService(true)}
            >
              Créer maintenant →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 🆕 Message d'onboarding pour nouveaux vendeurs */}
      {stats?.products.total === 0 && stats?.orders.total === 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  Bienvenue dans votre espace professionnel !
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Commencez à vendre en quelques étapes simples
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    variant="outline" 
                    className="gap-2 justify-start"
                    onClick={() => navigate('/vendeur/products/new')}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un produit
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2 justify-start"
                    onClick={() => navigate('/vendeur/settings')}
                  >
                    <Settings className="w-4 h-4" />
                    Configurer mon profil
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2 justify-start"
                    onClick={() => window.open('/help/vendor-guide', '_blank')}
                  >
                    <BookOpen className="w-4 h-4" />
                    Guide du vendeur
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards - Design comme l'image */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Commandes */}
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-primary"
          onClick={() => navigate('/vendeur/orders')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Commandes</span>
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {stats?.orders.total || vendorStats?.orders_count || 0}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {(stats?.orders.pending || vendorStats?.pending_orders || 0) > 0 && (
                <>
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-600">
                    {stats?.orders.pending || vendorStats?.pending_orders} en attente
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Produits */}
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
          onClick={() => navigate('/vendeur/products')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Produits</span>
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {stats?.products.total || vendorStats?.products_count || 0}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-green-600">
                {stats?.products.active || vendorStats?.products_count || 0} actifs
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card className="border-l-4 border-l-transparent hover:border-l-purple-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Clients</span>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {stats?.clients.total || vendorStats?.customers_count || 0}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {(stats?.clients.newThisMonth || 0) > 0 && (
                <>
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">
                    +{stats?.clients.newThisMonth} ce mois
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chiffre d'affaires - Mis en évidence */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">Chiffre d'affaires</span>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-primary">
              {formatCurrency(stats?.sales.totalRevenue || vendorStats?.revenue || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats?.sales.monthRevenue || 0)} ce mois
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Vue d'ensemble, Commandes récentes, Top produits */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="text-xs md:text-sm py-2 px-2 gap-1 md:gap-2">
            <BarChart3 className="w-4 h-4 hidden md:block" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs md:text-sm py-2 px-2 gap-1 md:gap-2">
            <ShoppingBag className="w-4 h-4 hidden md:block" />
            Commandes récentes
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs md:text-sm py-2 px-2 gap-1 md:gap-2">
            <Package className="w-4 h-4 hidden md:block" />
            Top produits
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Résumé des ventes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Résumé des ventes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Total */}
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">Total général</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(stats?.sales.totalRevenue || vendorStats?.revenue || 0)}
                  </span>
                </div>
                
                {/* Séparation POS / Online */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <Store className="w-3 h-3 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">POS</span>
                    </div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(stats?.salesPos.totalRevenue || 0)}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">En ligne</span>
                    </div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(stats?.salesOnline.totalRevenue || 0)}
                    </div>
                  </div>
                </div>

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
              </CardContent>
            </Card>

            {/* État des commandes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  État des commandes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total POS / Online */}
                <div className="grid grid-cols-2 gap-3 pb-4 border-b">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Store className="w-3 h-3 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">POS</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {stats?.ordersPos.total || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-400">En ligne</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats?.ordersOnline.total || 0}
                    </div>
                  </div>
                </div>

                {/* Détails par statut */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">En attente</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        POS: {stats?.ordersPos.pending || 0}
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                        Web: {stats?.ordersOnline.pending || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">En cours</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        POS: {stats?.ordersPos.confirmed || 0}
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                        Web: {stats?.ordersOnline.confirmed || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Livrées</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        POS: {stats?.ordersPos.delivered || 0}
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                        Web: {stats?.ordersOnline.delivered || 0}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Annulées</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        POS: {stats?.ordersPos.cancelled || 0}
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                        Web: {stats?.ordersOnline.cancelled || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Commandes récentes */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base md:text-lg">Commandes récentes</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/vendeur/orders')}>
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
                  {recentOrders.slice(0, 5).map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">#{order.order_number}</span>
                          <Badge 
                            variant={order.status === 'completed' || order.status === 'delivered' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                          {order.source === 'pos' ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                              POS
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                              En ligne
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {order.customer_name} • {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: fr })}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="font-semibold text-sm">{formatCurrency(order.total_amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top produits */}
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base md:text-lg">Produits les plus vendus</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/vendeur/products')}>
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun produit vendu pour le moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((product, index) => (
                    <div 
                      key={product.id} 
                      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.total_sold} vendus
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bouton flottant mobile pour ajouter un service */}
      <Button
        onClick={() => setShowAddService(true)}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Modal pour ajouter un nouveau service */}
      <AddServiceModal 
        open={showAddService} 
        onOpenChange={setShowAddService}
      />
    </div>
  );
}

export default VendorBusinessDashboard;
