/**
 * DASHBOARD VENDEUR PROFESSIONNEL - 224SOLUTIONS
 * Interface complète avec sidebar et tous les modules
 */

import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity, LogOut, Bell, Settings, User, ChevronRight,
  DollarSign, ShoppingCart, Users, Target, TrendingUp, Package
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useToast } from "@/hooks/use-toast";
import { useUserInfo } from "@/hooks/useUserInfo";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/vendor/VendorSidebar";

// Import des modules vendeur
import ProductManagement from "@/components/vendor/ProductManagement";
import OrderManagement from "@/components/vendor/OrderManagement";
import ClientManagement from "@/components/vendor/ClientManagement";
import AgentManagement from "@/components/vendor/AgentManagement";
import ExpenseManagementDashboard from "@/components/vendor/ExpenseManagementDashboard";
import PaymentLinksManager from "@/components/vendor/PaymentLinksManager";
import VendorAnalytics from "@/components/vendor/VendorAnalytics";
import InventoryManagement from "@/components/vendor/InventoryManagement";
import MarketingManagement from "@/components/vendor/MarketingManagement";
import WalletDashboard from "@/components/vendor/WalletDashboard";
import ProspectManagement from "@/components/vendor/ProspectManagement";
import SupportTickets from "@/components/vendor/SupportTickets";
import WarehouseManagement from "@/components/vendor/WarehouseManagement";
import POSSystemWrapper from "@/components/vendor/POSSystemWrapper";
import PaymentManagement from "@/components/vendor/PaymentManagement";
import DebtManagement from "@/components/vendor/DebtManagement";
import SimpleCommunicationInterface from "@/components/communication/SimpleCommunicationInterface";

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  useRoleRedirect();
  const { userInfo } = useUserInfo();

  // Rediriger vers dashboard par défaut
  useEffect(() => {
    if (location.pathname === '/vendeur' || location.pathname === '/vendeur/') {
      navigate('/vendeur/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: "Erreur de déconnexion",
        description: "Une erreur est survenue lors de la déconnexion",
        variant: "destructive"
      });
    }
  };

  const mainStats = [
    {
      label: "Chiffre d'affaires",
      value: "2.4M GNF",
      change: "+12%",
      icon: DollarSign,
      color: "bg-green-50 text-green-600"
    },
    {
      label: "Commandes",
      value: "156",
      change: "+8%",
      icon: ShoppingCart,
      color: "bg-blue-50 text-blue-600"
    },
    {
      label: "Clients actifs",
      value: "89",
      change: "+15%",
      icon: Users,
      color: "bg-purple-50 text-purple-600"
    },
    {
      label: "Taux conversion",
      value: "3.2%",
      change: "+0.5%",
      icon: Target,
      color: "bg-orange-50 text-orange-600"
    }
  ];

  // Composant Dashboard principal
  const DashboardHome = () => (
    <div className="space-y-6">
      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">{stat.change}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Commandes récentes</CardTitle>
            <CardDescription>Vos 5 dernières commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Commande #{1000 + i}</p>
                      <p className="text-sm text-muted-foreground">Client {i}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">En cours</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertes & Notifications</CardTitle>
            <CardDescription>Actions requises</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Stock faible</p>
                  <p className="text-sm text-yellow-700">3 produits nécessitent un réapprovisionnement</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Nouvelles commandes</p>
                  <p className="text-sm text-blue-700">12 nouvelles commandes à traiter</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>Accédez rapidement aux fonctionnalités principales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/pos')}
            >
              <Activity className="w-6 h-6" />
              <span className="text-sm font-medium">Point de vente</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/products')}
            >
              <Package className="w-6 h-6" />
              <span className="text-sm font-medium">Produits</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/orders')}
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="text-sm font-medium">Commandes</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/wallet')}
            >
              <DollarSign className="w-6 h-6" />
              <span className="text-sm font-medium">Wallet</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Composant Settings
  const SettingsPage = () => (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres du compte</CardTitle>
        <CardDescription>Configurez votre espace vendeur</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Informations du compte</h3>
            <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
            <p className="text-sm text-muted-foreground">Nom: {profile?.first_name} {profile?.last_name}</p>
            {userInfo && (
              <p className="text-sm text-muted-foreground">ID: {userInfo.custom_id}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <VendorSidebar />
        
        <div className="flex-1 flex flex-col w-full">
          {/* Header global avec trigger */}
          <header className="h-16 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 shadow-sm flex items-center px-6">
            <SidebarTrigger className="mr-4" />
            
            <div className="flex items-center justify-between flex-1">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                    224SOLUTIONS
                  </h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    {profile?.first_name || user?.email?.split('@')[0]}
                    {userInfo && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                        {userInfo.custom_id}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Contenu principal */}
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="dashboard" element={<DashboardHome />} />
              <Route path="analytics" element={<VendorAnalytics />} />
              <Route path="pos" element={<POSSystemWrapper />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="orders" element={<OrderManagement />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="warehouse" element={<WarehouseManagement />} />
              <Route path="clients" element={<ClientManagement />} />
              <Route path="agents" element={<AgentManagement />} />
              <Route path="prospects" element={<ProspectManagement />} />
              <Route path="marketing" element={<MarketingManagement />} />
              <Route path="wallet" element={<WalletDashboard />} />
              <Route path="payments" element={<PaymentManagement />} />
              <Route path="payment-links" element={<PaymentLinksManager />} />
              <Route path="expenses" element={<ExpenseManagementDashboard />} />
              <Route path="debts" element={<DebtManagement />} />
              <Route path="delivery" element={<Card><CardContent className="p-6">Module Livraisons - En développement</CardContent></Card>} />
              <Route path="support" element={<SupportTickets />} />
              <Route path="communication" element={<SimpleCommunicationInterface />} />
              <Route path="reports" element={<Card><CardContent className="p-6">Module Rapports - En développement</CardContent></Card>} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
