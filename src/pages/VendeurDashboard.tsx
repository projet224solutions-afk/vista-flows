/**
 * DASHBOARD VENDEUR PROFESSIONNEL - 224SOLUTIONS
 * Interface complète avec sidebar et tous les modules
 */

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { useVendorStats } from "@/hooks/useVendorData";
import { supabase } from "@/integrations/supabase/client";

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
import ProspectManagement from "@/components/vendor/ProspectManagement";
import SupportTickets from "@/components/vendor/SupportTickets";
import WarehouseManagement from "@/components/vendor/WarehouseManagement";
import POSSystemWrapper from "@/components/vendor/POSSystemWrapper";
import PaymentManagement from "@/components/vendor/PaymentManagement";
import DebtManagement from "@/components/vendor/DebtManagement";
import { VendorDebtManagement } from "@/components/vendor/debts/VendorDebtManagement";
import UniversalCommunicationHub from "@/components/communication/UniversalCommunicationHub";
import AffiliateManagement from "@/components/vendor/AffiliateManagement";
import SupplierManagement from "@/components/vendor/SupplierManagement";
import UniversalWalletTransactions from "@/components/wallet/UniversalWalletTransactions";
import GeminiAITest from "@/components/vendor/GeminiAITest";
import GoogleCloudVerification from "@/components/vendor/GoogleCloudVerification";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import OfflineSyncPanel from "@/components/vendor/OfflineSyncPanel";
import NetworkStatusIndicator from "@/components/vendor/NetworkStatusIndicator";
// import PWAInstallButton from "@/components/pwa/PWAInstallButton"; // PWA désactivée
import { VendorIdDisplay } from "@/components/vendor/VendorIdDisplay";
import { SubscriptionExpiryBanner } from "@/components/vendor/SubscriptionExpiryBanner";
import { SubscriptionRenewalPage } from "@/components/vendor/SubscriptionRenewalPage";
import { VendorAnalyticsDashboard } from "@/components/vendor/VendorAnalyticsDashboard";
import { VendorNotificationsPanel } from "@/components/vendor/VendorNotificationsPanel";
import { VendorSecurityPanel } from "@/components/vendor/VendorSecurityPanel";
import CommunicationWidget from "@/components/communication/CommunicationWidget";
import { VendorDeliveriesPanel } from "@/components/vendor/VendorDeliveriesPanel";

export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  useRoleRedirect();
  const { userInfo } = useUserInfo();
  const { stats, loading: statsLoading } = useVendorStats();
  const [recentOrders, setRecentOrders] = useState<{
    order_number: string;
    customer_label: string;
    status: string;
    total_amount: number;
    created_at: string;
  }[]>([]);

  // Stats dynamiques réelles (dérivées de useVendorStats)
  const mainStats = useMemo(() => {
    const revenue = stats?.revenue ?? 0;
    const ordersCount = stats?.orders_count ?? 0;
    const customersCount = stats?.customers_count ?? 0;
    const conversion = customersCount > 0 ? (ordersCount / customersCount) * 100 : 0;

    return [
      {
        label: "Chiffre d'affaires",
        value: `${Math.round(revenue).toLocaleString()} GNF`,
        change: "",
        icon: DollarSign,
        color: "bg-green-50 text-green-600"
      },
      {
        label: "Commandes",
        value: `${ordersCount.toLocaleString()}`,
        change: "",
        icon: ShoppingCart,
        color: "bg-blue-50 text-blue-600"
      },
      {
        label: "Clients actifs",
        value: `${customersCount.toLocaleString()}`,
        change: "",
        icon: Users,
        color: "bg-purple-50 text-purple-600"
      },
      {
        label: "Taux conversion",
        value: `${conversion.toFixed(1)}%`,
        change: "",
        icon: Target,
        color: "bg-orange-50 text-orange-600"
      }
    ];
  }, [stats]);

  // Rediriger vers dashboard par défaut
  useEffect(() => {
    // ✅ Correction : Garde-fou de redirection pour éviter toute boucle
    if (location.pathname === '/vendeur' || location.pathname === '/vendeur/') {
      navigate('/vendeur/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Charger les 5 dernières commandes réelles du vendeur
  useEffect(() => {
    const loadRecentOrders = async () => {
      if (!user) return;
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!vendor) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`order_number,total_amount,status,created_at,customer:customers!inner(user_id)`)
        .eq('vendor_id', vendor.id)
        .neq('customer.user_id', user.id) // Exclude POS sales
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return;

      const formatted = (data || []).map((o: any) => ({
        order_number: o.order_number,
        customer_label: o.customer?.user_id ? `Client ${(o.customer.user_id as string).slice(0, 6)}` : 'Client',
        status: o.status || 'pending',
        total_amount: o.total_amount || 0,
        created_at: o.created_at
      }));
      setRecentOrders(formatted);
    };
    loadRecentOrders();
  }, [user]);

  // ✅ Correction : Stabilise la référence et empêche re-renders des enfants qui recevraient cette fonction
  const handleSignOut = useCallback(async () => {
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
  }, [signOut, toast, navigate]);

  // ✅ Correction : Ajoute un petit écran de chargement tant que user/profile ne sont pas prêts
  const isLoading = !user || typeof profile === 'undefined' || statsLoading;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-slate-700">
          <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
          <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse [animation-delay:150ms]"></div>
          <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse [animation-delay:300ms]"></div>
          <span className="text-sm font-medium">Chargement de votre espace vendeur…</span>
        </div>
      </div>
    );
  }

  // (stats déplacées plus haut via useMemo)

  // Composant Dashboard principal
  const DashboardHome = () => (
    <div className="space-y-6">
      {/* Analytics Dashboard intégré */}
      <VendorAnalyticsDashboard />

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallet universel */}
        <div>
          <UniversalWalletTransactions />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Commandes récentes</CardTitle>
            <CardDescription>Vos 5 dernières commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((o) => (
                <div key={o.order_number} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Commande #{o.order_number}</p>
                      <p className="text-sm text-muted-foreground">{o.customer_label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{o.total_amount.toLocaleString()} GNF</span>
                    <Badge variant="secondary">{o.status}</Badge>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <div className="text-sm text-muted-foreground">Aucune commande récente.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications intégrées */}
        <div>
          <VendorNotificationsPanel />
        </div>
      </div>

      {/* Panneau de sécurité */}
      <VendorSecurityPanel />

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
              <p className="text-sm text-muted-foreground">ID: {userInfo.public_id}</p>
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      {profile?.first_name || user?.email?.split('@')[0]}
                    </p>
                    <VendorIdDisplay showName={false} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NetworkStatusIndicator />
                {/* PWAInstallButton désactivé */}
                <div className="hidden lg:block">
                  <WalletBalanceWidget className="max-w-[280px]" />
                </div>
                <QuickTransferButton variant="ghost" size="icon" showText={false} />
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

          {/* Subscription expiry banner */}
          <SubscriptionExpiryBanner />

          {/* Contenu principal */}
          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route index element={<DashboardHome />} />
              <Route path="/" element={<DashboardHome />} />
              <Route path="dashboard" element={<DashboardHome />} />
              <Route path="analytics" element={<VendorAnalytics />} />
              <Route path="pos" element={<POSSystemWrapper />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="orders" element={<OrderManagement />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="warehouse" element={<WarehouseManagement />} />
              <Route path="suppliers" element={<SupplierManagement />} />
              <Route path="clients" element={<ClientManagement />} />
              <Route path="agents" element={<AgentManagement />} />
              <Route path="prospects" element={<ProspectManagement />} />
              <Route path="marketing" element={<MarketingManagement />} />
              <Route path="wallet" element={<UniversalWalletTransactions />} />
              <Route path="payments" element={<PaymentManagement />} />
              <Route path="payment-links" element={<PaymentLinksManager />} />
              <Route path="expenses" element={<ExpenseManagementDashboard />} />
              <Route path="debts" element={<VendorDebtManagement vendorId={(stats as any)?.vendorId || ''} />} />
              <Route path="affiliate" element={<AffiliateManagement shopId={(stats as any)?.vendorId || undefined} />} />
              <Route path="delivery" element={<VendorDeliveriesPanel />} />
              <Route path="support" element={<SupportTickets />} />
              <Route path="communication" element={<UniversalCommunicationHub />} />
              <Route path="reports" element={<Card><CardContent className="p-6">Module Rapports - En développement</CardContent></Card>} />
              <Route path="test-ai" element={<GeminiAITest />} />
              <Route path="test-google-cloud" element={<GoogleCloudVerification />} />
              <Route path="offline-sync" element={<OfflineSyncPanel />} />
              <Route path="subscription" element={<SubscriptionRenewalPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
      
      {/* Widget de communication flottant */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </SidebarProvider>
  );
}

