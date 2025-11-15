/**
 * 🔧 HOOK: GÉNÉRATION D'ID PUBLIC UNIQUE
 * Gère la génération et la validation d'IDs au format LLLDDDD
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PublicIdResult {
  id: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook pour gérer les IDs publics uniques
 */
export const usePublicId = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Génère un ID unique via l'Edge Function
   * @param scope - Contexte de l'ID (users, products, orders, etc.)
   * @param showToast - Afficher les notifications toast
   * @returns ID généré ou null en cas d'erreur
   */
  const generatePublicId = async (
    scope: string,
    showToast: boolean = true
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 Génération ID pour scope: ${scope}`);

      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-unique-id',
        {
          body: { scope, batch: 1 }
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data?.success || !data?.ids || data.ids.length === 0) {
        throw new Error('Aucun ID généré');
      }

      const generatedId = data.ids[0];
      console.log(`✅ ID généré: ${generatedId}`);

      if (showToast) {
        toast.success(`ID généré: ${generatedId}`);
      }

      setLoading(false);
      return generatedId;

    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la génération d\'ID';
      console.error('❌ Erreur génération ID:', errorMsg);
      setError(errorMsg);
      
      if (showToast) {
        toast.error(errorMsg);
      }
      
      setLoading(false);
      return null;
    }
  };

  /**
   * Génère plusieurs IDs en une seule requête
   * @param scope - Contexte des IDs
   * @param count - Nombre d'IDs à générer (max 10)
   * @returns Array d'IDs générés
   */
  const generateBatchPublicIds = async (
    scope: string,
    count: number = 1
  ): Promise<string[]> => {
    if (count > 10) {
      toast.error('Maximum 10 IDs par requête');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-unique-id',
        {
          body: { scope, batch: count }
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data?.success || !data?.ids) {
        throw new Error('Erreur génération batch');
      }

      console.log(`✅ ${data.ids.length} IDs générés pour ${scope}`);
      setLoading(false);
      return data.ids;

    } catch (err: any) {
      const errorMsg = err.message || 'Erreur génération batch';
      console.error('❌ Erreur batch:', errorMsg);
      setError(errorMsg);
      setLoading(false);
      return [];
    }
  };

  /**
   * Valide un ID au format LLLDDDD
   * @param id - ID à valider
   * @returns true si valide
   */
  const validatePublicId = (id: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    // 3 lettres (sans I, L, O) + 4 chiffres
    const regex = /^[A-HJ-KM-NP-Z]{3}[0-9]{4}$/;
    return regex.test(id);
  };

  /**
   * Formate un ID pour l'affichage
   * @param id - ID à formatter
   * @returns ID en majuscules
   */
  const formatPublicId = (id: string | null | undefined): string => {
    return id ? id.toUpperCase() : '';
  };

  /**
   * Vérifie si un ID existe déjà dans le système
   * @param id - ID à vérifier
   * @returns true si l'ID existe
   */
  const checkIdExists = async (id: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('ids_reserved')
        .select('public_id')
        .eq('public_id', id.toUpperCase())
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erreur vérification ID:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('❌ Erreur checkIdExists:', err);
      return false;
    }
  };

  return {
    generatePublicId,
    generateBatchPublicIds,
    validatePublicId,
    formatPublicId,
    checkIdExists,
    loading,
    error
  };
};

export default usePublicId;
