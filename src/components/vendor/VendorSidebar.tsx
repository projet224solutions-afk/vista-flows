/**
 * SIDEBAR VENDEUR PROFESSIONNELLE - 224SOLUTIONS
 * Navigation complète avec tous les modules vendeur
 * @version 2.0.0 - Production Build Fix
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  Package, ShoppingCart, Users, BarChart3, CreditCard, 
  Wallet, Receipt, Truck, Megaphone, FileText, Settings,
  Target, TrendingUp, Box, MessageSquare, HeadphonesIcon,
  Store, DollarSign, Boxes, AlertTriangle, Link, Building2
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useVendorBadges } from "@/hooks/useVendorBadges";
import { cn } from "@/lib/utils";

export function VendorSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';
  const collapsed = state === "collapsed";
  const { badges, loading } = useVendorBadges();

  const isActive = (path: string) => currentPath === path;

  const getBadgeValue = (path: string): string | null => {
    if (loading) return null;
    
    switch (path) {
      case 'pos':
        return 'HOT';
      case 'products':
        return badges.totalProducts > 0 ? badges.totalProducts.toString() : null;
      case 'inventory':
        return badges.lowStockProducts > 0 ? badges.lowStockProducts.toString() : null;
      case 'orders':
        return badges.pendingOrders > 0 ? badges.pendingOrders.toString() : null;
      case 'expenses':
        return badges.unreadExpenseAlerts > 0 ? badges.unreadExpenseAlerts.toString() : null;
      default:
        return null;
    }
  };

  const handleNavigation = (path: string) => {
    navigate(`/vendeur/${path}`);
  };

  const menuSections = [
    {
      label: "Vue d'ensemble",
      items: [
        { title: "Dashboard", icon: BarChart3, path: "dashboard" },
        { title: "Analytiques", icon: TrendingUp, path: "analytics" },
      ]
    },
    {
      label: "Ventes & Commerce",
      items: [
        { title: "Point de vente (POS)", icon: Store, path: "pos" },
        { title: "Produits", icon: Package, path: "products" },
        { title: "Commandes", icon: ShoppingCart, path: "orders" },
        { title: "Inventaire", icon: Box, path: "inventory" },
        { title: "Entrepôts", icon: Boxes, path: "warehouse" },
        { title: "Fournisseurs", icon: Building2, path: "suppliers" },
      ]
    },
    {
      label: "Clients & Marketing",
      items: [
        { title: "Agents", icon: Users, path: "agents" },
        { title: "Clients", icon: Users, path: "clients" },
        { title: "Prospects", icon: Target, path: "prospects" },
        { title: "Marketing", icon: Megaphone, path: "marketing" },
      ]
    },
    {
      label: "Finances",
      items: [
        { title: "Wallet", icon: Wallet, path: "wallet" },
        { title: "Devis & Factures", icon: FileText, path: "quotes-invoices" },
        { title: "Paiements", icon: CreditCard, path: "payments" },
        { title: "Liens de paiement", icon: DollarSign, path: "payment-links" },
        { title: "Dépenses", icon: Receipt, path: "expenses" },
        { title: "Dettes", icon: AlertTriangle, path: "debts" },
        { title: "Contrats", icon: FileText, path: "contracts" },
        { title: "Affiliation", icon: Link, path: "affiliate" },
      ]
    },
    {
      label: "Support & Outils",
      items: [
        { title: "Livraisons", icon: Truck, path: "delivery" },
        { title: "Support Tickets", icon: HeadphonesIcon, path: "support" },
        { title: "Communication", icon: MessageSquare, path: "communication" },
        { title: "Rapports", icon: FileText, path: "reports" },
      ]
    },
    {
      label: "Configuration",
      items: [
        { title: "Paramètres", icon: Settings, path: "settings" },
      ]
    }
  ];

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
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
                {section.items.map((item) => {
                  const badgeValue = getBadgeValue(item.path);
                  const active = isActive(item.path);
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNavigation(item.path);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNavigation(item.path);
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors cursor-pointer select-none",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                          collapsed && "justify-center"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.title}</span>
                            {badgeValue && (
                              <Badge 
                                variant={badgeValue === "HOT" ? "destructive" : "secondary"}
                                className="text-xs px-2 py-0 ml-auto pointer-events-none"
                              >
                                {badgeValue}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
