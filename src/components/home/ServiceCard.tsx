/**
 * SERVICE CARD - Ultra Professional Design
 * 224Solutions - Premium Service Cards
 * Clean iOS-style with subtle animations
 */

import { ReactNode } from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeServiceCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  count: number;
  gradient?: string;
  trending?: boolean;
  onClick?: () => void;
  className?: string;
}

export function HomeServiceCard({
  id,
  icon,
  title,
  count,
  gradient = 'from-primary/10 to-primary/5',
  trending = false,
  onClick,
  className,
}: HomeServiceCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full p-4 rounded-2xl text-left',
        'bg-card border border-border/40',
        'hover:border-primary/20 hover:shadow-lg',
        'transition-all duration-300 ease-out',
        'active:scale-[0.97]',
        className
      )}
    >
      {/* Trending badge */}
      {trending && count > 0 && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-vendeur-secondary text-white text-[10px] font-bold rounded-full shadow-md animate-bounce-in">
          <TrendingUp className="w-3 h-3" />
          Hot
        </div>
      )}

      <div className="flex flex-col items-center text-center space-y-2.5">
        {/* Icon Container */}
        <div
          className={cn(
            'relative p-3.5 rounded-2xl transition-all duration-300',
            'bg-gradient-to-br',
            gradient,
            'group-hover:scale-110 group-hover:shadow-md'
          )}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {count} {count === 1 ? 'disponible' : 'disponibles'}
          </p>
        </div>
      </div>
    </button>
  );
}

export default HomeServiceCard;
