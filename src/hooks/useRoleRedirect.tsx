import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const roleRoutes = {
  admin: '/admin',
  vendeur: '/vendeur',
  livreur: '/livreur',
  taxi: '/taxi',
  syndicat: '/syndicat',
  transitaire: '/transitaire',
  client: '/client'
};

export const useRoleRedirect = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      const currentPath = window.location.pathname;
      const expectedRoute = roleRoutes[profile.role as keyof typeof roleRoutes];
      
      // Rediriger automatiquement vers l'interface correspondant au rôle
      if (currentPath === '/' && expectedRoute) {
        console.log(`🔄 Redirection automatique vers ${expectedRoute} pour le rôle ${profile.role}`);
        navigate(expectedRoute);
      }
    }
  }, [user, profile, loading, navigate]);

  return { user, profile, loading };
};