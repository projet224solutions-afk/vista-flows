import { Suspense, memo, useEffect, useState } from "react";
import { resolvePostAuthRouteSync } from "@/utils/postAuthRoute";
import { usePrefetchCriticalData } from "@/hooks/usePrefetchCriticalData";
import { useAutoFillGps as useAutoFillGpsHook } from "@/hooks/useAutoFillGps";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CognitoAuthProvider } from "@/contexts/CognitoAuthContext";
import OAuthPasswordGate from "@/components/auth/OAuthPasswordGate";
import { ThemeProvider } from "next-themes";
// OfflineBanner retiré du global - maintenant uniquement dans VendeurDashboard
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { NotificationsRealtimeListener } from "@/components/common/NotificationsRealtimeListener";
import DeepLinkInitializer from "@/components/DeepLinkInitializer";

const MerchantOnboarding = lazyWithRetry(() => import("@/components/onboarding/MerchantOnboarding"));
const WebRTCCallProvider = lazyWithRetry(() => import("@/components/communication/WebRTCCallProvider"));

// Lazy load TOUT - même la page d'accueil pour réduire TBT
const Index = lazyWithRetry(() => import("./pages/Index"));

// Lazy load avec retry automatique pour éviter les erreurs de cache après déploiement
const QuickFooter = lazyWithRetry(() => import("@/components/QuickFooter"));
const CommunicationWidget = lazyWithRetry(() => import("@/components/communication/CommunicationWidget"));
const _PWAInstallPrompt = lazyWithRetry(() => import("@/components/pwa/PWAInstallPrompt"));
const _InstallPromptBanner = lazyWithRetry(() =>
  import("@/components/pwa/InstallPromptBanner").then((m) => ({ default: m.InstallPromptBanner }))
);
const AutoInstallPrompt = lazyWithRetry(() => import("@/components/pwa/AutoInstallPrompt"));

// Lazy loading des pages - regroupées par priorité
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Home = lazyWithRetry(() => import("./pages/Home"));
const Marketplace = lazyWithRetry(() => import("./pages/Marketplace"));
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const SimilarProducts = lazyWithRetry(() => import("./pages/SimilarProducts"));
const OtherProducts = lazyWithRetry(() => import("./pages/OtherProducts"));
const ForYouPage = lazyWithRetry(() => import("./pages/ForYouPage"));
const VendorShop = lazyWithRetry(() => import("./pages/VendorShop"));
const Messages = lazyWithRetry(() => import("./pages/Messages"));
const ServicesProximite = lazyWithRetry(() => import("./pages/ServicesProximite"));
const Proximite = lazyWithRetry(() => import("./pages/Proximite"));
const NearbyTaxiMoto = lazyWithRetry(() => import("./pages/NearbyTaxiMoto"));
const NearbyLivraison = lazyWithRetry(() => import("./pages/NearbyLivraison"));
const NearbyBoutiques = lazyWithRetry(() => import("./pages/NearbyBoutiques"));
const ClientTrackingPage = lazyWithRetry(() => import("./pages/ClientTrackingPage"));
const MesCommandes = lazyWithRetry(() => import("./pages/MesCommandes"));
const Profil = lazyWithRetry(() => import("./pages/Profil"));
const MyPurchases = lazyWithRetry(() => import("./pages/MyPurchases"));
const AgentLogin = lazyWithRetry(() => import("./pages/AgentLogin"));
const BureauLogin = lazyWithRetry(() => import("./pages/BureauLogin"));
const AgentChangePassword = lazyWithRetry(() => import("./pages/AgentChangePassword"));
const BureauChangePassword = lazyWithRetry(() => import("./pages/BureauChangePassword"));
const ClientDashboard = lazyWithRetry(() => import("./pages/ClientDashboard"));
const VendeurDashboard = lazyWithRetry(() => import("./pages/VendeurDashboard"));
const DigitalVendorDashboard = lazyWithRetry(() => import("./pages/DigitalVendorDashboard"));
const LivreurDashboard = lazyWithRetry(() => import("./pages/LivreurDashboard"));
const DriverProfile = lazyWithRetry(() => import("./pages/driver/DriverProfile"));
const DriverSettings = lazyWithRetry(() => import("./pages/driver/DriverSettings"));
const DriverHelp = lazyWithRetry(() => import("./pages/driver/DriverHelp"));
const TaxiMotoDriver = lazyWithRetry(() => import("./pages/TaxiMotoDriver"));
const DriverSubscriptionPage = lazyWithRetry(() => import("./pages/DriverSubscriptionPage"));
const VendorSubscriptionPage = lazyWithRetry(() => import("./pages/VendorSubscriptionPage"));
const TaxiMotoClient = lazyWithRetry(() => import("./pages/TaxiMotoClient"));
const TaxiMotoRouter = lazyWithRetry(() => import("./components/taxi-moto/TaxiMotoRouter"));
const SyndicatDashboardUltraPro = lazyWithRetry(() => import("./pages/SyndicatDashboardUltraPro"));
const UserActivationPage = lazyWithRetry(() => import("./components/agent-system/UserActivationPage"));
const TransitaireDashboard = lazyWithRetry(() => import("./pages/TransitaireDashboard"));
const PDG224Solutions = lazyWithRetry(() => import("./pages/PDG224Solutions"));
const PdgCommandCenter = lazyWithRetry(() => import("./pages/PdgCommandCenter"));
const PdgSecurity = lazyWithRetry(() => import("./pages/PdgSecurity"));
const PdgDebug = lazyWithRetry(() => import("./pages/PdgDebug"));
const CompetitiveAnalysis = lazyWithRetry(() => import("./pages/pdg/CompetitiveAnalysis"));
const ApiSupervision = lazyWithRetry(() => import("./pages/pdg/ApiSupervision"));
const SystemDebugPage = lazyWithRetry(() => import("./pages/pdg/SystemDebugPage"));
const PDGCopilotDashboard = lazyWithRetry(() => import("./components/pdg/PDGCopilotDashboard"));
const MonitoringDashboard = lazyWithRetry(() => import("./pages/pdg/MonitoringDashboard"));
const BureauDashboard = lazyWithRetry(() => import("./pages/BureauDashboard"));
const BureauMonitoringPage = lazyWithRetry(() => import("./pages/BureauMonitoringPage"));
const WorkerDashboard = lazyWithRetry(() => import("./pages/WorkerDashboard"));
const Payment = lazyWithRetry(() => import("./pages/Payment"));
const PaymentPage = lazyWithRetry(() => import("./pages/PaymentPage"));
const PaymentLinkPage = lazyWithRetry(() => import("./pages/PaymentLinkPage"));
const PaymentSuccessRedirect = lazyWithRetry(() => import("./pages/PaymentSuccessRedirect"));
const PaymentCorePage = lazyWithRetry(() => import("./pages/PaymentCore"));
const Orders = lazyWithRetry(() => import("./pages/Orders"));
const DigitalPurchaseDownload = lazyWithRetry(() => import("./pages/DigitalPurchaseDownload"));
const MyDigitalPurchases = lazyWithRetry(() => import("./pages/MyDigitalPurchases"));
const MyDigitalSubscriptions = lazyWithRetry(() => import("./pages/MyDigitalSubscriptions"));
const ContactUserById = lazyWithRetry(() => import("./components/communication/ContactUserById"));
const DirectConversation = lazyWithRetry(() => import("./pages/DirectConversation"));
const Devis = lazyWithRetry(() => import("./pages/Devis"));
const Notifications = lazyWithRetry(() => import("./pages/Notifications"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const AgentActivation = lazyWithRetry(() => import("./pages/AgentActivation"));
const AgentDashboard = lazyWithRetry(() => import("./pages/AgentDashboard"));
const AgentDashboardPublic = lazyWithRetry(() => import("./pages/AgentDashboardPublic"));
const InstallMobileApp = lazyWithRetry(() => import("./pages/InstallMobileApp"));
const ServiceSelection = lazyWithRetry(() => import("./pages/ServiceSelection"));
const ServiceDashboard = lazyWithRetry(() => import("./pages/ServiceDashboard"));
const MigrateIds = lazyWithRetry(() => import("./pages/Admin/MigrateIds"));
const Wallet = lazyWithRetry(() => import("./pages/Wallet"));
const SubscriptionsPage = lazyWithRetry(() => import("./pages/SubscriptionsPage"));
const AffiliateRedirect = lazyWithRetry(() => import("./pages/AffiliateRedirect"));
const AgentAffiliateRedirect = lazyWithRetry(() => import("./pages/AgentAffiliateRedirect"));
const AffiliateActivationPage = lazyWithRetry(() => import("./pages/AffiliateActivationPage"));
const AffiliateDashboardPage = lazyWithRetry(() => import("./pages/AffiliateDashboardPage"));
const DeliveryRequest = lazyWithRetry(() => import("./pages/DeliveryRequest"));
const DeliveryClient = lazyWithRetry(() => import("./pages/DeliveryClient"));
const BugBounty = lazyWithRetry(() => import("./pages/BugBounty"));
const Cart = lazyWithRetry(() => import("./pages/Cart"));
const VendorAgentInterface = lazyWithRetry(() => import("./pages/VendorAgentInterface"));
const _VendorContracts = lazyWithRetry(() => import("./pages/VendorContracts"));
const ClientContracts = lazyWithRetry(() => import("./pages/ClientContracts"));
const ServiceDetail = lazyWithRetry(() => import("./pages/ServiceDetail"));
const ServiceRedirect = lazyWithRetry(() => import("./pages/ServiceRedirect"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const UniversalLoginPage = lazyWithRetry(() => import("./pages/UniversalLoginPage"));
const SetPasswordAfterOAuth = lazyWithRetry(() => import("./pages/SetPasswordAfterOAuth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const AgentCreation = lazyWithRetry(() => import("./pages/AgentCreation"));
const WorkerSettings = lazyWithRetry(() => import("./pages/WorkerSettings"));
const BadgeVerification = lazyWithRetry(() => import("./pages/BadgeVerification"));
const StolenMotoDeclaration = lazyWithRetry(() => import("./pages/StolenMotoDeclaration"));
const VisualSearch = lazyWithRetry(() => import("./pages/VisualSearch"));
const Categories = lazyWithRetry(() => import("./pages/Categories"));
const DigitalProducts = lazyWithRetry(() => import("./pages/DigitalProducts"));
const DigitalProductDetail = lazyWithRetry(() => import("./pages/DigitalProductDetail"));
const ShortLinkRedirect = lazyWithRetry(() => import("./pages/ShortLinkRedirect"));
const UserPublicProfile = lazyWithRetry(() => import("./pages/UserPublicProfile"));
const RestaurantPublicMenu = lazyWithRetry(() => import("./pages/RestaurantPublicMenu"));
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

function App() {
  // Debug log immédiat
  console.log('🎯 App component rendering...');
  console.log('📍 Current URL:', window.location.href);
  console.log('📍 Pathname:', window.location.pathname);

  useEffect(() => {
    console.log('✅ App component mounted successfully');
    console.log('📍 Final URL after mount:', window.location.href);

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
      <div style={{position:'fixed',top:0,left:0,zIndex:99999,background:'#ff0',color:'#000',padding:'8px',fontWeight:'bold'}}>TEST-RENDER</div>
      <QueryClientProvider client={queryClient}>
        <AppPrefetcher />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <BrowserRouter>
            <LanguageProvider>
              <CurrencyProvider>
                <div style={{background:'#0ff',color:'#000',padding:'8px'}}>TEST-BEFORE-AUTH</div>
                <AuthProvider>
                <GpsAutoFill />
                <CognitoAuthProvider>
                  <OAuthPasswordGate />
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
                <div style={{background:'#0f0',color:'#000',padding:'8px'}}>TEST-ROUTING</div>
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
                    <ProtectedRoute allowedRoles={['vendeur', 'admin']}>
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
                  element={<VendeurDashboard />}
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
