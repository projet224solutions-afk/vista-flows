/**
 * AGENT ACTIONS HOOK - 224SOLUTIONS
 * Hook pour toutes les actions de l'agent (création utilisateurs, sous-agents, etc.)
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'client' | 'vendeur' | 'livreur' | 'taxi' | 'transitaire' | 'syndicat';
  country: string;
  city: string;
  // Données spécifiques selon le rôle
  syndicatData?: {
    bureau_code: string;
    prefecture: string;
    commune: string;
    full_location: string;
  };
  vendeurData?: {
    business_name: string;
    business_description?: string;
    business_address?: string;
  };
  driverData?: {
    license_number: string;
    vehicle_type: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    vehicle_plate?: string;
  };
}

export interface CreateSubAgentData {
  name: string;
  email: string;
  phone: string;
  commission_rate: number;
  can_create_sub_agent: boolean;
  permissions: string[];
}

interface UseAgentActionsOptions {
  onUserCreated?: () => void;
  onSubAgentCreated?: () => void;
  onSubAgentUpdated?: () => void;
  onSubAgentDeleted?: () => void;
}

export const useAgentActions = (options: UseAgentActionsOptions = {}) => {
  /**
   * Créer un utilisateur
   */
  const createUser = async (
    userData: CreateUserData,
    agentId: string,
    agentCode: string,
    accessToken?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validation basique
      if (!userData.firstName || !userData.email || !userData.phone) {
        return { success: false, error: 'Veuillez remplir tous les champs obligatoires' };
      }

      // Validation spécifique selon le rôle
      if (userData.role === 'syndicat') {
        if (!userData.syndicatData?.bureau_code || !userData.syndicatData?.prefecture || !userData.syndicatData?.commune) {
          return { success: false, error: 'Veuillez remplir tous les champs du bureau syndical' };
        }
      } else if (userData.role === 'vendeur') {
        if (!userData.vendeurData?.business_name) {
          return { success: false, error: "Veuillez remplir le nom de l'entreprise" };
        }
      } else if (userData.role === 'taxi' || userData.role === 'livreur') {
        if (!userData.driverData?.license_number) {
          return { success: false, error: 'Veuillez remplir le numéro de permis' };
        }
      }

      // Préparer les données pour l'edge function
      const requestBody: any = {
        email: userData.email,
        password: Math.random().toString(36).slice(-8) + 'Aa1!',
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role,
        country: userData.country,
        city: userData.city,
        agentId: agentId,
        agentCode: agentCode,
        access_token: accessToken,
      };

      // Ajouter les données spécifiques selon le rôle
      if (userData.syndicatData) {
        requestBody.syndicatData = userData.syndicatData;
      }
      if (userData.vendeurData) {
        requestBody.vendeurData = userData.vendeurData;
      }
      if (userData.driverData) {
        requestBody.driverData = userData.driverData;
      }

      // Créer l'utilisateur via edge function
      const { data, error } = await supabase.functions.invoke('create-user-by-agent', {
        body: requestBody,
      });

      if (error) {
        console.error('[useAgentActions] Edge function error:', error);
        return { success: false, error: error.message || "Erreur lors de la création de l'utilisateur" };
      }

      // Vérifier si la réponse contient une erreur
      if (data?.error || data?.code === 'EMAIL_EXISTS') {
        if (data.code === 'EMAIL_EXISTS') {
          return { success: false, error: '⚠️ Cet email est déjà utilisé par un autre utilisateur' };
        }
        return { success: false, error: data.error || "Erreur lors de la création de l'utilisateur" };
      }

      toast.success(`Utilisateur ${userData.role} créé avec succès!`);
      options.onUserCreated?.();
      return { success: true };
    } catch (error: any) {
      console.error('[useAgentActions] Create user error:', error);
      return { success: false, error: error.message || "Erreur lors de la création de l'utilisateur" };
    }
  };

  /**
   * Créer un sous-agent
   */
  const createSubAgent = async (
    subAgentData: CreateSubAgentData,
    parentAgentId: string
  ): Promise<{ success: boolean; error?: string; subAgent?: any }> => {
    try {
      // Validation
      if (!subAgentData.name || !subAgentData.email || !subAgentData.phone) {
        return { success: false, error: 'Veuillez remplir tous les champs obligatoires' };
      }

      if (subAgentData.commission_rate < 0 || subAgentData.commission_rate > 100) {
        return { success: false, error: 'Le taux de commission doit être entre 0 et 100%' };
      }

      // Créer le compte utilisateur pour le sous-agent
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: subAgentData.email,
        password: Math.random().toString(36).slice(-8) + 'Aa1!', // Mot de passe temporaire
        options: {
          data: {
            firstName: subAgentData.name,
            phone: subAgentData.phone,
            role: 'agent'
          }
        }
      });

      if (authError) {
        console.error('[useAgentActions] Auth signup error:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Erreur lors de la création du compte' };
      }

      // Créer l'enregistrement agent
      const { data: agent, error: agentError } = await supabase
        .from('agents_management')
        .insert({
          user_id: authData.user.id,
          name: subAgentData.name,
          email: subAgentData.email,
          phone: subAgentData.phone,
          parent_agent_id: parentAgentId,
          commission_rate: subAgentData.commission_rate,
          can_create_sub_agent: subAgentData.can_create_sub_agent,
          permissions: subAgentData.permissions,
          is_active: true
        })
        .select()
        .single();

      if (agentError) {
        console.error('[useAgentActions] Agent creation error:', agentError);
        // Supprimer le compte auth créé
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: agentError.message };
      }

      toast.success(`Sous-agent ${subAgentData.name} créé avec succès!`);
      options.onSubAgentCreated?.();
      return { success: true, subAgent: agent };
    } catch (error: any) {
      console.error('[useAgentActions] Create sub-agent error:', error);
      return { success: false, error: error.message || 'Erreur lors de la création du sous-agent' };
    }
  };

  /**
   * Mettre à jour un sous-agent
   */
  const updateSubAgent = async (
    subAgentId: string,
    updates: Partial<CreateSubAgentData>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          commission_rate: updates.commission_rate,
          can_create_sub_agent: updates.can_create_sub_agent,
          permissions: updates.permissions
        })
        .eq('id', subAgentId);

      if (error) {
        console.error('[useAgentActions] Update sub-agent error:', error);
        return { success: false, error: error.message };
      }

      toast.success('Sous-agent mis à jour avec succès!');
      options.onSubAgentUpdated?.();
      return { success: true };
    } catch (error: any) {
      console.error('[useAgentActions] Update sub-agent error:', error);
      return { success: false, error: error.message || 'Erreur lors de la mise à jour du sous-agent' };
    }
  };

  /**
   * Désactiver un sous-agent
   */
  const deleteSubAgent = async (subAgentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Désactiver plutôt que supprimer (soft delete)
      const { error } = await supabase
        .from('agents_management')
        .update({ is_active: false })
        .eq('id', subAgentId);

      if (error) {
        console.error('[useAgentActions] Delete sub-agent error:', error);
        return { success: false, error: error.message };
      }

      toast.success('Sous-agent désactivé avec succès!');
      options.onSubAgentDeleted?.();
      return { success: true };
    } catch (error: any) {
      console.error('[useAgentActions] Delete sub-agent error:', error);
      return { success: false, error: error.message || 'Erreur lors de la désactivation du sous-agent' };
    }
  };

  /**
   * Assigner des permissions à un agent
   */
  const assignPermissions = async (
    agentId: string,
    permissions: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('agents_management')
        .update({ permissions })
        .eq('id', agentId);

      if (error) {
        console.error('[useAgentActions] Assign permissions error:', error);
        return { success: false, error: error.message };
      }

      toast.success('Permissions mises à jour avec succès!');
      return { success: true };
    } catch (error: any) {
      console.error('[useAgentActions] Assign permissions error:', error);
      return { success: false, error: error.message || 'Erreur lors de la mise à jour des permissions' };
    }
  };

  /**
   * Mettre à jour le taux de commission
   */
  const updateCommissionRate = async (
    agentId: string,
    rate: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (rate < 0 || rate > 100) {
        return { success: false, error: 'Le taux de commission doit être entre 0 et 100%' };
      }

      const { error } = await supabase
        .from('agents_management')
        .update({ commission_rate: rate })
        .eq('id', agentId);

      if (error) {
        console.error('[useAgentActions] Update commission rate error:', error);
        return { success: false, error: error.message };
      }

      toast.success('Taux de commission mis à jour avec succès!');
      return { success: true };
    } catch (error: any) {
      console.error('[useAgentActions] Update commission rate error:', error);
      return { success: false, error: error.message || 'Erreur lors de la mise à jour du taux de commission' };
    }
  };

  return {
    createUser,
    createSubAgent,
    updateSubAgent,
    deleteSubAgent,
    assignPermissions,
    updateCommissionRate
  };
};
