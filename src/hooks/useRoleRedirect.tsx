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
      const targetRoute = roleRoutes[profile.role];
      if (targetRoute) {
        const currentPath = window.location.pathname;
        
        // Si l'utilisateur est sur la page d'accueil ou d'authentification, rediriger vers son dashboard
        if (currentPath === '/' || currentPath === '/auth' || currentPath === '/home') {
          navigate(targetRoute);
        }
        
        // Empêcher l'accès aux dashboards d'autres rôles (sauf pour les admins)
        const isOnWrongDashboard = Object.values(roleRoutes).includes(currentPath) && 
                                   currentPath !== targetRoute && 
                                   profile.role !== 'admin';
        
        if (isOnWrongDashboard) {
          navigate(targetRoute);
        }
      }
    }
  }, [user, profile, loading, navigate]);

  return { user, profile, loading };
};