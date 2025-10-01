/**
 * 🏢 Service de Gestion des Agents - 224Solutions
 * Service complet pour la gestion des agents, sous-agents et commissions
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types pour le système d'agents
export interface PDGManagement {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentManagement {
  id: string;
  agent_code: string;
  user_id: string;
  pdg_id: string;
  name: string;
  email: string;
  phone: string;
  can_create_sub_agent: boolean;
  is_active: boolean;
  permissions: string[];
  total_users_created: number;
  total_commissions_earned: number;
  created_at: string;
  updated_at: string;
}

export interface SubAgentManagement {
  id: string;
  sub_agent_code: string;
  user_id: string;
  parent_agent_id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  permissions: string[];
  total_users_created: number;
  total_commissions_earned: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCreatedUser {
  id: string;
  user_code: string;
  user_id?: string;
  creator_id: string;
  creator_type: 'agent' | 'sub_agent';
  name: string;
  email?: string;
  phone?: string;
  invitation_token: string;
  invitation_link: string;
  status: 'invited' | 'active' | 'suspended' | 'inactive';
  device_type?: 'mobile' | 'pc' | 'tablet';
  activated_at?: string;
  last_login?: string;
  total_revenue_generated: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCommission {
  id: string;
  commission_code: string;
  recipient_id: string;
  recipient_type: 'agent' | 'sub_agent';
  source_user_id: string;
  source_transaction_id?: string;
  amount: number;
  commission_rate: number;
  source_type: 'user' | 'sub_agent_user';
  calculation_details: any;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at?: string;
  created_at: string;
}

export interface CommissionSettings {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string;
  updated_by?: string;
  updated_at: string;
}

export class AgentService {
  private static instance: AgentService;

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
      return pdg;
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
      return data;
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
    can_create_sub_agent?: boolean;
    permissions?: string[];
  }): Promise<AgentManagement> {
    try {
      // Créer d'abord un utilisateur auth si nécessaire
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: this.generateTemporaryPassword(),
        email_confirm: true
      });

      if (authError) throw authError;

      const { data: agent, error } = await supabase
        .from('agents_management')
        .insert({
          pdg_id: data.pdg_id,
          user_id: authUser.user.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          can_create_sub_agent: data.can_create_sub_agent || false,
          permissions: data.permissions || ['create_users']
        })
        .select()
        .single();

      if (error) throw error;

      // Envoyer email d'invitation
      await this.sendAgentInvitation(data.email, data.name, 'agent');

      toast.success(`✅ Agent ${data.name} créé avec succès`);
      return agent;
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
      return data || [];
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

  // =====================================================
  // GESTION SOUS-AGENTS
  // =====================================================

  async createSubAgent(data: {
    parent_agent_id: string;
    name: string;
    email: string;
    phone: string;
    permissions?: string[];
  }): Promise<SubAgentManagement> {
    try {
      // Vérifier que l'agent parent peut créer des sous-agents
      const { data: parentAgent } = await supabase
        .from('agents_management')
        .select('can_create_sub_agent')
        .eq('id', data.parent_agent_id)
        .single();

      if (!parentAgent?.can_create_sub_agent) {
        throw new Error('L\'agent parent n\'a pas la permission de créer des sous-agents');
      }

      // Créer utilisateur auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: this.generateTemporaryPassword(),
        email_confirm: true
      });

      if (authError) throw authError;

      const { data: subAgent, error } = await supabase
        .from('sub_agents_management')
        .insert({
          parent_agent_id: data.parent_agent_id,
          user_id: authUser.user.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          permissions: data.permissions || ['create_users']
        })
        .select()
        .single();

      if (error) throw error;

      // Envoyer email d'invitation
      await this.sendAgentInvitation(data.email, data.name, 'sub_agent');

      toast.success(`✅ Sous-agent ${data.name} créé avec succès`);
      return subAgent;
    } catch (error) {
      console.error('❌ Erreur création sous-agent:', error);
      toast.error('Erreur lors de la création du sous-agent');
      throw error;
    }
  }

  async getSubAgentsByAgent(agentId: string): Promise<SubAgentManagement[]> {
    try {
      const { data, error } = await supabase
        .from('sub_agents_management')
        .select('*')
        .eq('parent_agent_id', agentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération sous-agents:', error);
      return [];
    }
  }

  // =====================================================
  // GESTION UTILISATEURS CRÉÉS PAR AGENTS
  // =====================================================

  async createUserByAgent(data: {
    creator_id: string;
    creator_type: 'agent' | 'sub_agent';
    name: string;
    email?: string;
    phone?: string;
  }): Promise<AgentCreatedUser> {
    try {
      const { data: user, error } = await supabase
        .from('agent_created_users')
        .insert({
          creator_id: data.creator_id,
          creator_type: data.creator_type,
          name: data.name,
          email: data.email,
          phone: data.phone
        })
        .select()
        .single();

      if (error) throw error;

      // Envoyer invitation
      if (data.email) {
        await this.sendUserInvitation(data.email, data.name, user.invitation_link);
      }
      if (data.phone) {
        await this.sendSMSInvitation(data.phone, user.invitation_link);
      }

      toast.success(`✅ Utilisateur ${data.name} créé et invité`);
      return user;
    } catch (error) {
      console.error('❌ Erreur création utilisateur:', error);
      toast.error('Erreur lors de la création de l\'utilisateur');
      throw error;
    }
  }

  async getUsersByCreator(creatorId: string): Promise<AgentCreatedUser[]> {
    try {
      const { data, error } = await supabase
        .from('agent_created_users')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération utilisateurs:', error);
      return [];
    }
  }

  async activateUser(invitationToken: string, deviceType: 'mobile' | 'pc' | 'tablet'): Promise<{
    success: boolean;
    downloadUrl?: string;
    user?: AgentCreatedUser;
  }> {
    try {
      // Trouver l'utilisateur par token
      const { data: user, error: findError } = await supabase
        .from('agent_created_users')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'invited')
        .single();

      if (findError || !user) {
        throw new Error('Invitation invalide ou expirée');
      }

      // Activer l'utilisateur
      const { error: updateError } = await supabase
        .from('agent_created_users')
        .update({
          status: 'active',
          device_type: deviceType,
          activated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Déterminer l'URL de téléchargement
      const downloadUrl = deviceType === 'mobile'
        ? 'https://play.google.com/store/apps/details?id=com.224solutions.app'
        : 'https://224solutions.app/download/desktop';

      toast.success('✅ Compte activé avec succès !');
      
      return {
        success: true,
        downloadUrl,
        user: { ...user, status: 'active', device_type: deviceType }
      };
    } catch (error) {
      console.error('❌ Erreur activation utilisateur:', error);
      toast.error('Erreur lors de l\'activation');
      return { success: false };
    }
  }

  // =====================================================
  // GESTION COMMISSIONS
  // =====================================================

  async processTransaction(data: {
    userId: string;
    transactionAmount: number;
    netRevenue: number;
    transactionType: string;
    metadata?: any;
  }): Promise<{ commissions: any[]; transactionId: string }> {
    try {
      // Enregistrer la transaction
      const { data: transaction, error: txError } = await supabase
        .from('agent_transactions')
        .insert({
          user_id: data.userId,
          amount: data.transactionAmount,
          net_revenue: data.netRevenue,
          commission_base: data.netRevenue,
          transaction_type: data.transactionType,
          metadata: data.metadata
        })
        .select()
        .single();

      if (txError) throw txError;

      // Calculer et distribuer les commissions
      const { data: commissions, error: commError } = await supabase
        .rpc('calculate_and_distribute_commissions', {
          p_user_id: data.userId,
          p_transaction_amount: data.transactionAmount,
          p_net_revenue: data.netRevenue
        });

      if (commError) throw commError;

      // Marquer la transaction comme traitée
      await supabase
        .from('agent_transactions')
        .update({ processed_for_commissions: true })
        .eq('id', transaction.id);

      return {
        commissions: commissions || [],
        transactionId: transaction.id
      };
    } catch (error) {
      console.error('❌ Erreur traitement transaction:', error);
      throw error;
    }
  }

  async getCommissionsByRecipient(recipientId: string, recipientType: 'agent' | 'sub_agent'): Promise<AgentCommission[]> {
    try {
      const { data, error } = await supabase
        .from('agent_commissions')
        .select('*')
        .eq('recipient_id', recipientId)
        .eq('recipient_type', recipientType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération commissions:', error);
      return [];
    }
  }

  // =====================================================
  // PARAMÈTRES DE COMMISSION
  // =====================================================

  async getCommissionSettings(): Promise<CommissionSettings[]> {
    try {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération paramètres:', error);
      return [];
    }
  }

  async updateCommissionSetting(settingKey: string, value: number, updatedBy: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('commission_settings')
        .update({
          setting_value: value,
          updated_by: updatedBy,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', settingKey);

      if (error) throw error;
      toast.success(`✅ Paramètre ${settingKey} mis à jour`);
    } catch (error) {
      console.error('❌ Erreur mise à jour paramètre:', error);
      toast.error('Erreur lors de la mise à jour');
      throw error;
    }
  }

  // =====================================================
  // STATISTIQUES ET RAPPORTS
  // =====================================================

  async getAgentStats(agentId: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalCommissions: number;
    monthlyCommissions: number;
    subAgents: number;
  }> {
    try {
      const [usersData, commissionsData, subAgentsData] = await Promise.all([
        supabase
          .from('agent_created_users')
          .select('id, status')
          .eq('creator_id', agentId),
        supabase
          .from('agent_commissions')
          .select('amount, created_at')
          .eq('recipient_id', agentId)
          .eq('recipient_type', 'agent'),
        supabase
          .from('sub_agents_management')
          .select('id')
          .eq('parent_agent_id', agentId)
          .eq('is_active', true)
      ]);

      const users = usersData.data || [];
      const commissions = commissionsData.data || [];
      const subAgents = subAgentsData.data || [];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        totalCommissions: commissions.reduce((sum, c) => sum + c.amount, 0),
        monthlyCommissions: commissions
          .filter(c => new Date(c.created_at) >= monthStart)
          .reduce((sum, c) => sum + c.amount, 0),
        subAgents: subAgents.length
      };
    } catch (error) {
      console.error('❌ Erreur récupération stats agent:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalCommissions: 0,
        monthlyCommissions: 0,
        subAgents: 0
      };
    }
  }

  // =====================================================
  // UTILITAIRES PRIVÉS
  // =====================================================

  private generateTemporaryPassword(): string {
    return Math.random().toString(36).slice(-12) + '!A1';
  }

  private async sendAgentInvitation(email: string, name: string, type: 'agent' | 'sub_agent'): Promise<void> {
    // Simulation d'envoi d'email - à implémenter avec un service réel
    console.log(`📧 Envoi invitation ${type} à ${email} pour ${name}`);
    // TODO: Intégrer avec service email (SendGrid, etc.)
  }

  private async sendUserInvitation(email: string, name: string, invitationLink: string): Promise<void> {
    // Simulation d'envoi d'email - à implémenter avec un service réel
    console.log(`📧 Envoi invitation utilisateur à ${email} pour ${name}: ${invitationLink}`);
    // TODO: Intégrer avec service email
  }

  private async sendSMSInvitation(phone: string, invitationLink: string): Promise<void> {
    // Simulation d'envoi SMS - à implémenter avec un service réel
    console.log(`📱 Envoi SMS invitation à ${phone}: ${invitationLink}`);
    // TODO: Intégrer avec service SMS (Twilio, etc.)
  }
}

// Export singleton
export const agentService = AgentService.getInstance();
