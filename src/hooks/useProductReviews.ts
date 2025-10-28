import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateInput, productReviewSchema } from '@/lib/inputValidation';
import { rateLimiter } from '@/lib/rateLimiter';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  helpful_count: number;
  images?: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ProductRating {
  average_rating: number;
  total_reviews: number;
  rating_distribution?: { [key: number]: number };
}

export const useProductReviews = (productId: string) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [rating, setRating] = useState<ProductRating | null>(null);
  const [loading, setLoading] = useState(false);
  const [userReview, setUserReview] = useState<ProductReview | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Charger les avis
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('product_reviews')
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      // Charger la note moyenne
      const { data: ratingData, error: ratingError } = await supabase
        .rpc('calculate_product_rating', { p_product_id: productId });

      if (ratingError) throw ratingError;
      
      if (ratingData && ratingData.length > 0) {
        setRating(ratingData[0]);
      }

      // Charger l'avis de l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userReviewData } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .maybeSingle();

        setUserReview(userReviewData);
      }
    } catch (error: any) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (
    rating: number,
    title: string,
    comment: string,
    verifiedPurchase: boolean = false,
    images?: string[]
  ) => {
    // Rate limiting
    if (!rateLimiter.check('submit-review', { maxRequests: 5, windowMs: 60000 })) {
      toast.error('Trop de requêtes. Veuillez patienter.');
      return false;
    }

    // Validation
    const validation = validateInput(productReviewSchema, {
      product_id: productId,
      rating,
      title,
      comment,
      verified_purchase: verifiedPurchase
    });

    if (!validation.success) {
      toast.error(validation.errors?.[0] || 'Données invalides');
      return false;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const reviewData = {
        product_id: productId,
        user_id: user.id,
        rating,
        title,
        comment,
        verified_purchase: verifiedPurchase,
        images: images || []
      };

      if (userReview) {
        // Mettre à jour l'avis existant
        const { error } = await supabase
          .from('product_reviews')
          .update(reviewData)
          .eq('id', userReview.id);

        if (error) throw error;
        toast.success('Avis mis à jour avec succès');
      } else {
        // Créer un nouvel avis
        const { error } = await supabase
          .from('product_reviews')
          .insert(reviewData);

        if (error) throw error;
        toast.success('Avis publié avec succès');
      }

      await loadReviews();
      return true;
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error('Erreur lors de la publication de l\'avis');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async () => {
    if (!userReview) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;

      toast.success('Avis supprimé');
      await loadReviews();
      return true;
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      loadReviews();
    }
  }, [productId]);

  return {
    reviews,
    rating,
    userReview,
    loading,
    submitReview,
    deleteReview,
    reload: loadReviews
  };
};
