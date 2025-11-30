/**
 * 🔍 HOOK: RECHERCHE PAR ID STANDARDISÉ
 * Recherche utilisateurs par ID (USR0001, VND0001, etc.) ou 224-XXX-XXX
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserProfile } from '@/types/communication.types';

interface SearchByIdResult {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useSearchUserId() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Valider le format de l'ID
   */
  const validateIdFormat = useCallback((id: string): boolean => {
    const trimmedId = id.trim().toUpperCase();
    
    // Format 1: AAA0001 (3 lettres + 4+ chiffres)
    const format1 = /^[A-Z]{3}\d{4,}$/;
    
    // Format 2: 224-XXX-XXX (224 + 3 chiffres + 3 chiffres)
    const format2 = /^224-\d{3}-\d{3}$/;
    
    return format1.test(trimmedId) || format2.test(trimmedId);
  }, []);

  /**
   * Rechercher un utilisateur par ID
   */
  const searchById = useCallback(async (
    searchId: string
  ): Promise<UserProfile | null> => {
    setLoading(true);
    setError(null);

    try {
      const trimmedId = searchId.trim().toUpperCase();

      // Valider le format
      if (!validateIdFormat(trimmedId)) {
        throw new Error('Format ID invalide. Formats acceptés: USR0001 ou 224-123-456');
      }

      // Rechercher dans la base
      const { data: profile, error: searchError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, public_id, role, phone')
        .eq('public_id', trimmedId)
        .single();

      if (searchError) {
        if (searchError.code === 'PGRST116') {
          throw new Error('Aucun utilisateur trouvé avec cet ID');
        }
        throw searchError;
      }

      if (!profile) {
        throw new Error('Utilisateur non trouvé');
      }

      toast.success('Utilisateur trouvé!', {
        description: `${profile.first_name || ''} ${profile.last_name || ''} (${profile.public_id})`
      });

      return profile as UserProfile;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la recherche';
      setError(errorMessage);
      
      toast.error('Recherche échouée', {
        description: errorMessage
      });

      return null;
    } finally {
      setLoading(false);
    }
  }, [validateIdFormat]);

  /**
   * Rechercher plusieurs utilisateurs par IDs
   */
  const searchByIds = useCallback(async (
    ids: string[]
  ): Promise<UserProfile[]> => {
    setLoading(true);
    setError(null);

    try {
      const validIds = ids
        .map(id => id.trim().toUpperCase())
        .filter(id => validateIdFormat(id));

      if (validIds.length === 0) {
        throw new Error('Aucun ID valide fourni');
      }

      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, public_id, role, phone')
        .in('public_id', validIds);

      if (searchError) throw searchError;

      toast.success(`${profiles?.length || 0} utilisateur(s) trouvé(s)`);

      return (profiles as UserProfile[]) || [];
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la recherche';
      setError(errorMessage);
      
      toast.error('Recherche échouée', {
        description: errorMessage
      });

      return [];
    } finally {
      setLoading(false);
    }
  }, [validateIdFormat]);

  /**
   * Rechercher utilisateurs par préfixe (USR, VND, DRV, etc.)
   */
  const searchByPrefix = useCallback(async (
    prefix: string
  ): Promise<UserProfile[]> => {
    setLoading(true);
    setError(null);

    try {
      const upperPrefix = prefix.trim().toUpperCase();

      if (upperPrefix.length !== 3) {
        throw new Error('Le préfixe doit contenir exactement 3 lettres');
      }

      const { data: profiles, error: searchError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, public_id, role, phone')
        .like('public_id', `${upperPrefix}%`)
        .limit(50);

      if (searchError) throw searchError;

      return (profiles as UserProfile[]) || [];
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la recherche';
      setError(errorMessage);
      
      toast.error('Recherche échouée', {
        description: errorMessage
      });

      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchById,
    searchByIds,
    searchByPrefix,
    validateIdFormat,
    loading,
    error
  };
}
