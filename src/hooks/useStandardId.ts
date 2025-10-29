/**
 * 🆔 HOOK: GESTION DES IDs STANDARDISÉS 224SOLUTIONS
 * Format universel: AAA0001 (3 lettres + 4+ chiffres séquentiels)
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Mapping des scopes vers les préfixes
 */
export const SCOPE_PREFIX_MAP: Record<string, string> = {
  'users': 'USR',
  'user': 'USR',
  'vendors': 'VND',
  'vendor': 'VND',
  'pdg': 'PDG',
  'agents': 'AGT',
  'agent': 'AGT',
  'sub_agents': 'SAG',
  'sub_agent': 'SAG',
  'syndicats': 'SYD',
  'syndicat': 'SYD',
  'drivers': 'DRV',
  'driver': 'DRV',
  'clients': 'CLI',
  'client': 'CLI',
  'customers': 'CLI',
  'customer': 'CLI',
  'products': 'PRD',
  'product': 'PRD',
  'orders': 'ORD',
  'order': 'ORD',
  'transactions': 'TXN',
  'transaction': 'TXN',
  'wallets': 'WLT',
  'wallet': 'WLT',
  'messages': 'MSG',
  'message': 'MSG',
  'conversations': 'CNV',
  'conversation': 'CNV',
  'deliveries': 'DLV',
  'delivery': 'DLV',
  'general': 'GEN',
};

export interface StandardIdResult {
  id: string | null;
  prefix: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook principal pour gérer les IDs standardisés 224SOLUTIONS
 */
export const useStandardId = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Génère un ID standardisé via l'Edge Function
   */
  const generateStandardId = async (
    scope: string,
    showToast = true
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const prefix = SCOPE_PREFIX_MAP[scope.toLowerCase()] || 'GEN';
      
      const { data, error: funcError } = await supabase.functions.invoke(
        'generate-unique-id',
        {
          body: { scope, prefix, batch: 1 }
        }
      );

      if (funcError) throw funcError;

      if (!data?.success || !data?.ids?.[0]) {
        throw new Error('Génération d\'ID échouée');
      }

      const generatedId = data.ids[0];

      if (showToast) {
        toast.success(`ID généré: ${generatedId}`, {
          description: `Préfixe: ${prefix} • Scope: ${scope}`
        });
      }

      return generatedId;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur génération ID';
      setError(errorMsg);
      
      if (showToast) {
        toast.error('Échec génération ID', {
          description: errorMsg
        });
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Génère plusieurs IDs en batch
   */
  const generateBatchStandardIds = async (
    scope: string,
    count: number,
    showToast = true
  ): Promise<string[]> => {
    if (count > 10) {
      toast.error('Maximum 10 IDs par requête');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const prefix = SCOPE_PREFIX_MAP[scope.toLowerCase()] || 'GEN';

      const { data, error: funcError } = await supabase.functions.invoke(
        'generate-unique-id',
        {
          body: { scope, prefix, batch: count }
        }
      );

      if (funcError) throw funcError;

      if (!data?.success || !data?.ids) {
        throw new Error('Génération IDs échouée');
      }

      if (showToast) {
        toast.success(`${data.ids.length} IDs générés`, {
          description: `Préfixe: ${prefix} • ${data.ids[0]} ... ${data.ids[data.ids.length - 1]}`
        });
      }

      return data.ids;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur génération IDs';
      setError(errorMsg);
      
      if (showToast) {
        toast.error('Échec génération IDs', {
          description: errorMsg
        });
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valide le format d'un ID standardisé
   */
  const validateStandardId = (id: string): boolean => {
    // Format: 3 lettres majuscules + au moins 4 chiffres
    return /^[A-Z]{3}\d{4,}$/.test(id);
  };

  /**
   * Extrait le préfixe d'un ID
   */
  const extractPrefix = (id: string): string | null => {
    if (!validateStandardId(id)) return null;
    return id.substring(0, 3);
  };

  /**
   * Extrait le numéro séquentiel d'un ID
   */
  const extractNumber = (id: string): number | null => {
    if (!validateStandardId(id)) return null;
    const numStr = id.substring(3);
    return parseInt(numStr, 10);
  };

  /**
   * Obtient un aperçu du prochain ID sans l'incrémenter
   */
  const previewNextId = async (scope: string): Promise<string | null> => {
    try {
      const prefix = SCOPE_PREFIX_MAP[scope.toLowerCase()] || 'GEN';
      
      const { data, error } = await supabase
        .rpc('preview_next_id', { p_prefix: prefix });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Erreur preview ID:', err);
      return null;
    }
  };

  /**
   * Obtient les statistiques d'un préfixe
   */
  const getPrefixStats = async (prefix: string) => {
    try {
      const { data, error } = await supabase
        .from('id_counters')
        .select('*')
        .eq('prefix', prefix)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Erreur stats préfixe:', err);
      return null;
    }
  };

  /**
   * Formate un ID pour l'affichage
   */
  const formatStandardId = (id: string): string => {
    if (!id) return '';
    return id.toUpperCase().trim();
  };

  return {
    generateStandardId,
    generateBatchStandardIds,
    validateStandardId,
    extractPrefix,
    extractNumber,
    previewNextId,
    getPrefixStats,
    formatStandardId,
    loading,
    error,
    SCOPE_PREFIX_MAP
  };
};

export default useStandardId;
