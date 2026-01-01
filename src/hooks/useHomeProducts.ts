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

        // Requête simple sans filtre complexe
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, price, images, category_id, rating, reviews_count,
            vendors(business_type, business_name)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit * 2);

        if (error) {
          console.warn('Erreur produits:', error.message);
          setProducts([]);
          return;
        }

        // Filtrer côté client pour exclure les vendeurs "physical"
        const filteredProducts = (data || [])
          .filter(product => {
            const vendor = product.vendors as any;
            return vendor && vendor.business_type !== 'physical';
          })
          .slice(0, limit);

        setProducts(filteredProducts);
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
