import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Permission {
  id: string;
  role_id: string;
  action: string;
  allowed: boolean;
}

export interface Agent {
  id: string;
  seller_id: string;
  user_id: string;
  role_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  role?: Role;
}

export const useAgentManagement = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*');

      if (error) throw error;
      setPermissions(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchAgents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (agentData: {
    user_id: string;
    role_id: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('agents')
        .insert([{
          seller_id: user.id,
          ...agentData
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchAgents(); // Refresh the list
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateAgentStatus = async (agentId: string, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status })
        .eq('id', agentId);

      if (error) throw error;
      await fetchAgents(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
      await fetchAgents(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const getRolePermissions = (roleId: string) => {
    return permissions.filter(p => p.role_id === roleId);
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchRoles(),
        fetchPermissions(),
        fetchAgents()
      ]);
    }
  }, [user]);

  return {
    agents,
    roles,
    permissions,
    loading,
    error,
    createAgent,
    updateAgentStatus,
    deleteAgent,
    getRolePermissions,
    refetch: fetchAgents
  };
};