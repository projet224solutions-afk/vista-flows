/**
 * 🎨 NAVIGATION PDG - INTERFACE ORGANISÉE
 * Navigation par catégories avec version mobile optimisée
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, Users, Shield, Settings, Package, Wrench,
  UserCheck, Building2, BarChart3, Brain, MessageSquare, Key, Zap,
  ChevronDown, ChevronUp, Sparkles, Percent, Store, Bike, FileText, Landmark,
  Menu, ChevronRight, Car
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  value: string;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
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
      { value: 'finance', label: 'Finance & Revenus', icon: DollarSign },
      { value: 'banking', label: 'Système Bancaire', icon: Landmark, badge: true },
    ]
  },
  {
    title: 'Gestion',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    items: [
      { value: 'users', label: 'Utilisateurs', icon: Users },
      { value: 'products', label: 'Produits', icon: Package },
      { value: 'transfer-fees', label: 'Frais de Transfert', icon: Percent },
      { value: 'kyc', label: 'Gestion KYC', icon: Shield },
    ]
  },
  {
    title: 'Opérations',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500',
    items: [
      { value: 'agents', label: 'Agents', icon: UserCheck },
      { value: 'syndicat', label: 'Bureaux Syndicaux', icon: Building2 },
      { value: 'stolen-vehicles', label: 'Motos Volées', icon: Shield, badge: true },
      { value: 'orders', label: 'Commandes', icon: Package },
      { value: 'vendors', label: 'Vendeurs', icon: Store },
      { value: 'drivers', label: 'Livreurs', icon: Bike },
      { value: 'quotes-invoices', label: 'Devis & Factures', icon: FileText },
      { value: 'communication', label: 'Communication', icon: MessageSquare },
      { value: 'agent-wallet-audit', label: 'Audit Wallet Agents', icon: Shield },
    ]
  },
  {
    title: 'Système',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500',
    items: [
      { value: 'security', label: 'Sécurité', icon: Shield },
      { value: 'bug-bounty', label: 'Bug Bounty', icon: Shield },
      { value: 'config', label: 'Configuration', icon: Settings },
      { value: 'maintenance', label: 'Maintenance', icon: Wrench },
      { value: 'api', label: 'API', icon: Key },
      { value: 'debug', label: 'Debug & Surveillance', icon: Zap, badge: true },
    ]
  },
  {
    title: 'Intelligence',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500',
    items: [
      { value: 'ai-assistant', label: 'Assistant IA', icon: Brain, badge: true },
      { value: 'copilot', label: 'Copilote IA', icon: MessageSquare },
      { value: 'copilot-audit', label: 'Audit Copilote', icon: Shield },
      { value: 'reports', label: 'Rapports', icon: BarChart3 },
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

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  // Auto-expand la catégorie active au chargement
  useEffect(() => {
    const activeCategory = categories.find(cat => 
      cat.items.some(item => item.value === activeTab)
    );
    if (activeCategory) {
      setExpandedCategory(activeCategory.title);
    }
  }, [activeTab]);

  // Trouver la catégorie et l'item actifs
  const activeCategory = categories.find(cat => 
    cat.items.some(item => item.value === activeTab)
  );
  const activeItem = categories.flatMap(c => c.items).find(item => item.value === activeTab);

  const handleItemClick = (value: string) => {
    onTabChange(value);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Version Mobile - Menu Sheet
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Bouton menu + navigation actuelle */}
        <div className="flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 flex-1 justify-between h-12 px-3"
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
                  {categories.map((category) => {
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
                                  onClick={() => handleItemClick(item.value)}
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

        {/* Accès rapide catégories - horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((category) => {
            const hasActiveItem = category.items.some(item => item.value === activeTab);
            return (
              <button
                key={category.title}
                onClick={() => {
                  setExpandedCategory(category.title);
                  setMobileMenuOpen(true);
                }}
                className={cn(
                  "flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all",
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
        {categories.map((category) => {
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
                        onClick={() => handleItemClick(item.value)}
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
