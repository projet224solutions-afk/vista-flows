import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import QuickFooter from "@/components/QuickFooter";

// Lazy loading des pages pour optimiser le bundle
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Profil = lazy(() => import("./pages/Profil"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientDashboardPro = lazy(() => import("./pages/ClientDashboardPro"));
const ClientDashboardUltimate = lazy(() => import("./pages/ClientDashboardUltimate"));
const TestClient = lazy(() => import("./pages/TestClient"));
const ClientDashboardSimple = lazy(() => import("./pages/ClientDashboardSimple"));
const VendeurDashboard = lazy(() => import("./pages/VendeurDashboard"));
const VendeurDashboardOptimized = lazy(() => import("./pages/VendeurDashboardOptimized"));
const VendeurDashboardSimple = lazy(() => import("./pages/VendeurDashboardSimple"));
const TestUltraBasic = lazy(() => import("./pages/TestUltraBasic"));
const DiagnosticFonctionnalites = lazy(() => import("./pages/DiagnosticFonctionnalites"));
const LivreurDashboard = lazy(() => import("./pages/LivreurDashboard"));
const TaxiDashboard = lazy(() => import("./pages/TaxiDashboard"));
const TaxiMoto = lazy(() => import("./pages/TaxiMoto"));
const SyndicatDashboard = lazy(() => import("./pages/SyndicatDashboard"));
const SyndicatePresidentDashboard = lazy(() => import("./pages/SyndicatePresidentDashboard"));
const SyndicatDashboardUltraPro = lazy(() => import("./pages/SyndicatDashboardUltraPro"));
const SyndicatePresident = lazy(() => import("./pages/SyndicatePresident"));
const SyndicatePresidentNew = lazy(() => import("./pages/SyndicatePresidentNew"));
const SyndicatePresidentSimple = lazy(() => import("./pages/SyndicatePresidentSimple"));
const SyndicatePresidentUltraSimple = lazy(() => import("./pages/SyndicatePresidentUltraSimple"));
const SyndicatePresidentUltraPro = lazy(() => import("./pages/SyndicatePresidentUltraPro"));
const SyndicatInstall = lazy(() => import("./pages/SyndicatInstall"));
const UserActivationPage = lazy(() => import("./components/agent-system/UserActivationPage"));
const TransitaireDashboard = lazy(() => import("./pages/TransitaireDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PDGDashboard = lazy(() => import("./pages/PDGDashboard"));
const AdvancedPDGDashboard = lazy(() => import("./pages/AdvancedPDGDashboard"));
const PDG224Solutions = lazy(() => import("./pages/PDG224Solutions"));
// Removed deprecated PDG agent pages - being refactored
const PDGTest = lazy(() => import("./pages/PDGTest")); // Test PDG
const PDGSimple = lazy(() => import("./pages/PDGSimple")); // PDG Simple
const PDGBasic = lazy(() => import("./pages/PDGBasic")); // PDG Basic
const PDGMinimal = lazy(() => import("./pages/PDGMinimal")); // PDG Minimal
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const CommunicationTestPage = lazy(() => import("./pages/CommunicationTestPage"));
const LovableTestPage = lazy(() => import("./pages/LovableTestPage"));
const UltraSimpleTestPage = lazy(() => import("./pages/UltraSimpleTestPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AgentSystem = lazy(() => import("./pages/AgentSystem"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Main App Routes */}
              <Route path="/home" element={<Home />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/taxi-moto" element={<TaxiMoto />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/profil" element={<Profil />} />

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
                    <VendeurDashboardOptimized />
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
                path="/taxi"
                element={
                  <ProtectedRoute allowedRoles={['taxi', 'admin']}>
                    <TaxiDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/syndicat"
                element={
                  <ProtectedRoute allowedRoles={['syndicat', 'admin']}>
                    <SyndicatDashboardUltraPro />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/syndicat/president/:accessToken"
                element={<SyndicatePresidentUltraPro />}
              />
              <Route
                path="/syndicat/install/:token"
                element={<SyndicatInstall />}
              />
              <Route
                path="/syndicat/president-new/:accessToken"
                element={<SyndicatePresidentNew />}
              />
              <Route
                path="/syndicat/president-new"
                element={<SyndicatePresidentNew />}
              />
              <Route
                path="/syndicat/president-simple"
                element={<SyndicatePresidentSimple />}
              />
              <Route
                path="/syndicat/president-ultra-simple"
                element={<SyndicatePresidentUltraSimple />}
              />
              <Route
                path="/invite/:invitationToken"
                element={<UserActivationPage />}
              />
              <Route
                path="/payment/:paymentId"
                element={<PaymentPage />}
              />
              <Route
                path="/transitaire"
                element={
                  <ProtectedRoute allowedRoles={['transitaire', 'admin']}>
                    <TransitaireDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pdg"
                element={<PDGDashboard />}
              />
              <Route
                path="/pdg-advanced"
                element={<AdvancedPDGDashboard />}
              />
              <Route
                path="/pdg224solutionssoulbah"
                element={<PDG224Solutions />}
              />
              <Route
                path="/agent-system"
                element={<AgentSystem />}
              />
              {/* PDG routes removed - being refactored */}
              <Route
                path="/client"
                element={
                  <ProtectedRoute allowedRoles={['client', 'admin']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-pro"
                element={
                  <ProtectedRoute allowedRoles={['client', 'admin']}>
                    <ClientDashboardPro />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-ultimate"
                element={
                  <ProtectedRoute allowedRoles={['client', 'admin']}>
                    <ClientDashboardUltimate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/test-client"
                element={<TestClient />}
              />
              <Route
                path="/client-simple"
                element={<ClientDashboardSimple />}
              />
              <Route
                path="/vendeur-simple"
                element={<VendeurDashboardSimple />}
              />
              <Route
                path="/test-ultra-basic"
                element={<TestUltraBasic />}
              />
              <Route
                path="/diagnostic-fonctionnalites"
                element={<DiagnosticFonctionnalites />}
              />
              <Route
                path="/communication-test"
                element={<CommunicationTestPage />}
              />
              <Route
                path="/lovable-test"
                element={<LovableTestPage />}
              />
              <Route
                path="/ultra-simple-test"
                element={<UltraSimpleTestPage />}
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <QuickFooter />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
