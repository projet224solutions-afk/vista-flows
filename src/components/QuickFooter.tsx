import { Home, ShoppingBag, MapPin, MessageSquare, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

export default function QuickFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { t } = useTranslation();

  // Déterminer la page d'accueil selon le rôle
  const getHomePath = () => {
    if (!profile?.role) return '/home';
    const roleRoutes: Record<string, string> = {
      admin: '/pdg',
      ceo: '/pdg',
      vendeur: '/vendeur',
      livreur: '/livreur',
      taxi: '/taxi-moto/driver',
      syndicat: '/syndicat',
      transitaire: '/transitaire',
      client: '/client',
      agent: '/agent',
    };
    return roleRoutes[profile.role] || '/home';
  };

  // Navigation basée sur les fonctionnalités réelles de 224Solutions
  const navigationItems = [
    {
      id: 'home',
      labelKey: 'nav.home',
      icon: Home,
      path: getHomePath(),
    },
    {
      id: 'marketplace',
      labelKey: 'nav.marketplace',
      icon: ShoppingBag,
      path: '/marketplace',
    },
    {
      id: 'proximite',
      labelKey: 'nav.proximite',
      icon: MapPin,
      path: '/proximite',
    },
    {
      id: 'messages',
      labelKey: 'nav.messages',
      icon: MessageSquare,
      path: '/messages',
    },
    {
      id: 'profil',
      labelKey: 'nav.profile',
      icon: User,
      path: profile ? '/profil' : '/auth',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-[100] shadow-elegant pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]" role="navigation" aria-label="Navigation principale">
      <div className="flex items-center justify-around px-2 max-w-screen-xl mx-auto">
        {navigationItems.map((item) => {
          // Détecter si c'est le bouton Home et si on est sur un dashboard
          const isDashboard = ['/pdg', '/vendeur', '/livreur', '/taxi-moto/driver', '/syndicat', '/transitaire', '/client', '/agent'].some(path => location.pathname.startsWith(path));
          const isActive = item.id === 'home' 
            ? isDashboard || location.pathname === item.path
            : location.pathname === item.path || (item.id === 'profil' && !profile && location.pathname === '/auth');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center p-1.5 rounded-lg transition-all duration-300 min-w-[56px] group",
                isActive
                  ? "text-primary bg-accent scale-105"
                  : "text-muted-foreground hover:text-primary hover:bg-accent/50 hover:scale-105"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted group-hover:bg-accent group-hover:text-primary"
              )}>
                <Icon size={18} />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5 leading-tight",
                isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-primary"
              )}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}