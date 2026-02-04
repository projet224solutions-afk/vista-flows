/**
 * 🎨 NAVIGATION PDG - INTERFACE ORGANISÉE
 * Navigation par catégories avec version mobile optimisée
 * Filtrage automatique selon les permissions de l'utilisateur
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign, Users, Shield, Settings, Package, Wrench,
  UserCheck, Building2, BarChart3, Brain, MessageSquare, Key, Zap,
  ChevronDown, ChevronUp, Sparkles, Percent, Store, Bike, FileText, Landmark,
  Menu, ChevronRight, Car, Lock, RefreshCw, Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCurrentUserPermissions, PermissionKey } from '@/hooks/useCurrentUserPermissions';

interface NavItem {
  value: string;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
  external?: string;
  permission?: PermissionKey; // Permission requise pour voir cet item
}

interface NavCategory {
  title: string;
  color: string;
  bgColor: string;
  items: NavItem[];
}

const categories: NavCategory[] = [
  {
    title: 'Finance',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500',
    items: [
      { value: 'finance', label: 'Finance & Revenus', icon: DollarSign, permission: 'view_finance' },
      { value: 'banking', label: 'Système Bancaire', icon: Landmark, badge: true, permission: 'view_banking' },
    ]
  },
  {
    title: 'Gestion',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    items: [
      { value: 'users', label: 'Utilisateurs', icon: Users, permission: 'view_users' },
      { value: 'products', label: 'Produits', icon: Package, permission: 'view_products' },
      { value: 'transfer-fees', label: 'Frais de Transfert', icon: Percent, permission: 'view_transfer_fees' },
      { value: 'kyc', label: 'Gestion KYC', icon: Shield, permission: 'view_kyc' },
      { value: 'service-subscriptions', label: 'Abonnements Services', icon: Sparkles, badge: true, permission: 'view_service_subscriptions' },
    ]
  },
  {
    title: 'Opérations',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500',
    items: [
      { value: 'agents', label: 'Agents', icon: UserCheck, permission: 'view_agents' },
      { value: 'syndicat', label: 'Bureaux Syndicaux', icon: Building2, permission: 'view_syndicat' },
      { value: 'bureau-monitoring', label: 'Monitoring Bureaux', icon: Car, badge: true, permission: 'view_bureau_monitoring' },
      { value: 'driver-subscriptions', label: 'Abonnements Chauffeurs', icon: Bike, permission: 'view_driver_subscriptions' },
      { value: 'stolen-vehicles', label: 'Motos Volées', icon: Shield, badge: true, permission: 'view_stolen_vehicles' },
      { value: 'orders', label: 'Commandes', icon: Package, permission: 'view_orders' },
      { value: 'vendors', label: 'Vendeurs', icon: Store, permission: 'view_vendors' },
      { value: 'vendor-kyc-review', label: 'Vérification KYC', icon: Shield, badge: true, permission: 'view_vendor_kyc' },
      { value: 'vendor-certification', label: 'Certification Vendeurs', icon: Shield, badge: true, permission: 'view_vendor_certification' },
      { value: 'drivers', label: 'Livreurs', icon: Bike, permission: 'view_drivers' },
      { value: 'quotes-invoices', label: 'Devis & Factures', icon: FileText, permission: 'view_quotes_invoices' },
      { value: 'communication', label: 'Communication', icon: MessageSquare, permission: 'access_communication' },
      { value: 'broadcast-center', label: '📢 Diffusion Globale', icon: Megaphone, badge: true, permission: 'manage_broadcasts' },
      { value: 'agent-wallet-audit', label: 'Audit Wallet Agents', icon: Shield, permission: 'view_agent_wallet_audit' },
    ]
  },
  {
    title: 'Système',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500',
    items: [
      { value: 'security', label: 'Sécurité', icon: Shield, permission: 'view_security' },
      { value: 'logic-surveillance', label: 'Surveillance Logique', icon: Zap, badge: true, permission: 'view_debug' },
      { value: 'sync-dashboard', label: 'Synchronisation', icon: RefreshCw, badge: true, permission: 'view_debug' },
      { value: 'id-normalization', label: 'Audit ID', icon: Shield, badge: true, permission: 'view_id_normalization' },
      { value: 'deleted-users-restore', label: '🔄 Restauration', icon: RefreshCw, badge: true, permission: 'view_security' },
      { value: 'bug-bounty', label: 'Bug Bounty', icon: Shield, permission: 'view_bug_bounty' },
      { value: 'config', label: 'Configuration', icon: Settings, permission: 'view_config' },
      { value: 'maintenance', label: 'Maintenance', icon: Wrench, permission: 'view_maintenance' },
      { value: 'api', label: 'API', icon: Key, permission: 'view_api' },
      { value: 'debug', label: 'Debug & Surveillance', icon: Zap, badge: true, permission: 'view_debug' },
    ]
  },
  {
    title: 'Intelligence',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500',
    items: [
      { value: 'ai-assistant', label: 'Assistant IA', icon: Brain, badge: true, permission: 'access_ai_assistant' },
      { value: 'copilot', label: 'Copilote IA', icon: MessageSquare, permission: 'access_copilot' },
      { value: 'copilot-dashboard', label: 'Copilote Executive', icon: MessageSquare, badge: true, external: '/pdg/copilot', permission: 'access_copilot_dashboard' },
      { value: 'copilot-audit', label: 'Audit Copilote', icon: Shield, permission: 'view_copilot_audit' },
      { value: 'reports', label: 'Rapports', icon: BarChart3, permission: 'view_reports' },
    ]
  }
];

interface PDGNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  aiActive?: boolean;
}

export default function PDGNavigation({ activeTab, onTabChange, aiActive }: PDGNavigationProps) {
  const isMobile = useIsMobile();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasPermission, isPDG, isAgent, loading: permissionsLoading } = useCurrentUserPermissions();

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  // Filtrer les catégories et items selon les permissions de l'utilisateur
  const filteredCategories = useMemo(() => {
    // PDG a accès à tout
    if (isPDG) return categories;

    // Filtrer les items selon les permissions de l'agent
    return categories
      .map(category => ({
        ...category,
        items: category.items.filter(item => {
          // Si pas de permission requise, l'item est accessible
          if (!item.permission) return true;
          // Vérifier la permission
          return hasPermission(item.permission);
        })
      }))
      .filter(category => category.items.length > 0); // Exclure les catégories vides
  }, [isPDG, hasPermission]);

  // Auto-expand la catégorie active au chargement
  useEffect(() => {
    const activeCategory = filteredCategories.find(cat =>
      cat.items.some(item => item.value === activeTab)
    );

    if (activeCategory) {
      setExpandedCategory(activeCategory.title);
      return;
    }

    // Quand on est sur un onglet non listé (ex: dashboard), ouvrir la première catégorie disponible
    if (activeTab === 'dashboard' && filteredCategories.length > 0) {
      setExpandedCategory(filteredCategories[0].title);
    }
  }, [activeTab, filteredCategories]);

  // Trouver la catégorie et l'item actifs (dans les catégories filtrées)
  const activeCategory = filteredCategories.find(cat =>
    cat.items.some(item => item.value === activeTab)
  );
  const activeItem = filteredCategories.flatMap(c => c.items).find(item => item.value === activeTab);

  const handleItemClick = (value: string, externalUrl?: string) => {
    // Si c'est une URL externe, naviguer directement
    if (externalUrl) {
      window.location.href = externalUrl;
      return;
    }
    onTabChange(value);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Version Mobile - Menu Sheet
  if (isMobile) {
    return (
      <div className="space-y-3 w-full overflow-hidden">
        {/* Bouton menu + navigation actuelle */}
        <div className="flex items-center gap-2 w-full">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 flex-1 justify-between h-12 px-3 min-w-0"
              >
                <div className="flex items-center gap-2">
                  <Menu className="w-4 h-4" />
                  <div className="flex items-center gap-2">
                    {activeCategory && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium text-white",
                        activeCategory.bgColor
                      )}>
                        {activeCategory.title}
                      </span>
                    )}
                    <span className="font-medium text-sm truncate max-w-[120px]">
                      {activeItem?.label || 'Menu'}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] p-0">
              <SheetHeader className="px-4 py-3 border-b bg-muted/30">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Navigation PDG
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(85vh-60px)]">
                <div className="p-3 space-y-2">
                  {filteredCategories.map((category) => {
                    const isExpanded = expandedCategory === category.title;
                    const hasActiveItem = category.items.some(item => item.value === activeTab);
                    
                    return (
                      <div key={category.title} className="space-y-1">
                        {/* Header catégorie */}
                        <button
                          onClick={() => toggleCategory(category.title)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                            "bg-gradient-to-r text-white font-medium",
                            category.color,
                            hasActiveItem && "ring-2 ring-primary ring-offset-2"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{category.title}</span>
                            {hasActiveItem && (
                              <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                Actif
                              </Badge>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* Items de la catégorie */}
                        {isExpanded && (
                          <div className="pl-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                            {category.items.map((item) => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.value;
                              
                              return (
                                <button
                                  key={item.value}
                                  onClick={() => handleItemClick(item.value, item.external)}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                                    "hover:bg-muted/80 active:scale-[0.98]",
                                    isActive && "bg-primary text-primary-foreground shadow-md"
                                  )}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
                                  {item.badge && aiActive && (
                                    <Zap className="w-3 h-3 text-yellow-500" />
                                  )}
                                  {isActive && (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Si aucune section n'est visible (permissions en cours/incorrectes), afficher un hint */}
        {filteredCategories.length === 0 && !permissionsLoading && (
          <Card>
            <CardContent className="p-3 text-sm text-muted-foreground">
              Aucune section disponible. Vérifiez le rôle/permissions de ce compte.
            </CardContent>
          </Card>
        )}

        {/* Accès rapide catégories - horizontal scroll */}
        <div className="flex flex-wrap gap-2 pb-2 w-full px-0.5">
          {filteredCategories.map((category) => {
            const hasActiveItem = category.items.some(item => item.value === activeTab);
            return (
              <button
                key={category.title}
                onClick={() => {
                  setExpandedCategory(category.title);
                  setMobileMenuOpen(true);
                }}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  "bg-gradient-to-r text-white",
                  category.color,
                  hasActiveItem && "ring-2 ring-offset-1 ring-primary"
                )}
              >
                {category.title}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Version Desktop - Grille de cartes
  return (
    <div className="space-y-4">
      {/* Navigation compacte en grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCategories.map((category) => {
          const isExpanded = expandedCategory === category.title;
          const hasActiveItem = category.items.some(item => item.value === activeTab);
          
          return (
            <Card 
              key={category.title}
              className={cn(
                "overflow-hidden transition-all duration-300 hover:shadow-xl",
                hasActiveItem && "ring-2 ring-primary shadow-lg"
              )}
            >
              {/* En-tête de catégorie */}
              <div
                className={cn(
                  "bg-gradient-to-br p-4 cursor-pointer flex items-center justify-between",
                  "hover:shadow-lg transition-all duration-300 relative overflow-hidden",
                  category.color
                )}
                onClick={() => toggleCategory(category.title)}
              >
                {/* Effet de brillance au survol */}
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                
                <div className="flex items-center gap-2 relative z-10">
                  <h3 className="font-bold text-white text-lg">{category.title}</h3>
                  {hasActiveItem && (
                    <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Actif
                    </Badge>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-white animate-bounce relative z-10" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white relative z-10" />
                )}
              </div>

              {/* Items de navigation */}
              <CardContent 
                className={cn(
                  "p-2 transition-all duration-300",
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                )}
              >
                <div className="space-y-1">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.value;
                    
                    return (
                      <button
                        key={item.value}
                        onClick={() => handleItemClick(item.value, item.external)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          "hover:bg-muted/80 hover:scale-105 group relative overflow-hidden",
                          isActive && "bg-primary text-primary-foreground shadow-md scale-105"
                        )}
                      >
                        {/* Effet de brillance pour l'item actif */}
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        )}
                        
                        <Icon className={cn(
                          "w-4 h-4 transition-transform group-hover:scale-110 relative z-10",
                          isActive && "animate-pulse"
                        )} />
                        <span className="font-medium text-sm relative z-10">{item.label}</span>
                        {item.badge && aiActive && (
                          <Zap className="w-3 h-3 ml-auto text-yellow-500 animate-pulse relative z-10" />
                        )}
                        {isActive && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-current animate-pulse relative z-10" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Barre de navigation rapide (breadcrumb style) */}
      <Card className="bg-gradient-to-r from-muted/30 to-muted/50 backdrop-blur-sm border-primary/20">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground font-medium">Navigation:</span>
            {activeCategory && (
              <>
                <span className={cn(
                  "px-3 py-1 rounded-full font-medium bg-gradient-to-r text-white shadow-md",
                  activeCategory.color,
                  "hover:shadow-lg transition-shadow"
                )}>
                  {activeCategory.title}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold text-foreground px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  {activeItem?.label}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
