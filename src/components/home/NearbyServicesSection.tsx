/**
 * NEARBY SERVICES SECTION - Ultra Professional Design
 * 224Solutions - Premium Services Grid
 * Apple/Uber-inspired with modern glassmorphism
 */

import { Store, Car, Truck, Zap } from 'lucide-react';
import { HomeServiceCard } from './ServiceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface ServiceStats {
  boutiques: number;
  taxi: number;
  livraison: number;
}

interface NearbyServicesSectionProps {
  stats: ServiceStats;
  onServiceClick: (serviceId: string) => void;
  className?: string;
}

export function NearbyServicesSection({
  stats,
  onServiceClick,
  className,
}: NearbyServicesSectionProps) {
  const { t } = useTranslation();

  const services = [
    {
      id: 'boutiques',
      icon: <Store className="w-6 h-6 text-vendeur-primary" />,
      title: t('home.shops'),
      subtitle: 'Découvrez les commerces locaux',
      count: stats.boutiques,
      gradient: 'from-vendeur-primary/20 to-vendeur-secondary/10',
      iconBg: 'bg-vendeur-primary/15',
      trending: stats.boutiques > 5,
    },
    {
      id: 'taxi',
      icon: <Car className="w-6 h-6 text-taxi-primary" />,
      title: t('home.taxiMotos'),
      subtitle: 'Transport rapide et sécurisé',
      count: stats.taxi,
      gradient: 'from-taxi-primary/20 to-taxi-secondary/10',
      iconBg: 'bg-taxi-primary/15',
      trending: stats.taxi > 2,
    },
    {
      id: 'livraison',
      icon: <Truck className="w-6 h-6 text-livreur-primary" />,
      title: t('home.delivery'),
      subtitle: 'Livraison express à domicile',
      count: stats.livraison,
      gradient: 'from-livreur-primary/20 to-livreur-secondary/10',
      iconBg: 'bg-livreur-primary/15',
      trending: stats.livraison > 1,
    },
  ];

  return (
    <section className={cn('px-4 py-6 md:px-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              {t('home.nearbyServices')}
            </h2>
            <p className="text-xs text-muted-foreground">
              Trouvez les services autour de vous
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
            En direct
          </span>
        </div>
      </div>

      {/* Services Stack */}
      <div className="space-y-3">
        {services.map((service, index) => (
          <div
            key={service.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <HomeServiceCard
              id={service.id}
              icon={service.icon}
              title={service.title}
              subtitle={service.subtitle}
              count={service.count}
              gradient={service.gradient}
              iconBg={service.iconBg}
              trending={service.trending}
              onClick={() => onServiceClick(service.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default NearbyServicesSection;
