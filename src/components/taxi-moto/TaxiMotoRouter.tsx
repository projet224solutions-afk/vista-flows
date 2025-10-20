/**
 * ROUTEUR INTELLIGENT TAXI-MOTO
 * Redirige automatiquement vers l'interface appropriée selon le rôle
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function TaxiMotoRouter() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      // Si l'utilisateur a le rôle taxi, rediriger vers l'interface conducteur
      if (profile.role === 'taxi') {
        navigate('/taxi-moto/driver', { replace: true });
      } else {
        // Sinon, rediriger vers l'interface client
        navigate('/taxi-moto', { replace: true });
      }
    } else if (!loading && !profile) {
      // Si pas connecté, rediriger vers l'interface client publique
      navigate('/taxi-moto', { replace: true });
    }
  }, [profile, loading, navigate]);

  // Afficher un loader pendant la vérification
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Chargement de votre interface...</p>
      </div>
    </div>
  );
}
