/**
 * SIDEBAR VENDEUR PROFESSIONNELLE - 224SOLUTIONS
 * Navigation complète avec contrôle d'accès par abonnement
 * @version 4.0.0 - Contrôle d'accès par plan
 */

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Package, ShoppingCart, Users, BarChart3, CreditCard, 
  Wallet, Receipt, Truck, Megaphone, FileText, Settings,
  Target, TrendingUp, Box, MessageSquare, HeadphonesIcon,
  Store, DollarSign, Boxes, AlertTriangle, Link, Building2,
  LayoutDashboard, ChevronRight, Star, Smartphone, Bot, Lock
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubscriptionFeatures, MODULE_FEATURE_MAP, SubscriptionFeature } from "@/hooks/useSubscriptionFeatures";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PLAN_BADGE_COLORS: Record<string, string> = {
  'basic': 'bg-blue-500',
  'pro': 'bg-purple-500',
  'business': 'bg-orange-500',
  'premium': 'bg-gradient-to-r from-yellow-400 to-orange-500',
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  'basic': 'Basic',
  'pro': 'Pro',
  'business': 'Business',
  'premium': 'Premium',
};

export function VendorSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';
  const collapsed = state === "collapsed" && !isMobile;
  const { badges, loading: badgesLoading } = useVendorBadges();
  const { canAccessModule, getMinPlanForFeature, loading: subscriptionLoading } = useSubscriptionFeatures();
  
  // State pour le dialog d'upgrade
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [targetFeature, setTargetFeature] = useState<SubscriptionFeature | undefined>();
  const [targetModuleName, setTargetModuleName] = useState<string | undefined>();

  const linkedPaths = ['products', 'inventory'];
  const isActive = (path: string) => {
    if (linkedPaths.includes(path) && linkedPaths.includes(currentPath)) {
      return true;
    }
    return currentPath === path;
  };

  const getBadgeValue = (path: string): string | null => {
    if (badgesLoading) return null;
    
    switch (path) {
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

  const handleNavigation = (path: string, title: string) => {
    const feature = MODULE_FEATURE_MAP[path];
    const hasAccess = !feature || canAccessModule(path);
    
    if (hasAccess) {
      navigate(`/vendeur/${path}`);
      if (isMobile) {
        setOpen(false);
      }
    } else {
      // Afficher le dialog d'upgrade
      setTargetFeature(feature);
      setTargetModuleName(title);
      setUpgradeDialogOpen(true);
    }
  };

  const getRequiredPlan = (path: string): string | null => {
    const feature = MODULE_FEATURE_MAP[path];
    if (!feature) return null;
    return getMinPlanForFeature(feature);
  };

  const menuSections = [
    {
      label: "Principal",
      icon: LayoutDashboard,
      items: [
        { title: "Dashboard", icon: BarChart3, path: "dashboard" },
        { title: "Analytiques", icon: TrendingUp, path: "analytics" },
        { title: "POS", icon: Store, path: "pos", isPOS: true },
      ]
    },
    {
      label: "Commerce",
      icon: Package,
      items: [
        { title: "Produits", icon: Package, path: "products" },
        { title: "Commandes", icon: ShoppingCart, path: "orders" },
        { title: "Inventaire", icon: Box, path: "inventory" },
        { title: "Entrepôts", icon: Boxes, path: "warehouse" },
        { title: "Fournisseurs", icon: Building2, path: "suppliers" },
      ]
    },
    {
      label: "CRM",
      icon: Users,
      items: [
        { title: "Clients", icon: Users, path: "clients" },
        { title: "Agents", icon: Users, path: "agents" },
        { title: "Prospects", icon: Target, path: "prospects" },
        { title: "Marketing", icon: Megaphone, path: "marketing" },
      ]
    },
    {
      label: "Finance",
      icon: Wallet,
      items: [
        { title: "Wallet", icon: Wallet, path: "wallet" },
        { title: "Carte Virtuelle", icon: Smartphone, path: "virtual-card" },
        { title: "Devis & Factures", icon: FileText, path: "quotes-invoices" },
        { title: "Paiements", icon: CreditCard, path: "payments" },
        { title: "Liens paiement", icon: DollarSign, path: "payment-links" },
        { title: "Dépenses", icon: Receipt, path: "expenses" },
        { title: "Dettes", icon: AlertTriangle, path: "debts" },
        { title: "Contrats", icon: FileText, path: "contracts" },
        { title: "Affiliation", icon: Link, path: "affiliate" },
      ]
    },
    {
      label: "Services",
      icon: Truck,
      items: [
        { title: "Livraisons", icon: Truck, path: "delivery" },
        { title: "Avis Clients", icon: Star, path: "ratings" },
        { title: "Support", icon: HeadphonesIcon, path: "support" },
        { title: "Messages", icon: MessageSquare, path: "communication" },
        { title: "Rapports", icon: FileText, path: "reports" },
      ]
    },
    {
      label: "Système",
      icon: Settings,
      items: [
        { title: "Copilote IA", icon: Bot, path: "copilote" },
        { title: "Paramètres", icon: Settings, path: "settings" },
      ]
    }
  ];

  return (
    <TooltipProvider>
      <Sidebar className={cn(
        collapsed ? "w-12" : "w-44",
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
                      const hasAccess = subscriptionLoading ? true : canAccessModule(item.path);
                      const requiredPlan = getRequiredPlan(item.path);
                      
                      const menuItem = (
                        <SidebarMenuItem key={item.path}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleNavigation(item.path, item.title);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleNavigation(item.path, item.title);
                              }
                            }}
                            className={cn(
                              "group relative flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition-all duration-200 cursor-pointer select-none",
                              hasAccess && "hover:bg-primary/10 hover:text-primary",
                              !hasAccess && "opacity-60 hover:opacity-80",
                              active && hasAccess && "bg-primary/15 text-primary font-medium shadow-sm",
                              isPOS && hasAccess && "bg-gradient-to-r from-primary/5 to-transparent border border-primary/20",
                              isPOS && active && hasAccess && "from-primary/20 border-primary/40 shadow-md",
                              collapsed && "justify-center px-1"
                            )}
                          >
                            {/* Icône */}
                            <div className={cn(
                              "flex items-center justify-center rounded-md transition-all flex-shrink-0",
                              isPOS && hasAccess ? "w-6 h-6 bg-gradient-to-br from-primary to-primary/80 shadow-sm" : "w-5 h-5",
                              active && !isPOS && hasAccess && "bg-primary/10",
                              !hasAccess && "grayscale",
                              collapsed && isPOS && "w-5 h-5"
                            )}>
                              <item.icon className={cn(
                                "w-3.5 h-3.5 transition-colors",
                                isPOS && hasAccess ? "text-primary-foreground" : "",
                                active && !isPOS && hasAccess && "text-primary",
                                !active && !isPOS && hasAccess && "text-muted-foreground group-hover:text-primary",
                                !hasAccess && "text-muted-foreground"
                              )} />
                            </div>
                            
                            {/* Texte et Badge */}
                            {!collapsed && (
                              <>
                                <span className={cn(
                                  "flex-1 truncate",
                                  isPOS && hasAccess && "font-semibold",
                                  !hasAccess && "text-muted-foreground"
                                )}>
                                  {item.title}
                                </span>
                                
                                {/* Badge de contenu */}
                                {badgeValue && hasAccess && (
                                  <Badge 
                                    variant={badgeValue === "HOT" ? "destructive" : "secondary"}
                                    className={cn(
                                      "text-[9px] px-1 py-0 h-4 min-w-[16px] flex items-center justify-center flex-shrink-0",
                                      isPOS && "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 animate-pulse"
                                    )}
                                  >
                                    {badgeValue}
                                  </Badge>
                                )}
                                
                                {/* Icône de verrouillage si pas accès */}
                                {!hasAccess && requiredPlan && (
                                  <div className="flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-muted-foreground" />
                                    <Badge 
                                      className={cn(
                                        "text-[8px] px-1 py-0 h-4 text-white flex-shrink-0",
                                        PLAN_BADGE_COLORS[requiredPlan] || 'bg-gray-500'
                                      )}
                                    >
                                      {PLAN_DISPLAY_NAMES[requiredPlan] || requiredPlan}
                                    </Badge>
                                  </div>
                                )}
                                
                                {active && hasAccess && (
                                  <ChevronRight className="w-3 h-3 text-primary/60 flex-shrink-0" />
                                )}
                              </>
                            )}
                            
                            {/* Badge en mode collapsed */}
                            {collapsed && !hasAccess && (
                              <Lock className="absolute -top-1 -right-1 w-3 h-3 text-muted-foreground bg-background rounded-full p-0.5" />
                            )}
                            
                            {collapsed && badgeValue && hasAccess && (
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

                      // Tooltip pour les items verrouillés en mode collapsed
                      if (collapsed && !hasAccess) {
                        return (
                          <Tooltip key={item.path}>
                            <TooltipTrigger asChild>
                              {menuItem}
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Requiert {PLAN_DISPLAY_NAMES[requiredPlan || ''] || 'un abonnement supérieur'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return menuItem;
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </ScrollArea>
      </Sidebar>

      {/* Dialog d'upgrade */}
      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        feature={targetFeature}
        moduleName={targetModuleName}
      />
    </TooltipProvider>
  );
}
