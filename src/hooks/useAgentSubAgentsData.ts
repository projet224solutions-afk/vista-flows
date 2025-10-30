import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SubAgent {
  id: string;
  pdg_id: string;
  parent_agent_id: string;
  agent_code: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  permissions: string[];
  commission_rate: number;
  created_at: string;
  updated_at?: string;
  total_users_created?: number;
}

export interface AgentProfile {
  id: string;
  pdg_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  agent_code: string;
  permissions: string[];
  is_active: boolean;
  can_create_sub_agent: boolean;
  commission_rate: number;
}

export interface SubAgentStats {
  totalSubAgents: number;
  activeSubAgents: number;
  inactiveSubAgents: number;
  averageCommission: number;
}

export const useAgentSubAgentsData = () => {
  const { user } = useAuth();
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubAgentStats>({
    totalSubAgents: 0,
    activeSubAgents: 0,
    inactiveSubAgents: 0,
    averageCommission: 0,
  });

  // Charger le profil de l'agent
  const loadAgentProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('agents_management')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      const profile: AgentProfile = {
        id: data.id,
        pdg_id: data.pdg_id,
        user_id: data.user_id,
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        agent_code: data.agent_code,
        permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
        is_active: data.is_active,
        can_create_sub_agent: data.can_create_sub_agent || false,
        commission_rate: Number(data.commission_rate) || 0,
      };
      
      setAgentProfile(profile);
      return profile;
    } catch (error) {
      console.error('Erreur chargement agent:', error);
      toast.error('Erreur lors du chargement du profil agent');
    }
    return null;
  }, [user?.id]);

  // Charger les sous-agents
  const loadSubAgents = useCallback(async () => {
    if (!agentProfile?.id) return;

    try {
      setLoading(true);

      // Récupérer les sous-agents - typage simplifié
      const { data: subAgentsData, error: subAgentsError } = await supabase
        .from('agents_management')
        .select('*')
        .eq('parent_agent_id', agentProfile.id)
        .order('created_at', { ascending: false });

      if (subAgentsError) {
        console.error('Erreur récupération sous-agents:', subAgentsError);
        throw subAgentsError;
      }

      // Récupérer les statistiques pour chaque sous-agent
      const subAgentsWithStats: SubAgent[] = [];
      
      for (const subAgent of (subAgentsData || [])) {
        // Compter les utilisateurs créés par ce sous-agent
        const { count: usersCount } = await supabase
          .from('agent_created_users')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', subAgent.id);

        subAgentsWithStats.push({
          id: subAgent.id,
          pdg_id: subAgent.pdg_id,
          parent_agent_id: subAgent.parent_agent_id || agentProfile.id,
          agent_code: subAgent.agent_code,
          name: subAgent.name,
          email: subAgent.email,
          phone: subAgent.phone || '',
          is_active: subAgent.is_active,
          permissions: Array.isArray(subAgent.permissions) ? (subAgent.permissions as string[]) : [],
          commission_rate: Number(subAgent.commission_rate) || 0,
          created_at: subAgent.created_at,
          updated_at: subAgent.updated_at || undefined,
          total_users_created: usersCount || 0,
        });
      }

      setSubAgents(subAgentsWithStats);

      // Calculer les statistiques globales
      const activeSubAgents = subAgentsWithStats.filter(a => a.is_active).length;
      const avgCommission = subAgentsWithStats.length > 0
        ? subAgentsWithStats.reduce((sum, a) => sum + (Number(a.commission_rate) || 0), 0) / subAgentsWithStats.length
        : 0;

      setStats({
        totalSubAgents: subAgentsWithStats.length,
        activeSubAgents,
        inactiveSubAgents: subAgentsWithStats.length - activeSubAgents,
        averageCommission: avgCommission,
      });
    } catch (error) {
      console.error('Erreur chargement sous-agents:', error);
      toast.error('Erreur lors du chargement des sous-agents');
    } finally {
      setLoading(false);
    }
  }, [agentProfile?.id]);

  // Créer un sous-agent
  const createSubAgent = useCallback(async (subAgentData: {
    name: string;
    email: string;
    phone: string;
    permissions: string[];
    commission_rate?: number;
  }) => {
    if (!agentProfile?.id || !agentProfile?.pdg_id) {
      toast.error('Profil agent non trouvé');
      return null;
    }

    if (!agentProfile.can_create_sub_agent) {
      toast.error('Vous n\'avez pas la permission de créer des sous-agents');
      return null;
    }

    try {
      // Générer un code agent unique
      const agentCode = `SAG-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase.functions.invoke('create-sub-agent', {
        body: {
          pdg_id: agentProfile.pdg_id,
          parent_agent_id: agentProfile.id,
          agent_code: agentCode,
          name: subAgentData.name.trim(),
          email: subAgentData.email.trim().toLowerCase(),
          phone: subAgentData.phone.trim(),
          permissions: subAgentData.permissions,
          commission_rate: subAgentData.commission_rate || 5,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Sous-agent créé avec succès');
      await loadSubAgents(); // Recharger la liste
      return data?.agent;
    } catch (error: any) {
      console.error('Erreur création sous-agent:', error);
      toast.error(error.message || 'Erreur lors de la création');
      return null;
    }
  }, [agentProfile, loadSubAgents]);

  // Mettre à jour un sous-agent
  const updateSubAgent = useCallback(async (subAgentId: string, updates: Partial<SubAgent>) => {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subAgentId);

      if (error) throw error;

      toast.success('Sous-agent mis à jour avec succès');
      await loadSubAgents(); // Recharger la liste
      return true;
    } catch (error: any) {
      console.error('Erreur mise à jour sous-agent:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
      return false;
    }
  }, [loadSubAgents]);

  // Supprimer un sous-agent (désactivation)
  const deleteSubAgent = useCallback(async (subAgentId: string) => {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', subAgentId);

      if (error) throw error;

      toast.success('Sous-agent désactivé avec succès');
      await loadSubAgents(); // Recharger la liste
      return true;
    } catch (error: any) {
      console.error('Erreur suppression sous-agent:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
      return false;
    }
  }, [loadSubAgents]);

  // Activer/Désactiver un sous-agent
  const toggleSubAgentStatus = useCallback(async (subAgentId: string, isActive: boolean) => {
    return updateSubAgent(subAgentId, { is_active: isActive });
  }, [updateSubAgent]);

  // Charger les données au montage
  useEffect(() => {
    const init = async () => {
      const profile = await loadAgentProfile();
      if (profile) {
        await loadSubAgents();
      }
    };
    init();
  }, [user?.id]);

  // Recharger les sous-agents quand le profil agent change
  useEffect(() => {
    if (agentProfile?.id) {
      loadSubAgents();
    }
  }, [agentProfile?.id]);

  return {
    subAgents,
    agentProfile,
    loading,
    stats,
    createSubAgent,
    updateSubAgent,
    deleteSubAgent,
    toggleSubAgentStatus,
    refetch: loadSubAgents,
  };
};
