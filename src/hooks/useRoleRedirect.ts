import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Hook pour rediriger automatiquement l'utilisateur vers son dashboard
 * en fonction de son rôle après connexion
 * NE redirige PAS si l'utilisateur est déjà sur la bonne route de base
 */
export const useRoleRedirect = () => {
  const { profile, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Attendre la fin du chargement
    if (loading) return;

    // Si utilisateur connecté avec profil
    if (user && profile) {
      const roleRoutes: Record<string, string> = {
        admin: '/pdg',
        vendeur: '/vendeur',
        livreur: '/livreur',
        taxi: '/taxi-moto/driver',
        syndicat: '/syndicat',
        transitaire: '/transitaire',
        client: '/client',
      };

      const targetRoute = roleRoutes[profile.role];
      if (targetRoute) {
        // Ne pas rediriger si l'utilisateur est déjà sur la bonne route de base
        const currentPath = location.pathname;
        if (currentPath.startsWith(targetRoute)) {
          // L'utilisateur est déjà sur son dashboard, ne pas rediriger
          return;
        }
        
        console.log(`🔄 Redirection automatique vers ${targetRoute} (rôle: ${profile.role})`);
        navigate(targetRoute, { replace: true });
      }
    }
  }, [user, profile, loading, navigate, location.pathname]);
};
