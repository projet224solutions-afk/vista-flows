/**
 * DASHBOARD VENDEUR PROFESSIONNEL - 224SOLUTIONS
 * Interface complète avec sidebar et tous les modules
 * @updated 2025-12-20 - Ajout du panneau Avis Clients
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
import { ProfessionalVirtualCard } from "@/components/virtual-card";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import OfflineSyncPanel from "@/components/vendor/OfflineSyncPanel";
import NetworkStatusIndicator from "@/components/vendor/NetworkStatusIndicator";
// import PWAInstallButton from "@/components/pwa/PWAInstallButton"; // PWA désactivée
import { VendorIdDisplay } from "@/components/vendor/VendorIdDisplay";
import { VendorNotificationsPanel } from "@/components/vendor/VendorNotificationsPanel";
import CommunicationWidget from "@/components/communication/CommunicationWidget";
import { VendorDeliveriesPanel } from "@/components/vendor/VendorDeliveriesPanel";
import VendorRatingsPanel from "@/components/vendor/VendorRatingsPanel";
import { PushNotificationButton } from "@/components/vendor/PushNotificationButton";
import { ProtectedRoute } from "@/components/subscription/ProtectedRoute";
import { VendorSubscriptionButton } from "@/components/vendor/VendorSubscriptionButton";
import { VendorSubscriptionBanner } from "@/components/vendor/VendorSubscriptionBanner";
import { SubscriptionExpiryBanner } from "@/components/vendor/SubscriptionExpiryBanner";
import VendorQuotesInvoices from "@/pages/VendorQuotesInvoices";
import VendorContracts from "@/pages/VendorContracts";
import VendorSettings from "@/pages/vendor/Settings";
import CopiloteChat from "@/components/copilot/CopiloteChat";
import ReviewsManagement from "@/components/vendor/ReviewsManagement";
import VendorServiceModule from "@/components/vendor/VendorServiceModule";
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
  const { stats, loading: statsLoading, error: statsError } = useVendorStats();
  
  // Gestion des erreurs centralisée
  const { error, captureError, clearError } = useVendorErrorBoundary();
  const [recentOrders, setRecentOrders] = useState<{
    order_number: string;
    customer_label: string;
    status: string;
    total_amount: number;
    created_at: string;
  }[]>([]);
  const [showAllOrders, setShowAllOrders] = useState(false);

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
        
        if (vendorError) {
          console.warn('Erreur chargement vendeur:', vendorError);
          return;
        }

        if (!vendor) {
          console.info('Aucun vendeur pour cet utilisateur, commandes ignorées');
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
    const isVendorMissing = statsError === 'Vendor profile not found';

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className={isVendorMissing ? undefined : "text-destructive"}>
              {isVendorMissing ? "Accès vendeur indisponible" : t('vendor.loadError')}
            </CardTitle>
            <CardDescription>
              {isVendorMissing
                ? "Ce compte n'est pas rattaché à une boutique vendeur."
                : t('vendor.loadErrorDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isVendorMissing
                ? "Retournez à l'accueil pour utiliser votre compte utilisateur."
                : t('vendor.checkConnection')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => navigate('/')} className="w-full">
                Aller à l'accueil
              </Button>
              {!isVendorMissing && (
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                  {t('common.reloadPage')}
                </Button>
              )}
            </div>
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
            <CardDescription>Vos 2 dernières commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(showAllOrders ? recentOrders : recentOrders.slice(0, 2)).map((o) => (
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
              {recentOrders.length > 2 && (
                <Button 
                  variant="ghost" 
                  className="w-full text-primary" 
                  onClick={() => setShowAllOrders(!showAllOrders)}
                >
                  {showAllOrders ? 'Voir moins' : `Voir plus (${recentOrders.length - 2} autres)`}
                  <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${showAllOrders ? 'rotate-90' : ''}`} />
                </Button>
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
          <header className="min-h-14 md:min-h-16 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-40 shadow-sm px-2 sm:px-3 md:px-6 w-full max-w-full overflow-visible">
            <div className="flex flex-col sm:flex-row sm:items-center w-full min-w-0 gap-2 py-2 md:py-0">
              {/* Ligne 1 (mobile): menu + logo + nom app */}
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="h-[60px] w-[60px] sm:h-10 sm:w-10 md:h-8 md:w-8 sm:mr-2 md:mr-4 [&_svg]:h-8 [&_svg]:w-8 sm:[&_svg]:h-5 sm:[&_svg]:w-5" />

                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>

                <h1 className="text-sm md:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent whitespace-nowrap pr-1">
                  224Solutions
                </h1>
              </div>

              {/* Ligne 2 (mobile): user+ID à gauche, actions à droite */}
              <div className="flex items-center justify-between w-full min-w-0 gap-2">
                <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
                    <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                      {profile?.first_name || user?.email?.split('@')[0]}
                    </span>
                  </p>
                  <VendorIdDisplay showName={false} />
                </div>

                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                  <div className="hidden md:block">
                    <NetworkStatusIndicator />
                  </div>

                  <QuickTransferButton variant="ghost" size="icon" showText={false} className="h-8 w-8 md:h-10 md:w-10" />
                  <div className="hidden sm:block">
                    <VendorSubscriptionButton />
                  </div>

                  <PushNotificationButton className="h-8 w-8 md:h-10 md:w-10" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-10 md:w-10"
                    onClick={() => navigate('/vendeur/settings')}
                    title="Paramètres"
                  >
                    <Settings className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8 md:h-10 md:w-10">
                    <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Wallet compact - visible uniquement sur grands écrans */}
            <div className="hidden xl:block pb-2">
              <WalletBalanceWidget className="max-w-[250px]" showTransferButton={false} />
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

          {/* Contenu principal - padding optimisé pour éviter coupures */}
          <main className="flex-1 p-2 sm:p-3 md:p-6 overflow-x-hidden overflow-y-auto pt-4 pb-24 md:pb-8 w-full max-w-full">
            <Routes>
              {/* Route par défaut - toujours accessible */}
              <Route index element={<DashboardHome />} />
              <Route path="dashboard" element={<DashboardHome />} />
              
              {/* Vue d'ensemble - Analytics (Basic+) */}
              <Route path="analytics" element={
                <ProtectedRoute feature="analytics_basic">
                  <VendorAnalyticsDashboard />
                </ProtectedRoute>
              } />
              
              {/* Ventes & Commerce */}
              {/* POS - Basic+ */}
              <Route path="pos" element={
                <ProtectedRoute feature="pos_system">
                  <POSSystemWrapper />
                </ProtectedRoute>
              } />
              {/* Module Métier - Charge le module spécialisé selon le service_type */}
              <Route path="service-module" element={
                <ProtectedRoute feature="pos_system">
                  <VendorServiceModule />
                </ProtectedRoute>
              } />
              {/* Produits - Free (avec limite) */}
              <Route path="products" element={
                <ProtectedRoute feature="products_basic">
                  <ProductManagement />
                </ProtectedRoute>
              } />
              {/* Commandes - Free */}
              <Route path="orders" element={
                <ProtectedRoute feature="orders_simple">
                  <OrderManagement />
                </ProtectedRoute>
              } />
              {/* Inventaire - Basic+ */}
              <Route path="inventory" element={
                <ProtectedRoute feature="inventory_management">
                  <InventoryManagement />
                </ProtectedRoute>
              } />
              {/* Entrepôts - Business+ */}
              <Route path="warehouse" element={
                <ProtectedRoute feature="multi_warehouse">
                  <WarehouseManagement />
                </ProtectedRoute>
              } />
              {/* Fournisseurs - Business+ */}
              <Route path="suppliers" element={
                <ProtectedRoute feature="supplier_management">
                  <SupplierManagement />
                </ProtectedRoute>
              } />
              
              {/* CRM & Marketing */}
              {/* Clients - Basic+ */}
              <Route path="clients" element={
                <ProtectedRoute feature="crm_basic">
                  <ClientManagement />
                </ProtectedRoute>
              } />
              {/* Agents - Pro+ */}
              <Route path="agents" element={
                <ProtectedRoute feature="sales_agents">
                  <AgentManagement />
                </ProtectedRoute>
              } />
              {/* Prospects - Business+ */}
              <Route path="prospects" element={
                <ProtectedRoute feature="prospect_management">
                  <ProspectManagement />
                </ProtectedRoute>
              } />
              {/* Marketing - Pro+ */}
              <Route path="marketing" element={
                <ProtectedRoute feature="marketing_promotions">
                  <MarketingManagement />
                </ProtectedRoute>
              } />
              
              {/* Finances */}
              {/* Wallet - Free (accès basique) */}
              <Route path="wallet" element={
                <ProtectedRoute feature="wallet_basic">
                  <UniversalWalletTransactions />
                </ProtectedRoute>
              } />
              {/* Carte virtuelle - Free */}
              <Route path="virtual-card" element={
                <ProtectedRoute feature="wallet_basic">
                  <Card>
                    <CardHeader>
                      <CardTitle>Carte Virtuelle 224PAY</CardTitle>
                      <CardDescription>Gérez votre carte virtuelle pour les paiements en ligne</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProfessionalVirtualCard />
                    </CardContent>
                  </Card>
                </ProtectedRoute>
              } />
              {/* Devis & Factures - Business+ */}
              <Route path="quotes-invoices" element={
                <ProtectedRoute feature="quotes_invoices">
                  <VendorQuotesInvoices />
                </ProtectedRoute>
              } />
              {/* Paiements - Business+ */}
              <Route path="payments" element={
                <ProtectedRoute feature="payments">
                  <PaymentManagement />
                </ProtectedRoute>
              } />
              {/* Liens de paiement - Business+ */}
              <Route path="payment-links" element={
                <ProtectedRoute feature="payment_links">
                  <PaymentLinksManager />
                </ProtectedRoute>
              } />
              {/* Dépenses - Business+ */}
              <Route path="expenses" element={
                <ProtectedRoute feature="expenses">
                  <ExpenseManagementDashboard />
                </ProtectedRoute>
              } />
              {/* Dettes - Business+ */}
              <Route path="debts" element={
                <ProtectedRoute feature="debt_management">
                  <VendorDebtManagement vendorId={stats?.vendorId || ''} />
                </ProtectedRoute>
              } />
              {/* Contrats - Business+ */}
              <Route path="contracts" element={
                <ProtectedRoute feature="contracts">
                  <VendorContracts />
                </ProtectedRoute>
              } />
              {/* Affiliation - Pro+ */}
              <Route path="affiliate" element={
                <ProtectedRoute feature="affiliate_program">
                  <AffiliateManagement shopId={stats?.vendorId || undefined} />
                </ProtectedRoute>
              } />
              
              {/* Services */}
              {/* Livraison - Basic+ */}
              <Route path="delivery" element={
                <ProtectedRoute feature="delivery_tracking">
                  <VendorDeliveriesPanel />
                </ProtectedRoute>
              } />
              {/* Avis clients - Free */}
              <Route path="ratings" element={
                <ProtectedRoute feature="ratings">
                  <VendorRatingsPanel />
                </ProtectedRoute>
              } />
              {/* Support - Basic+ */}
              <Route path="support" element={
                <ProtectedRoute feature="support_basic">
                  <SupportTickets />
                </ProtectedRoute>
              } />
              {/* Messages - Basic+ */}
              <Route path="communication" element={
                <ProtectedRoute feature="communication_hub">
                  <UniversalCommunicationHub />
                </ProtectedRoute>
              } />
              {/* Avis Clients - Basic+ */}
              <Route path="reviews" element={
                <ProtectedRoute feature="copilot_ai">
                  <ReviewsManagement />
                </ProtectedRoute>
              } />

              {/* Rapports - Business+ */}
              <Route path="reports" element={
                <ProtectedRoute feature="data_export">
                  <Card><CardContent className="p-6">Module Rapports - En développement</CardContent></Card>
                </ProtectedRoute>
              } />
              
              {/* Système */}
              {/* Copilote IA - Basic+ */}
              <Route path="copilote" element={
                <ProtectedRoute feature="copilot_ai">
                  <Card>
                    <CardHeader>
                      <CardTitle>Copilote IA Vendeur</CardTitle>
                      <CardDescription>Votre assistant intelligent pour gérer votre boutique</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CopiloteChat userRole="vendeur" height="500px" />
                    </CardContent>
                  </Card>
                </ProtectedRoute>
              } />
              {/* Paramètres - Toujours accessible */}
              <Route path="settings" element={<VendorSettings />} />
              
              {/* Autres - Premium */}
              <Route path="offline-sync" element={
                <ProtectedRoute feature="offline_mode">
                  <OfflineSyncPanel />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </div>
      
      {/* Widget de communication flottant */}
      <CommunicationWidget position="bottom-right" showNotifications={true} />
    </SidebarProvider>
  );
}

