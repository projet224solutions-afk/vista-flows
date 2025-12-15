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
      {/* Gradient fade effect */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />

      {/* Navigation Bar */}
      <div className="relative px-4 pb-4">
        <div
          className={cn(
            'mx-auto max-w-md',
            'bg-card/90 backdrop-blur-xl',
            'border border-border/50',
            'rounded-2xl shadow-[0_-4px_30px_hsl(0_0%_0%_/_0.08)]',
            'p-2'
          )}
        >
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl',
                    'transition-all duration-300',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute inset-0 rounded-xl bg-primary/10 animate-scale-in" />
                  )}

                  {/* Icon container */}
                  <div
                    className={cn(
                      'relative z-10 p-1.5 rounded-xl transition-all duration-300',
                      active && 'bg-primary text-primary-foreground shadow-lg scale-110'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      'relative z-10 text-[10px] font-medium transition-all duration-300',
                      active && 'text-primary font-semibold'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default BottomNavigation;
