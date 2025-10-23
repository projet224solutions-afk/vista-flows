/**
 * 🎨 DASHBOARD PDG - VUE D'ENSEMBLE
 * KPIs et statistiques en temps réel
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Package, 
  Activity, AlertCircle, CheckCircle, Clock, Zap
} from 'lucide-react';
import { useAdminUnifiedData } from '@/hooks/useAdminUnifiedData';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PDGDashboardHome() {
  const adminData = useAdminUnifiedData(true);

  const kpis = [
    {
      title: 'Chiffre d\'Affaires',
      value: '2.5M GNF',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600 bg-green-500/10 border-green-500/20',
      description: 'vs mois dernier'
    },
    {
      title: 'Utilisateurs Actifs',
      value: String(adminData?.profiles?.data?.length || 0),
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
      description: 'vs mois dernier'
    },
    {
      title: 'Commandes',
      value: '1,284',
      change: '-3.1%',
      trend: 'down',
      icon: Package,
      color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
      description: 'vs mois dernier'
    },
    {
      title: 'Taux de Conversion',
      value: '3.2%',
      change: '+0.5%',
      trend: 'up',
      icon: Activity,
      color: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
      description: 'vs mois dernier'
    },
  ];

  const alerts = [
    { 
      type: 'warning', 
      message: '15 utilisateurs en attente de validation',
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20'
    },
    { 
      type: 'success', 
      message: 'Toutes les APIs fonctionnent correctement',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-500/10 border-green-500/20'
    },
    { 
      type: 'info', 
      message: 'Maintenance système programmée ce week-end',
      icon: AlertCircle,
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20'
    },
  ];

  const activities = [
    { user: 'Jean Dupont', action: 'a créé un nouveau produit', time: 'Il y a 5 min', type: 'create' },
    { user: 'Marie Claire', action: 'a modifié les paramètres', time: 'Il y a 12 min', type: 'edit' },
    { user: 'Ahmed Diallo', action: 'a validé une commande', time: 'Il y a 18 min', type: 'approve' },
    { user: 'Fatou Sow', action: 'a contacté le support', time: 'Il y a 25 min', type: 'support' },
  ];

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

        {/* Recent Activity */}
        <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activité Récente
            </CardTitle>
            <CardDescription>Dernières actions dans le système</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">{activity.user}</span>
                    {' '}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
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
