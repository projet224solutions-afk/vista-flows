import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryCount {
  name: string;
  count: number;
}

export const useHomeCategories = () => {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);

        // Récupérer les catégories depuis la table categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');

        if (categoriesError) throw categoriesError;

        // Compter les produits actifs par catégorie
        const categoryArray: CategoryCount[] = [];
        
        for (const cat of (categoriesData || [])) {
          const { count, error: countError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .eq('is_active', true);

          if (!countError && count !== null) {
            categoryArray.push({
              name: cat.name,
              count: count,
            });
          }
        }

        setCategories(categoryArray);
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading };
};
