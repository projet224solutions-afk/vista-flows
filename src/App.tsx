import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";

// Lazy loading des pages pour optimiser le bundle
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Profil = lazy(() => import("./pages/Profil"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const VendeurDashboard = lazy(() => import("./pages/VendeurDashboard"));
const LivreurDashboard = lazy(() => import("./pages/LivreurDashboard"));
const TaxiDashboard = lazy(() => import("./pages/TaxiDashboard"));
const SyndicatDashboard = lazy(() => import("./pages/SyndicatDashboard"));
const TransitaireDashboard = lazy(() => import("./pages/TransitaireDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/profil" element={<Profil />} />

              {/* Dashboard Routes */}
              <Route
                path="/vendeur"
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
                    <SyndicatDashboard />
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
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client"
                element={
                  <ProtectedRoute allowedRoles={['client', 'admin']}>
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
