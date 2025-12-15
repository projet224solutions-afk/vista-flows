/**
 * SERVICE CARD - Ultra Professional Design
 * 224Solutions - Premium Service Cards
 * Glass morphism with micro-animations
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HomeServiceCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  count: number;
  gradient?: string;
  onClick?: () => void;
  className?: string;
}

export function HomeServiceCard({
  id,
  icon,
  title,
  count,
  gradient = 'from-primary/10 to-primary/5',
  onClick,
  className,
}: HomeServiceCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full p-4 md:p-5 rounded-2xl text-left',
        'bg-card border border-border/50',
        'hover:border-primary/30 hover:shadow-[0_8px_30px_hsl(211_100%_50%_/_0.1)]',
        'transition-all duration-300',
        'hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
    >
      {/* Gradient overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100',
          'bg-gradient-to-br',
          gradient,
          'transition-opacity duration-300'
        )}
      />

      <div className="relative flex flex-col items-center text-center space-y-3">
        {/* Icon */}
        <div
          className={cn(
            'p-3 rounded-2xl',
            'bg-gradient-to-br from-muted to-muted/50',
            'group-hover:from-primary/20 group-hover:to-primary/10',
            'transition-all duration-300',
            'group-hover:scale-110 group-hover:shadow-lg'
          )}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h3 className="font-semibold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {count} {count === 1 ? 'disponible' : 'disponibles'}
          </p>
        </div>
      </div>
    </button>
  );
}

export default HomeServiceCard;
