import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function AutoRedirect() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Si pas connecté, rediriger vers marketplace
    if (!user || !profile) {
      navigate('/marketplace', { replace: true });
      return;
    }

    // Redirection selon le rôle
    const roleRedirects: Record<string, string> = {
      vendeur: '/vendeur',
      client: '/client',
      admin: '/admin',
      livreur: '/livreur',
      taxi: '/taxi-moto/driver',
      driver: '/taxi-moto/driver',
      bureau_syndical: '/bureau',
      travailleur: '/travailleur',
      transitaire: '/transitaire',
    };

    const redirectPath = roleRedirects[profile.role] || '/marketplace';
    navigate(redirectPath, { replace: true });
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span>Redirection...</span>
      </div>
    </div>
  );
}
