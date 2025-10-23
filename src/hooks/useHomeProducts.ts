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

        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, images, category_id, rating, reviews_count')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        setProducts(data || []);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit]);

  return { products, loading };
};
