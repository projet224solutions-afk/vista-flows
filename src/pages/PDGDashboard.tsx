import { useState, useEffect } from "react";
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
  Server,
  Clock,
  Globe,
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
import SyndicateBureauManagement from "@/components/syndicate/SyndicateBureauManagement";
import IntelligentChatInterface from "@/components/IntelligentChatInterface";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { supabase } from "@/integrations/supabase/client";

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
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(true);

  // États pour les données temps réel
  const [realUserStats, setRealUserStats] = useState<RealUserStats>({
    totalUsers: 0,
    activeUsers: 0,
    usersByRole: { clients: 0, vendors: 0, drivers: 0, agents: 0, admins: 0 },
    usersByRegion: []
  });

  const [realProductStats, setRealProductStats] = useState<RealProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalVendors: 0,
    activeVendors: 0
  });

  const [realTransactionStats, setRealTransactionStats] = useState<RealTransactionStats>({
    totalTransactions: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    recentTransactions: []
  });

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
      vendor: "Tech Store Dakar",
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
      description: "Interface PDG accessible sans authentification",
      variant: "default"
    });
    
    // Charger les données temps réel si activé
    if (realTimeMode) {
      loadRealTimeData();
    }
  }, [realTimeMode]);

  // Fonction pour charger les données temps réel depuis Supabase
  const loadRealTimeData = async () => {
    setLoading(true);
    try {
      // Charger les statistiques utilisateurs
      await loadUserStats();
      // Charger les statistiques produits
      await loadProductStats();
      // Charger les statistiques transactions
      await loadTransactionStats();
      
      toast({
        title: "📊 Données temps réel chargées",
        description: "Les statistiques ont été mises à jour",
      });
    } catch (error) {
      console.error('Erreur chargement données temps réel:', error);
      toast({
        title: "❌ Erreur chargement données",
        description: "Basculement vers données mockées",
        variant: "destructive"
      });
      setRealTimeMode(false);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      // Compter tous les utilisateurs
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Compter les utilisateurs actifs (connectés dans les 30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      // Compter par rôle
      const { data: roleData } = await supabase
        .from('profiles')
        .select('role')
        .not('role', 'is', null);

      const usersByRole = {
        clients: roleData?.filter(u => u.role === 'client').length || 0,
        vendors: roleData?.filter(u => u.role === 'vendeur').length || 0,
        drivers: roleData?.filter(u => u.role === 'taxi').length || 0,
        agents: roleData?.filter(u => u.role === 'livreur').length || 0,
        admins: roleData?.filter(u => u.role === 'admin').length || 0,
      };

      setRealUserStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        usersByRole,
        usersByRegion: [] // À implémenter si nécessaire
      });

      // Mettre à jour les stats principales avec les données réelles
      setStats(prev => ({
        ...prev,
        totalUsers: totalUsers || 0,
        activeVendors: usersByRole.vendors
      }));

    } catch (error) {
      console.error('Erreur chargement stats utilisateurs:', error);
    }
  };

  const loadProductStats = async () => {
    try {
      // Compter tous les produits
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Compter les produits actifs
      const { count: activeProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Compter les vendeurs
      const { count: totalVendors } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'vendeur');

      setRealProductStats({
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        totalVendors: totalVendors || 0,
        activeVendors: totalVendors || 0 // Simplification
      });

      // Mettre à jour les stats principales
      setStats(prev => ({
        ...prev,
        totalProducts: totalProducts || 0
      }));

    } catch (error) {
      console.error('Erreur chargement stats produits:', error);
    }
  };

  const loadTransactionStats = async () => {
    try {
      // Utiliser la table wallets pour simuler les transactions
      const { count: totalTransactions } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true });

      // Calculer le revenu total basé sur les soldes des wallets
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance');

      const totalRevenue = walletData?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

      setRealTransactionStats({
        totalTransactions: totalTransactions || 0,
        totalRevenue,
        totalCommissions: totalRevenue * 0.05, // 5% de commission
        recentTransactions: [] // Pas de données détaillées pour l'instant
      });

      // Mettre à jour les stats principales
      setStats(prev => ({
        ...prev,
        totalTransactions: totalTransactions || 0,
        totalRevenue: totalRevenue
      }));

    } catch (error) {
      console.error('Erreur chargement stats transactions:', error);
    }
  };

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
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard">Tableau de Bord</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="syndicate">Bureau Syndicat</TabsTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Encaissements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89.2M FCFA</div>
                  <p className="text-xs text-muted-foreground">Ce mois</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Commissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12.1M FCFA</div>
                  <p className="text-xs text-muted-foreground">Ce mois</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Paiements en attente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.3M FCFA</div>
                  <p className="text-xs text-muted-foreground">À traiter</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transactions Récentes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono">{transaction.id}</TableCell>
                        <TableCell>{transaction.type}</TableCell>
                        <TableCell>{transaction.amount.toLocaleString()} FCFA</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(transaction.method)}
                            <span className="capitalize">{transaction.method.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>{transaction.commission.toLocaleString()} FCFA</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bureau Syndicat */}
          <TabsContent value="syndicate" className="space-y-6">
            <SyndicateBureauManagement />
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
          <DialogContent>
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
      {!copilotVisible && (
        <Button
          onClick={() => setCopilotVisible(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-2xl rounded-full w-16 h-16 z-50"
          size="lg"
        >
          <Bot className="w-8 h-8" />
        </Button>
      )}

      {/* Interface Copilot AI */}
      {copilotVisible && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50">
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
                  users: stats.totalUsers,
                  products: stats.totalProducts,
                  revenue: stats.totalRevenue
                },
                recentActions: [],
                currentPage: 'pdg-dashboard',
                businessMetrics: {
                  totalUsers: stats.totalUsers,
                  activeUsers: stats.activeVendors,
                  totalProducts: stats.totalProducts,
                  totalTransactions: stats.totalTransactions
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
