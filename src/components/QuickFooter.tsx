import { Home, ShoppingBag, MapPin, User, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function QuickFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  // S'affiche uniquement pour les utilisateurs connectés
  if (!profile) {
    return null;
  }

  // Navigation de base pour tous les utilisateurs
  const baseNavigationItems = [
    { id: 'home', label: 'Accueil', icon: Home, path: '/home' },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, path: '/marketplace' },
    { id: 'tracking', label: 'Tracking', icon: MapPin, path: '/tracking' },
  ];

  // Dashboard selon le rôle
  const getDashboardItem = () => {
    const role = profile?.role;
    switch (role) {
      case 'vendeur':
        return { id: 'dashboard', label: 'Commerce', icon: BarChart3, path: '/vendeur' };
      case 'livreur':
        return { id: 'dashboard', label: 'Livraisons', icon: BarChart3, path: '/livreur' };
      case 'taxi':
        return { id: 'dashboard', label: 'Taxi', icon: BarChart3, path: '/taxi' };
      case 'transitaire':
        return { id: 'dashboard', label: 'Transitaire', icon: BarChart3, path: '/transitaire' };
      case 'syndicat':
        return { id: 'dashboard', label: 'Syndicat', icon: BarChart3, path: '/syndicat' };
      case 'admin':
        return { id: 'dashboard', label: 'Admin', icon: BarChart3, path: '/admin' };
      case 'client':
      default:
        return { id: 'dashboard', label: 'Mon Espace', icon: BarChart3, path: '/client' };
    }
  };

  const dashboardItem = getDashboardItem();
  const navigationItems = [
    ...baseNavigationItems,
    dashboardItem,
    { id: 'profil', label: 'Profil', icon: User, path: '/profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 shadow-lg">
      <div className="flex items-center justify-around px-2 py-3 max-w-screen-xl mx-auto">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.id === 'dashboard' && location.pathname.includes(item.path.slice(1)));
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[64px]",
                isActive
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}