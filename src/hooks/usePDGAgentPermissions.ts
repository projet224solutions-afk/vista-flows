import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PermissionGrant {
  id: string;
  permission_key: string;
  permission_name: string;
  category: string;
  is_active: boolean;
  expires_at: string | null;
  risk_level: string;
}

export interface AgentPermission {
  permission_key: string;
  permission_name: string;
  description: string;
  category: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  requires_2fa: boolean;
  requires_audit: boolean;
}

export function usePDGAgentPermissions(pdgId: string | null) {
  const [permissions, setPermissions] = useState<PermissionGrant[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<AgentPermission[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger le catalogue de permissions
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const { data, error } = await supabase
          .from('pdg_permission_catalog')
          .select('*')
          .order('category');

        if (error) throw error;
        setPermissionCatalog(data || []);
      } catch (error) {
        console.error('Erreur chargement catalogue permissions:', error);
      }
    };

    loadCatalog();
  }, []);

  // Charger les permissions déléguées pour un PDG
  const loadPermissions = useCallback(async () => {
    if (!pdgId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pdg_access_permissions')
        .select(`
          id,
          permission_key,
          permission_name,
          is_active,
          expires_at,
          agent_id,
          pdg_permission_catalog (category, risk_level)
        `)
        .eq('pdg_id', pdgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermissions(data as any || []);
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
      toast.error('Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  }, [pdgId]);

  // Accorder une permission à un agent
  const grantPermission = useCallback(async (
    agentId: string,
    permissionKey: string,
    expiresInDays?: number,
    scope?: any
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('grant_pdg_permission_to_agent', {
          p_pdg_id: pdgId,
          p_agent_id: agentId,
          p_permission_key: permissionKey,
          p_scope: scope,
          p_expires_in_days: expiresInDays
        });

      if (error) throw error;

      if (data?.[0]?.success) {
        toast.success('Permission accordée avec succès');
        await loadPermissions();
        return true;
      } else {
        toast.error(data?.[0]?.message || 'Erreur lors de l\'octroi de la permission');
        return false;
      }
    } catch (error) {
      console.error('Erreur octroi permission:', error);
      toast.error('Erreur lors de l\'octroi de la permission');
      return false;
    }
  }, [pdgId, loadPermissions]);

  // Révoquer une permission
  const revokePermission = useCallback(async (
    agentId: string,
    permissionKey: string,
    reason?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('revoke_pdg_permission_from_agent', {
          p_pdg_id: pdgId,
          p_agent_id: agentId,
          p_permission_key: permissionKey,
          p_reason: reason
        });

      if (error) throw error;

      if (data?.[0]?.success) {
        toast.success('Permission révoquée avec succès');
        await loadPermissions();
        return true;
      } else {
        toast.error('Erreur lors de la révocation');
        return false;
      }
    } catch (error) {
      console.error('Erreur révocation permission:', error);
      toast.error('Erreur lors de la révocation de la permission');
      return false;
    }
  }, [pdgId, loadPermissions]);

  // Vérifier si un agent a une permission
  const checkAgentPermission = useCallback(async (
    agentId: string,
    permissionKey: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('agent_has_permission', {
          p_agent_id: agentId,
          p_permission_key: permissionKey
        });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Erreur vérification permission:', error);
      return false;
    }
  }, []);

  return {
    permissions,
    permissionCatalog,
    loading,
    loadPermissions,
    grantPermission,
    revokePermission,
    checkAgentPermission
  };
}

// Hook pour vérifier les permissions de l'agent actuel
export function useAgentPermissions() {
  const [agentPermissions, setAgentPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Obtenir l'agent associé à cet utilisateur
        const { data: agent } = await supabase
          .from('agents_management')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!agent) {
          setLoading(false);
          return;
        }

        // Charger les permissions actives
        const { data: permissions } = await supabase
          .from('pdg_access_permissions')
          .select('permission_key')
          .eq('agent_id', agent.id)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString());

        const permSet = new Set(permissions?.map(p => p.permission_key) || []);
        setAgentPermissions(permSet);
      } catch (error) {
        console.error('Erreur chargement permissions agent:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const hasPermission = (permissionKey: string): boolean => {
    return agentPermissions.has(permissionKey);
  };

  const hasAnyPermission = (keys: string[]): boolean => {
    return keys.some(key => agentPermissions.has(key));
  };

  const hasAllPermissions = (keys: string[]): boolean => {
    return keys.every(key => agentPermissions.has(key));
  };

  return {
    agentPermissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
