import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateAgentData {
  name: string;
  email: string;
  phone: string;
  permissions: string[];
  commission_rate?: number;
  can_create_sub_agent?: boolean;
}

interface UpdateAgentData {
  name?: string;
  email?: string;
  phone?: string;
  permissions?: string[];
  commission_rate?: number;
  can_create_sub_agent?: boolean;
}

interface CreateBureauData {
  bureau_code: string;
  prefecture: string;
  commune: string;
  president_name: string;
  president_email: string;
  president_phone: string;
  full_location: string;
}

interface UpdateBureauData {
  bureau_code?: string;
  prefecture?: string;
  commune?: string;
  president_name?: string;
  president_email?: string;
  president_phone?: string;
  full_location?: string;
  status?: string;
}

interface UsePDGActionsOptions {
  onAgentCreated?: () => void;
  onAgentUpdated?: () => void;
  onAgentDeleted?: () => void;
  onBureauCreated?: () => void;
  onBureauUpdated?: () => void;
  onBureauDeleted?: () => void;
  onBureauValidated?: () => void;
}

export function usePDGActions(options: UsePDGActionsOptions = {}) {
  
  // ==================== AGENTS ====================
  
  const createAgent = useCallback(async (
    agentData: CreateAgentData,
    pdgId: string
  ): Promise<{ success: boolean; error?: string; agent?: any }> => {
    try {
      // Validation
      if (!agentData.name || !agentData.email || !agentData.phone) {
        return { success: false, error: 'Tous les champs obligatoires doivent être remplis' };
      }

      if (!pdgId) {
        return { success: false, error: 'ID PDG manquant' };
      }

      // Appel Edge Function
      const { data, error } = await supabase.functions.invoke('create-pdg-agent', {
        body: {
          name: agentData.name,
          email: agentData.email,
          phone: agentData.phone,
          permissions: agentData.permissions,
          commission_rate: agentData.commission_rate || 10,
          can_create_sub_agent: agentData.can_create_sub_agent || false,
        }
      });

      if (error) throw error;
      
      if (!data.success) {
        return { success: false, error: data.error || 'Erreur lors de la création' };
      }

      toast.success('Agent créé avec succès');
      options.onAgentCreated?.();
      
      return { success: true, agent: data.agent };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur création agent:', error);
      const errorMessage = error.message || 'Erreur lors de la création de l\'agent';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onAgentCreated]);

  const updateAgent = useCallback(async (
    agentId: string,
    updates: UpdateAgentData
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!agentId) {
        return { success: false, error: 'ID agent manquant' };
      }

      const permissionsJsonb = updates.permissions ? updates.permissions : undefined;
      
      const { data, error } = await supabase
        .rpc('update_agent' as any, {
          p_agent_id: agentId,
          p_name: updates.name,
          p_email: updates.email,
          p_phone: updates.phone,
          p_permissions: permissionsJsonb ? permissionsJsonb as any : null,
          p_commission_rate: updates.commission_rate,
          p_can_create_sub_agent: updates.can_create_sub_agent,
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        return { success: false, error: result.error || 'Erreur lors de la mise à jour' };
      }

      toast.success('Agent mis à jour avec succès');
      options.onAgentUpdated?.();
      
      return { success: true };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur mise à jour agent:', error);
      const errorMessage = error.message || 'Erreur lors de la mise à jour';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onAgentUpdated]);

  const deleteAgent = useCallback(async (
    agentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!agentId) {
        return { success: false, error: 'ID agent manquant' };
      }

      const { data, error } = await supabase.functions.invoke('delete-pdg-agent', {
        body: { agent_id: agentId }
      });

      if (error) throw error;

      if (!data.success) {
        return { success: false, error: data.error || 'Erreur lors de la suppression' };
      }

      toast.success('Agent supprimé avec succès');
      options.onAgentDeleted?.();
      
      return { success: true };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur suppression agent:', error);
      const errorMessage = error.message || 'Erreur lors de la suppression';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onAgentDeleted]);

  const toggleAgentStatus = useCallback(async (
    agentId: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!agentId) {
        return { success: false, error: 'ID agent manquant' };
      }

      const { data, error } = await supabase
        .rpc('toggle_agent_status' as any, {
          p_agent_id: agentId,
          p_is_active: isActive
        });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        return { success: false, error: result.error || 'Erreur lors du changement de statut' };
      }

      toast.success(isActive ? 'Agent activé' : 'Agent désactivé');
      options.onAgentUpdated?.();
      
      return { success: true };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur changement statut agent:', error);
      const errorMessage = error.message || 'Erreur lors du changement de statut';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onAgentUpdated]);

  // ==================== BUREAUX SYNDICATS ====================
  
  const createBureau = useCallback(async (
    bureauData: CreateBureauData
  ): Promise<{ success: boolean; error?: string; bureau?: any }> => {
    try {
      // Validation
      const required = ['bureau_code', 'prefecture', 'commune', 'president_name', 'president_email', 'president_phone'];
      for (const field of required) {
        if (!bureauData[field as keyof CreateBureauData]) {
          return { success: false, error: `Le champ ${field} est requis` };
        }
      }

      // Générer un code unique si nécessaire
      const bureauCode = bureauData.bureau_code.toUpperCase();

      // Vérifier si le code existe déjà
      const { data: existing } = await supabase
        .from('syndicat_bureau')
        .select('id')
        .eq('bureau_code', bureauCode)
        .single();

      if (existing) {
        return { success: false, error: 'Ce code bureau existe déjà' };
      }

      // Créer le bureau
      const { data, error } = await supabase
        .from('syndicat_bureau')
        .insert({
          bureau_code: bureauCode,
          prefecture: bureauData.prefecture,
          commune: bureauData.commune,
          president_name: bureauData.president_name,
          president_email: bureauData.president_email,
          president_phone: bureauData.president_phone,
          full_location: bureauData.full_location,
          status: 'pending',
          is_validated: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Bureau créé avec succès');
      options.onBureauCreated?.();
      
      return { success: true, bureau: data };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur création bureau:', error);
      const errorMessage = error.message || 'Erreur lors de la création du bureau';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onBureauCreated]);

  const updateBureau = useCallback(async (
    bureauId: string,
    updates: UpdateBureauData
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!bureauId) {
        return { success: false, error: 'ID bureau manquant' };
      }

      const { error } = await supabase
        .from('syndicat_bureau')
        .update(updates)
        .eq('id', bureauId);

      if (error) throw error;

      toast.success('Bureau mis à jour avec succès');
      options.onBureauUpdated?.();
      
      return { success: true };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur mise à jour bureau:', error);
      const errorMessage = error.message || 'Erreur lors de la mise à jour';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onBureauUpdated]);

  const deleteBureau = useCallback(async (
    bureauId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!bureauId) {
        return { success: false, error: 'ID bureau manquant' };
      }

      // Supprimer les données associées d'abord
      await supabase.from('syndicat_workers').delete().eq('bureau_id', bureauId);
      await supabase.from('syndicat_members').delete().eq('bureau_id', bureauId);
      await supabase.from('syndicat_vehicles').delete().eq('bureau_id', bureauId);

      // Supprimer le bureau
      const { error } = await supabase
        .from('syndicat_bureau')
        .delete()
        .eq('id', bureauId);

      if (error) throw error;

      toast.success('Bureau supprimé avec succès');
      options.onBureauDeleted?.();
      
      return { success: true };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur suppression bureau:', error);
      const errorMessage = error.message || 'Erreur lors de la suppression';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onBureauDeleted]);

  const validateBureau = useCallback(async (
    bureauId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!bureauId) {
        return { success: false, error: 'ID bureau manquant' };
      }

      const { error } = await supabase
        .from('syndicat_bureau')
        .update({
          is_validated: true,
          status: 'active',
          validated_at: new Date().toISOString(),
        })
        .eq('id', bureauId);

      if (error) throw error;

      toast.success('Bureau validé avec succès');
      options.onBureauValidated?.();
      
      return { success: true };
    } catch (error: any) {
      console.error('[usePDGActions] Erreur validation bureau:', error);
      const errorMessage = error.message || 'Erreur lors de la validation';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [options.onBureauValidated]);

  return {
    // Agents
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    
    // Bureaux
    createBureau,
    updateBureau,
    deleteBureau,
    validateBureau,
  };
}
