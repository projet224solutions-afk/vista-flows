import { Home, ShoppingBag, MessageSquare, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function QuickFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  // Navigation basée sur les fonctionnalités réelles de 224Solutions
  const navigationItems = [
    {
      id: 'home',
      label: 'Accueil',
      icon: Home,
      path: '/home',
      description: 'Accueil 224Solutions - Services à proximité'
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: ShoppingBag,
      path: '/marketplace',
      description: 'Achats en ligne - Produits et vendeurs'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      path: '/messages',
      description: 'Messagerie - Communication entre utilisateurs'
    },
    {
      id: 'profil',
      label: 'Profil',
      icon: User,
      path: profile ? '/profil' : '/auth',
      description: profile ? 'Mon profil et paramètres' : 'Connexion'
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-[100] shadow-elegant" role="navigation" aria-label="Navigation principale">
      <div className="flex items-center justify-around px-2 py-2 max-w-screen-xl mx-auto">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.id === 'profil' && !profile && location.pathname === '/auth');
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
              title={item.description}
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
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}