/**
 * SIDEBAR AGENT - 224SOLUTIONS
 * Navigation latérale professionnelle pour l'interface agent
 */

import { useState } from 'react';
import { 
  Wallet, Users, UserPlus, UserCog, BarChart3, 
  DollarSign, Package, Home, ChevronLeft, ChevronRight,
  Key, LogOut, Shield, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AgentSidebarProps {
  agent: {
    name: string;
    agent_code: string;
    type_agent?: string;
    is_active: boolean;
    permissions: string[];
    can_create_sub_agent?: boolean;
  };
  activeSection: string;
  onSectionChange: (section: string) => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  badge?: string;
  gradient?: string;
}

export default function AgentSidebar({
  agent,
  activeSection,
  onSectionChange,
  onChangePassword,
  onLogout
}: AgentSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { 
      id: 'overview', 
      label: 'Tableau de bord', 
      icon: Home,
      gradient: 'from-blue-500 to-indigo-500'
    },
    { 
      id: 'wallet', 
      label: 'Wallet', 
      icon: Wallet,
      gradient: 'from-emerald-500 to-teal-500'
    },
    { 
      id: 'create-user', 
      label: 'Créer Utilisateur', 
      icon: UserPlus,
      permission: 'create_users',
      gradient: 'from-green-500 to-lime-500'
    },
    { 
      id: 'sub-agents', 
      label: 'Sous-Agents', 
      icon: UserCog,
      permission: 'create_sub_agents',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      id: 'users', 
      label: 'Utilisateurs', 
      icon: Users,
      permission: 'manage_users',
      gradient: 'from-orange-500 to-amber-500'
    },
    { 
      id: 'products', 
      label: 'Produits', 
      icon: Package,
      permission: 'manage_products',
      gradient: 'from-cyan-500 to-blue-500'
    },
    { 
      id: 'reports', 
      label: 'Rapports', 
      icon: BarChart3,
      permission: 'view_reports',
      gradient: 'from-violet-500 to-purple-500'
    },
    { 
      id: 'commissions', 
      label: 'Commissions', 
      icon: DollarSign,
      permission: 'manage_commissions',
      gradient: 'from-yellow-500 to-orange-500'
    }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    if (item.id === 'sub-agents') {
      return agent.can_create_sub_agent || agent.permissions.includes('create_sub_agents');
    }
    return agent.permissions.includes(item.permission);
  });

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl transition-all duration-300 z-40 flex flex-col",
          collapsed ? "w-20" : "w-72",
          "lg:relative lg:translate-x-0",
          collapsed ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-4 border-b border-slate-700/50",
          collapsed ? "px-2" : ""
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg",
              collapsed ? "w-12 h-12" : "w-14 h-14"
            )}>
              <Shield className={cn("text-white", collapsed ? "w-6 h-6" : "w-8 h-8")} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">{agent.name}</h2>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-slate-700/50 px-2 py-0.5 rounded text-blue-300">
                    {agent.agent_code}
                  </code>
                </div>
                {agent.type_agent && (
                  <p className="text-xs text-slate-400 mt-1 truncate">{agent.type_agent}</p>
                )}
              </div>
            )}
          </div>
          
          {!collapsed && (
            <Badge 
              variant={agent.is_active ? "default" : "secondary"} 
              className={cn(
                "mt-3 w-full justify-center",
                agent.is_active ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : ""
              )}
            >
              {agent.is_active ? '✅ Agent Actif' : '⏸️ Inactif'}
            </Badge>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg` 
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center rounded-lg transition-all",
                  isActive ? "bg-white/20" : "bg-slate-700/50 group-hover:bg-slate-600/50",
                  collapsed ? "w-10 h-10" : "w-10 h-10"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                {!collapsed && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-700/50 space-y-2">
          <Button
            variant="ghost"
            onClick={onChangePassword}
            className={cn(
              "w-full justify-start text-slate-300 hover:text-white hover:bg-slate-700/50",
              collapsed ? "px-3" : ""
            )}
          >
            <Key className="w-5 h-5" />
            {!collapsed && <span className="ml-3">Mot de passe</span>}
          </Button>

          <Button
            variant="ghost"
            onClick={onLogout}
            className={cn(
              "w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10",
              collapsed ? "px-3" : ""
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="ml-3">Déconnexion</span>}
          </Button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-700 rounded-full items-center justify-center text-slate-300 hover:text-white hover:bg-slate-600 shadow-lg border border-slate-600"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {!collapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
