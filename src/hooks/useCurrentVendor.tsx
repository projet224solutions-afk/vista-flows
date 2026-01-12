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
  // business_type vient de vendors.business_type (physical | digital | hybrid)
  businessType?: 'physical' | 'digital' | 'hybrid' | 'online';
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
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mémoriser les IDs pour éviter les re-renders inutiles
  const authUserId = auth.user?.id;
  const authProfileId = auth.profile?.id;
  const agentVendorId = agentContext.vendorId;
  const hasAgent = !!agentContext.agent;
  
  // Le loading global inclut le chargement du profil auth
  const loading = auth.loading || auth.profileLoading || internalLoading;

  const loadVendorData = useCallback(async () => {
    // ⚡ Ne pas charger si auth n'est pas encore prêt
    if (auth.loading || auth.profileLoading) {
      console.log('⏳ useCurrentVendor: En attente du profil auth...');
      return;
    }
    
    try {
      setInternalLoading(true);
      setError(null);

      // CAS 1: On est dans un contexte AGENT (prioritaire)
      if (hasAgent && agentVendorId) {
        console.log('🔄 Mode Agent - Chargement données vendeur:', agentVendorId);
        
        // Récupérer le business_type du vendeur
        const { data: vendorInfo } = await supabase
          .from('vendors')
          .select('business_type')
          .eq('id', agentVendorId)
          .maybeSingle();
        
        setVendorData({
          vendorId: agentVendorId,
          isAgent: true,
          agentPermissions: (agentContext.agent?.permissions as VendorAgentPermissions) || {},
          user: { id: agentVendorId },
          profile: null,
          businessType: vendorInfo?.business_type as 'physical' | 'digital' | 'hybrid' | 'online' | undefined
        });
        
        console.log('✅ Données vendeur chargées (mode agent):', {
          vendorId: agentVendorId,
          businessType: vendorInfo?.business_type,
          agentPermissions: agentContext.agent?.permissions
        });
        setInternalLoading(false);
        return;
      }
      
      // CAS 2: On est dans un contexte VENDEUR DIRECT
      if (authUserId) {
        console.log('🔄 Mode Vendeur Direct - Utilisation user actuel:', authUserId);
        
        // Trouver le vendor_id et business_type du profil vendeur
        const { data: vendorProfile, error: vendorError } = await supabase
          .from('vendors')
          .select('id, business_type')
          .eq('user_id', authUserId)
          .maybeSingle();

        // Utiliser l'user_id comme vendorId si pas d'entrée vendors (nouveau vendeur)
        const vendorId = vendorProfile?.id || authUserId;
        const businessType = vendorProfile?.business_type as 'physical' | 'digital' | 'hybrid' | 'online' | undefined;

        setVendorData({
          vendorId: vendorId,
          isAgent: false,
          user: auth.user,
          profile: auth.profile,
          businessType: businessType || 'hybrid' // Default pour nouveaux vendeurs
        });
        
        console.log('✅ Données vendeur chargées (mode direct):', { vendorId, businessType });
      } else if (!hasAgent) {
        // CAS 3: Aucun contexte valide (ni agent ni vendeur)
        console.warn('⚠️ Aucun contexte vendeur valide');
        setError('Session non valide');
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement vendeur:', error);
      setError(error.message || 'Erreur lors du chargement des données');
    } finally {
      setInternalLoading(false);
    }
  }, [authUserId, authProfileId, agentVendorId, hasAgent, auth.user, auth.profile, agentContext.agent, auth.loading, auth.profileLoading]);

  useEffect(() => {
    // Seulement charger si auth est prêt
    if (!auth.loading && !auth.profileLoading) {
      loadVendorData();
    }
  }, [loadVendorData, auth.loading, auth.profileLoading]);

  return {
    vendorId: vendorData?.vendorId || null,
    isAgent: vendorData?.isAgent || false,
    agentPermissions: vendorData?.agentPermissions,
    user: vendorData?.user,
    profile: vendorData?.profile,
    businessType: vendorData?.businessType,
    loading,
    error,
    reload: loadVendorData,
    hasPermission: (permission: string) => {
      if (vendorData?.isAgent && vendorData.agentPermissions) {
        return vendorData.agentPermissions[permission as keyof VendorAgentPermissions] || false;
      }
      return true; // Vendeur direct a toutes les permissions
    },
    // POS accessible uniquement pour physical et hybrid (pas pour digital/online)
    canAccessPOS: vendorData?.businessType !== 'digital' && vendorData?.businessType !== 'online'
  };
};
