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
    const trimmedId = id.trim();
    
    // Format 1: AAA0001 (3 lettres + 4+ chiffres)
    const format1 = /^[A-Z]{3}\d{4,}$/i;
    
    // Format 2: 224-XXX-XXX (224 + 3 chiffres + 3 chiffres)
    const format2 = /^224-\d{3}-\d{3}$/;

    // Format 3: Email
    const formatEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Format 4: Phone (starts with 6,7,8 or +224)
    const formatPhone = /^(\+?224)?[678]\d{7,}$/;
    
    return format1.test(trimmedId.toUpperCase()) || format2.test(trimmedId) || formatEmail.test(trimmedId) || formatPhone.test(trimmedId.replace(/[\s-]/g, ''));
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
      const trimmedId = searchId.trim();

      // Valider le format
      if (!validateIdFormat(trimmedId)) {
        throw new Error('Format invalide. Formats acceptés: USR0001, 224-123-456, email ou téléphone');
      }

      let profile: any = null;

      // Détection du type de recherche
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedId);
      const isPhone = /^(\+?224)?[678]\d{7,}$/.test(trimmedId.replace(/[\s-]/g, ''));

      if (isEmail) {
        // Recherche par email
        const { data, error: searchError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url, public_id, role, phone')
          .ilike('email', trimmedId)
          .maybeSingle();
        if (searchError && searchError.code !== 'PGRST116') throw searchError;
        profile = data;
      } else if (isPhone) {
        // Recherche par téléphone
        const cleanPhone = trimmedId.replace(/[\s-]/g, '');
        const { data, error: searchError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url, public_id, role, phone')
          .or(`phone.ilike.%${cleanPhone}%`)
          .limit(1)
          .maybeSingle();
        if (searchError && searchError.code !== 'PGRST116') throw searchError;
        profile = data;
      } else {
        // Recherche par public_id (format code)
        const upperId = trimmedId.toUpperCase();
        const { data, error: searchError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url, public_id, role, phone')
          .eq('public_id', upperId)
          .maybeSingle();
        if (searchError && searchError.code !== 'PGRST116') throw searchError;
        profile = data;

        // Fallback: chercher dans user_ids.custom_id
        if (!profile) {
          const { data: uidData } = await supabase
            .from('user_ids')
            .select('user_id')
            .eq('custom_id', upperId)
            .maybeSingle();
          if (uidData?.user_id) {
            const { data: pData } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, email, avatar_url, public_id, role, phone')
              .eq('id', uidData.user_id)
              .maybeSingle();
            profile = pData;
          }
        }
      }

      if (!profile) {
        throw new Error('Aucun utilisateur trouvé');
      }

      toast.success('Utilisateur trouvé!', {
        description: `${profile.first_name || ''} ${profile.last_name || ''} (${profile.public_id || profile.email || ''})`
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
