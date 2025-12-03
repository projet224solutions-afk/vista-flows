import { Card, CardContent } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, UserPlus, Wallet, Target } from 'lucide-react';
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
      icon: <Users className="w-6 h-6 text-white" />,
      trend: stats.usersThisMonth > 0 ? { value: stats.usersThisMonth, positive: true } : undefined,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-600'
    },
    {
      title: 'Solde Wallet',
      value: `${formatAmount(walletBalance)}`,
      subtitle: currency,
      icon: <Wallet className="w-6 h-6 text-white" />,
      gradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-600'
    },
    {
      title: 'Taux Commission',
      value: `${commissionRate}%`,
      subtitle: 'Par transaction',
      icon: <DollarSign className="w-6 h-6 text-white" />,
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-600'
    },
    {
      title: 'Sous-Agents',
      value: stats.subAgentsCount,
      subtitle: `${stats.activeSubAgentsCount} actif(s)`,
      icon: <UserPlus className="w-6 h-6 text-white" />,
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-600'
    },
    {
      title: 'Performance',
      value: '100%',
      subtitle: 'Objectif atteint',
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      gradient: 'from-pink-500 to-rose-500',
      iconBg: 'bg-pink-600'
    },
    {
      title: 'Objectif Mensuel',
      value: stats.usersThisMonth,
      subtitle: 'Utilisateurs créés',
      icon: <Target className="w-6 h-6 text-white" />,
      gradient: 'from-cyan-500 to-teal-500',
      iconBg: 'bg-cyan-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {statCards.map((stat, index) => (
        <Card 
          key={index}
          className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <CardContent className="p-0">
            <div className={cn(
              "bg-gradient-to-r p-4 lg:p-5",
              stat.gradient
            )}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white/80">{stat.title}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl lg:text-3xl font-bold text-white">
                      {stat.value}
                    </span>
                    {stat.trend && (
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        stat.trend.positive 
                          ? "bg-white/20 text-white" 
                          : "bg-red-400/20 text-red-100"
                      )}>
                        {stat.trend.positive ? '+' : ''}{stat.trend.value}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70">{stat.subtitle}</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl bg-white/20 backdrop-blur-sm"
                )}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
