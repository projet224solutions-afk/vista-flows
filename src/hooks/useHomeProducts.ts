import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HomeProduct {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
  promotional_videos?: string[] | null;
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

        // 🚀 Filter server-side with IN instead of fetching 2x + client filter
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, images, promotional_videos, category_id, rating, reviews_count, vendors!inner(business_type)')
          .eq('is_active', true)
          .in('vendors.business_type', ['hybrid', 'online'])
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          // Fallback: if the IN filter on joined table fails, use the old approach
          console.warn('Optimized query failed, using fallback:', error.message);
          const { data: fallbackData } = await supabase
            .from('products')
            .select('id, name, price, images, promotional_videos, category_id, rating, reviews_count, vendors(business_type, business_name)')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(limit * 2);

          const filtered = (fallbackData || [])
            .filter(product => {
              const vendor = product.vendors as any;
              return vendor && ['hybrid', 'online'].includes(vendor.business_type);
            })
            .slice(0, limit);

          setProducts(filtered);
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
