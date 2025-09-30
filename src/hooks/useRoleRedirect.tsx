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
    // REDIRECTIONS AUTOMATIQUES DÉSACTIVÉES POUR PERMETTRE LE TEST DES INTERFACES
    // L'utilisateur peut naviguer librement sans être forcé sur son dashboard
    console.log("🧪 Redirections automatiques désactivées - Navigation libre autorisée");

    // Gardons juste la logique de base pour référence
    if (!loading && user && profile) {
      console.log("👤 Utilisateur connecté:", profile.role);
    }
  }, [user, profile, loading]);

  return { user, profile, loading };
};