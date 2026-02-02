/**
 * Hook unifié pour les permissions d'agent
 * Combine les permissions de la table agent_permissions avec les permissions legacy du JSON
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AVAILABLE_PERMISSIONS, PermissionKey } from './useAgentPermissions';

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

      // Charger les permissions depuis la table agent_permissions
      const { data: permissionsData, error: permError } = await supabase
        .from('agent_permissions')
        .select('permission_key, permission_value')
        .eq('agent_id', agentId);

      if (permError) {
        console.error('❌ Erreur chargement agent_permissions:', permError);
      } else {
        console.log('📋 [Permissions] Données table agent_permissions:', permissionsData);
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
      if (permissionsData && permissionsData.length > 0) {
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

  const hasPermission = useCallback((key: string): boolean => {
    return permissions[key] === true;
  }, [permissions]);

  // Charger au montage et écouter les changements
  useEffect(() => {
    if (!agentId) return;

    loadPermissions();

    // Écouter les changements en temps réel sur agent_permissions
    const channel = supabase
      .channel(`agent-permissions-unified-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_permissions',
          filter: `agent_id=eq.${agentId}`
        },
        () => {
          console.log('📋 Permissions agent mises à jour');
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
    hasPermission,
    reload: loadPermissions
  };
}

// Re-export pour compatibilité
export { AVAILABLE_PERMISSIONS, type PermissionKey };
