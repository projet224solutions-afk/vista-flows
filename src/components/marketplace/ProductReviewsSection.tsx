/**
 * Section d'affichage des avis clients sur un produit spécifique
 * Chaque produit a ses propres avis indépendants
 */

import { useState, useEffect } from 'react';
import { Star, User, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  vendor_response: string | null;
  vendor_response_at: string | null;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { [key: number]: number };
}

interface ProductReviewsSectionProps {
  productId: string;
  productName?: string;
}

export default function ProductReviewsSection({ productId, productName }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      loadReviews();
    }
  }, [productId]);

  const loadReviews = async () => {
    try {
      setLoading(true);

      // Récupérer les avis spécifiques à CE produit uniquement
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils des clients séparément
      const reviewsWithProfiles = await Promise.all((data || []).map(async (review) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', review.user_id)
          .maybeSingle();
        
        return {
          ...review,
          profiles: profile || { first_name: 'Client', last_name: '' }
        };
      }));

      setReviews(reviewsWithProfiles);

      // Calculer les statistiques pour ce produit
      if (reviewsWithProfiles && reviewsWithProfiles.length > 0) {
        const total = reviewsWithProfiles.length;
        const sum = reviewsWithProfiles.reduce((acc, r) => acc + r.rating, 0);
        const avg = sum / total;

        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviewsWithProfiles.forEach(r => {
          dist[r.rating as keyof typeof dist]++;
        });

        setStats({
          averageRating: avg,
          totalReviews: total,
          distribution: dist
        });
      } else {
        setStats({
          averageRating: 0,
          totalReviews: 0,
          distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
      }
    } catch (error) {
      console.error('Error loading product reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-muted-foreground">Chargement des avis...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-6 text-center">
        <Star className="w-12 h-12 mx-auto text-muted-foreground mb-2 opacity-50" />
        <p className="text-muted-foreground">Aucun avis pour ce produit</p>
        <p className="text-sm text-muted-foreground mt-2">
          Soyez le premier à donner votre avis sur ce produit
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Avis clients {productName ? `sur ${productName}` : ''}
        </h3>
        
        <div className="flex items-start gap-6 mb-6">
          {/* Note moyenne */}
          <div className="text-center">
            <div className="text-4xl font-bold mb-1">
              {stats.averageRating.toFixed(1)}
            </div>
            {renderStars(Math.round(stats.averageRating), 'lg')}
            <p className="text-sm text-muted-foreground mt-1">
              {stats.totalReviews} avis
            </p>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-sm w-8">{stars} ★</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{
                      width: stats.totalReviews > 0 
                        ? `${(stats.distribution[stars] / stats.totalReviews) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8">
                  {stats.distribution[stars]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Liste des avis */}
      <div className="space-y-4">
        <h4 className="font-medium">Tous les avis ({reviews.length})</h4>
        
        {reviews.map((review) => (
          <Card key={review.id} className="border-border/50">
            <CardContent className="p-4">
              {/* En-tête de l'avis */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {review.profiles?.first_name || 'Client'}{' '}
                      {review.profiles?.last_name || ''}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(review.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                      {review.verified_purchase && (
                        <span className="text-green-600 font-medium">• Achat vérifié</span>
                      )}
                    </div>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>

              {/* Titre de l'avis */}
              {review.title && (
                <h5 className="font-medium mb-2">{review.title}</h5>
              )}

              {/* Commentaire du client */}
              {review.content && (
                <div className="mb-3">
                  <p className="text-sm text-foreground">{review.content}</p>
                </div>
              )}

              {/* Compteur utile */}
              {review.helpful_count > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  {review.helpful_count} personne(s) ont trouvé cet avis utile
                </p>
              )}

              {/* Réponse du vendeur */}
              {review.vendor_response && (
                <div className="mt-3 pl-4 border-l-2 border-primary/30 bg-accent/30 p-3 rounded-r">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Réponse du vendeur
                    </span>
                    {review.vendor_response_at && (
                      <span className="text-xs text-muted-foreground">
                        • {new Date(review.vendor_response_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{review.vendor_response}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
