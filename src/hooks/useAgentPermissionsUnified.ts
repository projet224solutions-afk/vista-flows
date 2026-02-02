/**
 * Hook unifié pour les permissions d'agent
 * Combine les permissions de la table agent_permissions avec les permissions legacy du JSON
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AVAILABLE_PERMISSIONS, PermissionKey } from './useAgentPermissions';
import { hasPermissionWithAliases } from '@/lib/agent-permissions';

export interface UnifiedAgentPermissions {
  permissions: Record<string, boolean>;
  loading: boolean;
  hasPermission: (key: string) => boolean;
  reload: () => Promise<void>;
}

/**
 * Hook pour charger et vérifier les permissions d'un agent
 * @param agentId - L'ID de l'agent
 */
export function useAgentPermissionsUnified(agentId: string | undefined): UnifiedAgentPermissions {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📋 [Permissions] Chargement pour agent:', agentId);

      /**
       * IMPORTANT:
       * Dans l'interface Agent (publique via access_token), on n'a souvent PAS de session Supabase Auth.
       * Si la table agent_permissions est protégée par RLS, un SELECT direct peut renvoyer un tableau vide
       * (sans erreur). On privilégie donc la RPC get_agent_permissions (security definer côté DB).
       */
      let permissionsFromRpc: Record<string, boolean> | null = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_agent_permissions', {
          p_agent_id: agentId,
        });

        if (rpcError) {
          console.warn('⚠️ [Permissions] RPC get_agent_permissions en erreur, fallback SELECT:', rpcError);
        } else if (rpcData && typeof rpcData === 'object') {
          permissionsFromRpc = rpcData as Record<string, boolean>;
          console.log('📋 [Permissions] Données RPC get_agent_permissions:', permissionsFromRpc);
        }
      } catch (e) {
        console.warn('⚠️ [Permissions] Exception RPC get_agent_permissions, fallback SELECT:', e);
      }

      // Fallback: Charger les permissions depuis la table agent_permissions
      // (utile si la RPC n'existe pas / est désactivée dans un environnement)
      let permissionsData: Array<{ permission_key: string; permission_value: boolean | null }> = [];
      if (!permissionsFromRpc) {
        const { data, error: permError } = await supabase
          .from('agent_permissions')
          .select('permission_key, permission_value')
          .eq('agent_id', agentId);

        if (permError) {
          console.error('❌ Erreur chargement agent_permissions (fallback):', permError);
        } else {
          permissionsData = (data || []) as any;
          console.log('📋 [Permissions] Données table agent_permissions (fallback):', permissionsData);
        }
      }

      // Charger aussi les permissions legacy du JSON dans agents_management
      const { data: agentData, error: agentError } = await supabase
        .from('agents_management')
        .select('permissions')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error('❌ Erreur chargement agent permissions JSON:', agentError);
      } else {
        console.log('📋 [Permissions] Données legacy JSON:', agentData?.permissions);
      }

      // Fusionner les permissions
      const mergedPermissions: Record<string, boolean> = {};

      // D'abord, les permissions de la nouvelle table (prioritaires)
      if (permissionsFromRpc) {
        Object.entries(permissionsFromRpc).forEach(([key, value]) => {
          mergedPermissions[key] = value === true;
        });
        console.log('📋 [Permissions] Après ajout RPC:', mergedPermissions);
      } else if (permissionsData && permissionsData.length > 0) {
        permissionsData.forEach(p => {
          mergedPermissions[p.permission_key] = p.permission_value ?? false;
        });
        console.log('📋 [Permissions] Après ajout nouvelle table:', mergedPermissions);
      }

      // Ensuite, ajouter les permissions legacy si elles n'existent pas déjà
      if (agentData?.permissions) {
        const legacyPerms = agentData.permissions as any;
        
        // Si c'est un tableau (ancien format)
        if (Array.isArray(legacyPerms)) {
          legacyPerms.forEach((perm: string) => {
            if (!(perm in mergedPermissions)) {
              mergedPermissions[perm] = true;
            }
          });
        } 
        // Si c'est un objet (format key: boolean)
        else if (typeof legacyPerms === 'object') {
          Object.entries(legacyPerms).forEach(([key, value]) => {
            if (!(key in mergedPermissions)) {
              mergedPermissions[key] = Boolean(value);
            }
          });
        }
        console.log('📋 [Permissions] Après fusion legacy:', mergedPermissions);
      }

      console.log('✅ [Permissions] Permissions finales:', mergedPermissions);
      setPermissions(mergedPermissions);
    } catch (error) {
      console.error('❌ Erreur chargement permissions unifiées:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  /**
   * Vérifie si l'agent a une permission donnée
   * Implémente l'héritage: manage_* implique automatiquement view_*
   */
  const hasPermission = useCallback((key: string): boolean => {
    return hasPermissionWithAliases(permissions, key);
  }, [permissions]);

  // Charger au montage et écouter les changements
  useEffect(() => {
    if (!agentId) return;

    loadPermissions();

    /**
     * IMPORTANT:
     * Selon la session (agent public via token, sans auth), le realtime sur agent_permissions
     * peut ne pas être fiable (ou filtré). On écoute donc aussi agents_management (id) et
     * on recharge les permissions à chaque update.
     */
    const channelAgentPermissions = supabase
      .channel(`agent-permissions-unified-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_permissions',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          console.log('📋 [Permissions] Changement agent_permissions → reload');
          loadPermissions();
        }
      )
      .subscribe();

    const channelAgentRow = supabase
      .channel(`agent-row-unified-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents_management',
          filter: `id=eq.${agentId}`,
        },
        () => {
          console.log('📋 [Permissions] Changement agents_management → reload');
          loadPermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelAgentPermissions);
      supabase.removeChannel(channelAgentRow);
    };
  }, [agentId, loadPermissions]);

  return {
    permissions,
    loading,
    hasPermission,
    reload: loadPermissions
  };
}

// Re-export pour compatibilité
export { AVAILABLE_PERMISSIONS, type PermissionKey };
