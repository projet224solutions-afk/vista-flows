/**
 * KPI Cards pharmacie — inspiré Boots/CVS Health dashboard
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  _Package, AlertTriangle, TrendingUp, Users,
  ShoppingCart, Pill, Clock, _Activity
} from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { ServiceHealthStats } from '@/hooks/useServiceHealthStats';

interface PharmacyKPICardsProps {
  stats: ServiceHealthStats;
}

export function PharmacyKPICards({ stats }: PharmacyKPICardsProps) {
  const formatCurrency = useFormatCurrency();

  const kpis = [
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.sales.totalRevenue),
      subtitle: `${formatCurrency(stats.sales.todayRevenue)} aujourd'hui`,
      icon: TrendingUp,
      accent: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Commandes',
      value: stats.sales.totalOrders.toString(),
      subtitle: `${stats.sales.totalOrders > 0 ? formatCurrency(stats.sales.totalRevenue / stats.sales.totalOrders) : '0'} /moy`,
      icon: ShoppingCart,
      accent: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Produits',
      value: stats.stock.totalProducts.toString(),
      subtitle: `${stats.stock.activeProducts} actifs`,
      icon: Pill,
      accent: 'from-violet-500 to-violet-600',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
      badge: stats.stock.outOfStockCount > 0
        ? { text: `${stats.stock.outOfStockCount} rupture`, variant: 'destructive' as const }
        : undefined,
    },
    {
      title: 'Alertes stock',
      value: stats.stock.lowStockCount.toString(),
      subtitle: `${stats.stock.outOfStockCount} en rupture`,
      icon: AlertTriangle,
      accent: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600',
      urgent: stats.stock.lowStockCount > 0,
    },
    {
      title: 'Patients / Clients',
      value: stats.clients.total.toString(),
      subtitle: 'Fichier patient',
      icon: Users,
      accent: 'from-cyan-500 to-cyan-600',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-600',
    },
    {
      title: 'Ordonnances',
      value: stats.prescriptions.total.toString(),
      subtitle: `${stats.prescriptions.pending} en attente`,
      icon: Clock,
      accent: 'from-rose-500 to-rose-600',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-600',
      badge: stats.prescriptions.pending > 0
        ? { text: `${stats.prescriptions.pending} pending`, variant: 'secondary' as const }
        : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <Card
          key={kpi.title}
          className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 group ${
            kpi.urgent ? 'ring-1 ring-orange-300 dark:ring-orange-700' : ''
          }`}
        >
          {/* Top accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.accent}`} />

          <CardContent className="p-3 md:p-4 pt-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`w-4.5 h-4.5 ${kpi.iconColor}`} />
              </div>
              {kpi.badge && (
                <Badge variant={kpi.badge.variant} className="text-[9px] px-1.5 py-0 h-4">
                  {kpi.badge.text}
                </Badge>
              )}
            </div>

            <div className="text-xl md:text-2xl font-bold tracking-tight leading-none mb-0.5">
              {kpi.value}
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground font-medium">
              {kpi.title}
            </div>
            <div className="text-[9px] md:text-[10px] text-muted-foreground/70 mt-0.5">
              {kpi.subtitle}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
