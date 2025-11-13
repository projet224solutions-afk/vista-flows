import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook pour protéger les routes en vérifiant les permissions d'un agent
 * @param requiredPermission - La permission requise pour accéder à la route
 * @param redirectTo - La route vers laquelle rediriger si l'accès est refusé (par défaut: '/pdg')
 */
export const usePermissionGuard = (
  requiredPermission: string,
  redirectTo: string = '/pdg'
) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        navigate('/auth');
        return;
      }

      try {
        setLoading(true);

        // Récupérer l'agent connecté
        const { data: agent, error: agentError } = await supabase
          .from('agents_management')
          .select('id, is_active')
          .eq('user_id', user.id)
          .single();

        if (agentError || !agent) {
          console.log('Utilisateur n\'est pas un agent');
          setHasAccess(true); // Peut être PDG ou autre rôle
          setLoading(false);
          return;
        }

        if (!agent.is_active) {
          toast.error('Votre compte agent est suspendu');
          setHasAccess(false);
          setLoading(false);
          navigate(redirectTo);
          return;
        }

        // Vérifier la permission via RPC
        const { data: permission, error: permError } = await supabase
          .rpc('check_agent_permission', {
            p_agent_id: agent.id,
            p_permission_key: requiredPermission
          });

        if (permError) throw permError;

        if (!permission) {
          toast.error('Permission refusée pour cet agent');
          setHasAccess(false);
          navigate(redirectTo);
        } else {
          setHasAccess(true);
        }
      } catch (error: any) {
        console.error('Erreur vérification permission:', error);
        toast.error('Erreur lors de la vérification des permissions');
        setHasAccess(false);
        navigate(redirectTo);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [user, requiredPermission, navigate, redirectTo]);

  return { hasAccess, loading };
};
