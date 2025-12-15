/**
 * BOTTOM NAVIGATION - Ultra Professional Design
 * 224Solutions - Apple/Uber-style Navigation
 * Floating design with blur effects
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, MapPin, User, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Accueil', path: '/home' },
  { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
  { id: 'tracking', icon: MapPin, label: 'Tracking', path: '/tracking' },
  { id: 'profil', icon: User, label: 'Profil', path: '/profil' },
];

interface BottomNavigationProps {
  className?: string;
}

export function BottomNavigation({ className }: BottomNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'pb-safe',
        className
      )}
    >
      {/* Subtle top gradient for seamless blend */}
      <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Navigation Bar - Clean iOS style */}
      <div
        className={cn(
          'relative',
          'bg-card/95 backdrop-blur-2xl',
          'border-t border-border/30',
          'shadow-[0_-2px_20px_hsl(0_0%_0%_/_0.05)]'
        )}
      >
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 py-2 px-1',
                  'transition-all duration-200',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground active:scale-95'
                )}
              >
                {/* Icon */}
                <div className="relative">
                  <Icon 
                    className={cn(
                      'w-6 h-6 transition-transform duration-200',
                      active && 'scale-105'
                    )} 
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {/* Active dot indicator */}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[11px] font-medium mt-0.5',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Safe area spacer for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </nav>
  );
}

export default BottomNavigation;
