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
      gradient: 'from-vendeur-primary/10 to-vendeur-secondary/5',
    },
    {
      id: 'taxi',
      icon: <Car className="w-6 h-6 text-taxi-primary" />,
      title: t('home.taxiMotos'),
      count: stats.taxi,
      gradient: 'from-taxi-primary/10 to-taxi-secondary/5',
    },
    {
      id: 'livraison',
      icon: <Truck className="w-6 h-6 text-livreur-primary" />,
      title: t('home.delivery'),
      count: stats.livraison,
      gradient: 'from-livreur-primary/10 to-livreur-secondary/5',
    },
  ];

  return (
    <section className={cn('px-4 py-6 md:px-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-foreground">
          {t('home.nearbyServices')}
        </h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          À proximité
        </span>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
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
              count={service.count}
              gradient={service.gradient}
              onClick={() => onServiceClick(service.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default NearbyServicesSection;
