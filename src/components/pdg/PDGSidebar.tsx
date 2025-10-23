/**
 * 🎨 SIDEBAR PDG ULTRA PROFESSIONNELLE
 * Sidebar moderne avec navigation catégorisée
 */

import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DollarSign, Users, Shield, Settings, Package, Wrench,
  UserCheck, Building2, BarChart3, Brain, MessageSquare, Key, Zap,
  Sparkles, Home
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  icon: React.ElementType;
  items: NavItem[];
}

const categories: NavCategory[] = [
  {
    title: 'Vue d\'ensemble',
    color: 'text-blue-500',
    icon: Home,
    items: [
      { value: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
    ]
  },
  {
    title: 'Gestion',
    color: 'text-blue-500',
    icon: DollarSign,
    items: [
      { value: 'finance', label: 'Finances', icon: DollarSign },
      { value: 'users', label: 'Utilisateurs', icon: Users },
      { value: 'products', label: 'Produits', icon: Package },
    ]
  },
  {
    title: 'Opérations',
    color: 'text-green-500',
    icon: UserCheck,
    items: [
      { value: 'agents', label: 'Agents', icon: UserCheck },
      { value: 'syndicat', label: 'Bureaux Syndicaux', icon: Building2 },
      { value: 'communication', label: 'Communication', icon: MessageSquare },
    ]
  },
  {
    title: 'Système',
    color: 'text-purple-500',
    icon: Shield,
    items: [
      { value: 'security', label: 'Sécurité', icon: Shield },
      { value: 'config', label: 'Configuration', icon: Settings },
      { value: 'maintenance', label: 'Maintenance', icon: Wrench },
      { value: 'api', label: 'Supervision API', icon: Key },
    ]
  },
  {
    title: 'Intelligence',
    color: 'text-pink-500',
    icon: Brain,
    items: [
      { value: 'ai-assistant', label: 'Assistant IA', icon: Brain, badge: true },
      { value: 'copilot', label: 'Copilote IA', icon: MessageSquare },
      { value: 'reports', label: 'Rapports', icon: BarChart3 },
    ]
  }
];

interface PDGSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  aiActive?: boolean;
}

export function PDGSidebar({ activeTab, onTabChange, aiActive }: PDGSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const isActive = (value: string) => activeTab === value;

  return (
    <Sidebar className="border-r border-border/40 bg-card/50 backdrop-blur-xl">
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "relative transition-all duration-300",
            collapsed ? "w-8 h-8" : "w-10 h-10"
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 blur-lg opacity-50" />
            <div className="relative bg-gradient-to-br from-primary to-primary/80 p-2 rounded-xl shadow-lg flex items-center justify-center">
              <Shield className="w-full h-full text-primary-foreground" />
            </div>
          </div>
          {!collapsed && (
            <div className="flex-1 animate-fade-in">
              <h2 className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                PDG Dashboard
              </h2>
              <p className="text-xs text-muted-foreground">224Solutions</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {categories.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <SidebarGroup key={category.title}>
              <SidebarGroupLabel className={cn(
                "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2",
                category.color
              )}>
                <CategoryIcon className="w-3.5 h-3.5" />
                {!collapsed && category.title}
              </SidebarGroupLabel>
              
              <SidebarGroupContent>
                <SidebarMenu>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.value);
                    
                    return (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          onClick={() => {
                            onTabChange(item.value);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={cn(
                            "relative group transition-all duration-200",
                            active && "bg-primary text-primary-foreground shadow-md font-medium"
                          )}
                          tooltip={collapsed ? item.label : undefined}
                        >
                          {/* Effet de brillance pour l'item actif */}
                          {active && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer rounded-md" />
                          )}
                          
                          <Icon className={cn(
                            "w-4 h-4 transition-transform group-hover:scale-110 relative z-10",
                            active && "animate-pulse"
                          )} />
                          
                          {!collapsed && (
                            <>
                              <span className="relative z-10">{item.label}</span>
                              {item.badge && aiActive && (
                                <Badge variant="secondary" className="ml-auto bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                                  <Zap className="w-3 h-3" />
                                </Badge>
                              )}
                              {active && (
                                <div className="ml-auto w-2 h-2 rounded-full bg-current animate-pulse relative z-10" />
                              )}
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
