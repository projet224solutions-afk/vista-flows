/**
 * 🧠 SERVICE DE RECOMMANDATION PRODUITS - 224SOLUTIONS
 * Système intelligent inspiré d'Alibaba/Amazon
 * Suivi comportemental + recommandations personnalisées
 */

import { supabase } from '@/integrations/supabase/client';

type ActionType = 'view' | 'search' | 'cart' | 'purchase' | 'wishlist';

interface RecommendedProduct {
  product_id: string;
  name: string;
  price: number;
  images: string[];
  rating: number | null;
  category_id?: string;
}

// ==========================================
// 📊 TRACKING DES INTERACTIONS
// ==========================================

/** Enregistrer une interaction utilisateur-produit */
export async function trackInteraction(
  productId: string,
  actionType: ActionType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Ignorer si non connecté

    await supabase
      .from('user_product_interactions')
      .insert({
        user_id: user.id,
        product_id: productId,
        action_type: actionType,
        metadata: metadata || {}
      });
  } catch (err) {
    console.warn('[Recommendations] Track error:', err);
  }
}

/** Enregistrer une recherche */
export async function trackSearch(
  query: string,
  resultProductIds?: string[]
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !resultProductIds?.length) return;

    // Track le premier résultat cliqué comme contexte de recherche
    const inserts = resultProductIds.slice(0, 5).map(pid => ({
      user_id: user.id,
      product_id: pid,
      action_type: 'search' as ActionType,
      search_query: query,
      metadata: { query, total_results: resultProductIds.length }
    }));

    await supabase.from('user_product_interactions').insert(inserts);
  } catch (err) {
    console.warn('[Recommendations] Track search error:', err);
  }
}

// ==========================================
// 🎯 RECOMMANDATIONS
// ==========================================

/** Produits similaires à un produit donné */
export async function getSimilarProducts(
  productId: string,
  limit = 10
): Promise<RecommendedProduct[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_similar_products', {
        p_product_id: productId,
        p_limit: limit
      });

    if (error) throw error;
    return (data || []) as RecommendedProduct[];
  } catch (err) {
    console.warn('[Recommendations] Similar products error:', err);
    return getFallbackProducts(limit, productId);
  }
}

/** Recommandations personnalisées pour l'utilisateur */
export async function getPersonalizedRecommendations(
  limit = 12
): Promise<(RecommendedProduct & { reason: string })[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getPopularProducts(limit);

    const { data, error } = await supabase
      .rpc('get_personalized_recommendations', {
        p_user_id: user.id,
        p_limit: limit
      });

    if (error) throw error;
    if (!data?.length) return getPopularProducts(limit);
    return data as (RecommendedProduct & { reason: string })[];
  } catch (err) {
    console.warn('[Recommendations] Personalized error:', err);
    return getPopularProducts(limit);
  }
}

/** Produits souvent achetés ensemble */
export async function getAlsoBoughtProducts(
  productId: string,
  limit = 8
): Promise<RecommendedProduct[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_also_bought_products', {
        p_product_id: productId,
        p_limit: limit
      });

    if (error) throw error;
    return (data || []) as RecommendedProduct[];
  } catch (err) {
    console.warn('[Recommendations] Also bought error:', err);
    return [];
  }
}

/** Produits populaires dans une catégorie */
export async function getPopularInCategory(
  categoryId: string,
  limit = 10,
  excludeProductId?: string
): Promise<RecommendedProduct[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_popular_in_category', {
        p_category_id: categoryId,
        p_limit: limit,
        p_exclude_product_id: excludeProductId || null
      });

    if (error) throw error;
    return (data || []) as RecommendedProduct[];
  } catch (err) {
    console.warn('[Recommendations] Popular in category error:', err);
    return [];
  }
}

// ==========================================
// 🔄 FALLBACKS
// ==========================================

/** Produits populaires globaux (fallback) */
async function getPopularProducts(
  limit = 12
): Promise<(RecommendedProduct & { reason: string })[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, images, rating, category_id')
      .eq('is_active', true)
      .order('rating', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(p => ({
      product_id: p.id,
      name: p.name,
      price: p.price,
      images: p.images || [],
      rating: p.rating,
      category_id: p.category_id,
      reason: 'popular'
    }));
  } catch {
    return [];
  }
}

/** Fallback si la fonction RPC échoue */
async function getFallbackProducts(
  limit: number,
  excludeId?: string
): Promise<RecommendedProduct[]> {
  try {
    let query = supabase
      .from('products')
      .select('id, name, price, images, rating, category_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return (data || []).map(p => ({
      product_id: p.id,
      name: p.name,
      price: p.price,
      images: p.images || [],
      rating: p.rating,
      category_id: p.category_id
    }));
  } catch {
    return [];
  }
}
