/**
 * SIDEBAR VENDEUR DIGITAL - Interface dédiée produits numériques & affiliations
 * Uniquement les fonctionnalités pertinentes pour le vendeur digital
 */

import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Laptop, Link, Wallet, Settings,
  BarChart3, LogOut, Home, Plus, Eye, ShoppingBag
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
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMerchantDigitalProducts } from "@/hooks/useDigitalProducts";

const DigitalVendorSidebar = memo(function DigitalVendorSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed" && !isMobile;
  const { products } = useMerchantDigitalProducts();

  const currentPath = location.pathname.replace('/vendeur-digital/', '').replace('/vendeur-digital', '') || 'dashboard';

  const isActive = (path: string) => currentPath === path;

  const handleNavigation = (path: string) => {
    navigate(`/vendeur-digital/${path}`);
    if (isMobile) setOpen(false);
  };

  const publishedCount = products.filter(p => p.status === 'published').length;
  const affiliateCount = products.filter(p => p.product_mode === 'affiliate').length;

  const menuSections = [
    {
      label: "Principal",
      items: [
        { title: "Tableau de bord", icon: LayoutDashboard, path: "dashboard" },
        { title: "Statistiques", icon: BarChart3, path: "analytics" },
      ]
    },
    {
      label: "Produits Numériques",
      items: [
        { title: "Mes Produits", icon: Laptop, path: "products", badge: products.length > 0 ? products.length.toString() : null },
        { title: "Ajouter un produit", icon: Plus, path: "add-product" },
        { title: "Marketplace", icon: Eye, path: "marketplace" },
      ]
    },
    {
      label: "Affiliation",
      items: [
        { title: "Programme Affiliation", icon: Link, path: "affiliate", badge: affiliateCount > 0 ? affiliateCount.toString() : null },
      ]
    },
    {
      label: "Finance",
      items: [
        { title: "Portefeuille", icon: Wallet, path: "wallet" },
      ]
    },
    {
      label: "Système",
      items: [
        { title: "Paramètres", icon: Settings, path: "settings" },
      ]
    },
  ];

  return (
    <Sidebar className={cn(
      collapsed ? "w-12" : "w-52",
      "border-r border-border/40 shadow-lg"
    )} collapsible="icon">
      <ScrollArea className="h-full pr-4 overflow-visible">
        <SidebarContent className="bg-gradient-to-b from-background via-background to-muted/20 py-2 pr-3 pb-96">
          {/* Logo / Brand */}
          {!collapsed && (
            <div className="px-4 py-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg flex items-center justify-center">
                  <Laptop className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Digital Store</h2>
                  <p className="text-[10px] text-muted-foreground">{publishedCount} produit{publishedCount !== 1 ? 's' : ''} publié{publishedCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}

          {menuSections.map((section, sectionIndex) => (
            <SidebarGroup key={section.label} className="py-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-4 py-1.5 mb-1">
                  {section.label}
                </SidebarGroupLabel>
              )}

              {collapsed && sectionIndex > 0 && (
                <div className="h-px bg-border/50 mx-2 my-2" />
              )}

              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5 px-2">
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.path}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNavigation(item.path)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleNavigation(item.path);
                          }}
                          className={cn(
                            "group relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all duration-200 cursor-pointer select-none",
                            "hover:bg-primary/10 hover:text-primary",
                            active && "bg-primary/15 text-primary font-medium shadow-sm",
                            collapsed && "justify-center px-1"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center rounded-md w-5 h-5 transition-all flex-shrink-0",
                            active && "bg-primary/10"
                          )}>
                            <item.icon className={cn(
                              "w-3.5 h-3.5 transition-colors",
                              active ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                            )} />
                          </div>

                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left leading-tight">{item.title}</span>
                              {item.badge && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0">
                                  {item.badge}
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

          {/* Bouton retour accueil */}
          {!collapsed && (
            <div className="px-4 mt-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate('/home')}
                className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-muted/50"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Retour à l'accueil</span>
              </div>
            </div>
          )}
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
});

export { DigitalVendorSidebar };
export default DigitalVendorSidebar;
