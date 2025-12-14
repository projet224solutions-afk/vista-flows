import { useAuth } from '@/hooks/useAuth';
import { useAgent } from '@/contexts/AgentContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

interface VendorData {
  vendorId: string;
  isAgent: boolean;
  agentPermissions?: VendorAgentPermissions;
  user: any;
  profile: any;
}

/**
 * Hook unifié pour obtenir les données du vendeur actuel
 * Fonctionne à la fois pour :
 * - Un vendeur connecté directement (via useAuth)
 * - Un agent accédant aux données du vendeur (via useAgent)
 */
export const useCurrentVendor = () => {
  const auth = useAuth();
  const agentContext = useAgent();
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mémoriser les IDs pour éviter les re-renders inutiles
  const authUserId = auth.user?.id;
  const authProfileId = auth.profile?.id;
  const agentVendorId = agentContext.vendorId;
  const hasAgent = !!agentContext.agent;

  const loadVendorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // CAS 1: On est dans un contexte AGENT (prioritaire)
      if (hasAgent && agentVendorId) {
        console.log('🔄 Mode Agent - Chargement données vendeur:', agentVendorId);
        
        // L'agent a son propre vendorId - on l'utilise directement
        // Les RLS sur products permettent l'accès via vendor_agents
        setVendorData({
          vendorId: agentVendorId,
          isAgent: true,
          agentPermissions: (agentContext.agent?.permissions as VendorAgentPermissions) || {},
          user: { id: agentVendorId }, // Utiliser vendorId comme référence
          profile: null
        });
        
        console.log('✅ Données vendeur chargées (mode agent):', {
          vendorId: agentVendorId,
          agentPermissions: agentContext.agent?.permissions
        });
        setLoading(false);
        return;
      }
      
      // CAS 2: On est dans un contexte VENDEUR DIRECT
      if (authUserId && auth.profile) {
        console.log('🔄 Mode Vendeur Direct - Utilisation user actuel:', authUserId);
        
        // Trouver le vendor_id du profil vendeur
        const { data: vendorProfile, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', authUserId)
          .maybeSingle();

        const vendorId = vendorProfile?.id || authUserId;

        setVendorData({
          vendorId: vendorId,
          isAgent: false,
          user: auth.user,
          profile: auth.profile
        });
        
        console.log('✅ Données vendeur chargées (mode direct):', { vendorId });
      } else if (!hasAgent) {
        // CAS 3: Aucun contexte valide (ni agent ni vendeur)
        console.warn('⚠️ Aucun contexte vendeur valide');
        setError('Session non valide');
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement vendeur:', error);
      setError(error.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [authUserId, authProfileId, agentVendorId, hasAgent, auth.user, auth.profile, agentContext.agent]);

  useEffect(() => {
    loadVendorData();
  }, [loadVendorData]);

  return {
    vendorId: vendorData?.vendorId || null,
    isAgent: vendorData?.isAgent || false,
    agentPermissions: vendorData?.agentPermissions,
    user: vendorData?.user,
    profile: vendorData?.profile,
    loading,
    error,
    reload: loadVendorData,
    hasPermission: (permission: string) => {
      if (vendorData?.isAgent && vendorData.agentPermissions) {
        return vendorData.agentPermissions[permission as keyof VendorAgentPermissions] || false;
      }
      return true; // Vendeur direct a toutes les permissions
    }
  };
};
