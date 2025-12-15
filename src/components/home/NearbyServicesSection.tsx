/**
 * NEARBY SERVICES SECTION - Ultra Professional Design
 * 224Solutions - Services Grid with Premium Cards
 */

import { Store, Car, Truck } from 'lucide-react';
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
      count: stats.boutiques,
      gradient: 'from-vendeur-primary/15 to-vendeur-secondary/5',
      trending: stats.boutiques > 5,
    },
    {
      id: 'taxi',
      icon: <Car className="w-6 h-6 text-taxi-primary" />,
      title: t('home.taxiMotos'),
      count: stats.taxi,
      gradient: 'from-taxi-primary/15 to-taxi-secondary/5',
      trending: stats.taxi > 2,
    },
    {
      id: 'livraison',
      icon: <Truck className="w-6 h-6 text-livreur-primary" />,
      title: t('home.delivery'),
      count: stats.livraison,
      gradient: 'from-livreur-primary/15 to-livreur-secondary/5',
      trending: stats.livraison > 1,
    },
  ];

  return (
    <section className={cn('px-4 py-5 md:px-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">
            {t('home.nearbyServices')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Services disponibles autour de vous
          </p>
        </div>
        <span className="text-[10px] text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">
          📍 À proximité
        </span>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-3 gap-3">
        {services.map((service, index) => (
          <div
            key={service.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <HomeServiceCard
              id={service.id}
              icon={service.icon}
              title={service.title}
              count={service.count}
              gradient={service.gradient}
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
