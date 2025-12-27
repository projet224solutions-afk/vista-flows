import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Routes publiques accessibles à tous les utilisateurs connectés
 * sans redirection vers leur dashboard
 */
const PUBLIC_ROUTES = [
  '/home',
  '/marketplace',
  '/tracking',
  '/client-tracking',
  '/profil',
  '/messages',
  '/services-proximite',
  '/taxi-moto',
  '/taxi',
  '/delivery',
  '/delivery-request',
  '/devis',
  '/payment',
  '/wallet',
  '/cart',
  '/product',
  '/shop', // Deep linking - boutiques accessibles via lien partagé
  '/s', // Short URLs
  '/contact-user',
  '/communication',
  '/bug-bounty',
  '/proximite',
  '/categories',
  '/digital-products',
  '/boutiques',
];

/**
 * Hook pour rediriger automatiquement l'utilisateur vers son dashboard
 * en fonction de son rôle après connexion
 * NE redirige PAS si l'utilisateur est sur une route publique ou déjà sur son dashboard
 */
export const useRoleRedirect = () => {
  const { profile, user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Attendre la fin du chargement complet (session ET profil)
    if (loading || profileLoading) return;

    // Si utilisateur connecté avec profil chargé
    if (user && profile && profile.role) {
      const currentPath = location.pathname;

      // Ne pas rediriger si l'utilisateur est sur une route publique
      const isOnPublicRoute = PUBLIC_ROUTES.some(route => 
        currentPath === route || currentPath.startsWith(route + '/')
      );
      
      if (isOnPublicRoute) {
        return;
      }

      const roleRoutes: Record<string, string> = {
        admin: '/pdg',
        ceo: '/pdg', // Alias pour PDG
        vendeur: '/vendeur',
        livreur: '/livreur',
        taxi: '/taxi-moto/driver',
        syndicat: '/syndicat',
        transitaire: '/transitaire',
        client: '/client',
        agent: '/agent', // Pour les agents
      };

      const targetRoute = roleRoutes[profile.role];
      if (targetRoute) {
        // Ne pas rediriger si l'utilisateur est déjà sur la bonne route de base
        if (currentPath.startsWith(targetRoute)) {
          return;
        }
        
        console.log(`🔄 Redirection automatique vers ${targetRoute} (rôle: ${profile.role})`);
        navigate(targetRoute, { replace: true });
      }
    }
  }, [user, profile, loading, profileLoading, navigate, location.pathname]);
};
