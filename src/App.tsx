import { Suspense, memo, useEffect, useState } from "react";
import { resolvePostAuthRouteSync } from "@/utils/postAuthRoute";
import { usePrefetchCriticalData } from "@/hooks/usePrefetchCriticalData";
import { useAutoFillGps as useAutoFillGpsHook } from "@/hooks/useAutoFillGps";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CognitoAuthProvider } from "@/contexts/CognitoAuthContext";
import OAuthPasswordGate from "@/components/auth/OAuthPasswordGate";
import CountrySelectionGate from "@/components/auth/CountrySelectionGate";
import { ThemeProvider } from "next-themes";
// OfflineBanner retiré du global - maintenant uniquement dans VendeurDashboard
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { VendorCurrencyProvider } from "@/contexts/VendorCurrencyContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import EscrowDisputePage from "./components/escrow/EscrowDisputePage";
import VendorDisputePage from "./components/vendor/VendorDisputePage";
import { NotificationsRealtimeListener } from "@/components/common/NotificationsRealtimeListener";
import DeepLinkInitializer from "@/components/DeepLinkInitializer";

const MerchantOnboarding = lazyWithRetry(() => import("@/components/onboarding/MerchantOnboarding"));
const WebRTCCallProvider = lazyWithRetry(() => import("@/components/communication/WebRTCCallProvider"));

// Lazy load TOUT - même la page d'accueil pour réduire TBT
const Index = lazyWithRetry(() => import("./pg/Index"));

// Lazy load avec retry automatique pour éviter les erreurs de cache après déploiement
const QuickFooter = lazyWithRetry(() => import("@/components/QuickFooter"));
const CommunicationWidget = lazyWithRetry(() => import("@/components/communication/CommunicationWidget"));
const _PWAInstallPrompt = lazyWithRetry(() => import("@/components/pwa/PWAInstallPrompt"));
const _InstallPromptBanner = lazyWithRetry(() =>
  import("@/components/pwa/InstallPromptBanner").then((m) => ({ default: m.InstallPromptBanner }))
);
const AutoInstallPrompt = lazyWithRetry(() => import("@/components/pwa/AutoInstallPrompt"));

// Lazy loading des pages - regroupées par priorité
const Auth = lazyWithRetry(() => import("./pg/Auth"));
const Home = lazyWithRetry(() => import("./pg/Home"));
const Marketplace = lazyWithRetry(() => import("./pg/Marketplace"));
const ProductDetail = lazyWithRetry(() => import("./pg/ProductDetail"));
const SimilarProducts = lazyWithRetry(() => import("./pg/SimilarProducts"));
const OtherProducts = lazyWithRetry(() => import("./pg/OtherProducts"));
const ForYouPage = lazyWithRetry(() => import("./pg/ForYouPage"));
const VendorShop = lazyWithRetry(() => import("./pg/VendorShop"));
const Messages = lazyWithRetry(() => import("./pg/Messages"));
const ServicesProximite = lazyWithRetry(() => import("./pg/ServicesProximite"));
const Proximite = lazyWithRetry(() => import("./pg/Proximite"));
const NearbyTaxiMoto = lazyWithRetry(() => import("./pg/NearbyTaxiMoto"));
const NearbyLivraison = lazyWithRetry(() => import("./pg/NearbyLivraison"));
const NearbyBoutiques = lazyWithRetry(() => import("./pg/NearbyBoutiques"));
const ClientTrackingPage = lazyWithRetry(() => import("./pg/ClientTrackingPage"));
const MesCommandes = lazyWithRetry(() => import("./pg/MesCommandes"));
const Profil = lazyWithRetry(() => import("./pg/Profil"));
const MyPurchases = lazyWithRetry(() => import("./pg/MyPurchases"));
const AgentLogin = lazyWithRetry(() => import("./pg/AgentLogin"));
const BureauLogin = lazyWithRetry(() => import("./pg/BureauLogin"));
const AgentChangePassword = lazyWithRetry(() => import("./pg/AgentChangePassword"));
const BureauChangePassword = lazyWithRetry(() => import("./pg/BureauChangePassword"));
const ClientDashboard = lazyWithRetry(() => import("./pg/ClientDashboard"));
const VendeurDashboard = lazyWithRetry(() => import("./pg/VendeurDashboard"));
const DigitalVendorDashboard = lazyWithRetry(() => import("./pg/DigitalVendorDashboard"));
const LivreurDashboard = lazyWithRetry(() => import("./pg/LivreurDashboard"));
const DriverProfile = lazyWithRetry(() => import("./pg/driver/DriverProfile"));
const DriverSettings = lazyWithRetry(() => import("./pg/driver/DriverSettings"));
const DriverHelp = lazyWithRetry(() => import("./pg/driver/DriverHelp"));
const TaxiMotoDriver = lazyWithRetry(() => import("./pg/TaxiMotoDriver"));
const DriverSubscriptionPage = lazyWithRetry(() => import("./pg/DriverSubscriptionPage"));
const _VendorSubscriptionPage = lazyWithRetry(() => import("./pg/VendorSubscriptionPage"));
const TaxiMotoClient = lazyWithRetry(() => import("./pg/TaxiMotoClient"));
const TaxiMotoRouter = lazyWithRetry(() => import("./components/taxi-moto/TaxiMotoRouter"));
const SyndicatDashboardUltraPro = lazyWithRetry(() => import("./pg/SyndicatDashboardUltraPro"));
const UserActivationPage = lazyWithRetry(() => import("./components/agent-system/UserActivationPage"));
const TransitaireDashboard = lazyWithRetry(() => import("./pg/TransitaireDashboard"));
const PDG224Solutions = lazyWithRetry(() => import("./pg/PDG224Solutions"));
const PdgCommandCenter = lazyWithRetry(() => import("./pg/PdgCommandCenter"));
const PdgSecurity = lazyWithRetry(() => import("./pg/PdgSecurity"));
const PdgDebug = lazyWithRetry(() => import("./pg/PdgDebug"));
const CompetitiveAnalysis = lazyWithRetry(() => import("./pg/pdg/CompetitiveAnalysis"));
const ApiSupervision = lazyWithRetry(() => import("./pg/pdg/ApiSupervision"));
const _SystemDebugPage = lazyWithRetry(() => import("./pg/pdg/SystemDebugPage"));
const PDGCopilotDashboard = lazyWithRetry(() => import("./components/pdg/PDGCopilotDashboard"));
const MonitoringDashboard = lazyWithRetry(() => import("./pg/pdg/MonitoringDashboard"));
const BureauDashboard = lazyWithRetry(() => import("./pg/BureauDashboard"));
const BureauMonitoringPage = lazyWithRetry(() => import("./pg/BureauMonitoringPage"));
const WorkerDashboard = lazyWithRetry(() => import("./pg/WorkerDashboard"));
const Payment = lazyWithRetry(() => import("./pg/Payment"));
const PaymentPage = lazyWithRetry(() => import("./pg/PaymentPage"));
const PaymentLinkPage = lazyWithRetry(() => import("./pg/PaymentLinkPage"));
const PaymentSuccessRedirect = lazyWithRetry(() => import("./pg/PaymentSuccessRedirect"));
const PaymentCorePage = lazyWithRetry(() => import("./pg/PaymentCore"));
const Orders = lazyWithRetry(() => import("./pg/Orders"));
const DigitalPurchaseDownload = lazyWithRetry(() => import("./pg/DigitalPurchaseDownload"));
const MyDigitalPurchases = lazyWithRetry(() => import("./pg/MyDigitalPurchases"));
const MyDigitalSubscriptions = lazyWithRetry(() => import("./pg/MyDigitalSubscriptions"));
const ContactUserById = lazyWithRetry(() => import("./components/communication/ContactUserById"));
const DirectConversation = lazyWithRetry(() => import("./pg/DirectConversation"));
const Devis = lazyWithRetry(() => import("./pg/Devis"));
const Notifications = lazyWithRetry(() => import("./pg/Notifications"));
const NotFound = lazyWithRetry(() => import("./pg/NotFound"));
const AgentActivation = lazyWithRetry(() => import("./pg/AgentActivation"));
const AgentDashboard = lazyWithRetry(() => import("./pg/AgentDashboard"));
const AgentDashboardPublic = lazyWithRetry(() => import("./pg/AgentDashboardPublic"));
const InstallMobileApp = lazyWithRetry(() => import("./pg/InstallMobileApp"));
const ServiceSelection = lazyWithRetry(() => import("./pg/ServiceSelection"));
const ServiceDashboard = lazyWithRetry(() => import("./pg/ServiceDashboard"));
const MigrateIds = lazyWithRetry(() => import("./pg/Admin/MigrateIds"));
const Wallet = lazyWithRetry(() => import("./pg/Wallet"));
const SubscriptionsPage = lazyWithRetry(() => import("./pg/SubscriptionsPage"));
const AffiliateRedirect = lazyWithRetry(() => import("./pg/AffiliateRedirect"));
const AgentAffiliateRedirect = lazyWithRetry(() => import("./pg/AgentAffiliateRedirect"));
const AffiliateActivationPage = lazyWithRetry(() => import("./pg/AffiliateActivationPage"));
const AffiliateDashboardPage = lazyWithRetry(() => import("./pg/AffiliateDashboardPage"));
const DeliveryRequest = lazyWithRetry(() => import("./pg/DeliveryRequest"));
const DeliveryClient = lazyWithRetry(() => import("./pg/DeliveryClient"));
const BugBounty = lazyWithRetry(() => import("./pg/BugBounty"));
const Cart = lazyWithRetry(() => import("./pg/Cart"));
const VendorAgentInterface = lazyWithRetry(() => import("./pg/VendorAgentInterface"));
const _VendorContracts = lazyWithRetry(() => import("./pg/VendorContracts"));
const ClientContracts = lazyWithRetry(() => import("./pg/ClientContracts"));
const ServiceDetail = lazyWithRetry(() => import("./pg/ServiceDetail"));
const ServiceRedirect = lazyWithRetry(() => import("./pg/ServiceRedirect"));
const Dashboard = lazyWithRetry(() => import("./pg/Dashboard"));
const UniversalLoginPage = lazyWithRetry(() => import("./pg/UniversalLoginPage"));
const SetPasswordAfterOAuth = lazyWithRetry(() => import("./pg/SetPasswordAfterOAuth"));
const SelectCountryPage = lazyWithRetry(() => import("./pg/SelectCountryPage"));
const ResetPassword = lazyWithRetry(() => import("./pg/ResetPassword"));
const AuthConfirm = lazyWithRetry(() => import("./pg/AuthConfirm"));
const AgentCreation = lazyWithRetry(() => import("./pg/AgentCreation"));
const WorkerSettings = lazyWithRetry(() => import("./pg/WorkerSettings"));
const BadgeVerification = lazyWithRetry(() => import("./pg/BadgeVerification"));
const StolenMotoDeclaration = lazyWithRetry(() => import("./pg/StolenMotoDeclaration"));
const VisualSearch = lazyWithRetry(() => import("./pg/VisualSearch"));
const Categories = lazyWithRetry(() => import("./pg/Categories"));
const DigitalProducts = lazyWithRetry(() => import("./pg/DigitalProducts"));
const DigitalProductDetail = lazyWithRetry(() => import("./pg/DigitalProductDetail"));
const ShortLinkRedirect = lazyWithRetry(() => import("./pg/ShortLinkRedirect"));
const UserPublicProfile = lazyWithRetry(() => import("./pg/UserPublicProfile"));
const RestaurantPublicMenu = lazyWithRetry(() => import("./pg/RestaurantPublicMenu"));
// Ultra-simple loading component with built-in timeout to prevent infinite loading
const PageLoader = memo(() => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#023288', marginBottom: '16px' }}>224Solutions</div>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Le chargement prend trop de temps.</p>
          <button onClick={() => window.location.reload()} style={{
            padding: '10px 24px', background: '#023288', color: '#fff', border: 'none',
            borderRadius: '8px', cursor: 'pointer', fontSize: '14px', marginBottom: '8px', width: '100%'
          }}>Recharger l'application</button>
          <button onClick={() => {
            if ('caches' in window) caches.keys().then(k => k.forEach(n => caches.delete(n)));
            if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
            setTimeout(() => window.location.replace('/?resetSw=1'), 500);
          }} style={{
            padding: '10px 24px', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb',
            borderRadius: '8px', cursor: 'pointer', fontSize: '13px', width: '100%'
          }}>Réinitialiser le cache PWA</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '24px', fontWeight: '700', color: '#023288', marginBottom: '16px',
          fontFamily: 'system-ui, sans-serif'
        }}>224Solutions</div>
        <div style={{
          width: '32px', height: '32px', border: '3px solid #f3f4f6',
          borderTop: '3px solid #023288', borderRadius: '50%',
          margin: '0 auto', animation: 'spin 0.8s linear infinite'
        }} />
      </div>
      <style dangerouslySetInnerHTML={{__html: '@keyframes spin { to { transform: rotate(360deg); } }'}} />
    </div>
  );
});
PageLoader.displayName = 'PageLoader';

/**
 * RootRedirect - Logique intelligente pour la route "/"
 * Connecté → dashboard selon rôle | Non connecté → landing page
 */
function RootRedirect() {
  const { user, profile, loading, profileLoading } = useAuth();

  // 1. Non connecté → landing immédiate
  if (!user && !loading) {
    return <Index />;
  }

  // 2. Connecté + rôle → redirection instantanée (déclaratif, pas de useEffect)
  if (user && profile?.role) {
    const route = resolvePostAuthRouteSync(profile.role);
    return <Navigate to={route} replace />;
  }

  // 3. Encore en chargement → loader léger
  if (loading || profileLoading) {
    return <PageLoader />;
  }

  // 4. Fallback sécurité (connecté sans profil chargé)
  return <Index />;
}

// Auto-fill GPS component - runs once when user is authenticated
function GpsAutoFill() {
  const { autoFillGps } = useAutoFillGpsHook();
  useEffect(() => { autoFillGps(); }, [autoFillGps]);
  return null;
}

// Configure QueryClient with optimized cache for high-traffic multi-cloud
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - données considérées fraîches
      gcTime: 1000 * 60 * 30, // 30 minutes - garde en cache mémoire
      retry: (failureCount, error: any) => {
        // Ne pas retry sur les erreurs 4xx (sauf 429)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex + Math.random() * 500, 15000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Rafraîchir après reconnexion réseau
      networkMode: 'offlineFirst', // Supporter le mode hors-ligne
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// Composant pour le prefetching des données critiques
function AppPrefetcher() {
  usePrefetchCriticalData();
  return null;
}

function RoutedEscrowDisputePage() {
  const { escrowId = "" } = useParams<{ escrowId: string }>();
  return <EscrowDisputePage escrowId={escrowId} />;
}

function RoutedVendorDisputePage() {
  const { escrowId = "" } = useParams<{ escrowId: string }>();
  return <VendorDisputePage escrowId={escrowId} />;
}

function App() {
  useEffect(() => {
    // Important: éviter la perte de session OAuth entre http/https sur le domaine production
    if (window.location.hostname.includes('224solution.net') && window.location.protocol === 'http:') {
      const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
      console.log('🔄 Redirecting to HTTPS:', httpsUrl);
      window.location.replace(httpsUrl);
    }

    // Nettoyage automatique des données de persistence expirées
    import('@/hooks/useAppPersistence').then(({ cleanupExpiredPersistence }) => {
      const cleaned = cleanupExpiredPersistence();
      if (cleaned > 0) {
        console.log(`🧹 Nettoyage: ${cleaned} entrée(s) de persistence expirée(s) supprimée(s)`);
      }
    }).catch(() => {});

    // Enregistrement du Service Worker pour PWA (centralisé dans src/main.tsx)

  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AppPrefetcher />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <BrowserRouter>
            <LanguageProvider>
              <CurrencyProvider>
                <AuthProvider>
                <VendorCurrencyProvider>
                <GpsAutoFill />
                <CognitoAuthProvider>
                  <OAuthPasswordGate />
                  <CountrySelectionGate />
                  <CartProvider>
                  <TooltipProvider>
                  <Toaster />
                  <Sonner />
                    {/* Réception globale des notifications (Realtime + toast) */}
                    <NotificationsRealtimeListener />
                  {/* OfflineBanner retiré - uniquement dans VendeurDashboard */}
                  {/* Prompt d'installation PWA automatique */}
                  <Suspense fallback={null}>
                    <AutoInstallPrompt delayMs={8000} />
                  </Suspense>
                  <Suspense fallback={null}>
                    <MerchantOnboarding />
                  </Suspense>
                  <Suspense fallback={null}>
                    <WebRTCCallProvider>
                      <></>
                    </WebRTCCallProvider>
                  </Suspense>

                  <ErrorBoundary>
                <DeepLinkInitializer />
                <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Route racine: redirige vers dashboard si connecté, sinon landing */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/index" element={<Navigate to="/" replace />} />
                <Route path="/index.html" element={<Navigate to="/" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* Accueil application (avec footer + services) */}
                <Route path="/home" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
<Route path="/universal-login" element={<UniversalLoginPage />} />
                <Route path="/auth/set-password" element={<SetPasswordAfterOAuth />} />
                <Route path="/auth/select-country" element={<SelectCountryPage />} />
                <Route path="/auth/confirm" element={<AuthConfirm />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/agent/create" element={<AgentCreation />} />
                <Route path="/worker/settings" element={<WorkerSettings />} />
                {/* <Route path="/install" element={<InstallPWA />} /> PWA désactivée */}
                <Route path="/install-app" element={<InstallMobileApp />} />

                {/* Main App Routes */}
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/marketplace/visual-search" element={<VisualSearch />} />
                <Route path="/marketplace/similar/:id" element={<SimilarProducts />} />
                <Route path="/marketplace/others/:id" element={<OtherProducts />} />
                <Route path="/marketplace/for-you" element={<ForYouPage />} />
                <Route path="/marketplace/product/:id" element={<ProductDetail />} />
                <Route path="/marketplace/product/:id/*" element={<ProductDetail />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/product/:id/*" element={<ProductDetail />} />
                <Route path="/produit/:id" element={<ProductDetail />} />
                <Route path="/produit/:id/*" element={<ProductDetail />} />
                {/* Short URL redirect - must be before shop/boutique routes */}
                <Route path="/s/:shortCode" element={<ShortLinkRedirect />} />
                <Route path="/s/:shortCode/*" element={<ShortLinkRedirect />} />
                <Route path="/shop/:vendorId" element={<VendorShop />} />
                <Route path="/shop/:vendorId/*" element={<VendorShop />} />
                <Route path="/boutique/:slug" element={<VendorShop />} />
                <Route path="/boutique/:slug/*" element={<VendorShop />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/contact-user" element={<ContactUserById />} />
                {/* Messagerie directe: supporte les deux formats (legacy direct_ + nouveau direct/) */}
                <Route path="/communication/direct/:userId" element={<DirectConversation />} />
                <Route path="/communication/direct_:userId" element={<DirectConversation />} />
                <Route path="/proximite" element={<Proximite />} />
                <Route path="/proximite/taxi-moto" element={<NearbyTaxiMoto />} />
                <Route path="/proximite/livraison" element={<NearbyLivraison />} />
                <Route path="/proximite/boutiques" element={<NearbyBoutiques />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/digital-products" element={<DigitalProducts />} />
                <Route path="/digital-product/:id" element={<DigitalProductDetail />} />
                <Route path="/boutiques" element={<NearbyBoutiques />} />

                <Route path="/services-proximite" element={<ServicesProximite />} />
                <Route path="/services-proximite/:id" element={<ServiceDetail />} />
                {/* Page publique menu restaurant pour commande client */}
                <Route path="/restaurant/:serviceId/menu" element={<RestaurantPublicMenu />} />
                {/* Alias legacy: /service/:id -> /services-proximite/:id */}
                <Route path="/service/:id" element={<ServiceRedirect />} />
                {/* Service Selection - Protected for logged-in users to create their professional service */}
                <Route path="/service-selection" element={<ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'driver', 'admin', 'syndicat', 'agent', 'transitaire', 'prestataire']}><ServiceSelection /></ProtectedRoute>} />
                <Route path="/devis" element={<Devis />} />
                <Route path="/delivery-request" element={<DeliveryRequest />} />
                <Route path="/delivery" element={<DeliveryClient />} />
                <Route path="/taxi" element={<TaxiMotoRouter />} />
                <Route path="/taxi-moto" element={<TaxiMotoClient />} />
                <Route path="/taxi-moto/driver" element={<ProtectedRoute allowedRoles={['taxi', 'driver', 'admin']}><TaxiMotoDriver /></ProtectedRoute>} />
                {/* Redirection 301 depuis l'alias vers la route normalisée */}
                <Route path="/taxi-moto-driver" element={<Navigate to="/taxi-moto/driver" replace />} />
                {/* Abonnement conducteur: disponible pour taxi/driver et vendeur */}
                {/* Abonnement conducteur: disponible pour taxi/driver et vendeur */}
                <Route path="/driver-subscription" element={<ProtectedRoute allowedRoles={['taxi', 'driver', 'livreur', 'admin']}><DriverSubscriptionPage /></ProtectedRoute>} />
                <Route path="/vendeur/subscription" element={<ProtectedRoute allowedRoles={['vendeur', 'admin']}><SubscriptionsPage /></ProtectedRoute>} />
                <Route path="/tracking" element={<ClientTrackingPage />} />
                <Route path="/client-tracking" element={<ClientTrackingPage />} />
                <Route path="/profil" element={<Profil />} />
                <Route path="/my-purchases" element={<MyPurchases />} />
                <Route path="/payment/success" element={<PaymentSuccessRedirect />} />
                <Route path="/mes-commandes" element={<MesCommandes />} />
                <Route path="/profile/:userId" element={<UserPublicProfile />} />

                {/* Affiliate Routes - Vendeur */}
                <Route path="/ref/:vendorId" element={<AffiliateRedirect />} />

                {/* Affiliate Routes - Agent (redirection vers page de connexion) */}
                <Route path="/register" element={<AgentAffiliateRedirect />} />
                <Route path="/r/:token" element={<AgentAffiliateRedirect />} />
                <Route
                  path="/affiliate/activation"
                  element={
                    <ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'driver', 'admin', 'syndicat', 'agent', 'transitaire', 'prestataire']}>
                      <AffiliateActivationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/affiliate/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'driver', 'admin', 'syndicat', 'agent', 'transitaire', 'prestataire']}>
                      <AffiliateDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Dashboard Routes */}
                <Route
                  path="/vendeur/*"
                  element={
                    <ProtectedRoute allowedRoles={['vendeur', 'admin']} allowOfflineAccess>
                      <VendeurDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Dashboard Vendeur Digital - Interface dédiée produits numériques */}
                <Route
                  path="/vendeur-digital/*"
                  element={
                    <ProtectedRoute allowedRoles={['vendeur', 'admin']}>
                      <DigitalVendorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/livreur"
                  element={
                    <ProtectedRoute allowedRoles={['livreur', 'admin']}>
                      <LivreurDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/livreur/profile"
                  element={
                    <ProtectedRoute allowedRoles={['livreur', 'admin']}>
                      <DriverProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/livreur/settings"
                  element={
                    <ProtectedRoute allowedRoles={['livreur', 'admin']}>
                      <DriverSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/livreur/help"
                  element={
                    <ProtectedRoute allowedRoles={['livreur', 'admin']}>
                      <DriverHelp />
                    </ProtectedRoute>
                  }
                />
                {/* Removed legacy TaxiDashboard */}
                <Route path="/syndicat" element={<ProtectedRoute allowedRoles={['syndicat', 'admin']}><SyndicatDashboardUltraPro /></ProtectedRoute>} />
                <Route
                  path="/invite/:invitationToken"
                  element={<UserActivationPage />}
                />
                <Route
                  path="/payment/:paymentId"
                  element={<PaymentPage />}
                />
                <Route
                  path="/pay/:token"
                  element={<PaymentLinkPage />}
                />
                <Route
                  path="/payment"
                  element={<Payment />}
                />
                <Route
                  path="/payment-core"
                  element={<PaymentCorePage />}
                />

                <Route path="/orders" element={<Orders />} />
                <Route path="/digital-purchase/:productId" element={<DigitalPurchaseDownload />} />
                <Route path="/my-digital-purchases" element={<MyDigitalPurchases />} />
                <Route path="/my-digital-subscriptions" element={<MyDigitalSubscriptions />} />
                <Route
                  path="/wallet"
                  element={
                    <ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'driver', 'admin', 'syndicat', 'agent', 'transitaire', 'prestataire']}>
                      <Wallet />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/subscriptions"
                  element={
                    <ProtectedRoute allowedRoles={['vendeur', 'admin']}>
                      <SubscriptionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/migrate-ids"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <MigrateIds />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transitaire"
                  element={
                    <ProtectedRoute allowedRoles={['transitaire', 'admin']}>
                      <TransitaireDashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Rediriger /admin vers /pdg - Interface principale de gestion */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pdg']}>
                      <PDG224Solutions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdg"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pdg', 'ceo']}>
                      <PDG224Solutions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdg/debug"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pdg', 'ceo']}>
                      <PdgDebug />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdg/api-supervision"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pdg', 'ceo']}>
                      <ApiSupervision />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdg/command-center"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pdg', 'ceo']}>
                      <PdgCommandCenter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdg/security"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pdg', 'ceo']}>
                      <PdgSecurity />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pdg/competitive-analysis"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'pdg', 'ceo']}>
                      <CompetitiveAnalysis />
                    </ProtectedRoute>
                  }
                />
                <Route path="/pdg224solutionssoulbah" element={<ProtectedRoute allowedRoles={['admin', 'pdg', 'ceo']}><PDG224Solutions /></ProtectedRoute>} />
                <Route path="/pdg/copilot" element={<ProtectedRoute allowedRoles={['pdg', 'ceo', 'admin']}><PDGCopilotDashboard /></ProtectedRoute>} />
                <Route path="/pdg/monitoring" element={<ProtectedRoute allowedRoles={['pdg', 'ceo', 'admin']}><MonitoringDashboard /></ProtectedRoute>} />

                {/* Agent & Bureau Login with MFA */}
                <Route path="/agent/login" element={<AgentLogin />} />
                <Route path="/agent-login" element={<Navigate to="/agent/login" replace />} />
                <Route path="/bureau/login" element={<BureauLogin />} />
                <Route path="/bureau-login" element={<Navigate to="/bureau/login" replace />} />
                <Route path="/agent/change-password" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AgentChangePassword /></ProtectedRoute>} />
                <Route path="/bureau/change-password" element={<ProtectedRoute allowedRoles={['syndicat', 'admin']}><BureauChangePassword /></ProtectedRoute>} />

                {/* Agent & Bureau Dashboards */}
                <Route path="/bureau/:token" element={<BureauDashboard />} />
                <Route path="/worker/:token" element={<WorkerDashboard />} />
                <Route path="/agent/activate/:token" element={<AgentActivation />} />
                <Route path="/agent/:token" element={<AgentDashboardPublic />} />
                <Route path="/vendor-agent/:token" element={<VendorAgentInterface />} />
                <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AgentDashboard /></ProtectedRoute>} />
                <Route path="/agent-dashboard" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AgentDashboard /></ProtectedRoute>} />
                <Route path="/bureau" element={<ProtectedRoute allowedRoles={['syndicat', 'admin']}><BureauDashboard /></ProtectedRoute>} />
                <Route path="/bureau/monitoring" element={<BureauMonitoringPage />} />
                <Route path="/stolen-moto-declaration" element={<StolenMotoDeclaration />} />
                <Route path="/client" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientDashboard /></ProtectedRoute>} />
                <Route path="/client/contracts" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientContracts /></ProtectedRoute>} />
                <Route
                  path="/vendeur-simple"
                  element={<ProtectedRoute allowedRoles={['vendeur', 'admin']} allowOfflineAccess><VendeurDashboard /></ProtectedRoute>}
                />

                {/* Professional Services Routes */}
                <Route
                  path="/services"
                  element={
                    <ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'agent', 'syndicat', 'transitaire', 'admin']}>
                      <ServiceSelection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/service/:serviceId"
                  element={
                    <ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'agent', 'syndicat', 'transitaire', 'admin', 'prestataire']}>
                      <ServiceDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Bug Bounty - Public */}
                <Route path="/bug-bounty" element={<BugBounty />} />

                {/* Badge Verification - Public */}
                <Route path="/badge/:vehicleId" element={<BadgeVerification />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                {/* Page justification litige Escrow */}
                <Route path="/escrow/dispute/:escrowId" element={<RoutedEscrowDisputePage />} />
                <Route path="/escrow/vendor-dispute/:escrowId" element={<RoutedVendorDisputePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Suspense fallback={null}>
                <CommunicationWidget position="bottom-right" showNotifications={true} />
                <QuickFooter />
              </Suspense>
            </Suspense>
            </ErrorBoundary>
          </TooltipProvider>
        </CartProvider>
      </CognitoAuthProvider>
      </VendorCurrencyProvider>
      </AuthProvider>
      </CurrencyProvider>
      </LanguageProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
    </>
  );
}

export default App;
