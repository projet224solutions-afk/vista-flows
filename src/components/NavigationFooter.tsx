import { Home, ShoppingBag, MapPin, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigationItems = [
  { id: 'home', label: 'Accueil', icon: Home, path: '/home' },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, path: '/marketplace' },
  { id: 'tracking', label: 'Tracking', icon: MapPin, path: '/tracking' },
  { id: 'profil', label: 'Profil', icon: User, path: '/profil' },
];

export default function NavigationFooter() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2 max-w-screen-xl mx-auto">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[70px]",
                isActive
                  ? "text-vendeur-primary bg-vendeur-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon size={22} className="mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}