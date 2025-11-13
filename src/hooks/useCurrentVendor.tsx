import { useAuth } from '@/hooks/useAuth';
import { useAgent } from '@/contexts/AgentContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VendorData {
  vendorId: string;
  isAgent: boolean;
  agentPermissions?: string[];
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
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Essayer de récupérer le contexte agent (peut throw si pas dans AgentProvider)
  let agentContext = null;
  try {
    agentContext = useAgent();
  } catch (e) {
    // Pas dans un contexte agent, c'est normal
  }

  useEffect(() => {
    const loadVendorData = async () => {
      try {
        setLoading(true);

        if (agentContext && agentContext.vendorId) {
          // CAS 1: On est dans un contexte AGENT
          console.log('🔄 Mode Agent - Chargement données vendeur:', agentContext.vendorId);
          
          // Récupérer les infos du vendeur
          const { data: vendorUser, error: vendorError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', agentContext.vendorId)
            .single();

          if (vendorError) {
            console.error('❌ Erreur chargement profil vendeur:', vendorError);
          }

          setVendorData({
            vendorId: agentContext.vendorId,
            isAgent: true,
            agentPermissions: agentContext.agent?.permissions || [],
            user: { id: agentContext.vendorId }, // Simule un user avec l'ID du vendeur
            profile: vendorUser
          });
          
          console.log('✅ Données vendeur chargées (mode agent):', {
            vendorId: agentContext.vendorId,
            agentName: agentContext.agent?.name
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
  }, [agentContext?.vendorId, auth.user?.id, auth.profile]);

  return {
    ...vendorData,
    loading,
    hasPermission: (permission: string) => {
      if (vendorData?.isAgent && vendorData.agentPermissions) {
        return vendorData.agentPermissions.includes(permission);
      }
      return true; // Vendeur direct a toutes les permissions
    }
  };
};
