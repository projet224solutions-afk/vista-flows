import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgent } from '@/contexts/AgentContext';

/**
 * Hook centralisé pour récupérer le vendor_id
 * Fonctionne dans 2 contextes:
 * 1. Interface Vendeur direct (utilise user_id pour trouver vendor)
 * 2. Interface Agent (utilise vendor_id depuis AgentContext)
 */
export function useVendorId() {
  const { user } = useAuth();
  const agentContext = useAgent(); // Utilise le contexte avec valeurs par défaut
  
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si vendorId fourni par AgentContext, l'utiliser directement
    if (agentContext.vendorId) {
      console.log('✅ Vendor ID depuis AgentContext:', agentContext.vendorId);
      setVendorId(agentContext.vendorId);
      setLoading(false);
      return;
    }

    // Sinon, mode vendeur direct
    const fetchVendorId = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('🔍 Récupération vendor_id pour user:', user.id);
        
        const { data, error } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        console.log('✅ Vendor ID trouvé:', data?.id);
        setVendorId(data?.id || null);
      } catch (err: any) {
        console.error('❌ Erreur récupération vendor_id:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorId();
  }, [user?.id, agentContext.vendorId]);

  return { vendorId, loading, error };
}
