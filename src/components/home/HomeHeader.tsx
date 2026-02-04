/**
 * HOME HEADER - Ultra Professional Design
 * 224Solutions - Marketplace Header Component
 * Glassmorphism + Premium animations
 */

import { useNavigate } from 'react-router-dom';
import { MapPin, ShoppingCart, Bell, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import LanguageSelector from '@/components/LanguageSelector';
import { useUserLocation } from '@/hooks/useUserLocation';
import { cn } from '@/lib/utils';

interface HomeHeaderProps {
  cartCount?: number;
  notificationCount?: number;
  onCartClick?: () => void;
  onNotificationClick?: () => void;
  className?: string;
}

export function HomeHeader({
  cartCount = 0,
  notificationCount = 0,
  onCartClick,
  onNotificationClick,
  className,
}: HomeHeaderProps) {
  const navigate = useNavigate();
  const { location, loading, refresh } = useUserLocation();

  return (
    <header
      className={cn(
        'sticky top-0 z-50',
        'bg-card/80 backdrop-blur-xl border-b border-border/50',
        'transition-all duration-300',
        className
      )}
    >
      <div className="px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Location */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Animated Logo */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 rounded-xl blur-md opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-lg md:text-xl">M</span>
              </div>
            </div>

            <div className="min-w-0 text-center">
              <h1 className="font-bold text-primary text-lg md:text-xl tracking-tight truncate">
                224SOLUTIONS
              </h1>
              <button 
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group"
                onClick={() => refresh()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                ) : (
                  <MapPin className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
                )}
                <span className="truncate max-w-[150px]">
                  {loading ? 'Détection...' : location?.address || 'Conakry, Guinée'}
                </span>
                {!loading && (
                  <RefreshCw className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            <ThemeToggle />
            <LanguageSelector variant="minimal" />

            {/* Cart Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick || (() => navigate('/cart'))}
              className="relative h-10 w-10 rounded-full hover:bg-primary/10 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {cartCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground border-2 border-card"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
            </Button>

            {/* Notification Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onNotificationClick || (() => navigate('/notifications'))}
              className="relative h-10 w-10 rounded-full hover:bg-primary/10 transition-colors"
            >
              <Bell className="w-5 h-5 text-foreground" />
              {notificationCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground border-2 border-card"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Professional Ticker Banner - Below MarketPlace */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-t border-primary/20 overflow-hidden relative">
        <div className="flex animate-ticker py-2">
          {/* First set of phrases */}
          <span className="ticker-item text-base md:text-lg font-semibold text-primary whitespace-nowrap px-8">
            🎉 Bienvenue sur 224SOLUTIONS
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            🌍 Une plateforme africaine
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            🚀 Des opportunités sans frontières
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            🏪 Tout votre marché en un seul endroit
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            💎 Découvrez, achetez et vendez simplement
          </span>
          {/* Duplicate for seamless loop */}
          <span className="ticker-item text-base md:text-lg font-semibold text-primary whitespace-nowrap px-8">
            🎉 Bienvenue sur 224SOLUTIONS
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            🌍 Une plateforme africaine
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            🚀 Des opportunités sans frontières
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            🏪 Tout votre marché en un seul endroit
          </span>
          <span className="ticker-item text-sm md:text-base font-medium text-primary/90 whitespace-nowrap px-8">
            💎 Découvrez, achetez et vendez simplement
          </span>
        </div>
      </div>
    </header>
  );
}

export default HomeHeader;
