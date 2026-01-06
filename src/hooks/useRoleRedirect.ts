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
  '/produit',
  '/shop',
  '/boutique',
  '/s',
  '/contact-user',
  '/communication',
  '/bug-bounty',
  '/proximite',
  '/categories',
  '/digital-products',
  '/boutiques',
];

/**
 * Retourne la route du dashboard selon le rôle
 */
export const getDashboardRoute = (role: string | null | undefined): string => {
  if (!role) return '/home';
  
  const roleRoutes: Record<string, string> = {
    admin: '/pdg',
    ceo: '/pdg',
    vendeur: '/vendeur',
    livreur: '/livreur',
    taxi: '/taxi-moto/driver',
    syndicat: '/syndicat',
    transitaire: '/transitaire',
    client: '/client',
    agent: '/agent',
  };

  return roleRoutes[role] || '/home';
};

/**
 * Hook pour rediriger automatiquement l'utilisateur vers son dashboard
 * en fonction de son rôle après connexion
 * NE redirige PAS si l'utilisateur est sur une route publique ou déjà sur son dashboard
 * 
 * ⚡ OPTIMISÉ: Redirection immédiate dès que le profil est chargé (pas d'attente du rendu)
 */
export const useRoleRedirect = () => {
  const { profile, user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    
    console.log('🔍 [useRoleRedirect] État:', {
      loading,
      profileLoading,
      hasUser: !!user,
      hasProfile: !!profile,
      role: profile?.role,
      currentPath
    });

    // ⚡ Attendre que l'auth soit chargée
    if (loading) {
      console.log('⏳ [useRoleRedirect] Auth en cours de chargement...');
      return;
    }

    // ⚡ Attendre que le profil soit chargé si l'utilisateur est connecté
    if (user && profileLoading) {
      console.log('⏳ [useRoleRedirect] Profil en cours de chargement...');
      return;
    }

    // Si utilisateur connecté avec profil et rôle
    if (user && profile && profile.role) {
      // Vérifier si le profil doit être complété (nouveau compte)
      const needsProfileCompletion = localStorage.getItem('needs_profile_completion') === 'true';
      const isProfileIncomplete = !profile.first_name || !profile.last_name || !profile.phone;
      
      if (needsProfileCompletion && isProfileIncomplete) {
        console.log('📝 [useRoleRedirect] Profil incomplet - demande de complétion');
      }

      // Ne pas rediriger si l'utilisateur est sur une route publique
      const isOnPublicRoute = PUBLIC_ROUTES.some(route => 
        currentPath === route || currentPath.startsWith(route + '/')
      );
      
      if (isOnPublicRoute) {
        console.log('📍 [useRoleRedirect] Route publique, pas de redirection:', currentPath);
        return;
      }

      const targetRoute = getDashboardRoute(profile.role);
      
      // ⚡ Rediriger depuis / vers le dashboard approprié
      if (currentPath === '/') {
        console.log(`🚀 [useRoleRedirect] Redirection depuis ${currentPath} vers ${targetRoute} (rôle: ${profile.role})`);
        navigate(targetRoute, { replace: true });
        return;
      }
      
      // Ne pas rediriger si l'utilisateur est déjà sur la bonne route
      if (currentPath.startsWith(targetRoute)) {
        console.log('✅ [useRoleRedirect] Déjà sur la bonne route:', currentPath);
        return;
      }
      
      console.log('📍 [useRoleRedirect] Sur une autre route autorisée:', currentPath);
    } else if (user && !profile && !profileLoading) {
      // L'utilisateur est connecté mais n'a pas de profil (rare)
      console.log('⚠️ [useRoleRedirect] Utilisateur sans profil détecté');
    }
  }, [user, profile, loading, profileLoading, navigate, location.pathname]);
};
