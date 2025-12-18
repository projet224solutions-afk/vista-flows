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
import { useTranslation } from "@/hooks/useTranslation";
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
import { VendorAnalyticsDashboard } from "@/components/vendor/VendorAnalyticsDashboard";
import InventoryManagement from "@/components/vendor/InventoryManagement";
import MarketingManagement from "@/components/vendor/MarketingManagement";
import ProspectManagement from "@/components/vendor/ProspectManagement";
import SupportTickets from "@/components/vendor/SupportTickets";
import WarehouseManagement from "@/components/vendor/WarehouseManagement";
import POSSystemWrapper from "@/components/vendor/POSSystemWrapper";
import PaymentManagement from "@/components/vendor/PaymentManagement";
import { VendorDebtManagement } from "@/components/vendor/debts/VendorDebtManagement";
import UniversalCommunicationHub from "@/components/communication/UniversalCommunicationHub";
import AffiliateManagement from "@/components/vendor/AffiliateManagement";
import SupplierManagement from "@/components/vendor/SupplierManagement";
import UniversalWalletTransactions from "@/components/wallet/UniversalWalletTransactions";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import OfflineSyncPanel from "@/components/vendor/OfflineSyncPanel";
import NetworkStatusIndicator from "@/components/vendor/NetworkStatusIndicator";
// import PWAInstallButton from "@/components/pwa/PWAInstallButton"; // PWA désactivée
import { VendorIdDisplay } from "@/components/vendor/VendorIdDisplay";
import { VendorNotificationsPanel } from "@/components/vendor/VendorNotificationsPanel";
import CommunicationWidget from "@/components/communication/CommunicationWidget";
import { VendorDeliveriesPanel } from "@/components/vendor/VendorDeliveriesPanel";
import { ProtectedRoute } from "@/components/subscription/ProtectedRoute";
import { VendorSubscriptionButton } from "@/components/vendor/VendorSubscriptionButton";
import { VendorSubscriptionBanner } from "@/components/vendor/VendorSubscriptionBanner";
import { SubscriptionExpiryBanner } from "@/components/vendor/SubscriptionExpiryBanner";
import VendorQuotesInvoices from "@/pages/VendorQuotesInvoices";
import VendorContracts from "@/pages/VendorContracts";
import VendorSettings from "@/pages/vendor/Settings";
// NOUVEAUX IMPORTS POUR GESTION D'ERREURS
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useVendorErrorBoundary } from "@/hooks/useVendorErrorBoundary";


export default function VendeurDashboard() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  useRoleRedirect();
  const { userInfo } = useUserInfo();
  const { stats, loading: statsLoading } = useVendorStats();
  
  // Gestion des erreurs centralisée
  const { error, captureError, clearError } = useVendorErrorBoundary();
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
        label: t('vendor.revenue'),
        value: `${Math.round(revenue).toLocaleString()} GNF`,
        change: "",
        icon: DollarSign,
        color: "bg-green-50 text-green-600"
      },
      {
        label: t('vendor.orders'),
        value: `${ordersCount.toLocaleString()}`,
        change: "",
        icon: ShoppingCart,
        color: "bg-blue-50 text-blue-600"
      },
      {
        label: t('vendor.activeClients'),
        value: `${customersCount.toLocaleString()}`,
        change: "",
        icon: Users,
        color: "bg-purple-50 text-purple-600"
      },
      {
        label: t('vendor.conversionRate'),
        value: `${conversion.toFixed(1)}%`,
        change: "",
        icon: Target,
        color: "bg-orange-50 text-orange-600"
      }
    ];
  }, [stats, t]);

  // Rediriger vers dashboard par défaut (optimisé pour éviter boucles)
  useEffect(() => {
    // ✅ Redirection une seule fois au montage
    const path = location.pathname;
    if (path === '/vendeur' || path === '/vendeur/') {
      navigate('/vendeur/dashboard', { replace: true });
    }
  }, []); // ✅ Dépendances vides = une seule exécution

  // Charger les 5 dernières commandes réelles du vendeur (optimisé)
  useEffect(() => {
    const loadRecentOrders = async () => {
      if (!user?.id) return;
      
      try {
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (vendorError || !vendor) {
          console.warn('Vendeur non trouvé:', vendorError);
          return;
        }

        const { data, error } = await supabase
          .from('orders')
          .select(`
            order_number,
            total_amount,
            status,
            created_at,
            customer:customers!inner(user_id)
          `)
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          console.error('Erreur chargement commandes:', error);
          return;
        }

        const formatted = (data || []).map((o: any) => ({
          order_number: o.order_number,
          customer_label: o.customer?.user_id ? `Client ${(o.customer.user_id as string).slice(0, 6)}` : 'Client',
          status: o.status || 'pending',
          total_amount: o.total_amount || 0,
          created_at: o.created_at
        }));
        setRecentOrders(formatted);
      } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
      }
    };
    loadRecentOrders();
  }, [user?.id]); // ✅ Dépendance stable (primitive)

  // ✅ Correction : Stabilise la référence et empêche re-renders des enfants qui recevraient cette fonction
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast({
        title: t('common.signOutSuccess'),
        description: t('common.signOutSuccess'),
      });
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast({
        title: t('common.error'),
        description: t('error.generic'),
        variant: "destructive"
      });
    }
  }, [signOut, toast, navigate, t]);

  // ✅ Correction : Ajoute un petit écran de chargement tant que user/profile ne sont pas prêts
  const isLoading = !user || typeof profile === 'undefined' || statsLoading;
  
  // Afficher un message d'erreur si les stats ne chargent pas
  if (!isLoading && stats === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">{t('vendor.loadError')}</CardTitle>
            <CardDescription>
              {t('vendor.loadErrorDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('vendor.checkConnection')}
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              {t('common.reloadPage')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-slate-700">
          <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
          <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse [animation-delay:150ms]"></div>
          <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse [animation-delay:300ms]"></div>
          <span className="text-sm font-medium">{t('vendor.loadingSpace')}</span>
        </div>
      </div>
    );
  }

  // (stats déplacées plus haut via useMemo)

  // Composant Dashboard principal
  const DashboardHome = () => (
    <div className="space-y-6">
      {/* Banner d'abonnement */}
      <VendorSubscriptionBanner />
      
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
            <CardTitle>{t('vendor.recentOrders')}</CardTitle>
            <CardDescription>{t('vendor.last5Orders')}</CardDescription>
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
                      <p className="font-medium">{t('vendor.orders')} #{o.order_number}</p>
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
                <div className="text-sm text-muted-foreground">{t('vendor.noRecentOrders')}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications intégrées */}
        <div>
          <VendorNotificationsPanel />
        </div>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>{t('vendor.quickActions')}</CardTitle>
          <CardDescription>{t('vendor.quickActionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/pos')}
            >
              <Activity className="w-6 h-6" />
              <span className="text-sm font-medium">{t('vendor.pos')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/products')}
            >
              <Package className="w-6 h-6" />
              <span className="text-sm font-medium">{t('vendor.products')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/orders')}
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="text-sm font-medium">{t('vendor.orders')}</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 flex-col gap-2"
              onClick={() => navigate('/vendeur/wallet')}
            >
              <DollarSign className="w-6 h-6" />
              <span className="text-sm font-medium">{t('vendor.wallet')}</span>
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
        <CardTitle>{t('vendor.settings')}</CardTitle>
        <CardDescription>{t('vendor.settingsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">{t('vendor.accountInfo')}</h3>
            <p className="text-sm text-muted-foreground">{t('common.email')}: {user?.email}</p>
            <p className="text-sm text-muted-foreground">{t('common.name')}: {profile?.first_name} {profile?.last_name}</p>
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
      <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-x-hidden">
        {/* Sidebar - cachée par défaut sur mobile, overlay mode */}
        <VendorSidebar />

        <div className="flex-1 flex flex-col w-full min-w-0 max-w-full overflow-x-hidden">
          {/* Header global optimisé mobile */}
          <header className="h-14 md:h-16 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 shadow-sm flex items-center px-2 sm:px-3 md:px-6 w-full max-w-full overflow-x-hidden">
            <SidebarTrigger className="mr-2 md:mr-4" />

            <div className="flex items-center justify-between flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent truncate">
                    224SOLUTIONS
                  </h1>
                  <div className="flex items-center gap-1 md:gap-2">
                    <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="truncate max-w-[60px] md:max-w-none">{profile?.first_name || user?.email?.split('@')[0]}</span>
                    </p>
                    <VendorIdDisplay showName={false} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <div className="hidden md:block">
                  <NetworkStatusIndicator />
                </div>
                
                <div className="hidden lg:block">
                  <WalletBalanceWidget className="max-w-[280px]" />
                </div>
                <QuickTransferButton variant="ghost" size="icon" showText={false} className="h-8 w-8 md:h-10 md:w-10" />
                <div className="hidden sm:block">
                  <VendorSubscriptionButton />
                </div>
                
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                  <Bell className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8 md:h-10 md:w-10">
                  <User className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 md:h-10 md:w-10">
                  <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Banner d'expiration d'abonnement */}
          <SubscriptionExpiryBanner />

          {/* Error Banner - Affichage des erreurs persistantes */}
          {error && (
            <div className="px-6 pt-2">
              <ErrorBanner
                message={error.message}
                actionLabel="Fermer"
                onAction={clearError}
              />
            </div>
          )}

          {/* Contenu principal - padding réduit sur mobile */}
          <main className="flex-1 p-2 sm:p-3 md:p-6 overflow-x-hidden overflow-y-auto pb-20 md:pb-6 w-full max-w-full">
            <Routes>
              {/* Route par défaut */}
              <Route index element={<DashboardHome />} />
              <Route path="dashboard" element={<DashboardHome />} />
              
              {/* Vue d'ensemble */}
              <Route path="analytics" element={<VendorAnalyticsDashboard />} />
              
              {/* Ventes & Commerce */}
              <Route path="pos" element={<POSSystemWrapper />} />
              <Route path="products" element={<ProductManagement />} />
              <Route path="orders" element={<OrderManagement />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="warehouse" element={<WarehouseManagement />} />
              <Route path="suppliers" element={<SupplierManagement />} />
              
              {/* Clients & Marketing */}
              <Route path="agents" element={<AgentManagement />} />
              <Route path="clients" element={<ClientManagement />} />
              <Route path="prospects" element={<ProspectManagement />} />
              <Route path="marketing" element={<MarketingManagement />} />
              
              {/* Finances */}
              <Route path="wallet" element={<UniversalWalletTransactions />} />
              <Route path="quotes-invoices" element={<VendorQuotesInvoices />} />
              <Route path="payments" element={<PaymentManagement />} />
              <Route path="payment-links" element={<PaymentLinksManager />} />
              <Route path="expenses" element={<ExpenseManagementDashboard />} />
              <Route path="debts" element={<VendorDebtManagement vendorId={(stats as any)?.vendorId || ''} />} />
              <Route path="contracts" element={<VendorContracts />} />
              <Route path="affiliate" element={<AffiliateManagement shopId={(stats as any)?.vendorId || undefined} />} />
              
              {/* Support & Outils */}
              <Route path="delivery" element={<VendorDeliveriesPanel />} />
              <Route path="support" element={<SupportTickets />} />
              <Route path="communication" element={<UniversalCommunicationHub />} />
              <Route path="reports" element={<Card><CardContent className="p-6">Module Rapports - En développement</CardContent></Card>} />
              
              {/* Configuration */}
              <Route path="settings" element={<VendorSettings />} />
              
              {/* Autres */}
              <Route path="offline-sync" element={<OfflineSyncPanel />} />
            </Routes>
          </main>
        </div>
      </div>
      
      {/* Widget de communication flottant */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </SidebarProvider>
  );
}

