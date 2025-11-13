import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface VendorAgentPermissions {
  view_dashboard?: boolean;
  view_analytics?: boolean;
  access_pos?: boolean;
  manage_products?: boolean;
  manage_orders?: boolean;
  manage_inventory?: boolean;
  manage_warehouse?: boolean;
  manage_suppliers?: boolean;
  manage_agents?: boolean;
  manage_clients?: boolean;
  manage_prospects?: boolean;
  manage_marketing?: boolean;
  access_wallet?: boolean;
  manage_payments?: boolean;
  manage_payment_links?: boolean;
  manage_expenses?: boolean;
  manage_debts?: boolean;
  access_affiliate?: boolean;
  manage_delivery?: boolean;
  access_support?: boolean;
  access_communication?: boolean;
  view_reports?: boolean;
  access_settings?: boolean;
}

export interface VendorAgent {
  id: string;
  vendor_id: string;
  agent_code: string;
  name: string;
  email: string;
  phone: string;
  access_token: string;
  commission_rate: number;
  permissions: VendorAgentPermissions;
  can_create_sub_agent: boolean;
  is_active: boolean;
  agent_type?: 'commercial' | 'logistique' | 'support' | 'administratif' | 'manager' | 'technique';
  total_users_created: number;
  total_commissions_earned: number;
  created_at: string;
  updated_at: string;
}

export interface VendorAgentStats {
  totalAgents: number;
  activeAgents: number;
  totalUsers: number;
  totalCommissions: number;
}

export const useVendorAgentsData = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<VendorAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VendorAgentStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalUsers: 0,
    totalCommissions: 0,
  });

  const loadAgents = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vendor_agents')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading vendor agents:', error);
        toast.error('Erreur lors du chargement des agents');
        return;
      }

      // Convert Json permissions to VendorAgentPermissions
      const formattedAgents = (data || []).map(agent => ({
        ...agent,
        permissions: agent.permissions as VendorAgentPermissions
      }));

      setAgents(formattedAgents);

      // Calculate stats
      const totalAgents = data?.length || 0;
      const activeAgents = data?.filter(a => a.is_active).length || 0;
      const totalUsers = data?.reduce((sum, a) => sum + (a.total_users_created || 0), 0) || 0;
      const totalCommissions = data?.reduce((sum, a) => sum + (parseFloat(a.total_commissions_earned?.toString() || '0')), 0) || 0;

      setStats({
        totalAgents,
        activeAgents,
        totalUsers,
        totalCommissions,
      });
    } catch (err) {
      console.error('Error in loadAgents:', err);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createAgent = useCallback(async (agentData: {
    name: string;
    email: string;
    phone: string;
    permissions?: VendorAgentPermissions;
    can_create_sub_agent?: boolean;
    agent_type?: 'commercial' | 'logistique' | 'support' | 'administratif' | 'manager' | 'technique';
  }) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return null;
    }

    try {
      // Note: agent_code and access_token are generated automatically by triggers
      const insertData: any = {
        vendor_id: user.id,
        name: agentData.name,
        email: agentData.email,
        phone: agentData.phone,
        permissions: agentData.permissions || ['create_users'],
        can_create_sub_agent: agentData.can_create_sub_agent || false,
        agent_type: agentData.agent_type || 'commercial',
        is_active: true,
      };

      const { data, error } = await supabase
        .from('vendor_agents')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating vendor agent:', error);
        toast.error('Erreur lors de la création de l\'agent');
        return null;
      }

      toast.success('Agent créé avec succès');
      await loadAgents();
      return data;
    } catch (err) {
      console.error('Error in createAgent:', err);
      toast.error('Erreur lors de la création de l\'agent');
      return null;
    }
  }, [user, loadAgents]);

  const updateAgent = useCallback(async (agentId: string, updates: Partial<VendorAgent>) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      // Cast permissions to any to satisfy Supabase Json type
      const updatePayload: any = { ...updates };
      
      const { error } = await supabase
        .from('vendor_agents')
        .update(updatePayload)
        .eq('id', agentId)
        .eq('vendor_id', user.id);

      if (error) {
        console.error('Error updating vendor agent:', error);
        toast.error('Erreur lors de la modification de l\'agent');
        return;
      }

      toast.success('Agent modifié avec succès');
      await loadAgents();
    } catch (err) {
      console.error('Error in updateAgent:', err);
      toast.error('Erreur lors de la modification de l\'agent');
    }
  }, [user, loadAgents]);

  const deleteAgent = useCallback(async (agentId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      // Hard delete: completely remove the agent
      const { error } = await supabase
        .from('vendor_agents')
        .delete()
        .eq('id', agentId)
        .eq('vendor_id', user.id);

      if (error) {
        console.error('Error deleting vendor agent:', error);
        toast.error('Erreur lors de la suppression de l\'agent');
        return;
      }

      toast.success('Agent supprimé définitivement');
      await loadAgents();
    } catch (err) {
      console.error('Error in deleteAgent:', err);
      toast.error('Erreur lors de la suppression de l\'agent');
    }
  }, [user, loadAgents]);

  const toggleAgentStatus = useCallback(async (agentId: string, isActive: boolean) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      const { error } = await supabase
        .from('vendor_agents')
        .update({ is_active: isActive })
        .eq('id', agentId)
        .eq('vendor_id', user.id);

      if (error) {
        console.error('Error toggling agent status:', error);
        toast.error('Erreur lors du changement de statut');
        return;
      }

      toast.success(`Agent ${isActive ? 'activé' : 'désactivé'} avec succès`);
      await loadAgents();
    } catch (err) {
      console.error('Error in toggleAgentStatus:', err);
      toast.error('Erreur lors du changement de statut');
    }
  }, [user, loadAgents]);

  useEffect(() => {
    if (user) {
      loadAgents();
    }
  }, [user, loadAgents]);

  return {
    agents,
    loading,
    stats,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    refetch: loadAgents,
  };
};
