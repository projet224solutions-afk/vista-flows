import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Dashboard Router - Redirige vers le dashboard approprié selon le rôle
 */
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      // Si pas connecté, rediriger vers la page d'authentification
      navigate("/auth");
      return;
    }

    // Redirection selon le rôle
    const roleRedirects: Record<string, string> = {
      'admin': '/pdg',
      'vendeur': '/vendeur',
      'livreur': '/livreur',
      'taxi': '/taxi-moto/driver',
      'driver': '/taxi-moto/driver',
      'syndicat': '/syndicat',
      'bureau': '/bureau',
      'transitaire': '/transitaire',
      'agent': '/agent-dashboard',
      'client': '/client',
    };

    const role = user.user_metadata?.role || user.role;
    const redirectPath = roleRedirects[role] || '/home';
    
    navigate(redirectPath, { replace: true });
  }, [user, navigate]);

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
