/**
 * HERO SECTION - Ultra Professional Design
 * 224Solutions - Premium Hero with 3D-like effects
 * Inspired by Apple, Stripe, Linear design systems
 */

import { useNavigate } from 'react-router-dom';
import { Store, Utensils, Truck, Car, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface ServiceChip {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const services: ServiceChip[] = [
  { id: 'restaurant', icon: <Utensils className="w-4 h-4" />, label: 'Restaurant' },
  { id: 'boutique', icon: <Store className="w-4 h-4" />, label: 'Boutique' },
  { id: 'livraison', icon: <Truck className="w-4 h-4" />, label: 'Livraison' },
  { id: 'transport', icon: <Car className="w-4 h-4" />, label: 'Transport' },
];

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className={cn('relative overflow-hidden', className)}>
      {/* Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-vendeur-secondary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative px-4 py-8 md:px-6 md:py-12">
        {/* Hero Card */}
        <div
          className={cn(
            'relative rounded-3xl overflow-hidden',
            'bg-gradient-to-br from-card via-card to-primary/5',
            'border border-border/50',
            'shadow-[0_8px_40px_hsl(211_100%_50%_/_0.1)]'
          )}
        >
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                               linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: '32px 32px'
            }}
          />

          <div className="relative p-6 md:p-10 lg:p-12">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              {/* Animated Icon */}
              <div className="flex justify-center">
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse" />
                  {/* Icon container */}
                  <div className="relative p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                    <Store className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-primary via-primary to-vendeur-secondary bg-clip-text text-transparent">
                    {t('home.createService')}
                  </span>
                </h2>
                <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                  Restaurant, Boutique, Livraison, Transport, Beauté, Santé, Éducation...
                  <br />
                  <span className="font-semibold text-foreground">15 catégories professionnelles</span>{' '}
                  avec des outils complets inspirés des meilleurs standards internationaux
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
                <Button
                  onClick={() => navigate('/services')}
                  size="lg"
                  className={cn(
                    'gap-2 text-base md:text-lg px-6 md:px-8 h-12 md:h-14 rounded-2xl',
                    'bg-primary hover:bg-primary/90',
                    'shadow-[0_4px_20px_hsl(211_100%_50%_/_0.3)]',
                    'hover:shadow-[0_8px_30px_hsl(211_100%_50%_/_0.4)]',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    'transition-all duration-300'
                  )}
                >
                  <Store className="w-5 h-5" />
                  {t('home.startNow')}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => navigate('/services')}
                  className={cn(
                    'gap-2 text-base h-12 md:h-14 px-6 rounded-2xl',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-muted/50',
                    'transition-all duration-300 group'
                  )}
                >
                  {t('home.discover15Services')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              {/* Service Chips */}
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {services.map((service, index) => (
                  <div
                    key={service.id}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full',
                      'bg-muted/50 border border-border/50',
                      'text-sm text-muted-foreground',
                      'hover:bg-primary/10 hover:text-primary hover:border-primary/30',
                      'transition-all duration-300 cursor-pointer',
                      'animate-fade-in'
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {service.icon}
                    <span>{service.label}</span>
                  </div>
                ))}
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full',
                    'bg-primary/10 border border-primary/20',
                    'text-sm text-primary font-medium',
                    'hover:bg-primary/20',
                    'transition-all duration-300 cursor-pointer',
                    'animate-fade-in'
                  )}
                  style={{ animationDelay: '400ms' }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>+11 autres</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
