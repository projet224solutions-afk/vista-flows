/**
 * HOOK POUR RÉCUPÉRER LE CODE ID DE L'UTILISATEUR CONNECTÉ
 * Cherche dans custom_id ou public_id
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserCode() {
  const { user } = useAuth();
  const [userCode, setUserCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setUserCode(null);
      setLoading(false);
      return;
    }

    const fetchUserCode = async () => {
      try {
        setLoading(true);

        // Chercher dans user_ids d'abord
        const { data: userIdData } = await supabase
          .from('user_ids')
          .select('custom_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userIdData?.custom_id) {
          setUserCode(userIdData.custom_id);
          setLoading(false);
          return;
        }

        // Sinon chercher dans profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('custom_id, public_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          // Priorité à custom_id, sinon public_id
          setUserCode(profileData.custom_id || profileData.public_id);
        }
      } catch (error) {
        console.error('Erreur récupération code utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCode();
  }, [user?.id]);

  return { userCode, loading };
}
