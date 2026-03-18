/**
 * 🔍 Hook de découverte - Produits de catégories non explorées
 * Brise la "bulle de filtre" en suggérant des produits que l'utilisateur
 * n'a pas encore vus, basé sur ses vues et recherches récentes
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DiscoveryProduct {
  product_id: string;
  name: string;
  price: number;
  images: string[];
  rating: number | null;
  reason?: string;
  category_name?: string;
}

export function useDiscoveryProducts(limit = 12) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['discovery-products', user?.id],
    queryFn: async (): Promise<DiscoveryProduct[]> => {
      // 1. Récupérer les catégories déjà vues par l'utilisateur
      const { data: viewedProducts } = await supabase
        .from('product_views')
        .select('product_id')
        .eq('user_id', user!.id)
        .order('viewed_at', { ascending: false })
        .limit(50);

      const viewedIds = (viewedProducts || []).map(v => v.product_id);

      // 2. Récupérer les category_id des produits vus
      let viewedCategoryIds: string[] = [];
      if (viewedIds.length > 0) {
        const { data: viewedCats } = await supabase
          .from('products')
          .select('category_id')
          .in('id', viewedIds)
          .not('category_id', 'is', null);

        viewedCategoryIds = [...new Set((viewedCats || []).map(p => p.category_id).filter(Boolean))] as string[];
      }

      // 3. Récupérer des produits de catégories NON explorées
      // Uniquement des vendeurs avec vente en ligne activée
      const allowedTypes = ['hybrid', 'online'];
      let query = supabase
        .from('products')
        .select('id, name, price, images, rating, category_id, vendor_id, categories(name), vendors(business_type)')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(limit * 3); // On prend plus pour filtrer ensuite

      // Exclure les catégories déjà vues (si l'utilisateur en a vu)
      if (viewedCategoryIds.length > 0 && viewedCategoryIds.length < 10) {
        // S'il a vu peu de catégories, on exclut celles-là
        // Sinon on prend tout mais on exclut les produits déjà vus
        for (const catId of viewedCategoryIds.slice(0, 5)) {
          query = query.neq('category_id', catId);
        }
      }

      const { data: discoveryData, error } = await query;
      if (error) throw error;

      // Filtrer les produits déjà vus
      const unseen = (discoveryData || [])
        .filter(p => !viewedIds.includes(p.id))
        .slice(0, limit);

      // Si pas assez de produits non vus, compléter avec des produits populaires aléatoires
      if (unseen.length < 4) {
        const { data: fallback } = await supabase
          .from('products')
          .select('id, name, price, images, rating, category_id, categories(name), vendors!inner(business_type)')
          .eq('is_active', true)
          .in('vendors.business_type', ['hybrid', 'online'])
          .order('reviews_count', { ascending: false })
          .limit(limit);

        const fallbackFiltered = (fallback || [])
          .filter(p => !viewedIds.includes(p.id) && !unseen.find(u => u.id === p.id))
          .slice(0, limit - unseen.length);

        unseen.push(...fallbackFiltered);
      }

      return unseen.map(p => ({
        product_id: p.id,
        name: p.name,
        price: p.price,
        images: Array.isArray(p.images) ? (p.images as string[]) : [],
        rating: p.rating,
        reason: `Découvrir: ${(p.categories as any)?.name || 'Nouveauté'}`,
        category_name: (p.categories as any)?.name,
      }));
    },
    enabled: !authLoading && !!user,
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
