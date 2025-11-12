import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import QuickFooter from "@/components/QuickFooter";
import CommunicationWidget from "@/components/communication/CommunicationWidget";

// Lazy loading des pages pour optimiser le bundle
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const ServicesProximite = lazy(() => import("./pages/ServicesProximite"));
const Tracking = lazy(() => import("./pages/Tracking"));
const ClientTrackingPage = lazy(() => import("./pages/ClientTrackingPage"));
const Profil = lazy(() => import("./pages/Profil"));
const LoginGoogle = lazy(() => import("./pages/LoginGoogle"));
const AuthGoogleSuccess = lazy(() => import("./pages/AuthGoogleSuccess"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const VendeurDashboard = lazy(() => import("./pages/VendeurDashboard"));
const DiagnosticFonctionnalites = lazy(() => import("./pages/DiagnosticFonctionnalites"));
const LivreurDashboard = lazy(() => import("./pages/LivreurDashboard"));
const DriverProfile = lazy(() => import("./pages/driver/DriverProfile"));
const DriverSettings = lazy(() => import("./pages/driver/DriverSettings"));
const DriverHelp = lazy(() => import("./pages/driver/DriverHelp"));
const TaxiMotoDriver = lazy(() => import("./pages/TaxiMotoDriver"));
const TaxiMotoClient = lazy(() => import("./pages/TaxiMotoClient"));
const TaxiMotoRouter = lazy(() => import("./components/taxi-moto/TaxiMotoRouter"));
const SyndicatDashboardUltraPro = lazy(() => import("./pages/SyndicatDashboardUltraPro"));
const UserActivationPage = lazy(() => import("./components/agent-system/UserActivationPage"));
const TransitaireDashboard = lazy(() => import("./pages/TransitaireDashboard"));
const PDG224Solutions = lazy(() => import("./pages/PDG224Solutions"));
const PdgDebugPanel = lazy(() => import("./pages/PdgDebugPanel"));
const PdgCommandCenter = lazy(() => import("./pages/PdgCommandCenter"));
const PdgSecurity = lazy(() => import("./pages/PdgSecurity"));
const CompetitiveAnalysis = lazy(() => import("./pages/pdg/CompetitiveAnalysis"));
const ApiSupervision = lazy(() => import("./pages/pdg/ApiSupervision"));
const BureauDashboard = lazy(() => import("./pages/BureauDashboard"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const Payment = lazy(() => import("./pages/Payment"));
const ContactUserById = lazy(() => import("./components/communication/ContactUserById"));
const DirectConversation = lazy(() => import("./pages/DirectConversation"));
const Devis = lazy(() => import("./pages/Devis"));
// Test pages removed
const NotFound = lazy(() => import("./pages/NotFound"));
const AgentActivation = lazy(() => import("./pages/AgentActivation"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AgentDashboardPublic = lazy(() => import("./pages/AgentDashboardPublic"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const InstallMobileApp = lazy(() => import("./pages/InstallMobileApp"));
const ServiceSelection = lazy(() => import("./pages/ServiceSelection"));
const ServiceDashboard = lazy(() => import("./pages/ServiceDashboard"));
const TestWalletTransfer = lazy(() => import("./pages/TestWalletTransfer"));
const MigrateIds = lazy(() => import("./pages/Admin/MigrateIds"));
const Wallet = lazy(() => import("./pages/Wallet"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage"));
const AffiliateRedirect = lazy(() => import("./pages/AffiliateRedirect"));
const DeliveryRequest = lazy(() => import("./pages/DeliveryRequest"));
const DeliveryClient = lazy(() => import("./pages/DeliveryClient"));
const BugBounty = lazy(() => import("./pages/BugBounty"));
const Cart = lazy(() => import("./pages/Cart"));

// Composant de loading
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span>Chargement...</span>
    </div>
  </div>
);

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/google" element={<LoginGoogle />} />
              <Route path="/auth/google/success" element={<AuthGoogleSuccess />} />
              <Route path="/install" element={<InstallPWA />} />
              <Route path="/install-app" element={<InstallMobileApp />} />

              {/* Main App Routes */}
              <Route path="/home" element={<Home />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/product/:id" element={<ProductDetail />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/contact-user" element={<ContactUserById />} />
              <Route path="/communication/direct_:userId" element={<DirectConversation />} />
              <Route path="/services-proximite" element={<ServicesProximite />} />
              <Route path="/devis" element={<Devis />} />
              <Route path="/delivery-request" element={<DeliveryRequest />} />
              <Route path="/delivery" element={<DeliveryClient />} />
              <Route path="/taxi" element={<TaxiMotoRouter />} />
              <Route path="/taxi-moto" element={<TaxiMotoClient />} />
              <Route path="/taxi-moto/driver" element={<ProtectedRoute allowedRoles={['taxi', 'driver', 'admin']}><TaxiMotoDriver /></ProtectedRoute>} />
              <Route path="/taxi-moto-driver" element={<ProtectedRoute allowedRoles={['taxi', 'driver', 'admin']}><TaxiMotoDriver /></ProtectedRoute>} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/client-tracking" element={<ClientTrackingPage />} />
              <Route path="/profil" element={<Profil />} />
              
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
                path="/test-wallet-transfer"
                element={<TestWalletTransfer />}
              />
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
                path="/pdg/api-supervision"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ApiSupervision />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg/debug"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <PdgDebugPanel />
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
              <Route path="/bureau/:token" element={<BureauDashboard />} />
              <Route path="/worker/:token" element={<WorkerDashboard />} />
              <Route path="/agent/activate/:token" element={<AgentActivation />} />
              <Route path="/agent/:token" element={<AgentDashboardPublic />} />
              <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent', 'admin']}><AgentDashboard /></ProtectedRoute>} />
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientDashboard /></ProtectedRoute>} />
              <Route
                path="/vendeur-simple"
                element={<VendeurDashboard />}
              />

              <Route
                path="/diagnostic-fonctionnalites"
                element={<DiagnosticFonctionnalites />}
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

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CommunicationWidget position="bottom-right" showNotifications={true} />
            <QuickFooter />
          </Suspense>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>
  );
}

export default App;
