/**
 * HERO SECTION - Ultra Compact E-Commerce Design
 * 224Solutions - Premium Mobile-First Hero
 * Inspired by Uber, Deliveroo, Glovo
 */

import { useNavigate } from 'react-router-dom';
import { Store, Utensils, Truck, Car, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  gradient: string;
}

const quickActions: QuickAction[] = [
  { 
    id: 'restaurant', 
    icon: <Utensils className="w-5 h-5" />, 
    label: 'Restaurant',
    gradient: 'from-orange-500 to-red-500'
  },
  { 
    id: 'boutique', 
    icon: <Store className="w-5 h-5" />, 
    label: 'Boutique',
    gradient: 'from-blue-500 to-indigo-500'
  },
  { 
    id: 'livraison', 
    icon: <Truck className="w-5 h-5" />, 
    label: 'Livraison',
    gradient: 'from-emerald-500 to-teal-500'
  },
  { 
    id: 'transport', 
    icon: <Car className="w-5 h-5" />, 
    label: 'Transport',
    gradient: 'from-violet-500 to-purple-500'
  },
];

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className={cn('relative', className)}>
      {/* Compact Header */}
      <div className="px-4 pt-4 pb-6">
        {/* Welcome Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">224Solutions</span>
          </div>
        </div>

        {/* Main Title - Compact */}
        <h1 className="text-xl font-bold text-foreground leading-tight mb-2">
          {t('home.createService')}
        </h1>
        
        {/* Subtitle - Short */}
        <p className="text-sm text-muted-foreground mb-5">
          15 services professionnels • Outils complets
        </p>

        {/* CTA Button - Primary */}
        <Button
          onClick={() => navigate('/services')}
          size="lg"
          className={cn(
            'w-full gap-2 h-12 rounded-xl text-base font-semibold',
            'bg-primary hover:bg-primary/90',
            'shadow-lg shadow-primary/25',
            'active:scale-[0.98] transition-all duration-200'
          )}
        >
          <Store className="w-5 h-5" />
          {t('home.startNow')}
        </Button>
      </div>

      {/* Quick Actions Grid - Compact Cards */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Services populaires</h2>
          <button 
            onClick={() => navigate('/services')}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Voir tout
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => navigate('/services')}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-2xl',
                'bg-card border border-border/50',
                'hover:border-primary/30 hover:bg-primary/5',
                'active:scale-95 transition-all duration-200'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br text-white shadow-sm',
                action.gradient
              )}>
                {action.icon}
              </div>
              <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* More Services Chip */}
        <button
          onClick={() => navigate('/services')}
          className={cn(
            'w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl',
            'bg-muted/50 border border-border/50',
            'hover:bg-muted hover:border-border',
            'active:scale-[0.98] transition-all duration-200'
          )}
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            +11 autres services
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </section>
  );
}

export default HeroSection;
