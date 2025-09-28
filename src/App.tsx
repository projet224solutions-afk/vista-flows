import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Tracking from "./pages/Tracking";
import Profil from "./pages/Profil";
import ClientDashboard from "./pages/ClientDashboard";
import VendeurDashboard from "./pages/VendeurDashboard";
import LivreurDashboard from "./pages/LivreurDashboard";
import TaxiDashboard from "./pages/TaxiDashboard";
import SyndicatDashboard from "./pages/SyndicatDashboard";
import TransitaireDashboard from "./pages/TransitaireDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
