import { Suspense, memo, useEffect, useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

const MerchantOnboarding = lazyWithRetry(() => import("@/components/onboarding/MerchantOnboarding"));
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

// Lazy load TOUT - même la page d'accueil pour réduire TBT
const Index = lazyWithRetry(() => import("./pages/Index"));

// Lazy load avec retry automatique pour éviter les erreurs de cache après déploiement
const QuickFooter = lazyWithRetry(() => import("@/components/QuickFooter"));
const CommunicationWidget = lazyWithRetry(() => import("@/components/communication/CommunicationWidget"));
const DeepLinkInitializer = lazyWithRetry(() => import("@/components/DeepLinkInitializer"));
const PWAInstallPrompt = lazyWithRetry(() => import("@/components/pwa/PWAInstallPrompt"));
const InstallPromptBanner = lazyWithRetry(() =>
  import("@/components/pwa/InstallPromptBanner").then((m) => ({ default: m.InstallPromptBanner }))
);

// Lazy loading des pages - regroupées par priorité
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Home = lazyWithRetry(() => import("./pages/Home"));
const Marketplace = lazyWithRetry(() => import("./pages/Marketplace"));
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const VendorShop = lazyWithRetry(() => import("./pages/VendorShop"));
const Messages = lazyWithRetry(() => import("./pages/Messages"));
const ServicesProximite = lazyWithRetry(() => import("./pages/ServicesProximite"));
const Proximite = lazyWithRetry(() => import("./pages/Proximite"));
const NearbyTaxiMoto = lazyWithRetry(() => import("./pages/NearbyTaxiMoto"));
const NearbyLivraison = lazyWithRetry(() => import("./pages/NearbyLivraison"));
const NearbyBoutiques = lazyWithRetry(() => import("./pages/NearbyBoutiques"));
const ClientTrackingPage = lazyWithRetry(() => import("./pages/ClientTrackingPage"));
const Profil = lazyWithRetry(() => import("./pages/Profil"));
const LoginGoogle = lazyWithRetry(() => import("./pages/LoginGoogle"));
const AuthGoogleSuccess = lazyWithRetry(() => import("./pages/AuthGoogleSuccess"));
const AgentLogin = lazyWithRetry(() => import("./pages/AgentLogin"));
const BureauLogin = lazyWithRetry(() => import("./pages/BureauLogin"));
const AgentChangePassword = lazyWithRetry(() => import("./pages/AgentChangePassword"));
const BureauChangePassword = lazyWithRetry(() => import("./pages/BureauChangePassword"));
const ClientDashboard = lazyWithRetry(() => import("./pages/ClientDashboard"));
const VendeurDashboard = lazyWithRetry(() => import("./pages/VendeurDashboard"));
const LivreurDashboard = lazyWithRetry(() => import("./pages/LivreurDashboard"));
const DriverProfile = lazyWithRetry(() => import("./pages/driver/DriverProfile"));
const DriverSettings = lazyWithRetry(() => import("./pages/driver/DriverSettings"));
const DriverHelp = lazyWithRetry(() => import("./pages/driver/DriverHelp"));
const TaxiMotoDriver = lazyWithRetry(() => import("./pages/TaxiMotoDriver"));
const DriverSubscriptionPage = lazyWithRetry(() => import("./pages/DriverSubscriptionPage"));
const TaxiMotoClient = lazyWithRetry(() => import("./pages/TaxiMotoClient"));
const TaxiMotoRouter = lazyWithRetry(() => import("./components/taxi-moto/TaxiMotoRouter"));
const SyndicatDashboardUltraPro = lazyWithRetry(() => import("./pages/SyndicatDashboardUltraPro"));
const UserActivationPage = lazyWithRetry(() => import("./components/agent-system/UserActivationPage"));
const TransitaireDashboard = lazyWithRetry(() => import("./pages/TransitaireDashboard"));
const PDG224Solutions = lazyWithRetry(() => import("./pages/PDG224Solutions"));
const PdgCommandCenter = lazyWithRetry(() => import("./pages/PdgCommandCenter"));
const PdgSecurity = lazyWithRetry(() => import("./pages/PdgSecurity"));
const CompetitiveAnalysis = lazyWithRetry(() => import("./pages/pdg/CompetitiveAnalysis"));
const ApiSupervision = lazyWithRetry(() => import("./pages/pdg/ApiSupervision"));
const SystemDebugPage = lazyWithRetry(() => import("./pages/pdg/SystemDebugPage"));
const SimpleDiagnostic = lazyWithRetry(() => import("./pages/SimpleDiagnostic"));
const PDGCopilotDashboard = lazyWithRetry(() => import("./components/pdg/PDGCopilotDashboard"));
const BureauDashboard = lazyWithRetry(() => import("./pages/BureauDashboard"));
const BureauMonitoringPage = lazyWithRetry(() => import("./pages/BureauMonitoringPage"));
const WorkerDashboard = lazyWithRetry(() => import("./pages/WorkerDashboard"));
const Payment = lazyWithRetry(() => import("./pages/Payment"));
const DjomyPayment = lazyWithRetry(() => import("./pages/DjomyPayment"));
const PaymentCorePage = lazyWithRetry(() => import("./pages/PaymentCore"));
const Orders = lazyWithRetry(() => import("./pages/Orders"));
const ContactUserById = lazyWithRetry(() => import("./components/communication/ContactUserById"));
const DirectConversation = lazyWithRetry(() => import("./pages/DirectConversation"));
const Devis = lazyWithRetry(() => import("./pages/Devis"));
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
const DeliveryRequest = lazyWithRetry(() => import("./pages/DeliveryRequest"));
const DeliveryClient = lazyWithRetry(() => import("./pages/DeliveryClient"));
const BugBounty = lazyWithRetry(() => import("./pages/BugBounty"));
const Cart = lazyWithRetry(() => import("./pages/Cart"));
const VendorAgentInterface = lazyWithRetry(() => import("./pages/VendorAgentInterface"));
const VendorContracts = lazyWithRetry(() => import("./pages/VendorContracts"));
const ClientContracts = lazyWithRetry(() => import("./pages/ClientContracts"));
const ServiceDetail = lazyWithRetry(() => import("./pages/ServiceDetail"));
const ServiceRedirect = lazyWithRetry(() => import("./pages/ServiceRedirect"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const UniversalLoginPage = lazyWithRetry(() => import("./pages/UniversalLoginPage"));
const SetPasswordAfterOAuth = lazyWithRetry(() => import("./pages/SetPasswordAfterOAuth"));
const AgentCreation = lazyWithRetry(() => import("./pages/AgentCreation"));
const WorkerSettings = lazyWithRetry(() => import("./pages/WorkerSettings"));
const BadgeVerification = lazyWithRetry(() => import("./pages/BadgeVerification"));
const StolenMotoDeclaration = lazyWithRetry(() => import("./pages/StolenMotoDeclaration"));
const VisualSearch = lazyWithRetry(() => import("./pages/VisualSearch"));
const Categories = lazyWithRetry(() => import("./pages/Categories"));
const StripePaymentTest = lazyWithRetry(() => import("./pages/StripePaymentTest"));
const StripeDiagnostic = lazyWithRetry(() => import("./pages/StripeDiagnostic"));
const DigitalProducts = lazyWithRetry(() => import("./pages/DigitalProducts"));
const ShortLinkRedirect = lazyWithRetry(() => import("./pages/ShortLinkRedirect"));
const UserPublicProfile = lazyWithRetry(() => import("./pages/UserPublicProfile"));
const RestaurantPublicMenu = lazyWithRetry(() => import("./pages/RestaurantPublicMenu"));
const Custom224PaymentDemo = lazyWithRetry(() => import("./pages/demos/Custom224PaymentDemo"));
// Ultra-simple loading component - Pure CSS inline (no Tailwind dependency)
const PageLoader = memo(() => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: '#fff'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: '700', 
        color: '#007BFF', 
        marginBottom: '16px',
        fontFamily: 'system-ui, sans-serif'
      }}>224Solutions</div>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #f3f4f6',
        borderTop: '3px solid #007BFF',
        borderRadius: '50%',
        margin: '0 auto',
        animation: 'spin 0.8s linear infinite'
      }} />
    </div>
    <style dangerouslySetInnerHTML={{__html: '@keyframes spin { to { transform: rotate(360deg); } }'}} />
  </div>
));
PageLoader.displayName = 'PageLoader';

// Configure QueryClient with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (anciennement cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  // Debug log immédiat
  console.log('🎯 App component rendering...');
  useEffect(() => {
    console.log('✅ App component mounted successfully');

    // Important: éviter la perte de session OAuth entre http/https sur le domaine production
    if (window.location.hostname.includes('224solution.net') && window.location.protocol === 'http:') {
      const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(httpsUrl);
    }

    // Enregistrement du Service Worker pour PWA (centralisé dans src/main.tsx)

  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <InstallPromptBanner />
                <PWAInstallPrompt />
                <DeepLinkInitializer />
                <Suspense fallback={null}>
                  <MerchantOnboarding />
                </Suspense>

                <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Page d'accueil publique - toujours accessible */}
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Accueil application (avec footer + services) */}
              <Route path="/home" element={<Home />} />
              <Route path="/diagnostic" element={<SimpleDiagnostic />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/auth/google" element={<LoginGoogle />} />
              <Route path="/auth/google/success" element={<AuthGoogleSuccess />} />
<Route path="/universal-login" element={<UniversalLoginPage />} />
              <Route path="/auth/set-password" element={<SetPasswordAfterOAuth />} />
              <Route path="/agent/create" element={<AgentCreation />} />
              <Route path="/worker/settings" element={<WorkerSettings />} />
              {/* <Route path="/install" element={<InstallPWA />} /> PWA désactivée */}
              <Route path="/install-app" element={<InstallMobileApp />} />

              {/* Main App Routes */}
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/visual-search" element={<VisualSearch />} />
              <Route path="/marketplace/product/:id/*" element={<ProductDetail />} />
              <Route path="/product/:id/*" element={<ProductDetail />} />
              <Route path="/produit/:id/*" element={<ProductDetail />} />
              {/* Short URL redirect - must be before shop/boutique routes */}
              <Route path="/s/:shortCode/*" element={<ShortLinkRedirect />} />
              <Route path="/shop/:vendorId/*" element={<VendorShop />} />
              <Route path="/boutique/:slug/*" element={<VendorShop />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/messages" element={<Messages />} />
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
              <Route path="/boutiques" element={<NearbyBoutiques />} />
              
              {/* Demo Pages */}
              <Route path="/demos/custom-payment" element={<Custom224PaymentDemo />} />
              
              <Route path="/services-proximite" element={<ServicesProximite />} />
              <Route path="/services-proximite/:id" element={<ServiceDetail />} />
              {/* Page publique menu restaurant pour commande client */}
              <Route path="/restaurant/:serviceId/menu" element={<RestaurantPublicMenu />} />
              {/* Alias legacy: /service/:id -> /services-proximite/:id */}
              <Route path="/service/:id" element={<ServiceRedirect />} />
              {/* Service Selection - Protected for logged-in users to create their professional service */}
              <Route path="/service-selection" element={<ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'driver', 'admin', 'syndicat', 'agent', 'transitaire']}><ServiceSelection /></ProtectedRoute>} />
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
              <Route path="/vendeur/subscription" element={<ProtectedRoute allowedRoles={['vendeur', 'admin']}><DriverSubscriptionPage /></ProtectedRoute>} />
              <Route path="/tracking" element={<ClientTrackingPage />} />
              <Route path="/client-tracking" element={<ClientTrackingPage />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/profile/:userId" element={<UserPublicProfile />} />
              
              {/* Affiliate Routes */}
              <Route path="/ref/:vendorId" element={<AffiliateRedirect />} />

              {/* Dashboard Routes */}
              <Route
                path="/vendeur/*"
                element={
                  <ProtectedRoute allowedRoles={['vendeur', 'admin']}>
                    <VendeurDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Accès direct pour diagnostic si besoin */}
              <Route
                path="/vendeur-open"
                element={<VendeurDashboard />}
              />
              <Route
                path="/vendeur-optimized"
                element={
                  <ProtectedRoute allowedRoles={['vendeur', 'admin']}>
                    <VendeurDashboard />
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
                element={<Payment />}
              />
              <Route
                path="/payment"
                element={<Payment />}
              />
              <Route
                path="/djomy-payment"
                element={<DjomyPayment />}
              />
              <Route
                path="/payment-core"
                element={<PaymentCorePage />}
              />
              
              {/* Test Stripe Payment */}
              <Route path="/test-stripe-payment" element={<StripePaymentTest />} />
              
              {/* Diagnostic Stripe */}
              <Route path="/stripe-diagnostic" element={<StripeDiagnostic />} />
              
              <Route path="/orders" element={<Orders />} />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'driver', 'admin', 'syndicat', 'agent', 'transitaire']}>
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
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PDG224Solutions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PDG224Solutions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg/debug"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SystemDebugPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg/api-supervision"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ApiSupervision />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg/command-center"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PdgCommandCenter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg/security"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PdgSecurity />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg/competitive-analysis"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CompetitiveAnalysis />
                  </ProtectedRoute>
                }
              />
              <Route path="/pdg224solutionssoulbah" element={<PDG224Solutions />} />
              <Route path="/pdg/copilot" element={<ProtectedRoute allowedRoles={['pdg', 'owner']}><PDGCopilotDashboard /></ProtectedRoute>} />
              
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
                  <ProtectedRoute allowedRoles={['client', 'vendeur', 'livreur', 'taxi', 'agent', 'syndicat', 'transitaire', 'admin']}>
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
    </AuthProvider>
  </LanguageProvider>
  </BrowserRouter>
</QueryClientProvider>
  );
}

export default App;
