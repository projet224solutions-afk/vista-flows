import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentPermission {
  id: string;
  agent_id: string;
  permission_key: string;
  permission_value: boolean;
  created_at: string;
  updated_at: string;
}

export const AVAILABLE_PERMISSIONS = {
  // Gestion des utilisateurs
  manage_vendors: 'Gérer les vendeurs',
  manage_drivers: 'Gérer les livreurs',
  manage_users: 'Gérer les utilisateurs',
  
  // Statistiques et rapports
  view_statistics: 'Voir les statistiques globales',
  view_reports: 'Accès aux rapports',
  
  // Finance
  manage_wallet_transactions: 'Gérer les transactions wallet',
  access_pdg_wallet: 'Accès à la caisse PDG',
  view_financial_module: 'Accès au module financier',
  manage_commissions: 'Accès au module de commissions',
  view_payments: 'Voir et contrôler les paiements internes',
  
  // Opérations
  manage_orders: 'Gérer les commandes',
  manage_deliveries: 'Gestion des livraisons',
  manage_sanctions: 'Gestions des sanctions utilisateurs',
  
  // Fournisseurs
  access_suppliers: 'Accès au module fournisseurs',
  
  // Agents
  manage_agents: 'Accès au module agents (créer sous-agent)',
  create_sub_agents: 'Créer des sous-agents',
} as const;

export type PermissionKey = keyof typeof AVAILABLE_PERMISSIONS;

export const useAgentPermissions = (agentId: string | undefined) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Charger les permissions de l'agent
  const loadPermissions = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_agent_permissions' as any, {
          p_agent_id: agentId
        });

      if (error) throw error;

      setPermissions((data as Record<string, boolean>) || {});
    } catch (error: any) {
      console.error('Erreur chargement permissions:', error);
      toast.error('Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Mettre à jour les permissions
  const setAgentPermissions = useCallback(async (newPermissions: Record<string, boolean>) => {
    if (!agentId) return false;

    try {
      const { data, error } = await supabase
        .rpc('set_agent_permissions' as any, {
          p_agent_id: agentId,
          p_permissions: newPermissions
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }

      toast.success(result.message || 'Permissions mises à jour');
      await loadPermissions();
      return true;
    } catch (error: any) {
      console.error('Erreur mise à jour permissions:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour des permissions');
      return false;
    }
  }, [agentId, loadPermissions]);

  // Vérifier une permission spécifique
  const hasPermission = useCallback((permissionKey: string): boolean => {
    return permissions[permissionKey] === true;
  }, [permissions]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!agentId) return;

    loadPermissions();

    // S'abonner aux changements en temps réel
    const channel = supabase
      .channel('agent-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_permissions',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('Permission updated:', payload);
          loadPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, loadPermissions]);

  return {
    permissions,
    loading,
    setAgentPermissions,
    hasPermission,
    reload: loadPermissions
  };
};
