/**
 * 🎨 DASHBOARD PDG - VUE D'ENSEMBLE
 * KPIs et statistiques RÉELLES en temps réel depuis Supabase
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Package, 
  Activity, AlertCircle, CheckCircle, Clock, Zap, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePDGStats } from '@/hooks/usePDGStats';

export function PDGDashboardHome() {
  const stats = usePDGStats();

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Erreur de chargement</p>
              <p className="text-sm text-muted-foreground">{stats.error}</p>
            </div>
            <Button onClick={stats.refresh} variant="outline" size="sm" className="ml-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      title: 'Chiffre d\'Affaires',
      value: stats.totalRevenue,
      change: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}%`,
      trend: stats.revenueGrowth >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'text-green-600 bg-green-500/10 border-green-500/20',
      description: 'vs mois dernier'
    },
    {
      title: 'Utilisateurs Actifs',
      value: stats.totalUsers.toLocaleString(),
      change: `${stats.userGrowth >= 0 ? '+' : ''}${stats.userGrowth}%`,
      trend: stats.userGrowth >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      description: `${stats.newUsersThisMonth} nouveaux ce mois`
    },
    {
      title: 'Commandes',
      value: stats.totalOrders.toLocaleString(),
      change: `${stats.ordersGrowth >= 0 ? '+' : ''}${stats.ordersGrowth}%`,
      trend: stats.ordersGrowth >= 0 ? 'up' : 'down',
      icon: Package,
      color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
      description: `${stats.ordersThisMonth} ce mois`
    },
    {
      title: 'Taux de Conversion',
      value: `${stats.conversionRate}%`,
      change: `${stats.conversionGrowth >= 0 ? '+' : ''}${stats.conversionGrowth}%`,
      trend: stats.conversionGrowth >= 0 ? 'up' : 'down',
      icon: Activity,
      color: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
      description: 'commandes / utilisateurs'
    },
  ];

  const alerts = [
    { 
      type: 'warning', 
      message: `${stats.pendingValidations} commande(s) en attente de traitement`,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
      show: stats.pendingValidations > 0
    },
    { 
      type: 'error', 
      message: `${stats.criticalAlerts} alerte(s) API critique(s) nécessitent votre attention`,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-500/10 border-red-500/20',
      show: stats.criticalAlerts > 0
    },
    { 
      type: 'success', 
      message: `${stats.activeVendors} vendeurs actifs sur ${stats.totalVendors}`,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-500/10 border-green-500/20',
      show: true
    },
    { 
      type: 'info', 
      message: `${stats.onlineDrivers} livreurs en ligne sur ${stats.totalDrivers}`,
      icon: Activity,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      show: true
    },
  ].filter(alert => alert.show);

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <Card 
              key={kpi.title}
              className="relative overflow-hidden hover:shadow-xl transition-all duration-300 group border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
              
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", kpi.color)}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold">{kpi.value}</div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "gap-1",
                      kpi.trend === 'up' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'
                    )}
                  >
                    <TrendIcon className="w-3 h-3" />
                    {kpi.change}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card className="lg:col-span-2 border border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Alertes & Notifications
            </CardTitle>
            <CardDescription>Événements importants nécessitant votre attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => {
              const AlertIcon = alert.icon;
              return (
                <div 
                  key={index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md",
                    alert.color
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0">
                    <AlertIcon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium flex-1">{alert.message}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Stats Détaillées */}
        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Statistiques Détaillées
                </CardTitle>
                <CardDescription>Vue d'ensemble de la plateforme</CardDescription>
              </div>
              <Button onClick={stats.refresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">{stats.activeProducts} actifs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Vendeurs</p>
                <p className="text-2xl font-bold">{stats.totalVendors}</p>
                <p className="text-xs text-muted-foreground">{stats.activeVendors} actifs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Livreurs</p>
                <p className="text-2xl font-bold">{stats.totalDrivers}</p>
                <p className="text-xs text-muted-foreground">{stats.onlineDrivers} en ligne</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Commandes en attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">À traiter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>Accès rapide aux fonctionnalités principales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Valider Utilisateurs', icon: Users, color: 'from-blue-500 to-blue-600' },
              { label: 'Gérer Finances', icon: DollarSign, color: 'from-green-500 to-green-600' },
              { label: 'Vérifier Sécurité', icon: AlertCircle, color: 'from-red-500 to-red-600' },
              { label: 'Voir Rapports', icon: Activity, color: 'from-purple-500 to-purple-600' },
            ].map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border/40 hover:border-primary/40 bg-card hover:shadow-lg transition-all duration-200 group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                    action.color
                  )}>
                    <ActionIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
