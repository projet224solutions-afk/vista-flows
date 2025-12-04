import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  BarChart3,
  ChevronRight,
  Zap,
  Sparkles,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  gradient?: string;
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

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Tableau de Bord',
      icon: <LayoutDashboard className="w-5 h-5" />,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'wallet',
      label: 'Portefeuille',
      icon: <Wallet className="w-5 h-5" />,
      gradient: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'create-user',
      label: 'Créer Utilisateur',
      icon: <UserPlus className="w-5 h-5" />,
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      id: 'sub-agents',
      label: 'Sous-Agents',
      icon: <Users className="w-5 h-5" />,
      gradient: 'from-orange-500 to-amber-500',
      badge: agent.can_create_sub_agent ? undefined : 'Pro',
      disabled: !agent.can_create_sub_agent
    },
    {
      id: 'reports',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings className="w-5 h-5" />,
      gradient: 'from-slate-500 to-zinc-500'
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
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <div className={cn("flex items-center gap-3", sidebarCollapsed && !isMobile && "hidden")}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-violet-500 rounded-xl blur-md opacity-60" />
            <div className="relative p-2 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">Agent Hub</h1>
            <p className="text-[10px] text-white/50 font-medium">224SOLUTIONS</p>
          </div>
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "text-white/70 hover:text-white hover:bg-white/10",
              sidebarCollapsed && "mx-auto"
            )}
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </Button>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Profile Section */}
      <div className={cn(
        "p-4 border-b border-white/10",
        sidebarCollapsed && !isMobile && "hidden"
      )}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-white/20 ring-offset-2 ring-offset-slate-900">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white font-bold">
                {getInitials(agent.name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{agent.name}</h3>
            <p className="text-xs text-white/50 truncate">{agent.email}</p>
          </div>
        </div>
        
        {/* Agent Code Badge */}
        <div className="flex items-center gap-2 mt-3">
          <Badge className="bg-white/10 text-white/90 hover:bg-white/20 border-0">
            <Zap className="w-3 h-3 mr-1 text-amber-400" />
            {agent.agent_code}
          </Badge>
          <Badge className={cn(
            "border-0",
            agent.is_active 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-red-500/20 text-red-400"
          )}>
            {agent.is_active ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        {/* Wallet Balance Card */}
        <div className="mt-4 p-3 bg-gradient-to-br from-white/5 to-white/10 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50 font-medium">Solde disponible</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{formatCurrency(walletBalance)}</span>
            <span className="text-sm text-white/50">GNF</span>
          </div>
          {stats && stats.totalUsersCreated > 0 && (
            <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs">
              <ArrowUpRight className="w-3 h-3" />
              <span>{stats.totalUsersCreated} utilisateurs</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isDisabled = item.disabled;

            return (
              <TooltipProvider key={item.id} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full h-12 transition-all duration-200",
                        sidebarCollapsed && !isMobile ? "justify-center px-3" : "justify-start gap-3 px-4",
                        isActive && !isDisabled && [
                          "bg-gradient-to-r text-white shadow-lg",
                          item.gradient
                        ],
                        !isActive && !isDisabled && [
                          "text-white/70 hover:text-white hover:bg-white/10"
                        ],
                        isDisabled && "opacity-40 cursor-not-allowed"
                      )}
                      onClick={() => !isDisabled && onTabChange(item.id)}
                      disabled={isDisabled}
                    >
                      <span className={cn(
                        "transition-transform",
                        isActive && "scale-110"
                      )}>
                        {item.icon}
                      </span>
                      {(!sidebarCollapsed || isMobile) && (
                        <>
                          <span className="flex-1 text-left font-medium text-sm">
                            {item.label}
                          </span>
                          {item.badge && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0 border-white/30 text-white/70">
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && <ChevronRight className="w-4 h-4" />}
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {sidebarCollapsed && !isMobile && (
                    <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full h-11 text-red-400 hover:text-red-300 hover:bg-red-500/10",
            sidebarCollapsed && !isMobile ? "justify-center px-3" : "justify-start gap-3 px-4"
          )}
          onClick={onSignOut}
        >
          <LogOut className="w-5 h-5" />
          {(!sidebarCollapsed || isMobile) && <span className="font-medium">Déconnexion</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col transition-all duration-300",
        sidebarCollapsed ? "w-20" : "w-72",
        "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 transform transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl"
      )}>
        <SidebarContent isMobile />
      </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Page Title */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-slate-900">
                {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h2>
              <p className="text-xs text-slate-500">
                {agent.type_agent ? `Agent ${agent.type_agent}` : 'Interface Agent'}
              </p>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-slate-900">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </Button>

              {/* Quick Stats Badge */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full border border-emerald-200">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  {formatCurrency(walletBalance)} GNF
                </span>
              </div>

              {/* Profile Avatar */}
              <Avatar className="h-9 w-9 ring-2 ring-slate-200">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm font-bold">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
