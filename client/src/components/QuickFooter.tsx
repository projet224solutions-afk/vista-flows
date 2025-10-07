import { Home, ShoppingBag, MapPin, User, Bike } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function QuickFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  // Navigation principale - 5 boutons essentiels avec Taxi-Moto
  const navigationItems = [
    {
      id: 'home',
      label: 'Accueil',
      icon: Home,
      path: '/',
      description: 'Interface d\'accueil avec toutes les fonctionnalités'
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: ShoppingBag,
      path: '/marketplace',
      description: 'Interface marketplace et toutes ses fonctionnalités'
    },
    {
      id: 'taxi-moto',
      label: 'Taxi-Moto',
      icon: Bike,
      path: '/taxi-moto',
      description: 'Service de transport urbain - Réservation de taxi-moto'
    },
    {
      id: 'tracking',
      label: 'Suivi',
      icon: MapPin,
      path: '/tracking',
      description: 'Fonctionnalités de tracking et suivi'
    },
    {
      id: 'profil',
      label: 'Profil',
      icon: User,
      path: profile ? '/profil' : '/auth',
      description: profile ? 'Mon profil et paramètres' : 'Connexion selon votre rôle'
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-50 shadow-lg">
      <div className="flex items-center justify-around px-4 py-3 max-w-screen-xl mx-auto">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/' && location.pathname === '/') ||
            (item.id === 'profil' && !profile && location.pathname === '/auth');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 min-w-[70px] group",
                isActive
                  ? "text-purple-600 bg-purple-50 scale-105 shadow-md"
                  : "text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 hover:scale-105"
              )}
              title={item.description}
            >
              <div className={cn(
                "p-2 rounded-full transition-all duration-300",
                isActive
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-gray-100 group-hover:bg-purple-100 group-hover:text-purple-600"
              )}>
                <Icon size={18} />
              </div>
              <span className={cn(
                "text-xs font-medium mt-1 leading-tight",
                isActive ? "text-purple-600" : "text-gray-600 group-hover:text-purple-600"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Indicateur visuel pour l'élément actif */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
    </div>
  );
}