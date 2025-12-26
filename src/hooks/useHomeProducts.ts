import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HomeProduct {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
  rating?: number;
  reviews_count?: number;
  category_id?: string;
}

export const useHomeProducts = (limit: number = 4) => {
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Filtrer les produits - exclure uniquement les vendeurs "physical" (boutique physique uniquement)
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, price, images, category_id, rating, reviews_count,
            vendors!inner(business_type)
          `)
          .eq('is_active', true)
          .neq('vendors.business_type', 'physical')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.warn('Erreur produits:', error.message);
          setProducts([]);
          return;
        }

        setProducts(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit]);

  return { products, loading };
};
