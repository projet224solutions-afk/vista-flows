import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductRecommendation {
  id: string;
  recommended_product_id: string;
  score: number;
  reason: string;
  product?: {
    id: string;
    name: string;
    price: number;
    images?: string[];
    rating?: number;
  };
}

/**
 * Hook pour charger les recommandations personnalisées (comme Amazon "Recommandé pour vous")
 */
export const useProductRecommendations = (limit: number = 10) => {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRecommendations([]);
        return;
      }

      // Charger les recommandations existantes
      const { data: existingRecs, error: recsError } = await supabase
        .from('product_recommendations')
        .select(`
          *,
          product:products!recommended_product_id(
            id,
            name,
            price,
            images,
            rating
          )
        `)
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(limit);

      if (recsError) throw recsError;

      // Si pas assez de recommandations, en générer de nouvelles
      if (!existingRecs || existingRecs.length < 5) {
        await supabase.rpc('generate_recommendations_for_user', {
          p_user_id: user.id,
          p_limit: limit
        });

        // Recharger
        const { data: newRecs } = await supabase
          .from('product_recommendations')
          .select(`
            *,
            product:products!recommended_product_id(
              id,
              name,
              price,
              images,
              rating
            )
          `)
          .eq('user_id', user.id)
          .order('score', { ascending: false })
          .limit(limit);

        setRecommendations((newRecs as any) || []);
      } else {
        setRecommendations((existingRecs as any) || []);
      }
    } catch (error: any) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [limit]);

  return {
    recommendations,
    loading,
    reload: loadRecommendations
  };
};
