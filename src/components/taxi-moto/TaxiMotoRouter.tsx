/**
 * ROUTEUR INTELLIGENT TAXI-MOTO
 * Redirige automatiquement vers l'interface appropriée selon le rôle
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function TaxiMotoRouter() {
  const { profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Éviter les redirections multiples
    if (hasRedirected) return;
    
    // Attendre que le chargement soit terminé
    if (loading || profileLoading) return;

    // Ne pas rediriger si on est déjà sur une sous-route taxi-moto
    if (location.pathname !== '/taxi-moto') return;

    setHasRedirected(true);

    if (profile?.role === 'taxi') {
      // Conducteur taxi -> interface driver
      navigate('/taxi-moto/driver', { replace: true });
    } else {
      // Tous les autres -> interface client (page actuelle, pas de redirection nécessaire)
      // La page TaxiMoto s'affichera normalement
    }
  }, [profile, loading, profileLoading, navigate, location.pathname, hasRedirected]);

  // Afficher un loader pendant la vérification
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Chargement de votre interface...</p>
        </div>
      </div>
    );
  }

  return null;
}
