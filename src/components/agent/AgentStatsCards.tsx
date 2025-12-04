import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, UserPlus, Wallet, Target, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentStatsCardsProps {
  stats: {
    totalUsersCreated: number;
    usersThisMonth: number;
    subAgentsCount: number;
    activeSubAgentsCount: number;
  };
  commissionRate: number;
  walletBalance?: number;
  currency?: string;
}

interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  gradient: string;
  iconBg: string;
  textColor: string;
}

export function AgentStatsCards({ stats, commissionRate, walletBalance = 0, currency = 'GNF' }: AgentStatsCardsProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards: StatCard[] = [
    {
      title: 'Utilisateurs Créés',
      value: stats.totalUsersCreated,
      subtitle: `+${stats.usersThisMonth} ce mois`,
      icon: <Users className="w-5 h-5" />,
      trend: stats.usersThisMonth > 0 ? { value: stats.usersThisMonth, positive: true } : undefined,
      gradient: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-500/10',
      textColor: 'text-blue-600'
    },
    {
      title: 'Solde Wallet',
      value: formatAmount(walletBalance),
      subtitle: currency,
      icon: <Wallet className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-500/10',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Taux Commission',
      value: `${commissionRate}%`,
      subtitle: 'Par transaction',
      icon: <DollarSign className="w-5 h-5" />,
      gradient: 'from-violet-500 to-purple-500',
      iconBg: 'bg-violet-500/10',
      textColor: 'text-violet-600'
    },
    {
      title: 'Sous-Agents',
      value: stats.subAgentsCount,
      subtitle: `${stats.activeSubAgentsCount} actif(s)`,
      icon: <UserPlus className="w-5 h-5" />,
      gradient: 'from-orange-500 to-amber-500',
      iconBg: 'bg-orange-500/10',
      textColor: 'text-orange-600'
    },
    {
      title: 'Performance',
      value: '100%',
      subtitle: 'Objectif atteint',
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: 'from-pink-500 to-rose-500',
      iconBg: 'bg-pink-500/10',
      textColor: 'text-pink-600'
    },
    {
      title: 'Objectif Mensuel',
      value: stats.usersThisMonth,
      subtitle: 'Utilisateurs créés',
      icon: <Target className="w-5 h-5" />,
      gradient: 'from-slate-600 to-slate-700',
      iconBg: 'bg-slate-500/10',
      textColor: 'text-slate-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((stat, index) => (
        <Card 
          key={index}
          className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "p-2.5 rounded-xl transition-colors",
                stat.iconBg
              )}>
                <span className={stat.textColor}>
                  {stat.icon}
                </span>
              </div>
              {stat.trend && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" />
                  <span className="text-xs font-semibold">+{stat.trend.value}</span>
                </div>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
            </div>

            {/* Bottom accent line */}
            <div className={cn(
              "h-1 w-full mt-4 rounded-full bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity",
              stat.gradient
            )} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
