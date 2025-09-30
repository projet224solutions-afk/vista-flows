import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart3, Users, DollarSign, Shield, Menu, Moon, Sun, 
  Bot, Settings, LogOut, Crown, Activity, TrendingUp,
  Server, AlertTriangle, CheckCircle, Clock, Globe,
  Zap, FileText, Download, Bell, Search, Filter,
  MoreVertical, XCircle, Eye, RotateCcw, Trash2,
  Brain, Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import IntelligentChatInterface from "@/components/IntelligentChatInterface";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Types pour le dashboard
interface DashboardKPIs {
  activeUsers: number;
  todayRevenue: number;
  securityAlerts: number;
  totalUsers: number;
  monthlyGrowth: number;
  serverUptime: number;
  threatsBlocked: number;
}

interface ServerStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  uptime: number;
  lastCheck: string;
}

// Données mockées
const mockKPIs: DashboardKPIs = {
  activeUsers: 2847,
  todayRevenue: 1250000,
  securityAlerts: 3,
  totalUsers: 15847,
  monthlyGrowth: 18.5,
  serverUptime: 99.8,
  threatsBlocked: 47
};

const mockRevenueData = [
  { name: 'Lun', revenue: 850000, commissions: 42500 },
  { name: 'Mar', revenue: 920000, commissions: 46000 },
  { name: 'Mer', revenue: 1100000, commissions: 55000 },
  { name: 'Jeu', revenue: 1350000, commissions: 67500 },
  { name: 'Ven', revenue: 1250000, commissions: 62500 },
  { name: 'Sam', revenue: 1480000, commissions: 74000 },
  { name: 'Dim', revenue: 980000, commissions: 49000 }
];

const mockUserActivity = [
  { region: 'Conakry', count: 4200 },
  { region: 'Kankan', count: 2800 },
  { region: 'Labé', count: 2100 },
  { region: 'Nzérékoré', count: 1900 },
  { region: 'Autres', count: 4847 }
];

const mockServerStatus: ServerStatus[] = [
  { name: 'Supabase DB', status: 'online', uptime: 99.9, lastCheck: '2024-09-30 15:45' },
  { name: 'API Gateway', status: 'online', uptime: 99.7, lastCheck: '2024-09-30 15:44' },
  { name: 'Payment Service', status: 'warning', uptime: 98.2, lastCheck: '2024-09-30 15:43' },
  { name: 'GPS Tracking', status: 'online', uptime: 99.5, lastCheck: '2024-09-30 15:42' }
];

export default function AdvancedPDGDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // États
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotVisible, setCopilotVisible] = useState(true);
  const [kpis] = useState<DashboardKPIs>(mockKPIs);
  
  // Authentification PDG en mode test
  const [pdgAuth, setPdgAuth] = useState(false);
  
  useEffect(() => {
    // Vérifier l'authentification PDG depuis sessionStorage
    const pdgSession = sessionStorage.getItem("pdg_auth");
    if (pdgSession) {
      try {
        const authData = JSON.parse(pdgSession);
        setPdgAuth(true);
        console.log("🎯 Authentification PDG détectée:", authData);
      } catch (error) {
        console.log("❌ Erreur parsing PDG auth");
      }
    }
    
    // Mode test : Permettre l'accès même sans authentification
    if (!pdgAuth && !profile?.role) {
      console.log("🧪 Mode test PDG activé");
      setPdgAuth(true);
      sessionStorage.setItem("pdg_auth", JSON.stringify({
        userCode: "TEST",
        name: "Mode Test",
        level: "PDG_TEST",
        timestamp: Date.now()
      }));
    }
  }, [pdgAuth, profile]);

  // Sidebar items
  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', id: 'dashboard', active: true },
    { icon: DollarSign, label: 'Finances', id: 'finances' },
    { icon: Users, label: 'Utilisateurs', id: 'users' },
    { icon: Shield, label: 'Sécurité', id: 'security' },
    { icon: Settings, label: 'Configuration', id: 'settings' },
  ];

  // Fonction de déconnexion
  const handleSignOut = async () => {
    sessionStorage.removeItem("pdg_auth");
    if (user) {
      await signOut();
    }
    navigate('/');
  };

  // Rendu conditionnel pour l'authentification
  if (!pdgAuth && profile?.role !== 'PDG') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-4">Accès Restreint</h2>
            <p className="text-gray-600 mb-4">
              Cette interface est réservée aux PDG autorisés.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-background`}>
      <div className="flex h-screen overflow-hidden">
        
        {/* ======================= SIDEBAR ======================= */}
        <div className={`bg-card border-r border-border transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="font-bold text-lg">224SOLUTIONS</h2>
                  <p className="text-xs text-muted-foreground">PDG Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <Button
                  key={item.id}
                  variant={item.active ? "default" : "ghost"}
                  className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'px-4'}`}
                  onClick={() => toast.info(`Navigation vers ${item.label}`)}
                >
                  <item.icon className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="ml-3">{item.label}</span>}
                </Button>
              ))}
            </div>

            {/* AI Copilot Menu Entry - PDG ONLY */}
            {(profile?.role === 'PDG' || pdgAuth) && (
              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className={`w-full justify-start border-blue-300 text-blue-600 hover:bg-blue-50 ${
                    sidebarCollapsed ? 'px-2' : 'px-4'
                  }`}
                  onClick={() => setCopilotVisible(!copilotVisible)}
                >
                  <Brain className="w-5 h-5" />
                  {!sidebarCollapsed && (
                    <span className="ml-3 flex items-center gap-2">
                      AI Copilot
                      <Sparkles className="w-4 h-4 text-blue-500" />
                    </span>
                  )}
                </Button>
              </div>
            )}
          </nav>
        </div>

        {/* ======================= MAIN CONTENT ======================= */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header */}
          <header className="bg-card border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="font-bold text-xl">Dashboard PDG</h1>
                  <p className="text-sm text-muted-foreground">
                    Tableau de bord exécutif • Mode IA Activé
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Quick KPIs */}
                <div className="hidden lg:flex items-center gap-6 mr-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {kpis.activeUsers.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Utilisateurs actifs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {kpis.todayRevenue.toLocaleString()} XAF
                    </div>
                    <div className="text-xs text-muted-foreground">Revenus aujourd'hui</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {kpis.securityAlerts}
                    </div>
                    <div className="text-xs text-muted-foreground">Alertes sécurité</div>
                  </div>
                </div>

                {/* Controls */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDarkMode(!darkMode)}
                >
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                
                <Button variant="ghost" size="sm">
                  <Bell className="w-5 h-5" />
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="flex-1 overflow-hidden">
            <div className={`flex h-full ${copilotVisible && (profile?.role === 'PDG' || pdgAuth) ? '' : ''}`}>
              
              {/* Central Dashboard Area */}
              <div className={`flex-1 p-6 overflow-y-auto ${
                copilotVisible && (profile?.role === 'PDG' || pdgAuth) ? 'mr-80' : ''
              }`}>
                
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Utilisateurs Actifs</p>
                          <p className="text-2xl font-bold">{kpis.activeUsers.toLocaleString()}</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600">+{kpis.monthlyGrowth}% ce mois</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Revenus Aujourd'hui</p>
                          <p className="text-2xl font-bold">{kpis.todayRevenue.toLocaleString()} XAF</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-500" />
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600">Objectif: 95% atteint</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Alertes Sécurité</p>
                          <p className="text-2xl font-bold">{kpis.securityAlerts}</p>
                        </div>
                        <Shield className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-green-600">Sous contrôle</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Évolution des Revenus (7 jours)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={mockRevenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenus" />
                            <Line type="monotone" dataKey="commissions" stroke="#10b981" name="Commissions" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Activité Utilisateurs par Région</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mockUserActivity}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              nameKey="region"
                            >
                              {mockUserActivity.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Server Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>État des Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {mockServerStatus.map((service) => (
                        <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              service.status === 'online' ? 'bg-green-500' : 
                              service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <div className="font-medium">{service.name}</div>
                              <div className="text-xs text-muted-foreground">{service.lastCheck}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{service.uptime}%</div>
                            <div className="text-xs text-muted-foreground">Uptime</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ======================= AI COPILOT INTELLIGENT (PDG ONLY) ======================= */}
              {(profile?.role === 'PDG' || pdgAuth) && copilotVisible && (
                <div className="w-80 absolute right-0 top-0 h-full">
                  <div className="relative h-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCopilotVisible(false)}
                      className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <IntelligentChatInterface 
                      context={{
                        userRole: 'PDG',
                        companyData: {
                          name: '224Solutions',
                          users: kpis.totalUsers,
                          revenue: kpis.todayRevenue,
                          growth: kpis.monthlyGrowth
                        },
                        recentActions: [],
                        currentPage: 'pdg-dashboard',
                        businessMetrics: kpis
                      }}
                      onActionRequest={(action, data) => {
                        console.log('Action copilote:', action, data);
                        toast.success(`🤖 Action IA exécutée: ${action}`);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-card border-t border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <Activity className="w-3 h-3 mr-1" />
                  Système Opérationnel
                </Badge>
                <span className="text-muted-foreground">
                  Menaces bloquées: {kpis.threatsBlocked}
                </span>
                <span className="text-muted-foreground">
                  Uptime: {kpis.serverUptime}%
                </span>
              </div>
              <div className="text-muted-foreground">
                © 2024 224Solutions • Dashboard PDG Sécurisé
              </div>
            </div>
          </footer>
        </div>

        {/* Floating Copilot Toggle (when panel is hidden) */}
        {(profile?.role === 'PDG' || pdgAuth) && !copilotVisible && (
          <Button
            className="fixed bottom-6 right-6 rounded-full w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg animate-pulse"
            onClick={() => setCopilotVisible(true)}
          >
            <Brain className="h-6 w-6 text-white" />
          </Button>
        )}
      </div>
    </div>
  );
}