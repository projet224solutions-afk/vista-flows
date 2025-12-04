import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  UserPlus,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar
} from 'lucide-react';

interface AgentOverviewProfessionalProps {
  agent: {
    id: string;
    name: string;
    agent_code: string;
    commission_rate: number;
  };
  stats: {
    totalUsersCreated: number;
    totalCommissions: number;
    usersThisMonth?: number;
    subAgentsCount?: number;
    activeSubAgentsCount?: number;
    performance?: number;
  };
  walletBalance: number;
  onNavigate: (tab: string) => void;
}

interface StatCard {
  label: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend: 'up' | 'down' | 'neutral';
}

export function AgentOverviewProfessional({
  agent,
  stats,
  walletBalance,
  onNavigate
}: AgentOverviewProfessionalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const statCards: StatCard[] = [
    {
      label: 'Solde Total',
      value: formatCurrency(walletBalance),
      change: 0,
      icon: <Wallet className="w-6 h-6" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: 'neutral'
    },
    {
      label: 'Utilisateurs Créés',
      value: formatNumber(stats.totalUsersCreated),
      change: stats.usersThisMonth || 0,
      icon: <Users className="w-6 h-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: (stats.usersThisMonth || 0) > 0 ? 'up' : 'neutral'
    },
    {
      label: 'Commissions Totales',
      value: formatCurrency(stats.totalCommissions),
      change: 0,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      trend: 'neutral'
    },
    {
      label: 'Sous-Agents',
      value: formatNumber(stats.subAgentsCount || 0),
      change: stats.activeSubAgentsCount || 0,
      icon: <Activity className="w-6 h-6" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: (stats.activeSubAgentsCount || 0) > 0 ? 'up' : 'neutral'
    }
  ];

  const quickActions = [
    {
      icon: <UserPlus className="w-5 h-5" />,
      label: 'Créer Utilisateur',
      description: 'Ajouter un nouveau client',
      color: 'from-blue-600 to-violet-600',
      tab: 'create-user'
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      label: 'Gérer Wallet',
      description: 'Transferts et historique',
      color: 'from-emerald-600 to-teal-600',
      tab: 'wallet'
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: 'Voir Rapports',
      description: 'Analytics détaillés',
      color: 'from-orange-600 to-red-600',
      tab: 'reports'
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Sous-Agents',
      description: 'Gérer votre équipe',
      color: 'from-purple-600 to-pink-600',
      tab: 'sub-agents'
    }
  ];

  const recentActivity = [
    {
      type: 'user_created',
      title: 'Nouvel utilisateur créé',
      description: 'Client #USR12345',
      time: 'Il y a 5 min',
      icon: <UserPlus className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      type: 'commission',
      title: 'Commission reçue',
      description: '+2,500 GNF',
      time: 'Il y a 15 min',
      icon: <DollarSign className="w-4 h-4" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      type: 'transaction',
      title: 'Transaction complétée',
      description: 'Transfert effectué',
      time: 'Il y a 1 heure',
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Bienvenue, {agent.name}
          </h1>
          <p className="text-slate-600 mt-1">
            Voici votre tableau de bord - Code: <span className="font-semibold">{agent.agent_code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1.5">
            <Clock className="w-3 h-3 mr-1.5" />
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Badge>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card 
            key={index}
            className={cn(
              "relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer",
              "border-0 shadow-lg"
            )}
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            <CardContent className="p-6">
              {/* Icon Circle */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                stat.bgColor
              )}>
                <span className={stat.color}>
                  {stat.icon}
                </span>
              </div>

              {/* Stats */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">
                  {stat.label}
                </p>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </h3>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-semibold",
                    stat.trend === 'up' && "text-emerald-600",
                    stat.trend === 'down' && "text-red-600",
                    stat.trend === 'neutral' && "text-slate-600"
                  )}>
                    {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                    {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                    {stat.change > 0 ? '+' : ''}{stat.change}%
                  </div>
                </div>
              </div>

              {/* Decorative gradient */}
              <div className={cn(
                "absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10",
                stat.bgColor
              )} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg">
                <Activity className="w-4 h-4 text-white" />
              </div>
              Actions Rapides
            </CardTitle>
            <CardDescription>
              Accès direct aux fonctionnalités principales
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 justify-start hover:shadow-lg transition-all duration-200 group"
                onClick={() => onNavigate(action.tab)}
              >
                <div className={cn(
                  "p-3 rounded-xl bg-gradient-to-br text-white mr-4 group-hover:scale-110 transition-transform",
                  action.color
                )}>
                  {action.icon}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">
                    {action.label}
                  </p>
                  <p className="text-xs text-slate-600">
                    {action.description}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-blue-600 transition-colors" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-4 h-4" />
              Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  activity.bgColor
                )}>
                  <span className={activity.color}>
                    {activity.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {activity.title}
                  </p>
                  <p className="text-xs text-slate-600">
                    {activity.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full mt-2 text-blue-600">
              Voir tout
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance du Mois
              </CardTitle>
              <CardDescription>
                Vos objectifs et réalisations
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Ce mois
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Objective 1 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">
                  Nouveaux Utilisateurs
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {stats.totalUsersCreated} / 100
              </span>
            </div>
            <Progress value={stats.totalUsersCreated} className="h-2" />
          </div>

          {/* Objective 2 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">
                  Commissions Générées
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {formatCurrency(stats.totalCommissions)}
              </span>
            </div>
            <Progress 
              value={Math.min((stats.totalCommissions / 1000000) * 100, 100)} 
              className="h-2" 
            />
          </div>

          {/* Objective 3 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-slate-700">
                  Taux d'Activité
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {stats.performance || 100}%
              </span>
            </div>
            <Progress 
              value={stats.performance || 100} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Commission Info Banner */}
      <Card className="border-0 bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Taux de Commission: {agent.commission_rate}%
              </h3>
              <p className="text-blue-100 text-sm">
                Vous gagnez {agent.commission_rate}% sur chaque transaction effectuée par vos clients
              </p>
            </div>
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
