import { useAuth } from '@/hooks/useAuth';
import { useAgent } from '@/contexts/AgentContext';
import { useState, useEffect } from 'react';
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
  const agentContext = useAgent(); // Ne throw plus d'erreur, retourne des valeurs par défaut
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendorData = async () => {
      try {
        setLoading(true);

        if (agentContext.agent && agentContext.vendorId) {
          // CAS 1: On est dans un contexte AGENT
          console.log('🔄 Mode Agent - Chargement données vendeur:', agentContext.vendorId);
          
          // Récupérer les infos du vendeur depuis la table vendors
          const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .select('user_id')
            .eq('id', agentContext.vendorId)
            .maybeSingle();

          if (vendorError) {
            console.error('❌ Erreur chargement vendor:', vendorError);
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
            vendorId: agentContext.vendorId,
            isAgent: true,
            agentPermissions: (agentContext.agent?.permissions as VendorAgentPermissions) || {},
            user: { id: vendorUserId || agentContext.vendorId },
            profile: vendorProfile
          });
          
          console.log('✅ Données vendeur chargées (mode agent):', {
            vendorId: agentContext.vendorId,
            hasProfile: !!vendorProfile
          });
        } else if (auth.user && auth.profile) {
          // CAS 2: On est dans un contexte VENDEUR DIRECT
          console.log('🔄 Mode Vendeur Direct - Utilisation user actuel:', auth.user.id);
          
          // Trouver le vendor_id du profil vendeur
          const { data: vendorProfile, error: vendorError } = await supabase
            .from('vendors')
            .select('id')
            .eq('user_id', auth.user.id)
            .maybeSingle();

          const vendorId = vendorProfile?.id || auth.user.id;

          setVendorData({
            vendorId: vendorId,
            isAgent: false,
            user: auth.user,
            profile: auth.profile
          });
          
          console.log('✅ Données vendeur chargées (mode direct):', { vendorId });
        }
      } catch (error) {
        console.error('❌ Erreur chargement vendeur:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVendorData();
  }, [agentContext.vendorId, agentContext.agent, auth.user?.id, auth.profile]);

  return {
    ...vendorData,
    loading,
    hasPermission: (permission: string) => {
      if (vendorData?.isAgent && vendorData.agentPermissions) {
        return vendorData.agentPermissions[permission as keyof VendorAgentPermissions] || false;
      }
      return true; // Vendeur direct a toutes les permissions
    }
  };
};
