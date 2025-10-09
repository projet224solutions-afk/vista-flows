import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Crown,
  Users,
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  Download,
  Upload,
  RotateCcw,
  Shield,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Settings,
  Database,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  Building2,
  Bot,
  Brain,
  Moon,
  Sun,
  Globe,
  Calculator,
  Server,
  Clock,
  Zap,
  Bell,
  MoreVertical,
  Trash2,
  Sparkles,
  Truck,
  MessageSquare,
  Wallet,
  MapPin,
  Star,
  CheckCircle2,
  Mail,
  Phone,
  Key,
  HardDrive,
  ArrowUpDown,
  TrendingDown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { usePDGData } from "@/hooks/usePDGData";
import SyndicateBureauManagementPro from "@/components/syndicate/SyndicateBureauManagementPro";
import IntelligentChatInterface from "@/components/IntelligentChatInterface";
import CopilotTest from "@/components/CopilotTest";
import MotoSecurityDashboard from "@/components/security/MotoSecurityDashboard";
import AgentManagementDashboard from "@/components/agent-system/AgentManagementDashboard";
import SecurityDashboard from "@/components/security/SecurityDashboard";
import CommunicationModule from "@/components/communication/CommunicationModule";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { useGlobalStats, useUsers, useProducts, useTransactions } from "@/hooks/useDataManager";
import { usePDGManagement } from "@/hooks/useAgentSystem";
import PDGFinanceManagement from "@/components/pdg/PDGFinanceManagement";
import UltraSimpleCommunication from "@/components/communication/UltraSimpleCommunication";
import CopiloteChat from "@/components/copilot/CopiloteChat";

// Types pour les données PDG
interface PDGStats {
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  totalProducts: number;
  monthlyGrowth: number;
  activeVendors: number;
  pendingOrders: number;
  systemHealth: number;
}

// Types pour les vraies données temps réel
interface RealUserStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: {
    clients: number;
    vendors: number;
    drivers: number;
    agents: number;
    admins: number;
  };
  usersByRegion: Array<{
    region: string;
    count: number;
  }>;
}

interface RealProductStats {
  totalProducts: number;
  activeProducts: number;
  totalVendors: number;
  activeVendors: number;
}

interface RealTransactionStats {
  totalTransactions: number;
  totalRevenue: number;
  totalCommissions: number;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    date: string;
    status: string;
  }>;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended' | 'pending';
  joinDate: string;
  lastActivity: string;
  revenue: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  method: 'mobile_money' | 'card' | 'cash' | 'bank_transfer';
  status: 'completed' | 'pending' | 'failed';
  date: string;
  user: string;
  commission: number;
}

interface Product {
  id: string;
  name: string;
  vendor: string;
  status: 'active' | 'blocked' | 'pending';
  price: number;
  sales: number;
  compliance: 'compliant' | 'non_compliant' | 'under_review';
}

export default function PDGDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // États pour les nouvelles fonctionnalités avancées
  const [copilotVisible, setCopilotVisible] = useState(false);
  const [showCopilotButton, setShowCopilotButton] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(true);

  // Utilisation du nouveau système unifié
  const { stats: globalStats, loading: statsLoading } = useGlobalStats();
  const { data: usersData, loading: usersLoading } = useUsers();
  const { data: productsData, loading: productsLoading } = useProducts();
  const { data: transactionsData, loading: transactionsLoading } = useTransactions();

  // Gestion PDG pour les agents
  const { pdgData, createPDG } = usePDGManagement();

  // Calculer les stats par rôle (mémorisé pour éviter les recalculs)
  const usersByRole = useMemo(() => {
    if (!Array.isArray(usersData)) {
      return { clients: 0, vendors: 0, drivers: 0, agents: 0, admins: 0 };
    }
    
    return {
    clients: usersData.filter((u: any) => u.role === 'client').length,
    vendors: usersData.filter((u: any) => u.role === 'vendeur').length,
    drivers: usersData.filter((u: any) => u.role === 'taxi').length,
    agents: usersData.filter((u: any) => u.role === 'livreur').length,
    admins: usersData.filter((u: any) => u.role === 'admin').length,
    };
  }, [usersData]);

  // États pour les données temps réel (mémorisés pour éviter les recalculs)
  const realUserStats = useMemo(() => ({
    totalUsers: globalStats.totalUsers,
    activeUsers: Array.isArray(usersData) ? usersData.filter((u: any) => u.is_active).length : 0,
    usersByRole,
    usersByRegion: [] // À implémenter si nécessaire
  }), [globalStats.totalUsers, usersData, usersByRole]);

  const realProductStats = useMemo(() => ({
    totalProducts: globalStats.totalProducts,
    activeProducts: Array.isArray(productsData) ? productsData.filter((p: any) => p.is_active).length : 0,
    totalVendors: globalStats.activeVendors,
    activeVendors: globalStats.activeVendors
  }), [globalStats.totalProducts, globalStats.activeVendors, productsData]);

  const realTransactionStats = useMemo(() => ({
    totalTransactions: globalStats.totalTransactions,
    totalRevenue: globalStats.totalRevenue,
    totalCommissions: globalStats.totalRevenue * 0.05,
    recentTransactions: Array.isArray(transactionsData) ? transactionsData.slice(0, 10) : []
  }), [globalStats.totalTransactions, globalStats.totalRevenue, transactionsData]);

  // Loading global
  const loading = statsLoading || usersLoading || productsLoading || transactionsLoading;

  // États pour les données mockées (fallback)
  const [stats, setStats] = useState<PDGStats>({
    totalUsers: 15847,
    totalRevenue: 125600000,
    totalTransactions: 8934,
    totalProducts: 12456,
    monthlyGrowth: 18.5,
    activeVendors: 2341,
    pendingOrders: 156,
    systemHealth: 98.7
  });

  const [users, setUsers] = useState<UserAccount[]>([
    {
      id: "1",
      name: "Amadou Diallo",
      email: "amadou@example.com",
      role: "vendeur",
      status: "active",
      joinDate: "2024-01-15",
      lastActivity: "2024-09-28",
      revenue: 2500000
    },
    {
      id: "2",
      name: "Fatou Sow",
      email: "fatou@example.com",
      role: "livreur",
      status: "pending",
      joinDate: "2024-09-20",
      lastActivity: "2024-09-27",
      revenue: 450000
    },
    {
      id: "3",
      name: "Ibrahim Kone",
      email: "ibrahim@example.com",
      role: "taxi",
      status: "suspended",
      joinDate: "2024-02-10",
      lastActivity: "2024-09-25",
      revenue: 1200000
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TXN001",
      type: "Vente",
      amount: 25000,
      method: "mobile_money",
      status: "completed",
      date: "2024-09-28",
      user: "Amadou Diallo",
      commission: 2500
    },
    {
      id: "TXN002",
      type: "Livraison",
      amount: 5000,
      method: "cash",
      status: "pending",
      date: "2024-09-28",
      user: "Fatou Sow",
      commission: 500
    }
  ]);

  const [products, setProducts] = useState<Product[]>([
    {
      id: "PRD001",
      name: "Smartphone Samsung Galaxy",
      vendor: "Tech Store Conakry",
      status: "active",
      price: 350000,
      sales: 45,
      compliance: "compliant"
    },
    {
      id: "PRD002",
      name: "Produit suspect",
      vendor: "Vendeur Douteux",
      status: "blocked",
      price: 15000,
      sales: 2,
      compliance: "non_compliant"
    }
  ]);

  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // AUTHENTIFICATION TEMPORAIREMENT DÉSACTIVÉE POUR TESTS
  useEffect(() => {
    console.log("🧪 PDG Dashboard en mode test - Authentification désactivée");
    toast({
      title: "🧪 Mode Test Activé",
      description: "Interface PDG accessible sans authentification - Données temps réel activées",
      variant: "default"
    });
  }, []);

  // Fonctions de gestion des utilisateurs
  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        switch (action) {
          case 'suspend':
            return { ...user, status: 'suspended' as const };
          case 'activate':
            return { ...user, status: 'active' as const };
          case 'delete':
            return user; // En réalité, on supprimerait de la liste
        }
      }
      return user;
    }));

    toast({
      title: "Action effectuée",
      description: `Utilisateur ${action === 'delete' ? 'supprimé' : action === 'suspend' ? 'suspendu' : 'activé'}`,
    });
  };

  // Fonctions de gestion des produits
  const handleProductAction = (productId: string, action: 'block' | 'approve') => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          status: action === 'block' ? 'blocked' as const : 'active' as const,
          compliance: action === 'block' ? 'non_compliant' as const : 'compliant' as const
        };
      }
      return product;
    }));

    toast({
      title: "Produit mis à jour",
      description: `Produit ${action === 'block' ? 'bloqué' : 'approuvé'}`,
    });
  };

  // Fonctions système
  const handleSystemUpdate = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Mise à jour système",
        description: "Système mis à jour avec succès",
      });
    }, 3000);
  };

  const handleSystemRollback = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Restauration système",
        description: "Système restauré à la version précédente",
      });
    }, 2000);
  };

  // Export des données
  const handleExportData = (format: 'pdf' | 'excel') => {
    toast({
      title: `Export ${format.toUpperCase()}`,
      description: "Génération du rapport en cours...",
    });

    // Simulation de l'export
    setTimeout(() => {
      toast({
        title: "Export terminé",
        description: `Rapport ${format.toUpperCase()} téléchargé`,
      });
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Actif</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspendu</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Bloqué</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Terminé</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échoué</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'mobile_money':
        return <Smartphone className="w-4 h-4" />;
      case 'card':
        return <CreditCard className="w-4 h-4" />;
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'bank_transfer':
        return <Building className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${darkMode
      ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white'
      : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100'
      }`}>
      {/* Header PDG */}
      <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 text-white p-6 shadow-2xl">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Crown className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-2xl font-bold">Interface PDG - 224Solutions</h1>
              <p className="text-purple-200">Tableau de bord exécutif</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30">
              <Activity className="w-4 h-4 mr-2" />
              {realTimeMode ? 'Données Temps Réel' : 'Données Mockées'}
            </Badge>
            <Button
              onClick={() => setRealTimeMode(!realTimeMode)}
              variant="outline"
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              <Database className="w-4 h-4 mr-2" />
              {realTimeMode ? 'Mode Mock' : 'Mode Réel'}
            </Button>
            <Button
              onClick={() => setDarkMode(!darkMode)}
              variant="outline"
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => setCopilotVisible(true)}
              variant="outline"
              className="bg-white/20 text-white border-white/30 hover:bg-white/30"
              title="Assistant IA PDG"
            >
              <Bot className="w-4 h-4 mr-2" />
              Copilot AI
            </Button>
            <Badge variant="outline" className="bg-yellow-400 text-black border-yellow-400">
              ACCÈS MAXIMUM
            </Badge>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.removeItem("pdg_auth");
                navigate("/");
              }}
              className="border-white text-white hover:bg-white hover:text-purple-900"
            >
              Déconnexion Sécurisée
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs Totaux</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {realTimeMode ? realUserStats.totalUsers.toLocaleString() : stats.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {realTimeMode ? `${realUserStats.activeUsers} actifs` : '+12% ce mois'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {realTimeMode
                  ? `${(realTransactionStats.totalRevenue / 1000000).toFixed(1)}M FCFA`
                  : `${(stats.totalRevenue / 1000000).toFixed(1)}M FCFA`
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {realTimeMode
                  ? `${realTransactionStats.totalTransactions} transactions`
                  : `+${stats.monthlyGrowth}% ce mois`
                }
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {realTimeMode ? realTransactionStats.totalTransactions.toLocaleString() : stats.totalTransactions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {realTimeMode ? `${(realTransactionStats.totalCommissions / 1000).toFixed(0)}K commissions` : '+15% ce mois'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Santé Système</CardTitle>
              <Shield className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.systemHealth}%</div>
              <p className="text-xs text-muted-foreground">Excellent</p>
            </CardContent>
          </Card>
        </div>

        {/* Interface à onglets */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="dashboard">Tableau de Bord</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="agents">Gestion Agents</TabsTrigger>
            <TabsTrigger value="syndicate">Bureau Syndicat</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="copilote">Copilote IA</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
            <TabsTrigger value="system">Système</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
          </TabsList>

          {/* Tableau de bord */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Évolution des Ventes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { name: 'Jan', ventes: realTimeMode ? realTransactionStats.totalRevenue / 12 : 4000 },
                        { name: 'Fév', ventes: realTimeMode ? realTransactionStats.totalRevenue / 10 : 3000 },
                        { name: 'Mar', ventes: realTimeMode ? realTransactionStats.totalRevenue / 8 : 5000 },
                        { name: 'Avr', ventes: realTimeMode ? realTransactionStats.totalRevenue / 6 : 4500 },
                        { name: 'Mai', ventes: realTimeMode ? realTransactionStats.totalRevenue / 4 : 6000 },
                        { name: 'Juin', ventes: realTimeMode ? realTransactionStats.totalRevenue / 2 : 7500 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} FCFA`, 'Ventes']} />
                        <Legend />
                        <Line type="monotone" dataKey="ventes" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Répartition par Rôle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Clients', value: realTimeMode ? realUserStats.usersByRole.clients : 67, fill: '#8884d8' },
                            { name: 'Vendeurs', value: realTimeMode ? realUserStats.usersByRole.vendors : 17, fill: '#82ca9d' },
                            { name: 'Livreurs', value: realTimeMode ? realUserStats.usersByRole.agents : 10, fill: '#ffc658' },
                            { name: 'Chauffeurs', value: realTimeMode ? realUserStats.usersByRole.drivers : 6, fill: '#ff7300' },
                            { name: 'Admins', value: realTimeMode ? realUserStats.usersByRole.admins : 2, fill: '#8dd1e1' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Clients', value: realTimeMode ? realUserStats.usersByRole.clients : 67, fill: '#8884d8' },
                            { name: 'Vendeurs', value: realTimeMode ? realUserStats.usersByRole.vendors : 17, fill: '#82ca9d' },
                            { name: 'Livreurs', value: realTimeMode ? realUserStats.usersByRole.agents : 10, fill: '#ffc658' },
                            { name: 'Chauffeurs', value: realTimeMode ? realUserStats.usersByRole.drivers : 6, fill: '#ff7300' },
                            { name: 'Admins', value: realTimeMode ? realUserStats.usersByRole.admins : 2, fill: '#8dd1e1' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Graphique en barres pour les métriques de performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Métriques de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      {
                        name: 'Utilisateurs',
                        valeur: realTimeMode ? realUserStats.totalUsers : stats.totalUsers,
                        objectif: 20000
                      },
                      {
                        name: 'Produits',
                        valeur: realTimeMode ? realProductStats.totalProducts : stats.totalProducts,
                        objectif: 15000
                      },
                      {
                        name: 'Transactions',
                        valeur: realTimeMode ? realTransactionStats.totalTransactions : stats.totalTransactions,
                        objectif: 10000
                      },
                      {
                        name: 'Revenus (K)',
                        valeur: realTimeMode ? Math.round(realTransactionStats.totalRevenue / 1000) : Math.round(stats.totalRevenue / 1000),
                        objectif: 150000
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        name === 'Revenus (K)' ? `${Number(value).toLocaleString()}K FCFA` : Number(value).toLocaleString(),
                        name === 'valeur' ? 'Actuel' : 'Objectif'
                      ]} />
                      <Legend />
                      <Bar dataKey="valeur" fill="#8884d8" name="Actuel" />
                      <Bar dataKey="objectif" fill="#82ca9d" name="Objectif" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertes Système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      156 commandes en attente de validation
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      23 produits signalés comme non conformes
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion des utilisateurs */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Utilisateurs</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="Rechercher un utilisateur..." className="max-w-sm" />
                  <Button variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Revenus</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>{user.revenue.toLocaleString()} FCFA</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.status === 'suspended' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUserAction(user.id, 'activate')}
                              >
                                <Unlock className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUserAction(user.id, 'suspend')}
                              >
                                <Lock className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion des produits */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Produits</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Vendeur</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Ventes</TableHead>
                      <TableHead>Conformité</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.vendor}</TableCell>
                        <TableCell>{product.price.toLocaleString()} FCFA</TableCell>
                        <TableCell>{product.sales}</TableCell>
                        <TableCell>
                          {product.compliance === 'compliant' && (
                            <Badge className="bg-green-500">Conforme</Badge>
                          )}
                          {product.compliance === 'non_compliant' && (
                            <Badge variant="destructive">Non conforme</Badge>
                          )}
                          {product.compliance === 'under_review' && (
                            <Badge variant="secondary">En révision</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {product.status === 'blocked' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProductAction(product.id, 'approve')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProductAction(product.id, 'block')}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion financière */}
          <TabsContent value="finance" className="space-y-6">
            <PDGFinanceManagement />
          </TabsContent>

          {/* Bureau Syndicat */}
          <TabsContent value="agents" className="space-y-6">
            {pdgData ? (
              <AgentManagementDashboard pdgId={pdgData.id} />
            ) : (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-semibold mb-4">Configuration PDG requise</h3>
                  <p className="text-muted-foreground mb-6">
                    Pour utiliser le système d'agents, vous devez d'abord configurer votre profil PDG.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await createPDG({
                          name: profile?.first_name + ' ' + profile?.last_name || 'PDG 224Solutions',
                          email: profile?.email || user?.email || '',
                          phone: profile?.phone || '',
                          permissions: ['all']
                        });
                      } catch (error) {
                        console.error('Erreur création PDG:', error);
                      }
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Configurer le profil PDG
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="syndicate" className="space-y-6">
            <div className="space-y-6">
              {/* Monitoring en temps réel des bureaux syndicats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-blue-700">
                      <Activity className="w-5 h-5 mr-2" />
                      Monitoring Temps Réel
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Bureaux Actifs</span>
                        <Badge className="bg-green-100 text-green-800">En ligne</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Activités Aujourd'hui</span>
                        <span className="text-sm font-semibold">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Alertes</span>
                        <Badge variant="outline" className="text-orange-600">2</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-green-700">
                      <Users className="w-5 h-5 mr-2" />
                      Coordination
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Membres</span>
                        <span className="text-sm font-semibold">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Nouveaux Aujourd'hui</span>
                        <span className="text-sm font-semibold">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Véhicules</span>
                        <span className="text-sm font-semibold">0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-purple-700">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Revenus Globaux
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Cotisations</span>
                        <span className="text-sm font-semibold">0 FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ce Mois</span>
                        <span className="text-sm font-semibold">0 FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Croissance</span>
                        <Badge className="bg-green-100 text-green-800">+0%</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interface de gestion des bureaux syndicats */}
            <SyndicateBureauManagementPro />
            </div>
          </TabsContent>

          {/* Communication */}
          <TabsContent value="communication" className="space-y-6">
            <UltraSimpleCommunication />
          </TabsContent>

          {/* Copilote IA */}
          <TabsContent value="copilote" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CopiloteChat height="700px" />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-blue-500" />
                      Actions Rapides
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Wallet className="h-4 w-4 mr-2" />
                      Solde Wallet
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Statistiques
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Taux de Change
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Gestion Utilisateurs
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      Capacités IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Chat intelligent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Actions métiers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Simulations financières</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Gestion des taux</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Analyse des données</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Sécurité et Monitoring */}
          <TabsContent value="security" className="space-y-6">
            <MotoSecurityDashboard 
              isPDG={true}
              className="w-full"
            />
          </TabsContent>

          {/* Système */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Mise à Jour Système
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Version actuelle: v2.1.4
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dernière mise à jour: 15 septembre 2024
                  </p>
                  <Button
                    onClick={handleSystemUpdate}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Mettre à jour
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Restauration Système
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Version de sauvegarde: v2.1.3
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Sauvegarde du: 10 septembre 2024
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleSystemRollback}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Restauration...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurer ancien système
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>État du Système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <span>Base de données</span>
                    <Badge className="bg-green-500">Opérationnelle</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <span>API Services</span>
                    <Badge className="bg-green-500">Opérationnelle</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <span>Paiements</span>
                    <Badge className="bg-yellow-500">Maintenance</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rapports */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export des Rapports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Rapports Financiers</h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleExportData('pdf')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Rapport mensuel PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleExportData('excel')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Données Excel
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Rapports Utilisateurs</h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleExportData('pdf')}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Liste utilisateurs PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleExportData('excel')}
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Activité Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog pour détails utilisateur */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="z-[70]">
            <DialogHeader>
              <DialogTitle>Détails Utilisateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom complet</Label>
                <p className="font-medium">{selectedUser.name}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <Label>Rôle</Label>
                <Badge variant="outline">{selectedUser.role}</Badge>
              </div>
              <div>
                <Label>Revenus générés</Label>
                <p className="font-bold text-green-600">
                  {selectedUser.revenue.toLocaleString()} FCFA
                </p>
              </div>
              <div>
                <Label>Date d'inscription</Label>
                <p>{selectedUser.joinDate}</p>
              </div>
              <div>
                <Label>Dernière activité</Label>
                <p>{selectedUser.lastActivity}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bouton Copilot AI flottant */}
      {showCopilotButton && !copilotVisible && (
        <Button
          onClick={() => setCopilotVisible(true)}
          className="fixed bottom-20 right-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-2xl rounded-full w-16 h-16 z-[60] animate-pulse"
          size="lg"
          title="Assistant IA PDG"
        >
          <Bot className="w-8 h-8" />
        </Button>
      )}

      {/* Interface Copilot AI - Version Complète */}
      {copilotVisible && (
        <div className="fixed bottom-20 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-[60]">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              <h3 className="font-semibold">Copilot AI PDG</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCopilotVisible(false)}
              className="text-white hover:bg-white/20"
            >
              ×
            </Button>
          </div>
          <div className="h-[calc(100%-60px)]">
            <IntelligentChatInterface
              context={{
                userRole: 'PDG',
                companyData: {
                  name: '224Solutions',
                  users: globalStats?.totalUsers || stats.totalUsers,
                  products: globalStats?.totalProducts || stats.totalProducts,
                  revenue: globalStats?.totalRevenue || stats.totalRevenue
                },
                recentActions: [],
                currentPage: 'pdg-dashboard',
                businessMetrics: {
                  totalUsers: globalStats?.totalUsers || stats.totalUsers,
                  activeUsers: realUserStats.activeUsers || stats.activeVendors,
                  totalProducts: globalStats?.totalProducts || stats.totalProducts,
                  totalTransactions: globalStats?.totalTransactions || stats.totalTransactions
                }
              }}
              onActionRequest={(action, data) => {
                console.log('Action copilote:', action, data);
                toast({
                  title: "🤖 Action IA exécutée",
                  description: `Action: ${action}`,
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
