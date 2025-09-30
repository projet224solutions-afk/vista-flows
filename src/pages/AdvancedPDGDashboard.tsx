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
  Brain, Sparkles, Package, Truck, MessageSquare,
  CreditCard, Wallet, Lock, Unlock, MapPin, 
  ShoppingCart, Star, Ban, CheckCircle2, 
  UserCheck, Mail, Phone, Database, Key,
  HardDrive, RefreshCw, ArrowUpDown, TrendingDown
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
  totalCA: number;
  totalCommissions: number;
  dailyTransactions: number;
  weeklyTransactions: number;
  monthlyTransactions: number;
  conversionRate: number;
}

interface ServerStatus {
  name: string;
  status: 'online' | 'offline' | 'warning';
  uptime: number;
  lastCheck: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'vendor' | 'driver' | 'agent';
  status: 'active' | 'suspended' | 'banned';
  kyc: 'pending' | 'verified' | 'rejected';
  totalSpent?: number;
  totalSales?: number;
  rating?: number;
  joinDate: string;
}

interface ProductData {
  id: string;
  name: string;
  vendor: string;
  category: string;
  price: number;
  status: 'active' | 'reported' | 'blocked';
  reports: number;
  sales: number;
}

interface TransactionData {
  id: string;
  type: 'sale' | 'service' | 'delivery' | 'commission';
  amount: number;
  commission: number;
  vendor: string;
  buyer: string;
  status: 'completed' | 'pending' | 'disputed';
  date: string;
}

interface DeliveryData {
  id: string;
  orderId: string;
  driver: string;
  pickup: string;
  destination: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  progress: number;
  estimatedTime: string;
}

interface SupportTicket {
  id: string;
  user: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  category: string;
  date: string;
}

// Données mockées
const mockKPIs: DashboardKPIs = {
  activeUsers: 2847,
  todayRevenue: 1250000,
  securityAlerts: 3,
  totalUsers: 15847,
  monthlyGrowth: 18.5,
  serverUptime: 99.8,
  threatsBlocked: 47,
  totalCA: 45780000,
  totalCommissions: 2289000,
  dailyTransactions: 156,
  weeklyTransactions: 1092,
  monthlyTransactions: 4680,
  conversionRate: 12.8
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

const mockUsers: UserData[] = [
  { id: '1', name: 'Alice Traoré', email: 'alice@example.com', role: 'vendor', status: 'active', kyc: 'verified', totalSales: 850000, rating: 4.8, joinDate: '2024-01-15' },
  { id: '2', name: 'Moussa Diallo', email: 'moussa@example.com', role: 'client', status: 'active', kyc: 'verified', totalSpent: 120000, joinDate: '2024-02-20' },
  { id: '3', name: 'Fatou Camara', email: 'fatou@example.com', role: 'vendor', status: 'suspended', kyc: 'pending', totalSales: 45000, rating: 3.2, joinDate: '2024-03-10' },
  { id: '4', name: 'Ibrahim Sow', email: 'ibrahim@example.com', role: 'driver', status: 'active', kyc: 'verified', joinDate: '2024-01-05' },
  { id: '5', name: 'Aminata Bah', email: 'aminata@example.com', role: 'agent', status: 'active', kyc: 'verified', joinDate: '2024-02-28' }
];

const mockProducts: ProductData[] = [
  { id: '1', name: 'iPhone 15 Pro', vendor: 'Alice Traoré', category: 'Électronique', price: 1200000, status: 'active', reports: 0, sales: 45 },
  { id: '2', name: 'Sac à main Gucci', vendor: 'Fashion Store', category: 'Mode', price: 350000, status: 'reported', reports: 3, sales: 12 },
  { id: '3', name: 'Laptop Dell XPS', vendor: 'Tech World', category: 'Électronique', price: 800000, status: 'blocked', reports: 8, sales: 2 },
  { id: '4', name: 'Chaussures Nike', vendor: 'Sport Plus', category: 'Sport', price: 85000, status: 'active', reports: 0, sales: 156 }
];

const mockTransactions: TransactionData[] = [
  { id: '1', type: 'sale', amount: 1200000, commission: 60000, vendor: 'Alice Traoré', buyer: 'Moussa Diallo', status: 'completed', date: '2024-09-30' },
  { id: '2', type: 'delivery', amount: 15000, commission: 750, vendor: 'Express Delivery', buyer: 'Fatou Camara', status: 'pending', date: '2024-09-30' },
  { id: '3', type: 'service', amount: 45000, commission: 2250, vendor: 'Repair Shop', buyer: 'Ibrahim Sow', status: 'disputed', date: '2024-09-29' },
  { id: '4', type: 'commission', amount: 25000, commission: 1250, vendor: 'Agent Plus', buyer: 'System', status: 'completed', date: '2024-09-29' }
];

const mockDeliveries: DeliveryData[] = [
  { id: '1', orderId: 'ORD-001', driver: 'Ibrahim Sow', pickup: 'Conakry Centre', destination: 'Kipé', status: 'in_transit', progress: 75, estimatedTime: '15 min' },
  { id: '2', orderId: 'ORD-002', driver: 'Mamadou Bah', pickup: 'Madina Market', destination: 'Ratoma', status: 'picked_up', progress: 25, estimatedTime: '45 min' },
  { id: '3', orderId: 'ORD-003', driver: 'Fatoumata Diallo', pickup: 'Kaloum', destination: 'Dixinn', status: 'delivered', progress: 100, estimatedTime: 'Livré' }
];

const mockTickets: SupportTicket[] = [
  { id: '1', user: 'Alice Traoré', subject: 'Problème de paiement', priority: 'high', status: 'open', category: 'Paiement', date: '2024-09-30' },
  { id: '2', user: 'Moussa Diallo', subject: 'Produit non conforme', priority: 'medium', status: 'in_progress', category: 'Qualité', date: '2024-09-29' },
  { id: '3', user: 'Tech World', subject: 'Compte suspendu', priority: 'urgent', status: 'open', category: 'Compte', date: '2024-09-30' }
];

export default function AdvancedPDGDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  // États
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotVisible, setCopilotVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // Sidebar items améliorés
  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard Global', id: 'dashboard', description: 'KPIs et vue d\'ensemble' },
    { icon: DollarSign, label: 'Finances', id: 'finances', description: 'Revenus, commissions, wallets' },
    { icon: Package, label: 'Marketplace', id: 'marketplace', description: 'Produits, vendeurs, catégories' },
    { icon: Users, label: 'Utilisateurs', id: 'users', description: 'Gestion, KYC, rôles' },
    { icon: Truck, label: 'Logistique', id: 'logistics', description: 'Livraisons, tracking GPS' },
    { icon: MessageSquare, label: 'Support', id: 'support', description: 'Tickets, notifications' },
    { icon: Shield, label: 'Sécurité', id: 'security', description: 'Alertes, monitoring' },
    { icon: Settings, label: 'Configuration', id: 'settings', description: 'APIs, paramètres, admin' }
  ];

  // Fonction de déconnexion
  const handleSignOut = async () => {
    sessionStorage.removeItem("pdg_auth");
    if (user) {
      await signOut();
    }
    navigate('/');
  };

  // ================= FONCTIONS DE GESTION =================

  // Actions utilisateurs
  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'ban' | 'verify_kyc' | 'reject_kyc') => {
    toast.success(`Action ${action} appliquée à l'utilisateur ${userId}`);
  };

  // Actions produits
  const handleProductAction = (productId: string, action: 'approve' | 'block' | 'delete') => {
    toast.success(`Produit ${productId} ${action === 'approve' ? 'approuvé' : action === 'block' ? 'bloqué' : 'supprimé'}`);
  };

  // Actions financières
  const handleFinancialAction = (type: 'block_funds' | 'unblock_funds' | 'adjust_commission', data: any) => {
    toast.success(`Action financière ${type} exécutée`);
  };

  // Actions livraisons
  const handleDeliveryAction = (deliveryId: string, action: 'reassign' | 'cancel' | 'expedite') => {
    toast.success(`Livraison ${deliveryId} : ${action}`);
  };

  // Actions support
  const handleSupportAction = (ticketId: string, action: 'assign' | 'resolve' | 'escalate') => {
    toast.success(`Ticket ${ticketId} : ${action}`);
  };

  // Envoi notifications globales
  const sendGlobalNotification = (message: string, type: 'promo' | 'update' | 'alert') => {
    toast.success(`Notification ${type} envoyée : ${message}`);
  };

  // Gestion API
  const handleAPIAction = (api: string, action: 'enable' | 'disable' | 'configure') => {
    toast.success(`API ${api} : ${action}`);
  };

  // ================= RENDU DU CONTENU PAR ONGLET =================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardContent();
      case 'finances':
        return renderFinancesContent();
      case 'marketplace':
        return renderMarketplaceContent();
      case 'users':
        return renderUsersContent();
      case 'logistics':
        return renderLogisticsContent();
      case 'support':
        return renderSupportContent();
      case 'security':
        return renderSecurityContent();
      case 'settings':
        return renderSettingsContent();
      default:
        return renderDashboardContent();
    }
  };

  // Rendu Dashboard Global (existant mais amélioré)
  const renderDashboardContent = () => (
    <div className="space-y-6">
      {/* KPI Cards Améliorés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CA Total</p>
                <p className="text-2xl font-bold">{kpis.totalCA.toLocaleString()} XAF</p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +{kpis.monthlyGrowth}% ce mois
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commissions Nettes</p>
                <p className="text-2xl font-bold">{kpis.totalCommissions.toLocaleString()} XAF</p>
                <p className="text-xs text-blue-600 mt-1">
                  <Wallet className="w-3 h-3 inline mr-1" />
                  {((kpis.totalCommissions / kpis.totalCA) * 100).toFixed(1)}% du CA
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utilisateurs Actifs</p>
                <p className="text-2xl font-bold">{kpis.activeUsers.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">
                  <Users className="w-3 h-3 inline mr-1" />
                  {kpis.totalUsers.toLocaleString()} total
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transactions/Jour</p>
                <p className="text-2xl font-bold">{kpis.dailyTransactions}</p>
                <p className="text-xs text-orange-600 mt-1">
                  <ShoppingCart className="w-3 h-3 inline mr-1" />
                  {kpis.conversionRate}% conversion
                </p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts existants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Transactions Récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.type === 'sale' ? 'bg-green-100 text-green-600' :
                    transaction.type === 'delivery' ? 'bg-blue-100 text-blue-600' :
                    transaction.type === 'service' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {transaction.type === 'sale' ? <ShoppingCart className="w-5 h-5" /> :
                     transaction.type === 'delivery' ? <Truck className="w-5 h-5" /> :
                     transaction.type === 'service' ? <Settings className="w-5 h-5" /> :
                     <DollarSign className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.vendor} → {transaction.buyer}</p>
                    <p className="text-sm text-muted-foreground">{transaction.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{transaction.amount.toLocaleString()} XAF</p>
                  <p className="text-sm text-green-600">+{transaction.commission.toLocaleString()} commission</p>
                </div>
                <Badge variant={
                  transaction.status === 'completed' ? 'default' :
                  transaction.status === 'pending' ? 'secondary' : 'destructive'
                }>
                  {transaction.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Rendu Section Finances
  const renderFinancesContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion Financière Avancée</h2>
        <Button onClick={() => toast.info('Export financier généré')}>
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Global Application</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {(kpis.totalCA * 0.15).toLocaleString()} XAF
            </div>
            <p className="text-sm text-muted-foreground">Fonds disponibles</p>
            <div className="mt-4 space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Transfert de fonds
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenus par Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Ventes</span>
                <span className="font-bold">{(kpis.totalCommissions * 0.6).toLocaleString()} XAF</span>
              </div>
              <div className="flex justify-between">
                <span>Services</span>
                <span className="font-bold">{(kpis.totalCommissions * 0.2).toLocaleString()} XAF</span>
              </div>
              <div className="flex justify-between">
                <span>Livraisons</span>
                <span className="font-bold">{(kpis.totalCommissions * 0.15).toLocaleString()} XAF</span>
              </div>
              <div className="flex justify-between">
                <span>APIs</span>
                <span className="font-bold">{(kpis.totalCommissions * 0.05).toLocaleString()} XAF</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={() => handleFinancialAction('block_funds', {})}
              >
                <Lock className="w-4 h-4 mr-2" />
                Bloquer Fonds
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => handleFinancialAction('unblock_funds', {})}
              >
                <Unlock className="w-4 h-4 mr-2" />
                Débloquer Fonds
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => handleFinancialAction('adjust_commission', {})}
              >
                <Settings className="w-4 h-4 mr-2" />
                Ajuster Commission
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions récentes avec contrôles */}
      <Card>
        <CardHeader>
          <CardTitle>Historique Financier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    transaction.status === 'completed' ? 'bg-green-100 text-green-600' :
                    transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">{transaction.vendor} → {transaction.buyer}</p>
                    <p className="text-sm text-muted-foreground">{transaction.type} - {transaction.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">{transaction.amount.toLocaleString()} XAF</p>
                    <p className="text-sm text-green-600">+{transaction.commission.toLocaleString()}</p>
                  </div>
                  {transaction.status === 'disputed' && (
                    <Button size="sm" variant="outline" onClick={() => handleFinancialAction('block_funds', {})}>
                      <Lock className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Rendu Section Utilisateurs
  const renderUsersContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <UserCheck className="w-4 h-4 mr-2" />
            KYC en attente
          </Button>
          <Button>
            <Users className="w-4 h-4 mr-2" />
            Nouveau rôle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{mockUsers.filter(u => u.role === 'client').length}</div>
            <div className="text-sm text-muted-foreground">Clients</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{mockUsers.filter(u => u.role === 'vendor').length}</div>
            <div className="text-sm text-muted-foreground">Vendeurs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="w-8 h-8 mx-auto text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{mockUsers.filter(u => u.role === 'driver').length}</div>
            <div className="text-sm text-muted-foreground">Livreurs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Crown className="w-8 h-8 mx-auto text-orange-500 mb-2" />
            <div className="text-2xl font-bold">{mockUsers.filter(u => u.role === 'agent').length}</div>
            <div className="text-sm text-muted-foreground">Agents</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge variant={user.kyc === 'verified' ? 'default' : user.kyc === 'pending' ? 'secondary' : 'destructive'}>
                        KYC: {user.kyc}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.status === 'suspended' ? (
                    <Button size="sm" onClick={() => handleUserAction(user.id, 'activate')}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Activer
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, 'suspend')}>
                      <Ban className="w-4 h-4 mr-1" />
                      Suspendre
                    </Button>
                  )}
                  {user.kyc === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => handleUserAction(user.id, 'verify_kyc')}>
                      <UserCheck className="w-4 h-4 mr-1" />
                      Vérifier KYC
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Sections simplifiées pour les autres onglets (à développer)
  const renderMarketplaceContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Supervision Marketplace</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProducts.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Vendeur:</strong> {product.vendor}</p>
                <p><strong>Prix:</strong> {product.price.toLocaleString()} XAF</p>
                <p><strong>Ventes:</strong> {product.sales}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={product.status === 'active' ? 'default' : product.status === 'reported' ? 'secondary' : 'destructive'}>
                    {product.status}
                  </Badge>
                  {product.reports > 0 && (
                    <Badge variant="destructive">{product.reports} signalements</Badge>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={() => handleProductAction(product.id, 'approve')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approuver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleProductAction(product.id, 'block')}>
                    <Ban className="w-4 h-4 mr-1" />
                    Bloquer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderLogisticsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Suivi Logistique & Livraisons</h2>
      <div className="space-y-4">
        {mockDeliveries.map((delivery) => (
          <Card key={delivery.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Commande {delivery.orderId}</p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.pickup} → {delivery.destination}
                  </p>
                  <p className="text-sm">Livreur: {delivery.driver}</p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    delivery.status === 'delivered' ? 'default' :
                    delivery.status === 'in_transit' ? 'secondary' : 'outline'
                  }>
                    {delivery.status}
                  </Badge>
                  <p className="text-sm mt-1">{delivery.estimatedTime}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Progression</span>
                  <span>{delivery.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${delivery.progress}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSupportContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Support & Communication</h2>
        <Button onClick={() => sendGlobalNotification('Nouvelle promotion !', 'promo')}>
          <Mail className="w-4 h-4 mr-2" />
          Notification Globale
        </Button>
      </div>
      <div className="space-y-4">
        {mockTickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-sm text-muted-foreground">De: {ticket.user}</p>
                  <p className="text-sm text-muted-foreground">Catégorie: {ticket.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    ticket.priority === 'urgent' ? 'destructive' :
                    ticket.priority === 'high' ? 'secondary' : 'outline'
                  }>
                    {ticket.priority}
                  </Badge>
                  <Button size="sm" onClick={() => handleSupportAction(ticket.id, 'resolve')}>
                    Résoudre
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSecurityContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sécurité & Monitoring</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>État des Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockServerStatus.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'online' ? 'bg-green-500' : 
                      service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span>{service.name}</span>
                  </div>
                  <span className="text-sm">{service.uptime}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alertes Sécurité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Tentatives de connexion suspectes: 12</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm">Menaces bloquées: {kpis.threatsBlocked}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">Système sécurisé</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configuration & Paramètres</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>APIs Externes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Paiement', 'SMS', 'Email', 'GPS'].map((api) => (
                <div key={api} className="flex items-center justify-between">
                  <span>{api}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleAPIAction(api, 'configure')}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={() => handleAPIAction(api, 'enable')}>
                      Activer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sauvegarde & Restauration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                <HardDrive className="w-4 h-4 mr-2" />
                Sauvegarde Complète
              </Button>
              <Button className="w-full" variant="outline">
                <Database className="w-4 h-4 mr-2" />
                Export Données
              </Button>
              <Button className="w-full" variant="destructive">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restaurer Données
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

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
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'px-4'} transition-all duration-200`}
                  onClick={() => setActiveTab(item.id)}
                  title={item.description}
                >
                  <item.icon className="w-5 h-5" />
                  {!sidebarCollapsed && (
                    <div className="ml-3 text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  )}
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
              
              {/* Central Dashboard Area - Navigation par onglets */}
              <div className={`flex-1 p-6 overflow-y-auto ${
                copilotVisible && (profile?.role === 'PDG' || pdgAuth) ? 'mr-80' : ''
              }`}>
                
                {/* Breadcrumb/Navigation actuelle */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Crown className="w-4 h-4" />
                    <span>224Solutions PDG</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">
                      {sidebarItems.find(item => item.id === activeTab)?.label}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    <Activity className="w-3 h-3 mr-1" />
                    Mode Avancé Activé
                  </Badge>
                </div>

                {/* Contenu dynamique basé sur l'onglet actif */}
                {renderTabContent()}
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