/**
 * AGENT STATS HOOK - 224SOLUTIONS
 * Hook pour charger les statistiques de l'agent
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgentStats {
  totalUsersCreated: number;
  usersThisMonth: number;
  totalCommissions: number;
  commissionsThisMonth: number;
  subAgentsCount: number;
  activeSubAgentsCount: number;
  performance: number; // Pourcentage objectif
}

export const useAgentStats = (agentId: string | undefined) => {
  const [stats, setStats] = useState<AgentStats>({
    totalUsersCreated: 0,
    usersThisMonth: 0,
    totalCommissions: 0,
    commissionsThisMonth: 0,
    subAgentsCount: 0,
    activeSubAgentsCount: 0,
    performance: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer les sous-agents de cet agent
      const { data: subAgents, error: subAgentsError } = await supabase
        .from('agents_management')
        .select('id, is_active')
        .eq('parent_agent_id', agentId);

      if (subAgentsError) throw subAgentsError;

      // Créer une liste des IDs d'agents (agent + sous-agents)
      const agentIds = [agentId];
      if (subAgents && subAgents.length > 0) {
        agentIds.push(...subAgents.map(sa => sa.id));
      }

      // Compter le total d'utilisateurs créés
      const { count: totalCount, error: totalError } = await supabase
        .from('agent_created_users')
        .select('*', { count: 'exact', head: true })
        .in('agent_id', agentIds);

      if (totalError) throw totalError;

      // Compter les utilisateurs créés ce mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthCount, error: monthError } = await supabase
        .from('agent_created_users')
        .select('*', { count: 'exact', head: true })
        .in('agent_id', agentIds)
        .gte('created_at', startOfMonth.toISOString());

      if (monthError) throw monthError;

      // Calculer les commissions (TODO: implémenter quand le système de commission existe)
      const totalCommissions = 0;
      const commissionsThisMonth = 0;

      // Calculer la performance (TODO: implémenter selon les objectifs)
      const performance = 100;

      setStats({
        totalUsersCreated: totalCount || 0,
        usersThisMonth: monthCount || 0,
        totalCommissions,
        commissionsThisMonth,
        subAgentsCount: subAgents?.length || 0,
        activeSubAgentsCount: subAgents?.filter(sa => sa.is_active).length || 0,
        performance
      });
    } catch (err: any) {
      console.error('[useAgentStats] Error loading stats:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refetch: loadStats
  };
};
