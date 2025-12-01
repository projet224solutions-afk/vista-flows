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

      if (hasAgent && agentVendorId) {
        // CAS 1: On est dans un contexte AGENT
        console.log('🔄 Mode Agent - Chargement données vendeur:', agentVendorId);
        
        // Récupérer les infos du vendeur depuis la table vendors
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('user_id')
          .eq('id', agentVendorId)
          .maybeSingle();

        if (vendorError) {
          console.error('❌ Erreur chargement vendor:', vendorError);
          throw new Error('Impossible de charger les données du vendeur');
        }

        // Récupérer le profil du vendeur
        const vendorUserId = vendor?.user_id;
        let vendorProfile = null;
        
        if (vendorUserId) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', vendorUserId)
            .maybeSingle();

          if (profileError) {
            console.error('❌ Erreur chargement profil vendeur:', profileError);
          } else {
            vendorProfile = profileData;
          }
        }

        setVendorData({
          vendorId: agentVendorId,
          isAgent: true,
          agentPermissions: (agentContext.agent?.permissions as VendorAgentPermissions) || {},
          user: { id: vendorUserId || agentVendorId },
          profile: vendorProfile
        });
        
        console.log('✅ Données vendeur chargées (mode agent):', {
          vendorId: agentVendorId,
          hasProfile: !!vendorProfile
        });
      } else if (authUserId && auth.profile) {
        // CAS 2: On est dans un contexte VENDEUR DIRECT
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
      } else {
        // CAS 3: Aucun contexte valide
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
