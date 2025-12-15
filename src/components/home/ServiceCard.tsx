/**
 * SERVICE CARD - Ultra Professional Modern Design
 * 224Solutions - Premium Service Cards
 * Apple/Stripe-inspired with glassmorphism
 */

import { ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeServiceCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  count: number;
  gradient?: string;
  iconBg?: string;
  trending?: boolean;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function HomeServiceCard({
  id,
  icon,
  title,
  subtitle,
  count,
  gradient = 'from-primary/10 to-primary/5',
  iconBg = 'bg-primary/10',
  trending = false,
  onClick,
  className,
  compact = false,
}: HomeServiceCardProps) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'group relative w-full overflow-hidden',
          'p-3 rounded-2xl text-center',
          'bg-gradient-to-br from-card via-card to-card/80',
          'border border-border/50',
          'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
          'transition-all duration-300 ease-out',
          'active:scale-[0.98]',
          className
        )}
      >
        {/* Trending indicator */}
        {trending && count > 0 && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold rounded-full">
            <Sparkles className="w-2 h-2" />
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          {/* Icon Container */}
          <div
            className={cn(
              'p-3 rounded-xl',
              'transition-all duration-300',
              iconBg,
              'group-hover:scale-105'
            )}
          >
            {icon}
          </div>

          {/* Content */}
          <div className="space-y-1">
            <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {title}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium tabular-nums">
              {count}
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden',
        'p-5 rounded-3xl text-left',
        'bg-gradient-to-br from-card via-card to-card/80',
        'border border-border/50',
        'hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5',
        'transition-all duration-500 ease-out',
        'active:scale-[0.98]',
        className
      )}
    >
      {/* Ambient glow effect */}
      <div className={cn(
        'absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 blur-3xl',
        'bg-gradient-to-br',
        gradient,
        'group-hover:opacity-60 transition-opacity duration-700'
      )} />

      {/* Trending indicator */}
      {trending && count > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-lg">
          <Sparkles className="w-3 h-3" />
          Populaire
        </div>
      )}

      <div className="relative flex items-start gap-4">
        {/* Icon Container */}
        <div
          className={cn(
            'relative flex-shrink-0 p-4 rounded-2xl',
            'transition-all duration-500',
            iconBg,
            'group-hover:scale-110 group-hover:shadow-lg'
          )}
        >
          {icon}
          
          {/* Pulse ring on hover */}
          <div className="absolute inset-0 rounded-2xl border-2 border-current opacity-0 group-hover:opacity-20 group-hover:animate-ping" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tabular-nums">
              {count} disponible{count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="flex-shrink-0 self-center">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            'bg-muted/50 group-hover:bg-primary group-hover:text-primary-foreground',
            'transition-all duration-300'
          )}>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Bottom gradient line */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 h-0.5',
        'bg-gradient-to-r opacity-0 group-hover:opacity-100',
        gradient,
        'transition-opacity duration-500'
      )} />
    </button>
  );
}

export default HomeServiceCard;
