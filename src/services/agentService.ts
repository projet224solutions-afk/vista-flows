/**
 * 🏢 Service de Gestion des Agents - 224Solutions (Simplifié)
 * Service simplifié pour la gestion des PDG et agents
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Types simplifiés basés sur la structure réelle de la base de données
type PDGRow = Database['public']['Tables']['pdg_management']['Row'];
type AgentRow = Database['public']['Tables']['agents_management']['Row'];

export interface PDGManagement extends Omit<PDGRow, 'permissions'> {
  permissions: string[];
}

export interface AgentManagement extends Omit<AgentRow, 'permissions'> {
  permissions: string[];
  total_users_created?: number;
  total_commissions_earned?: number;
  can_create_sub_agent?: boolean;
}

// Types additionnels
export interface SubAgentManagement extends AgentManagement {}
export interface AgentCreatedUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
}
export interface AgentCommission {
  id: string;
  amount: number;
  date: string;
}
export interface CommissionSettings {
  rate: number;
  type: string;
}

export class AgentService {
  private static instance: AgentService;

  private constructor() {}

  static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  // =====================================================
  // GESTION PDG
  // =====================================================

  async createPDG(data: {
    user_id: string;
    name: string;
    email: string;
    phone?: string;
    permissions?: string[];
  }): Promise<PDGManagement> {
    try {
      const { data: pdg, error } = await supabase
        .from('pdg_management')
        .insert({
          user_id: data.user_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          permissions: data.permissions || ['all']
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ PDG créé avec succès');
      return pdg as PDGManagement;
    } catch (error) {
      console.error('❌ Erreur création PDG:', error);
      toast.error('Erreur lors de la création du PDG');
      throw error;
    }
  }

  async getPDGByUserId(userId: string): Promise<PDGManagement | null> {
    try {
      const { data, error } = await supabase
        .from('pdg_management')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as PDGManagement | null;
    } catch (error) {
      console.error('❌ Erreur récupération PDG:', error);
      return null;
    }
  }

  // =====================================================
  // GESTION AGENTS
  // =====================================================

  async createAgent(data: {
    pdg_id: string;
    name: string;
    email: string;
    phone: string;
    permissions?: string[];
  }): Promise<AgentManagement> {
    try {
      // Générer un code agent unique
      const agentCode = `AGT-${Date.now().toString(36).toUpperCase()}`;

      const { data: agent, error } = await supabase
        .from('agents_management')
        .insert({
          pdg_id: data.pdg_id,
          agent_code: agentCode,
          name: data.name,
          email: data.email,
          phone: data.phone,
          permissions: data.permissions || ['create_users']
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`✅ Agent ${data.name} créé avec succès`);
      return agent as AgentManagement;
    } catch (error) {
      console.error('❌ Erreur création agent:', error);
      toast.error('Erreur lors de la création de l\'agent');
      throw error;
    }
  }

  async getAgentsByPDG(pdgId: string): Promise<AgentManagement[]> {
    try {
      const { data, error } = await supabase
        .from('agents_management')
        .select('*')
        .eq('pdg_id', pdgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as AgentManagement[];
    } catch (error) {
      console.error('❌ Erreur récupération agents:', error);
      return [];
    }
  }

  async updateAgent(agentId: string, updates: Partial<AgentManagement>): Promise<void> {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', agentId);

      if (error) throw error;
      toast.success('✅ Agent mis à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour agent:', error);
      toast.error('Erreur lors de la mise à jour');
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({ is_active: false })
        .eq('id', agentId);

      if (error) throw error;
      toast.success('✅ Agent désactivé');
    } catch (error) {
      console.error('❌ Erreur désactivation agent:', error);
      toast.error('Erreur lors de la désactivation');
      throw error;
    }
  }

  // =====================================================
  // STATISTIQUES
  // =====================================================

  async getAgentStats(agentId: string) {
    try {
      const { data: agent } = await supabase
        .from('agents_management')
        .select('*')
        .eq('id', agentId)
        .single();

      if (!agent) throw new Error('Agent non trouvé');

      return {
        totalUsers: 0,
        totalCommissions: agent.commission_rate || 0,
        isActive: agent.is_active
      };
    } catch (error) {
      console.error('❌ Erreur stats agent:', error);
      return null;
    }
  }

  // Méthodes additionnelles pour compatibilité
  async getSubAgentsByAgent(agentId: string): Promise<SubAgentManagement[]> {
    return [];
  }

  async getUsersByCreator(creatorId: string): Promise<AgentCreatedUser[]> {
    return [];
  }

  async getCommissionsByRecipient(recipientId: string): Promise<AgentCommission[]> {
    return [];
  }

  async getCommissionSettings(): Promise<CommissionSettings | null> {
    return { rate: 0, type: 'percentage' };
  }

  async updateCommissionSetting(settings: Partial<CommissionSettings>): Promise<void> {}
  
  async processTransaction(data: any): Promise<void> {}
  
  async createUserByAgent(agentId: string, userData: any): Promise<AgentCreatedUser | null> {
    return null;
  }

  async activateUser(userId: string): Promise<void> {}
  
  async createSubAgent(data: any): Promise<SubAgentManagement> {
    throw new Error('Not implemented');
  }
}

// Instance singleton
export const agentService = AgentService.getInstance();
