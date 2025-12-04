import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Wallet,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Shield,
  Bell,
  Menu,
  X,
  FileText,
  TrendingUp,
  BarChart3,
  Search,
  Moon,
  Sun,
  HelpCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AgentLayoutProfessionalProps {
  children: ReactNode;
  agent: {
    id: string;
    name: string;
    email: string;
    agent_code: string;
    type_agent?: string;
    is_active: boolean;
    commission_rate: number;
    can_create_sub_agent?: boolean;
  };
  activeTab: string;
  onTabChange: (tab: string) => void;
  walletBalance?: number;
  stats?: {
    totalUsersCreated: number;
    totalCommissions: number;
  };
  onSignOut: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
  color?: string;
  disabled?: boolean;
}

export function AgentLayoutProfessional({
  children,
  agent,
  activeTab,
  onTabChange,
  walletBalance = 0,
  stats,
  onSignOut
}: AgentLayoutProfessionalProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: 'text-blue-600'
    },
    {
      id: 'wallet',
      label: 'Portefeuille',
      icon: <Wallet className="w-5 h-5" />,
      color: 'text-emerald-600'
    },
    {
      id: 'create-user',
      label: 'Créer Utilisateur',
      icon: <UserPlus className="w-5 h-5" />,
      color: 'text-violet-600'
    },
    {
      id: 'sub-agents',
      label: 'Sous-Agents',
      icon: <Users className="w-5 h-5" />,
      color: 'text-orange-600',
      badge: agent.can_create_sub_agent ? undefined : 'Premium',
      disabled: !agent.can_create_sub_agent
    },
    {
      id: 'reports',
      label: 'Rapports & Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-indigo-600'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      color: 'text-slate-600'
    }
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      darkMode 
        ? "bg-slate-900" 
        : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30"
    )}>
      {/* Sidebar Desktop */}
      <aside className={cn(
        "hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-72",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200",
        "border-r shadow-xl"
      )}>
        {/* Logo & Brand */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl blur opacity-50"></div>
                <div className="relative p-2.5 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className={cn(
                  "font-bold text-lg",
                  darkMode ? "text-white" : "text-slate-900"
                )}>
                  Agent Pro
                </h1>
                <p className="text-xs text-slate-500">v2.0</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              sidebarCollapsed && "mx-auto"
            )}
          >
            {sidebarCollapsed ? (
              <Menu className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Agent Profile Card */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-blue-500/20">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-white font-semibold">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-semibold truncate",
                  darkMode ? "text-white" : "text-slate-900"
                )}>
                  {agent.name}
                </h3>
                <p className="text-xs text-slate-500 truncate">{agent.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {agent.agent_code}
                  </Badge>
                  <Badge 
                    variant={agent.is_active ? "default" : "destructive"}
                    className="text-xs px-2 py-0.5"
                  >
                    {agent.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 p-3 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-slate-800 dark:to-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Solde Wallet
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(walletBalance)}
              </p>
              {stats && stats.totalUsersCreated > 0 && (
                <p className="text-xs text-emerald-600 mt-1">
                  {stats.totalUsersCreated} utilisateurs créés
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isDisabled = item.disabled;

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-11 transition-all duration-200",
                    sidebarCollapsed ? "px-3" : "px-4",
                    isActive && !isDisabled && [
                      "bg-gradient-to-r from-blue-600 to-violet-600",
                      "text-white shadow-lg shadow-blue-500/25",
                      "hover:from-blue-700 hover:to-violet-700"
                    ],
                    !isActive && !isDisabled && [
                      darkMode ? "hover:bg-slate-800" : "hover:bg-slate-100",
                      darkMode ? "text-slate-300" : "text-slate-700"
                    ],
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !isDisabled && onTabChange(item.id)}
                  disabled={isDisabled}
                >
                  <span className={cn(
                    isActive && !isDisabled ? "text-white" : item.color
                  )}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">
                        {item.label}
                      </span>
                      {item.badge && (
                        <Badge 
                          variant={isActive ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {!sidebarCollapsed && (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="font-medium">
                  {darkMode ? 'Mode Clair' : 'Mode Sombre'}
                </span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Aide & Support</span>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={onSignOut}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="font-medium">Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 transform transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        darkMode ? "bg-slate-900" : "bg-white",
        "shadow-2xl"
      )}>
        {/* Mobile content - Same as desktop but always expanded */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-bold text-lg text-slate-900">Agent Pro</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 border-b border-slate-200">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                <p className="text-xs text-slate-500">{agent.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {agent.agent_code}
                </Badge>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3",
                    activeTab === item.id && "bg-blue-600 text-white"
                  )}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  disabled={item.disabled}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                </Button>
              ))}
            </nav>
          </ScrollArea>

          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600"
              onClick={onSignOut}
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}>
        {/* Top Bar */}
        <header className={cn(
          "sticky top-0 z-30 h-16 border-b backdrop-blur-lg transition-colors",
          darkMode 
            ? "bg-slate-900/95 border-slate-800" 
            : "bg-white/95 border-slate-200"
        )}>
          <div className="flex items-center justify-between h-full px-6">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-4 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Rechercher utilisateurs, transactions..."
                  className={cn(
                    "pl-10 border-slate-200",
                    darkMode && "bg-slate-800 border-slate-700"
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative hidden lg:flex">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Button>
              
              <div className="hidden lg:block">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-violet-600 text-white text-sm">
                    {getInitials(agent.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
