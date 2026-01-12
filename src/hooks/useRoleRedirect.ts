import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Routes publiques où l'utilisateur peut rester sans redirection automatique
 * Ces routes sont accessibles à tous les utilisateurs, connectés ou non
 * ⚠️ IMPORTANT: Les liens partagés (/s/, /boutique/, /shop/, /product/) doivent être ici!
 */
const PUBLIC_ROUTES = [
  '/',            // Page d'accueil racine - accessible aux utilisateurs connectés
  '/home',        // Page d'accueil - accessible aux utilisateurs connectés
  '/marketplace',
  '/tracking',
  '/client-tracking',
  '/profil',
  '/profile',
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
  '/s',  // Short links - très important!
  '/contact-user',
  '/communication',
  '/bug-bounty',
  '/proximite',
  '/categories',
  '/digital-products',
  '/boutiques',
  '/ref',  // Affiliate links
  '/service',  // Page de détail d'un service professionnel
];

/**
 * Routes qui déclenchent toujours une redirection vers le dashboard approprié
 * Ce sont les pages d'entrée principales où un utilisateur connecté doit être redirigé
 * Note: / et /home sont retirés pour permettre aux utilisateurs connectés d'accéder à la page d'accueil
 */
const REDIRECT_TRIGGER_ROUTES = [
  '/auth',
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
 * 
 * ⚡ OPTIMISÉ: 
 * - Redirection immédiate depuis /, /home, /auth vers le dashboard
 * - Pas de redirection si déjà sur le bon dashboard ou une route publique autorisée
 * - Utilise un ref pour éviter les redirections multiples
 */
export const useRoleRedirect = () => {
  const { profile, user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirectedRef = useRef(false);
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Reset le flag si on change de page manuellement
    if (lastPathRef.current !== currentPath) {
      lastPathRef.current = currentPath;
      // Ne pas reset si on vient d'être redirigé
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = false;
      }
    }

    console.log('🔍 [useRoleRedirect] État:', {
      loading,
      profileLoading,
      hasUser: !!user,
      hasProfile: !!profile,
      role: profile?.role,
      currentPath,
      hasRedirected: hasRedirectedRef.current
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
      const targetRoute = getDashboardRoute(profile.role);
      
      // Vérifier si on est sur une route qui déclenche une redirection
      const isOnRedirectTriggerRoute = REDIRECT_TRIGGER_ROUTES.some(route => 
        currentPath === route || currentPath === route + '/'
      );
      
      // ⚡ PRIORITÉ 1: Rediriger depuis les pages d'entrée (/, /home, /auth)
      if (isOnRedirectTriggerRoute && !hasRedirectedRef.current) {
        console.log(`🚀 [useRoleRedirect] Redirection depuis ${currentPath} vers ${targetRoute} (rôle: ${profile.role})`);
        hasRedirectedRef.current = true;
        navigate(targetRoute, { replace: true });
        return;
      }
      
      // Ne pas rediriger si l'utilisateur est déjà sur la bonne route
      if (currentPath.startsWith(targetRoute)) {
        console.log('✅ [useRoleRedirect] Déjà sur la bonne route:', currentPath);
        return;
      }
      
      // Ne pas rediriger si l'utilisateur est sur une route publique autorisée
      const isOnPublicRoute = PUBLIC_ROUTES.some(route => 
        currentPath === route || currentPath.startsWith(route + '/')
      );
      
      if (isOnPublicRoute) {
        console.log('📍 [useRoleRedirect] Route publique autorisée:', currentPath);
        return;
      }
      
      console.log('📍 [useRoleRedirect] Sur une autre route:', currentPath);
    } else if (user && !profile && !profileLoading) {
      // L'utilisateur est connecté mais n'a pas de profil (rare)
      console.log('⚠️ [useRoleRedirect] Utilisateur sans profil détecté');
    }
  }, [user, profile, loading, profileLoading, navigate, location.pathname]);

  // Reset le flag quand l'utilisateur se déconnecte
  useEffect(() => {
    if (!user) {
      hasRedirectedRef.current = false;
    }
  }, [user]);
};
