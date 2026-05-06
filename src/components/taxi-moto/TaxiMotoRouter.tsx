/**
 * ROUTEUR INTELLIGENT TAXI-MOTO
 * Redirige automatiquement vers l'interface appropriée selon le rôle
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function TaxiMotoRouter() {
  const { profile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (hasRedirected) return;
    if (loading || profileLoading) return;

    setHasRedirected(true);

    if (profile?.role === 'taxi') {
      navigate('/taxi-moto/driver', { replace: true });
    } else {
      // Clients et autres rôles → interface de réservation
      navigate('/proximite/taxi-moto', { replace: true });
    }
  }, [profile, loading, profileLoading, navigate, hasRedirected]);

  // Loader pendant la vérification du rôle
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Chargement de votre interface...</p>
      </div>
    </div>
  );
}
