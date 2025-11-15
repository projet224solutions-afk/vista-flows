import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string;
  content: string;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface ProductReviewsSectionProps {
  productId: string;
}

/**
 * Section complète des avis produit (style Amazon)
 */
export const ProductReviewsSection = ({ productId }: ProductReviewsSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState({ average: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Charger les avis
      const { data: reviewsData } = await supabase
        .from('product_reviews')
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20);

      setReviews((reviewsData as any) || []);

      // Calculer la note moyenne
      if (reviewsData && reviewsData.length > 0) {
        const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setRating({ average: Math.round(avg * 10) / 10, total: reviewsData.length });
      }
    } catch (error: any) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div>Chargement des avis...</div>;
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec note globale */}
      <Card>
        <CardHeader>
          <CardTitle>Avis clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold">{rating.average.toFixed(1)}</div>
              {renderStars(Math.round(rating.average))}
              <div className="text-sm text-muted-foreground mt-1">
                {rating.total} avis
              </div>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter(r => r.rating === star).length;
                const percentage = rating.total > 0 ? (count / rating.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 mb-1">
                    <span className="text-sm w-12">{star} ⭐</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des avis */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {review.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {review.profiles?.full_name || 'Utilisateur'}
                    </p>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      {review.verified_purchase && (
                        <Badge variant="secondary" className="text-xs">
                          ✓ Achat vérifié
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h4 className="font-semibold mb-1">{review.title}</h4>
                <p className="text-sm text-muted-foreground">{review.content}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="ghost" size="sm">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  Utile ({review.helpful_count})
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reviews.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun avis pour le moment. Soyez le premier à donner votre avis !
          </CardContent>
        </Card>
      )}
    </div>
  );
};
