/**
 * LAYOUT LIVREUR - Structure avec navigation complète
 * Header + Sidebar + Contenu
 */

import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Menu,
  X,
  Home,
  Package,
  History,
  Wallet,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Navigation as NavigationIcon,
  Bike
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDriver } from '@/hooks/useDriver';
import { useResponsive } from '@/hooks/useResponsive';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import CommunicationWidget from '@/components/communication/CommunicationWidget';
import { DriverSubscriptionButton } from '@/components/driver/DriverSubscriptionButton';

interface DriverLayoutProps {
  children: ReactNode;
  currentPage?: string;
}

export function DriverLayout({ children, currentPage = 'dashboard' }: DriverLayoutProps) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { driver, stats } = useDriver();
  const { isMobile } = useResponsive();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Tableau de bord', path: '/livreur' },
    { id: 'missions', icon: Package, label: 'Missions', path: '/livreur?tab=missions' },
    { id: 'history', icon: History, label: 'Historique', path: '/livreur?tab=history' },
    { id: 'wallet', icon: Wallet, label: 'Portefeuille', path: '/wallet' },
    { id: 'profile', icon: User, label: 'Profil', path: '/profil' },
    { id: 'settings', icon: Settings, label: 'Paramètres', path: '/livreur/settings' },
    { id: 'help', icon: HelpCircle, label: 'Aide', path: '/livreur/help' },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast.success('Déconnexion réussie');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4 gap-4">
          {/* Menu Toggle Mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo & Title */}
          <div className="flex items-center gap-2 flex-1">
            <Bike className="h-6 w-6 text-primary" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold">224Solutions Livreur</h1>
              <p className="text-xs text-muted-foreground">Interface de livraison</p>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Gains aujourd'hui</p>
              <p className="font-bold text-primary">{stats.todayEarnings.toLocaleString()} GNF</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Livraisons</p>
              <p className="font-bold">{stats.todayDeliveries}</p>
            </div>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* Bouton d'abonnement */}
          <DriverSubscriptionButton />

          {/* Profile Avatar */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback>
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium">{driver?.full_name || profile?.first_name}</p>
              <Badge variant={driver?.is_online ? 'default' : 'secondary'} className="text-xs">
                {driver?.is_online ? '🟢 En ligne' : '⚪ Hors ligne'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {(sidebarOpen || !isMobile) && (
          <aside className={`
            ${isMobile ? 'fixed inset-y-0 left-0 z-40 w-64 bg-background border-r' : 'w-64 border-r'}
            flex flex-col transition-transform
          `}>
            <nav className="flex-1 p-4 space-y-1 mt-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-3 ${isActive ? 'font-semibold' : ''}`}
                    onClick={() => {
                      if (item.path.includes('?')) {
                        const [path, query] = item.path.split('?');
                        const params = new URLSearchParams(query);
                        navigate(path);
                        // Déclencher changement d'onglet si nécessaire
                      } else {
                        navigate(item.path);
                      }
                      if (isMobile) setSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            {/* Footer Sidebar */}
            <div className="p-4 border-t">
              <div className="mb-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <NavigationIcon className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium">GPS Tracking</p>
                </div>
                <p className="text-xs text-muted-foreground">Position mise à jour</p>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
          <main className="p-4">
            {children}
          </main>
        </ScrollArea>
      </div>

      {/* Communication Widget */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />

      {/* Overlay Mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
