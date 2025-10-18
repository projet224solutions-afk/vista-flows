/**
 * Redirection PDG - 224SOLUTIONS
 * Composant de redirection automatique vers le hub PDG principal
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPDGRedirect, isPDGRoute } from '@/config/pdg-routes';
import { Loader2 } from 'lucide-react';

interface PDGRedirectProps {
  targetTab?: string;
}

export default function PDGRedirect({ targetTab }: PDGRedirectProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Vérifier si c'est une route PDG qui nécessite une redirection
    if (isPDGRoute(currentPath)) {
      const redirectPath = getPDGRedirect(currentPath);
      
      // Redirection avec délai pour l'effet visuel
      const timer = setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [navigate, location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Redirection vers le Hub PDG
          </h2>
          <p className="text-muted-foreground">
            {targetTab ? `Chargement de l'onglet ${targetTab}...` : 'Chargement de l\'interface PDG...'}
          </p>
        </div>
      </div>
    </div>
  );
}
