import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Agent {
  id: string;
  pdg_id: string;
  agent_code: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  permissions: string[];
  commission_rate: number;
  can_create_sub_agent: boolean;
  created_at: string;
  updated_at?: string;
  total_users_created?: number;
  total_commissions_earned?: number;
}

export interface PDGProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  permissions: string[];
  is_active: boolean;
}

export interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  averageCommission: number;
  totalCommissionsEarned: number;
}

export const usePDGAgentsData = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pdgProfile, setPdgProfile] = useState<PDGProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AgentStats>({
    totalAgents: 0,
    activeAgents: 0,
    inactiveAgents: 0,
    averageCommission: 0,
    totalCommissionsEarned: 0,
  });

  // Charger le profil PDG
  const loadPDGProfile = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('pdg_management')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        // Si pas de profil PDG, créer automatiquement
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name, phone')
          .eq('id', user.id)
          .single();

        if (profile) {
          const { data: newPdg, error: createError } = await supabase
            .from('pdg_management')
            .insert({
              user_id: user.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
              email: profile.email,
              phone: profile.phone,
              permissions: ['all'],
              is_active: true,
            })
            .select()
            .single();

          if (createError) throw createError;
          
          const pdg: PDGProfile = {
            id: newPdg.id,
            user_id: newPdg.user_id,
            name: newPdg.name,
            email: newPdg.email,
            phone: newPdg.phone || undefined,
            permissions: Array.isArray(newPdg.permissions) ? (newPdg.permissions as string[]) : ['all'],
            is_active: newPdg.is_active,
          };
          setPdgProfile(pdg);
          toast.success('Profil PDG créé automatiquement');
          return pdg;
        }
      } else {
        const pdg: PDGProfile = {
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          permissions: Array.isArray(data.permissions) ? (data.permissions as string[]) : ['all'],
          is_active: data.is_active,
        };
        setPdgProfile(pdg);
        return pdg;
      }
    } catch (error) {
      console.error('Erreur chargement PDG:', error);
      toast.error('Erreur lors du chargement du profil PDG');
    }
    return null;
  }, [user?.id]);

  // Charger les agents
  const loadAgents = useCallback(async () => {
    if (!pdgProfile?.id) return;

    try {
      setLoading(true);

      // Récupérer les agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents_management')
        .select('*')
        .eq('pdg_id', pdgProfile.id)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Récupérer les statistiques pour chaque agent
      const agentsWithStats: Agent[] = (agentsData || []).map((agent) => {
        return {
          id: agent.id,
          pdg_id: agent.pdg_id,
          agent_code: agent.agent_code,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          is_active: agent.is_active,
          permissions: Array.isArray(agent.permissions) ? (agent.permissions as string[]) : [],
          commission_rate: Number(agent.commission_rate) || 0,
          can_create_sub_agent: false, // Par défaut false si la colonne n'existe pas
          created_at: agent.created_at,
          updated_at: agent.updated_at || undefined,
          total_commissions_earned: 0,
          total_users_created: 0,
        };
      });

      setAgents(agentsWithStats);

      // Calculer les statistiques globales
      const activeAgents = agentsWithStats.filter(a => a.is_active).length;
      const totalCommissions = agentsWithStats.reduce(
        (sum, a) => sum + (a.total_commissions_earned || 0),
        0
      );
      const avgCommission = agentsWithStats.length > 0
        ? agentsWithStats.reduce((sum, a) => sum + (Number(a.commission_rate) || 0), 0) / agentsWithStats.length
        : 0;

      setStats({
        totalAgents: agentsWithStats.length,
        activeAgents,
        inactiveAgents: agentsWithStats.length - activeAgents,
        averageCommission: avgCommission,
        totalCommissionsEarned: totalCommissions,
      });
    } catch (error) {
      console.error('Erreur chargement agents:', error);
      toast.error('Erreur lors du chargement des agents');
    } finally {
      setLoading(false);
    }
  }, [pdgProfile?.id]);

  // Créer un agent
  const createAgent = useCallback(async (agentData: {
    name: string;
    email: string;
    phone: string;
    permissions: string[];
    commission_rate?: number;
    can_create_sub_agent?: boolean;
  }) => {
    if (!pdgProfile?.id) {
      toast.error('Profil PDG non trouvé');
      return null;
    }

    try {
      // Générer un code agent unique
      const agentCode = `AG-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from('agents_management')
        .insert({
          pdg_id: pdgProfile.id,
          agent_code: agentCode,
          name: agentData.name,
          email: agentData.email,
          phone: agentData.phone,
          permissions: agentData.permissions,
          commission_rate: agentData.commission_rate || 10,
          can_create_sub_agent: agentData.can_create_sub_agent || false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Agent créé avec succès');
      await loadAgents(); // Recharger la liste
      return data;
    } catch (error: any) {
      console.error('Erreur création agent:', error);
      toast.error(error.message || 'Erreur lors de la création');
      return null;
    }
  }, [pdgProfile?.id, loadAgents]);

  // Mettre à jour un agent
  const updateAgent = useCallback(async (agentId: string, updates: Partial<Agent>) => {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agent mis à jour avec succès');
      await loadAgents(); // Recharger la liste
      return true;
    } catch (error: any) {
      console.error('Erreur mise à jour agent:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
      return false;
    }
  }, [loadAgents]);

  // Supprimer un agent (désactivation)
  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agent désactivé avec succès');
      await loadAgents(); // Recharger la liste
      return true;
    } catch (error: any) {
      console.error('Erreur suppression agent:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
      return false;
    }
  }, [loadAgents]);

  // Activer/Désactiver un agent
  const toggleAgentStatus = useCallback(async (agentId: string, isActive: boolean) => {
    return updateAgent(agentId, { is_active: isActive });
  }, [updateAgent]);

  // Charger les données au montage
  useEffect(() => {
    const init = async () => {
      const pdg = await loadPDGProfile();
      if (pdg) {
        await loadAgents();
      }
    };
    init();
  }, [user?.id]);

  // Recharger les agents quand le PDG change
  useEffect(() => {
    if (pdgProfile?.id) {
      loadAgents();
    }
  }, [pdgProfile?.id]);

  return {
    agents,
    pdgProfile,
    loading,
    stats,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    refetch: loadAgents,
  };
};
