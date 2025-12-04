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
  UserPlus,
  DollarSign,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  BarChart3,
  Calendar,
  Zap,
  Target,
  Award,
  ChevronRight,
  Sparkles,
  CreditCard,
  PieChart
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
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const quickActions = [
    {
      icon: <UserPlus className="w-5 h-5" />,
      label: 'Créer Utilisateur',
      description: 'Ajouter un nouveau client',
      gradient: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/25',
      tab: 'create-user'
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      label: 'Portefeuille',
      description: 'Gérer vos fonds',
      gradient: 'from-emerald-500 to-teal-500',
      shadowColor: 'shadow-emerald-500/25',
      tab: 'wallet'
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: 'Analytics',
      description: 'Voir les rapports',
      gradient: 'from-violet-500 to-purple-500',
      shadowColor: 'shadow-violet-500/25',
      tab: 'reports'
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Équipe',
      description: 'Gérer sous-agents',
      gradient: 'from-orange-500 to-amber-500',
      shadowColor: 'shadow-orange-500/25',
      tab: 'sub-agents'
    }
  ];

  const recentActivity = [
    {
      type: 'user_created',
      title: 'Utilisateur créé',
      description: 'Nouveau client ajouté',
      time: 'Il y a 5 min',
      icon: <UserPlus className="w-4 h-4" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      type: 'commission',
      title: 'Commission reçue',
      description: '+2,500 GNF',
      time: 'Il y a 15 min',
      icon: <DollarSign className="w-4 h-4" />,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      type: 'transaction',
      title: 'Transaction OK',
      description: 'Transfert effectué',
      time: 'Il y a 1h',
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-slate-500">Bienvenue,</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
            {agent.name}
          </h1>
          <p className="text-slate-500 mt-1 text-sm lg:text-base">
            Gérez vos activités et suivez vos performances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm px-3 py-1.5 bg-white shadow-sm">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'short',
              day: 'numeric', 
              month: 'short'
            })}
          </Badge>
          <Badge className="bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {agent.agent_code}
          </Badge>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <Card className="col-span-2 lg:col-span-1 overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Solde Total</p>
                <h3 className="text-2xl lg:text-3xl font-bold mt-1">
                  {formatCurrency(walletBalance)}
                </h3>
                <p className="text-emerald-200 text-sm mt-1">GNF</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <Button 
              size="sm" 
              className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => onNavigate('wallet')}
            >
              Gérer le wallet
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Users Created */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              {(stats.usersThisMonth || 0) > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                  +{stats.usersThisMonth}
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm font-medium">Utilisateurs</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatNumber(stats.totalUsersCreated)}
            </h3>
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-violet-50 rounded-xl">
                <DollarSign className="w-5 h-5 text-violet-600" />
              </div>
              <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">
                {agent.commission_rate}%
              </Badge>
            </div>
            <p className="text-slate-500 text-sm font-medium">Commissions</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(stats.totalCommissions)}
            </h3>
          </CardContent>
        </Card>

        {/* Sub Agents */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              {(stats.activeSubAgentsCount || 0) > 0 && (
                <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                  {stats.activeSubAgentsCount} actifs
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm font-medium">Sous-Agents</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatNumber(stats.subAgentsCount || 0)}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-slate-900">Actions Rapides</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Card 
                key={index}
                className={cn(
                  "border-0 shadow-lg cursor-pointer transition-all duration-300",
                  "hover:shadow-xl hover:-translate-y-1",
                  action.shadowColor
                )}
                onClick={() => onNavigate(action.tab)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg",
                      action.gradient
                    )}>
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {action.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {action.description}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
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
                  <p className="text-sm font-medium text-slate-900">
                    {activity.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Performance Mensuelle</CardTitle>
                <CardDescription>Vos objectifs et progrès</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              <PieChart className="w-3.5 h-3.5 mr-1.5" />
              Détails
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Objective 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">Utilisateurs</span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {stats.totalUsersCreated}/100
              </span>
            </div>
            <Progress value={Math.min(stats.totalUsersCreated, 100)} className="h-2" />
            <p className="text-xs text-slate-500">
              {stats.totalUsersCreated >= 100 ? 'Objectif atteint!' : `${100 - stats.totalUsersCreated} restants`}
            </p>
          </div>

          {/* Objective 2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Commissions</span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {Math.min(Math.round((stats.totalCommissions / 1000000) * 100), 100)}%
              </span>
            </div>
            <Progress 
              value={Math.min((stats.totalCommissions / 1000000) * 100, 100)} 
              className="h-2" 
            />
            <p className="text-xs text-slate-500">
              Objectif: 1,000,000 GNF
            </p>
          </div>

          {/* Objective 3 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium text-slate-700">Taux d'Activité</span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {stats.performance || 100}%
              </span>
            </div>
            <Progress value={stats.performance || 100} className="h-2" />
            <p className="text-xs text-slate-500">Excellent niveau!</p>
          </div>
        </CardContent>
      </Card>

      {/* Commission Rate Banner */}
      <Card className="border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Award className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Taux de Commission: {agent.commission_rate}%
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  Gagnez {agent.commission_rate}% sur chaque transaction client
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                className="bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => onNavigate('reports')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Voir Analytics
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
