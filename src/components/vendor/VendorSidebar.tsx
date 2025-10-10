/**
 * SIDEBAR VENDEUR PROFESSIONNELLE - 224SOLUTIONS
 * Navigation complète avec tous les modules vendeur
 */

import { NavLink, useLocation } from "react-router-dom";
import {
  Package, ShoppingCart, Users, BarChart3, CreditCard, 
  Wallet, Receipt, Truck, Megaphone, FileText, Settings,
  Target, TrendingUp, Box, MessageSquare, HeadphonesIcon,
  Store, DollarSign, Boxes, AlertTriangle
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const menuSections = [
  {
    label: "Vue d'ensemble",
    items: [
      { 
        title: "Dashboard", 
        icon: BarChart3, 
        path: "dashboard",
        badge: null
      },
      { 
        title: "Analytiques", 
        icon: TrendingUp, 
        path: "analytics",
        badge: null
      },
    ]
  },
  {
    label: "Ventes & Commerce",
    items: [
      { 
        title: "Point de vente (POS)", 
        icon: Store, 
        path: "pos",
        badge: "HOT"
      },
      { 
        title: "Produits", 
        icon: Package, 
        path: "products",
        badge: null
      },
      { 
        title: "Commandes", 
        icon: ShoppingCart, 
        path: "orders",
        badge: "12"
      },
      { 
        title: "Inventaire", 
        icon: Box, 
        path: "inventory",
        badge: null
      },
      { 
        title: "Entrepôts", 
        icon: Boxes, 
        path: "warehouse",
        badge: null
      },
    ]
  },
  {
    label: "Clients & Marketing",
    items: [
      { 
        title: "Clients", 
        icon: Users, 
        path: "clients",
        badge: null
      },
      { 
        title: "Prospects", 
        icon: Target, 
        path: "prospects",
        badge: "5"
      },
      { 
        title: "Marketing", 
        icon: Megaphone, 
        path: "marketing",
        badge: null
      },
    ]
  },
  {
    label: "Finances",
    items: [
      { 
        title: "Wallet", 
        icon: Wallet, 
        path: "wallet",
        badge: null
      },
      { 
        title: "Paiements", 
        icon: CreditCard, 
        path: "payments",
        badge: null
      },
      { 
        title: "Liens de paiement", 
        icon: DollarSign, 
        path: "payment-links",
        badge: null
      },
      { 
        title: "Dépenses", 
        icon: Receipt, 
        path: "expenses",
        badge: "3"
      },
    ]
  },
  {
    label: "Support & Outils",
    items: [
      { 
        title: "Livraisons", 
        icon: Truck, 
        path: "delivery",
        badge: null
      },
      { 
        title: "Support Tickets", 
        icon: HeadphonesIcon, 
        path: "support",
        badge: "2"
      },
      { 
        title: "Communication", 
        icon: MessageSquare, 
        path: "communication",
        badge: null
      },
      { 
        title: "Rapports", 
        icon: FileText, 
        path: "reports",
        badge: null
      },
    ]
  },
  {
    label: "Configuration",
    items: [
      { 
        title: "Paramètres", 
        icon: Settings, 
        path: "settings",
        badge: null
      },
    ]
  }
];

export function VendorSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  const getNavClass = (active: boolean) => 
    active 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground";

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="bg-gradient-to-b from-slate-50 to-white">
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 py-2">
                {section.label}
              </SidebarGroupLabel>
            )}
            
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={`/vendeur/${item.path}`}
                        className={getNavClass(isActive(item.path))}
                      >
                        <item.icon className={collapsed ? "w-5 h-5" : "w-4 h-4 mr-3"} />
                        {!collapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-sm font-medium">{item.title}</span>
                            {item.badge && (
                              <Badge 
                                variant={item.badge === "HOT" ? "destructive" : "secondary"}
                                className="text-xs px-2 py-0"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
