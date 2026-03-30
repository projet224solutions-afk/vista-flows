/**
 * SIDEBAR VENDEUR DIGITAL - Interface dédiée produits numériques & affiliations
 * Uniquement les fonctionnalités pertinentes pour le vendeur digital
 */

import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Laptop, Link, Wallet, Settings,
  BarChart3, Home, Plus, Eye, ShoppingBag, Bot
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
        { title: "Copilote IA", icon: Bot, path: "copilot" },
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
        { title: "Mes Achats", icon: ShoppingBag, path: "my-purchases" },
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
      collapsed ? "w-[78px]" : "w-[290px]",
      "border-r border-[#d9e5fb] bg-white/92 shadow-[0_20px_60px_rgba(4,67,158,0.08)] backdrop-blur-xl"
    )} collapsible="icon">
      <ScrollArea className="h-full overflow-visible">
        <SidebarContent className="bg-[linear-gradient(180deg,_rgba(4,67,158,0.05)_0%,_rgba(255,255,255,0.98)_18%,_rgba(255,255,255,1)_100%)] py-4 pr-0 pb-28">
          {/* Logo / Brand */}
          <div className={cn("px-3", collapsed ? "mb-3" : "mb-5")}>
            <div className={cn(
              "rounded-[24px] border border-[#d6e2f7] bg-white shadow-[0_18px_40px_rgba(4,67,158,0.08)]",
              collapsed ? "px-2 py-3" : "px-4 py-4"
            )}>
              <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#04439e_0%,#0d5ed2_100%)] shadow-[0_10px_24px_rgba(4,67,158,0.28)]">
                  <Laptop className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold tracking-[0.02em] text-[#0b1b33]">224Solutions Digital</h2>
                    <p className="mt-1 text-xs text-slate-500">{publishedCount} produit{publishedCount !== 1 ? 's' : ''} publié{publishedCount !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
              {!collapsed && (
                <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-[#f6f9ff] px-3 py-2.5">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6f89b7]">Catalogue actif</p>
                    <p className="text-sm font-semibold text-[#04439e]">{products.length} références digitales</p>
                  </div>
                  <Badge className="border-0 bg-[#ff4000]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ff4000] shadow-none">
                    {affiliateCount} affiliés
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {menuSections.map((section, sectionIndex) => (
            <SidebarGroup key={section.label} className="py-1.5 px-2">
              {!collapsed && (
                <SidebarGroupLabel className="px-4 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6f89b7]">
                  {section.label}
                </SidebarGroupLabel>
              )}

              {collapsed && sectionIndex > 0 && (
                <div className="mx-3 my-3 h-px bg-[#dce7fb]" />
              )}

              <SidebarGroupContent>
                <SidebarMenu className="space-y-1 px-1">
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
                            "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200 cursor-pointer select-none",
                            "text-slate-600 hover:bg-[#f3f7ff] hover:text-[#04439e]",
                            active && "bg-[linear-gradient(135deg,rgba(4,67,158,0.12),rgba(4,67,158,0.04))] text-[#04439e] font-semibold shadow-[inset_0_0_0_1px_rgba(4,67,158,0.14)]",
                            collapsed && "justify-center px-2"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center rounded-xl w-9 h-9 transition-all flex-shrink-0",
                            active ? "bg-[#04439e] text-white shadow-[0_10px_24px_rgba(4,67,158,0.20)]" : "bg-[#f5f8fe] text-[#6d7f9d] group-hover:bg-white"
                          )}>
                            <item.icon className={cn(
                              "w-4 h-4 transition-colors",
                              active ? "text-white" : "text-current"
                            )} />
                          </div>

                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left leading-tight">{item.title}</span>
                              {item.badge && (
                                <Badge className={cn(
                                  "h-6 min-w-[30px] flex items-center justify-center rounded-full border-0 px-2.5 py-0.5 text-[11px] font-semibold shadow-none",
                                  active ? "bg-[#ff4000] text-white" : "bg-[#eaf1fd] text-[#04439e]"
                                )}>
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
            <div className="px-3 mt-5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate('/home')}
                className="flex items-center gap-2 rounded-2xl border border-[#e4ecfb] bg-[#f8fbff] px-3 py-3 text-sm font-medium text-slate-600 transition-colors cursor-pointer hover:text-[#04439e] hover:bg-white"
              >
                <Home className="w-4 h-4" />
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
