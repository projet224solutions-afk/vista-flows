/**
 * 🤖 HOOK DE RECOMMANDATIONS IA - 224SOLUTIONS
 * Appelle l'edge function ai-recommend pour des suggestions Gemini-powered
 * Ne s'active que si l'utilisateur est connecté (évite le flickering)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AIProduct {
  product_id: string;
  name: string;
  price: number;
  images: string[];
  rating: number | null;
  category_id?: string;
  reason?: string;
  score?: number;
}

interface AIRecommendationResult {
  products: AIProduct[];
  source: 'ai' | 'cache' | 'fallback';
  type: string;
}

type RecoType = 'personalized' | 'contextual' | 'trending' | 'post_purchase';

async function fetchAIRecommendations(
  type: RecoType,
  productId?: string,
  context?: Record<string, unknown>
): Promise<AIRecommendationResult> {
  const { data, error } = await supabase.functions.invoke('ai-recommend', {
    body: { type, product_id: productId, context: context || {} },
  });

  if (error) {
    console.error('[AIRecommendations] Error:', error);
    throw error;
  }

  return data as AIRecommendationResult;
}

/** Recommandations personnalisées par IA */
export function useAIPersonalized(limit = 20) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', 'personalized', user?.id],
    queryFn: async () => {
      const result = await fetchAIRecommendations('personalized');
      return result.products.slice(0, limit);
    },
    enabled: !authLoading && !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/** Recommandations contextuelles (localisation, heure, saison) */
export function useAIContextual(context: Record<string, unknown> = {}, limit = 12) {
  const { user, loading: authLoading } = useAuth();

  const enrichedContext = {
    ...context,
    hour: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    month: new Date().getMonth() + 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  return useQuery({
    queryKey: ['ai-recommendations', 'contextual', user?.id, JSON.stringify(enrichedContext)],
    queryFn: async () => {
      const result = await fetchAIRecommendations('contextual', undefined, enrichedContext);
      return result.products.slice(0, limit);
    },
    enabled: !authLoading && !!user,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/** Produits tendances adaptés à l'utilisateur */
export function useAITrending(limit = 16) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', 'trending', user?.id],
    queryFn: async () => {
      const result = await fetchAIRecommendations('trending');
      return result.products.slice(0, limit);
    },
    enabled: !authLoading && !!user,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/** Recommandations post-achat */
export function useAIPostPurchase(productId: string | undefined, limit = 10) {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', 'post_purchase', user?.id, productId],
    queryFn: async () => {
      const result = await fetchAIRecommendations('post_purchase', productId);
      return result.products.slice(0, limit);
    },
    enabled: !authLoading && !!user && !!productId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
