/**
 * SIDEBAR VENDEUR PROFESSIONNELLE - 224SOLUTIONS
 * Navigation complète avec tous les modules vendeur
 * @version 3.0.0 - Ultra Professional Design
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  Package, ShoppingCart, Users, BarChart3, CreditCard, 
  Wallet, Receipt, Truck, Megaphone, FileText, Settings,
  Target, TrendingUp, Box, MessageSquare, HeadphonesIcon,
  Store, DollarSign, Boxes, AlertTriangle, Link, Building2,
  LayoutDashboard, ChevronRight
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
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VendorSidebar() {
  const { t } = useTranslation();
  const { state, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';
  // Sur mobile, toujours afficher le contenu complet quand ouvert
  const collapsed = state === "collapsed" && !isMobile;
  const { badges, loading } = useVendorBadges();

  // Produits et Inventaire fonctionnent ensemble
  const linkedPaths = ['products', 'inventory'];
  const isActive = (path: string) => {
    if (linkedPaths.includes(path) && linkedPaths.includes(currentPath)) {
      return true;
    }
    return currentPath === path;
  };

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
    // Fermer la sidebar automatiquement sur mobile après navigation
    if (isMobile) {
      setOpen(false);
    }
  };

  const menuSections = [
    {
      label: t("vendor.sidebar.main"),
      icon: LayoutDashboard,
      items: [
        { title: t("vendor.menu.dashboard"), icon: BarChart3, path: "dashboard" },
        { title: t("vendor.menu.analytics"), icon: TrendingUp, path: "analytics" },
        { title: t("vendor.menu.pos"), icon: Store, path: "pos", isPOS: true },
      ]
    },
    {
      label: t("vendor.sidebar.commerce"),
      icon: Package,
      items: [
        { title: t("vendor.menu.products"), icon: Package, path: "products" },
        { title: t("vendor.menu.orders"), icon: ShoppingCart, path: "orders" },
        { title: t("vendor.menu.inventory"), icon: Box, path: "inventory" },
        { title: t("vendor.menu.warehouses"), icon: Boxes, path: "warehouse" },
        { title: t("vendor.menu.suppliers"), icon: Building2, path: "suppliers" },
      ]
    },
    {
      label: t("vendor.sidebar.crm"),
      icon: Users,
      items: [
        { title: t("vendor.menu.clients"), icon: Users, path: "clients" },
        { title: t("vendor.menu.agents"), icon: Users, path: "agents" },
        { title: t("vendor.menu.prospects"), icon: Target, path: "prospects" },
        { title: t("vendor.menu.marketing"), icon: Megaphone, path: "marketing" },
      ]
    },
    {
      label: t("vendor.sidebar.finance"),
      icon: Wallet,
      items: [
        { title: t("vendor.menu.wallet"), icon: Wallet, path: "wallet" },
        { title: t("vendor.menu.quotesInvoices"), icon: FileText, path: "quotes-invoices" },
        { title: t("vendor.menu.payments"), icon: CreditCard, path: "payments" },
        { title: t("vendor.menu.paymentLinks"), icon: DollarSign, path: "payment-links" },
        { title: t("vendor.menu.expenses"), icon: Receipt, path: "expenses" },
        { title: t("vendor.menu.debts"), icon: AlertTriangle, path: "debts" },
        { title: t("vendor.menu.contracts"), icon: FileText, path: "contracts" },
        { title: t("vendor.menu.affiliate"), icon: Link, path: "affiliate" },
      ]
    },
    {
      label: t("vendor.sidebar.services"),
      icon: Truck,
      items: [
        { title: t("vendor.menu.delivery"), icon: Truck, path: "delivery" },
        { title: t("vendor.menu.support"), icon: HeadphonesIcon, path: "support" },
        { title: t("vendor.menu.messages"), icon: MessageSquare, path: "communication" },
        { title: t("vendor.menu.reports"), icon: FileText, path: "reports" },
      ]
    },
    {
      label: t("vendor.sidebar.system"),
      icon: Settings,
      items: [
        { title: t("vendor.menu.settings"), icon: Settings, path: "settings" },
      ]
    }
  ];

  return (
    <Sidebar className={cn(
      collapsed ? "w-16" : "w-64",
      "border-r border-border/40 shadow-lg"
    )} collapsible="icon">
      <ScrollArea className="h-full">
        <SidebarContent className="bg-gradient-to-b from-background via-background to-muted/20 py-2">
          {menuSections.map((section, sectionIndex) => (
            <SidebarGroup key={section.label} className="py-1">
              {!collapsed && (
                <SidebarGroupLabel className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-4 py-1.5 mb-1">
                  <section.icon className="w-3 h-3" />
                  {section.label}
                </SidebarGroupLabel>
              )}
              
              {collapsed && sectionIndex > 0 && (
                <div className="h-px bg-border/50 mx-2 my-2" />
              )}
              
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5 px-2">
                  {section.items.map((item: { title: string; icon: any; path: string; isPOS?: boolean }) => {
                    const badgeValue = getBadgeValue(item.path);
                    const active = isActive(item.path);
                    const isPOS = item.isPOS;
                    
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
                            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer select-none",
                            "hover:bg-primary/10 hover:text-primary",
                            active && "bg-primary/15 text-primary font-medium shadow-sm",
                            isPOS && "bg-gradient-to-r from-primary/5 to-transparent border border-primary/20",
                            isPOS && active && "from-primary/20 border-primary/40 shadow-md",
                            collapsed && "justify-center px-2"
                          )}
                        >
                          {/* Icône */}
                          <div className={cn(
                            "flex items-center justify-center rounded-md transition-all",
                            isPOS ? "w-8 h-8 bg-gradient-to-br from-primary to-primary/80 shadow-md" : "w-7 h-7",
                            active && !isPOS && "bg-primary/10",
                            collapsed && isPOS && "w-7 h-7"
                          )}>
                            <item.icon className={cn(
                              "w-4 h-4 transition-colors",
                              isPOS ? "text-primary-foreground" : "",
                              active && !isPOS && "text-primary",
                              !active && !isPOS && "text-muted-foreground group-hover:text-primary"
                            )} />
                          </div>
                          
                          {/* Texte et Badge */}
                          {!collapsed && (
                            <>
                              <span className={cn(
                                "flex-1 truncate",
                                isPOS && "font-semibold"
                              )}>
                                {item.title}
                              </span>
                              
                              {badgeValue && (
                                <Badge 
                                  variant={badgeValue === "HOT" ? "destructive" : "secondary"}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center",
                                    isPOS && "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 animate-pulse"
                                  )}
                                >
                                  {badgeValue}
                                </Badge>
                              )}
                              
                              {active && (
                                <ChevronRight className="w-4 h-4 text-primary/60" />
                              )}
                            </>
                          )}
                          
                          {/* Badge en mode collapsed */}
                          {collapsed && badgeValue && (
                            <span className={cn(
                              "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold",
                              badgeValue === "HOT" 
                                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse" 
                                : "bg-primary text-primary-foreground"
                            )}>
                              {badgeValue === "HOT" ? "!" : badgeValue.length > 2 ? "+" : badgeValue}
                            </span>
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
      </ScrollArea>
    </Sidebar>
  );
}
