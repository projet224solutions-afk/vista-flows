/**
 * 🎨 NAVIGATION PDG - INTERFACE ORGANISÉE
 * Navigation par catégories pour une meilleure lisibilité
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, Users, Shield, Settings, Package, Wrench,
  UserCheck, Building2, BarChart3, Brain, MessageSquare, Key, Zap,
  ChevronDown, ChevronUp, Sparkles, Percent, Store, Bike
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  value: string;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
}

interface NavCategory {
  title: string;
  color: string;
  items: NavItem[];
}

const categories: NavCategory[] = [
  {
    title: 'Gestion',
    color: 'from-blue-500 to-blue-600',
    items: [
      { value: 'finance', label: 'Finances', icon: DollarSign },
      { value: 'revenue-analytics', label: '💼 Revenus PDG', icon: BarChart3 },
      { value: 'subscriptions', label: '🎯 Abonnements', icon: Sparkles },
      { value: 'users', label: 'Utilisateurs', icon: Users },
      { value: 'products', label: 'Produits', icon: Package },
      { value: 'transfer-fees', label: 'Frais de Transfert', icon: Percent },
    ]
  },
  {
    title: 'Opérations',
    color: 'from-green-500 to-green-600',
    items: [
      { value: 'agents', label: 'Agents', icon: UserCheck },
      { value: 'syndicat', label: 'Bureaux Syndicaux', icon: Building2 },
      { value: 'orders', label: 'Commandes', icon: Package },
      { value: 'vendors', label: 'Vendeurs', icon: Store },
      { value: 'drivers', label: 'Livreurs', icon: Bike },
      { value: 'communication', label: 'Communication', icon: MessageSquare },
    ]
  },
  {
    title: 'Système',
    color: 'from-purple-500 to-purple-600',
    items: [
      { value: 'security', label: 'Sécurité', icon: Shield },
      { value: 'config', label: 'Configuration', icon: Settings },
      { value: 'maintenance', label: 'Maintenance', icon: Wrench },
      { value: 'api', label: 'API', icon: Key },
    ]
  },
  {
    title: 'Intelligence',
    color: 'from-pink-500 to-pink-600',
    items: [
      { value: 'ai-assistant', label: 'Assistant IA', icon: Brain, badge: true },
      { value: 'copilot', label: 'Copilote IA', icon: MessageSquare },
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  // Auto-expand la catégorie active au chargement
  useState(() => {
    const activeCategory = categories.find(cat => 
      cat.items.some(item => item.value === activeTab)
    );
    if (activeCategory) {
      setExpandedCategory(activeCategory.title);
    }
  });

  // Trouver la catégorie active
  const activeCategory = categories.find(cat => 
    cat.items.some(item => item.value === activeTab)
  );

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
                        onClick={() => {
                          onTabChange(item.value);
                          // Auto-scroll vers le haut après changement d'onglet
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
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
                  {categories
                    .flatMap(c => c.items)
                    .find(item => item.value === activeTab)?.label}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
