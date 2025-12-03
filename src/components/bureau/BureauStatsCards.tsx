import { Card, CardContent } from '@/components/ui/card';
import { Users, Bike, AlertCircle, Wallet, Building2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BureauStatsCardsProps {
  workersCount: number;
  membersCount: number;
  motosCount: number;
  alertsCount: number;
  walletBalance?: number;
  currency?: string;
}

interface StatCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}

export function BureauStatsCards({ 
  workersCount, 
  membersCount, 
  motosCount, 
  alertsCount,
  walletBalance = 0,
  currency = 'GNF'
}: BureauStatsCardsProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const statCards: StatCard[] = [
    {
      title: 'Membres Bureau',
      value: workersCount,
      subtitle: 'Membres actifs',
      icon: <Building2 className="w-6 h-6 text-white" />,
      gradient: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Adhérents',
      value: membersCount,
      subtitle: 'Total membres',
      icon: <Users className="w-6 h-6 text-white" />,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Véhicules',
      value: motosCount,
      subtitle: 'Enregistrés',
      icon: <Bike className="w-6 h-6 text-white" />,
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Alertes',
      value: alertsCount,
      subtitle: 'Non lues',
      icon: <AlertCircle className="w-6 h-6 text-white" />,
      gradient: alertsCount > 0 ? 'from-red-500 to-red-600' : 'from-slate-400 to-slate-500'
    },
    {
      title: 'Solde Wallet',
      value: formatAmount(walletBalance),
      subtitle: currency,
      icon: <Wallet className="w-6 h-6 text-white" />,
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      title: 'Performance',
      value: '100%',
      subtitle: 'Objectif atteint',
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      gradient: 'from-cyan-500 to-teal-500'
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
                  </div>
                  <p className="text-xs text-white/70">{stat.subtitle}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
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
