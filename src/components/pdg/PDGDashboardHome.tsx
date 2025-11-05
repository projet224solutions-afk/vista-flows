// @ts-nocheck
/**
 * 🎨 DASHBOARD PDG - VUE D'ENSEMBLE
 * KPIs et statistiques RÉELLES en temps réel depuis Supabase
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Package, 
  Activity, AlertCircle, CheckCircle, Clock, Zap, RefreshCw, UserCheck, Building2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePDGStats } from '@/hooks/usePDGStats';

interface PDGDashboardHomeProps {
  onNavigate?: (tab: string) => void;
}

export function PDGDashboardHome({ onNavigate }: PDGDashboardHomeProps) {
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
      value: stats.totalRevenue || '0 GNF',
      change: `${(stats.revenueGrowth || 0) >= 0 ? '+' : ''}${stats.revenueGrowth || 0}%`,
      trend: (stats.revenueGrowth || 0) >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'text-green-600 bg-green-500/10 border-green-500/20',
      description: 'vs mois dernier'
    },
    {
      title: 'Utilisateurs Plateforme',
      value: (stats.totalUsers || 0).toLocaleString(),
      change: `${(stats.userGrowth || 0) >= 0 ? '+' : ''}${stats.userGrowth || 0}%`,
      trend: (stats.userGrowth || 0) >= 0 ? 'up' : 'down',
      icon: Users,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      description: `${stats.newUsersThisMonth || 0} nouveaux ce mois`
    },
    {
      title: 'Agents Actifs',
      value: (stats.activeAgents || 0).toLocaleString(),
      change: '+0%',
      trend: 'up',
      icon: UserCheck,
      color: 'text-green-600 bg-green-500/10 border-green-500/20',
      description: `${stats.totalAgents || 0} agents au total`
    },
    {
      title: 'Commandes',
      value: (stats.totalOrders || 0).toLocaleString(),
      change: `${(stats.ordersGrowth || 0) >= 0 ? '+' : ''}${stats.ordersGrowth || 0}%`,
      trend: (stats.ordersGrowth || 0) >= 0 ? 'up' : 'down',
      icon: Package,
      color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
      description: `${stats.ordersThisMonth || 0} ce mois`
    },
    {
      title: 'Taux de Conversion',
      value: `${stats.conversionRate || 0}%`,
      change: `${(stats.conversionGrowth || 0) >= 0 ? '+' : ''}${stats.conversionGrowth || 0}%`,
      trend: (stats.conversionGrowth || 0) >= 0 ? 'up' : 'down',
      icon: Activity,
      color: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
      description: 'commandes / utilisateurs'
    },
  ];

  const alerts = [
    { 
      type: 'warning', 
      message: `${stats.pendingValidations || 0} commande(s) en attente de traitement`,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
      action: 'orders',
      show: (stats.pendingValidations || 0) > 0
    },
    { 
      type: 'error', 
      message: `${stats.criticalAlerts || 0} alerte(s) API critique(s) nécessitent votre attention`,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-500/10 border-red-500/20',
      action: 'security',
      show: (stats.criticalAlerts || 0) > 0
    },
    { 
      type: 'success', 
      message: `${stats.activeVendors || 0} vendeurs actifs sur ${stats.totalVendors || 0}`,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-500/10 border-green-500/20',
      action: 'vendors',
      show: true
    },
    { 
      type: 'info', 
      message: `${stats.onlineDrivers || 0} livreurs en ligne sur ${stats.totalDrivers || 0}`,
      icon: Activity,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      action: 'drivers',
      show: true
    },
  ].filter(alert => alert.show);

  return (
    <div className="space-y-6">
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                <button
                  key={index}
                  onClick={() => onNavigate?.(alert.action)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer hover:scale-[1.02]",
                    alert.color
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0">
                    <AlertIcon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium flex-1 text-left">{alert.message}</p>
                </button>
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
                <p className="text-2xl font-bold">{stats.totalProducts || 0}</p>
                <p className="text-xs text-muted-foreground">{stats.activeProducts || 0} actifs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Vendeurs</p>
                <p className="text-2xl font-bold">{stats.totalVendors || 0}</p>
                <p className="text-xs text-muted-foreground">{stats.activeVendors || 0} actifs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Agents</p>
                <p className="text-2xl font-bold text-primary">{stats.totalAgents || 0}</p>
                <p className="text-xs text-muted-foreground">{stats.activeAgents || 0} actifs</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Livreurs</p>
                <p className="text-2xl font-bold">{stats.totalDrivers || 0}</p>
                <p className="text-xs text-muted-foreground">{stats.onlineDrivers || 0} en ligne</p>
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
              { 
                label: 'Valider Utilisateurs', 
                icon: Users, 
                color: 'from-blue-500 to-blue-600',
                action: 'users',
                count: stats.totalUsers || 0
              },
              { 
                label: 'Gérer Finances', 
                icon: DollarSign, 
                color: 'from-green-500 to-green-600',
                action: 'finance',
                count: stats.totalRevenue || '0 GNF'
              },
              { 
                label: 'Vérifier Sécurité', 
                icon: AlertCircle, 
                color: 'from-red-500 to-red-600',
                action: 'security',
                count: stats.criticalAlerts || 0
              },
              { 
                label: 'Voir Rapports', 
                icon: Activity, 
                color: 'from-purple-500 to-purple-600',
                action: 'reports',
                count: stats.totalOrders || 0
              },
            ].map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => onNavigate?.(action.action)}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border/40 hover:border-primary/40 bg-card hover:shadow-lg transition-all duration-200 group cursor-pointer"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                    action.color
                  )}>
                    <ActionIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-center">{action.label}</span>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {typeof action.count === 'number' ? action.count.toLocaleString() : action.count}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Management Sections - Agents & Syndicats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gestion des Agents */}
        <Card 
          className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => onNavigate?.('agents')}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-600 text-white group-hover:scale-110 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                Gestion des Agents
              </CardTitle>
              <Badge variant="secondary" className="bg-green-600 text-white">
                Opérationnel
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Gérez votre réseau d'agents commerciaux avec permissions, commissions et suivi des performances en temps réel
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Agents</p>
                <p className="text-lg font-bold text-green-600">{stats.totalAgents || 0}</p>
              </div>
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Actifs</p>
                <p className="text-lg font-bold text-green-600">{stats.activeAgents || 0}</p>
              </div>
            </div>
            <Button 
              className="w-full mt-4 bg-green-600 hover:bg-green-700 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.('agents');
              }}
            >
              Accéder à la gestion
            </Button>
          </CardContent>
        </Card>

        {/* Gestion des Bureaux Syndicats */}
        <Card 
          className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 hover:shadow-xl transition-all duration-300 cursor-pointer group"
          onClick={() => onNavigate?.('syndicat')}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-600 text-white group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                Bureaux Syndicaux
              </CardTitle>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                Opérationnel
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Administrez les bureaux syndicaux de taxi-motos avec accès sécurisé, gestion des membres et cotisations
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Bureaux</p>
                <p className="text-lg font-bold text-blue-600">{stats.totalBureaus || 0}</p>
              </div>
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Validés</p>
                <p className="text-lg font-bold text-blue-600">{stats.validatedBureaus || 0}</p>
              </div>
            </div>
            <Button 
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 group-hover:scale-105 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate?.('syndicat');
              }}
            >
              Accéder à la gestion
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
