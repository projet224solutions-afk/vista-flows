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
const AutoRedirect = lazy(() => import("./pages/AutoRedirect"));
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Profil = lazy(() => import("./pages/Profil"));
const LoginGoogle = lazy(() => import("./pages/LoginGoogle"));
const AuthGoogleSuccess = lazy(() => import("./pages/AuthGoogleSuccess"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const VendeurDashboard = lazy(() => import("./pages/VendeurDashboard"));
const DiagnosticFonctionnalites = lazy(() => import("./pages/DiagnosticFonctionnalites"));
const LivreurDashboard = lazy(() => import("./pages/LivreurDashboard"));
const TaxiMotoDriver = lazy(() => import("./pages/TaxiMotoDriver"));
const TaxiMotoClient = lazy(() => import("./pages/TaxiMotoClient"));
const UserActivation = lazy(() => import("./pages/UserActivation"));
const BureauDashboard = lazy(() => import("./pages/BureauDashboard"));
const TravailleurDashboard = lazy(() => import("./pages/TravailleurDashboard"));
const TransitaireDashboard = lazy(() => import("./pages/TransitaireDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
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
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<AutoRedirect />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/google" element={<LoginGoogle />} />
              <Route path="/auth/google/success" element={<AuthGoogleSuccess />} />

              {/* Main App Routes */}
              <Route path="/home" element={<Home />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/taxi" element={<TaxiMotoClient />} />
              <Route path="/taxi-moto" element={<TaxiMotoClient />} />
              <Route path="/taxi-moto/driver" element={<ProtectedRoute allowedRoles={['taxi', 'driver', 'admin']}><TaxiMotoDriver /></ProtectedRoute>} />
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
              {/* Removed legacy TaxiDashboard */}
              <Route
                path="/invite/:token"
                element={<UserActivation />}
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
                path="/bureau/:token"
                element={<BureauDashboard />}
              />
              <Route
                path="/travailleur/:token"
                element={<TravailleurDashboard />}
              />
              <Route
                path="/agent-system"
                element={<AgentSystem />}
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
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientDashboard /></ProtectedRoute>} />
              <Route
                path="/vendeur-simple"
                element={<VendeurDashboard />}
              />

              <Route
                path="/diagnostic-fonctionnalites"
                element={<DiagnosticFonctionnalites />}
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <QuickFooter />
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
