import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook centralisé pour récupérer le vendor_id
 * Fonctionne dans 2 contextes:
 * 1. Interface Vendeur direct (utilise user_id pour trouver vendor)
 * 2. Interface Agent (utilise vendor_id depuis AgentContext)
 */
export function useVendorId() {
  const { user } = useAuth();
  
  // Essayer de récupérer depuis AgentContext si disponible
  let agentVendorId: string | null = null;
  try {
    const { useAgent } = require('@/contexts/AgentContext');
    const agentContext = useAgent();
    agentVendorId = agentContext?.vendorId || null;
  } catch {
    // AgentContext pas disponible, mode vendeur direct
  }

  const [vendorId, setVendorId] = useState<string | null>(agentVendorId);
  const [loading, setLoading] = useState(!agentVendorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si vendorId déjà fourni par AgentContext, pas besoin de fetch
    if (agentVendorId) {
      setVendorId(agentVendorId);
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
        const { data, error } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        setVendorId(data?.id || null);
      } catch (err: any) {
        console.error('Erreur récupération vendor_id:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorId();
  }, [user?.id, agentVendorId]);

  return { vendorId, loading, error };
}
