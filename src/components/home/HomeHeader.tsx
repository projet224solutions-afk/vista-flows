/**
 * HOME HEADER - Ultra Professional Design
 * 224Solutions - Marketplace Header Component
 * Glassmorphism + Premium animations
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShoppingCart, Bell, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LanguageSelector from '@/components/LanguageSelector';
import { cn } from '@/lib/utils';

interface HomeHeaderProps {
  cartCount?: number;
  notificationCount?: number;
  location?: string;
  onCartClick?: () => void;
  onNotificationClick?: () => void;
  className?: string;
}

export function HomeHeader({
  cartCount = 0,
  notificationCount = 0,
  location = 'Conakry, Guinée',
  onCartClick,
  onNotificationClick,
  className,
}: HomeHeaderProps) {
  const navigate = useNavigate();

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

            <div className="min-w-0">
              <h1 className="font-bold text-foreground text-lg md:text-xl tracking-tight truncate">
                MarketPlace
              </h1>
              <button 
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group"
                onClick={() => {/* Open location picker */}}
              >
                <MapPin className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
                <span className="truncate">{location}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            <LanguageSelector variant="minimal" />

            {/* Cart Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCartClick || (() => navigate('/cart'))}
              className="relative h-10 w-10 rounded-full hover:bg-primary/10 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              {cartCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs font-bold animate-bounce-in"
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </Badge>
              )}
            </Button>

            {/* Notification Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onNotificationClick || (() => navigate('/profil'))}
              className="relative h-10 w-10 rounded-full hover:bg-primary/10 transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 bg-destructive rounded-full text-xs text-destructive-foreground font-bold flex items-center justify-center px-1 animate-pulse">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HomeHeader;
