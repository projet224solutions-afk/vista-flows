import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Dashboard Router - Redirige vers le dashboard appropri├® selon le r├┤le
 * IMPORTANT: Utilise TOUJOURS profile.role comme source de v├®rit├®
 */
const Dashboard = () => {
  const { user, profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Attendre la fin du chargement complet
    if (loading || profileLoading) return;

    if (!user) {
      // Si pas connect├®, rediriger vers la page d'authentification
      navigate("/auth");
      return;
    }

    // Attendre que le profil soit charg├® avant de rediriger
    if (!profile) {
      console.log('ÔÅ│ Attente du chargement du profil...');
      return;
    }

    // Redirection selon le r├┤le depuis le PROFIL (source de v├®rit├® s├®curis├®e)
    // Normaliser le r├┤le en minuscules pour la comparaison
    const role = profile.role?.toLowerCase() || 'client';
    
    const roleRedirects: Record<string, string> = {
      'pdg': '/pdg',
      'admin': '/pdg',
      'ceo': '/pdg',
      'vendeur': '/vendeur',
      'prestataire': '/home', // G├®r├® dynamiquement ci-dessous
      'livreur': '/livreur',
      'taxi': '/taxi-moto/driver',
      'driver': '/taxi-moto/driver',
      'syndicat': '/syndicat',
      'bureau': '/bureau',
      'transitaire': '/transitaire',
      'agent': '/agent-dashboard',
      'client': '/client',
      'vendor_agent': '/home',
    };

    // Ô£à FIX: Pour les vendor_agents, chercher leur access_token et rediriger vers l'interface agent
    if (role === 'vendor_agent') {
      const fetchVendorAgentToken = async () => {
        const { data: vendorAgent } = await supabase
          .from('vendor_agents')
          .select('access_token')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (vendorAgent?.access_token) {
          console.log('­ƒÜÇ Dashboard: Redirection agent vendeur vers /vendor-agent/');
          navigate(`/vendor-agent/${vendorAgent.access_token}`, { replace: true });
        } else {
          console.log('ÔÜá´©Å Dashboard: Agent vendeur sans token, redirection /home');
          navigate('/home', { replace: true });
        }
      };
      fetchVendorAgentToken();
      return;
    }

    // Ô£à Pour les prestataires, chercher leur professional_service et rediriger
    if (role === 'prestataire') {
      const fetchPrestaService = async () => {
        const { data: proService } = await supabase
          .from('professional_services')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        
        if (proService?.id) {
          console.log('­ƒÜÇ Dashboard: Redirection prestataire vers /dashboard/service/', proService.id);
          navigate(`/dashboard/service/${proService.id}`, { replace: true });
        } else {
          console.log('ÔÜá´©Å Dashboard: Prestataire sans service, redirection /service-selection');
          navigate('/service-selection', { replace: true });
        }
      };
      fetchPrestaService();
      return;
    }

    const redirectPath = roleRedirects[role] || '/home';
    
    console.log(`­ƒöä Dashboard: Redirection vers ${redirectPath} (r├┤le: ${role})`);
    navigate(redirectPath, { replace: true });
  }, [user, profile, loading, profileLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Redirection vers votre dashboard...</p>
      </div>
    </div>
  );
};

export default Dashboard;
