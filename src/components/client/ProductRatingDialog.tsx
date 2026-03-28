/**
 * Dialog de notation des produits d'une commande
 * Permet de noter chaque produit individuellement après livraison
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, Package, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

interface OrderProduct {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  rated: boolean;
}

interface ProductRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  vendorId: string;
  vendorName: string;
  onRatingSubmitted?: () => void;
}

export default function ProductRatingDialog({
  open,
  onOpenChange,
  orderId,
  vendorId,
  vendorName,
  onRatingSubmitted
}: ProductRatingDialogProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allRated, setAllRated] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      loadOrderProducts();
    }
  }, [open, orderId]);

  const loadOrderProducts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les produits de la commande
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          product_id,
          quantity,
          products:product_id (
            name,
            images
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Récupérer les avis déjà soumis pour cette commande
      const { data: existingReviews } = await supabase
        .from('product_reviews')
        .select('product_id')
        .eq('order_id', orderId)
        .eq('user_id', user.id);

      const ratedProductIds = new Set((existingReviews || []).map(r => r.product_id));

      const productsList: OrderProduct[] = (orderItems || []).map(item => {
        const product = item.products as any;
        const images = product?.images;
        const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: product?.name || t('rating.product.productFallback'),
          product_image: firstImage,
          quantity: item.quantity,
          rated: ratedProductIds.has(item.product_id)
        };
      });

      setProducts(productsList);

      // Trouver le premier produit non noté
      const firstUnrated = productsList.findIndex(p => !p.rated);
      if (firstUnrated >= 0) {
        setCurrentProductIndex(firstUnrated);
        setAllRated(false);
      } else {
        setAllRated(true);
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error(t('rating.product.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error(t('rating.product.selectRating'));
      return;
    }

    const currentProduct = products[currentProductIndex];
    if (!currentProduct) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Insérer l'avis dans product_reviews
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: currentProduct.product_id,
          order_id: orderId,
          user_id: user.id,
          rating: rating,
          title: t('rating.product.reviewTitle', { productName: currentProduct.product_name }).substring(0, 100),
          content: comment.trim() || t('rating.product.noComment'),
          verified_purchase: true,
          is_approved: true
        });

      if (error) throw error;

      toast.success(t('rating.product.submittedFor', { productName: currentProduct.product_name }), {
        description: t('rating.product.starsDescription', { rating })
      });

      // Marquer comme noté
      const updatedProducts = [...products];
      updatedProducts[currentProductIndex].rated = true;
      setProducts(updatedProducts);

      // Réinitialiser pour le prochain produit
      setRating(0);
      setComment('');

      // Passer au prochain produit non noté
      const nextUnrated = updatedProducts.findIndex((p, i) => !p.rated && i > currentProductIndex);
      if (nextUnrated >= 0) {
        setCurrentProductIndex(nextUnrated);
      } else {
        // Vérifier s'il reste des produits non notés avant le current
        const prevUnrated = updatedProducts.findIndex(p => !p.rated);
        if (prevUnrated >= 0) {
          setCurrentProductIndex(prevUnrated);
        } else {
          // Tous notés
          setAllRated(true);
          onRatingSubmitted?.();
        }
      }
    } catch (error) {
      console.error('Erreur soumission avis:', error);
      toast.error(t('rating.product.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setRating(0);
    setComment('');
    setCurrentProductIndex(0);
    if (products.some(p => p.rated)) {
      onRatingSubmitted?.();
    }
  };

  const currentProduct = products[currentProductIndex];
  const ratedCount = products.filter(p => p.rated).length;
  const totalCount = products.length;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (allRated) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              {t('rating.product.thanksTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('rating.product.allRatedDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-muted-foreground">
              {t('rating.product.impactText')}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>{t('rating.product.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('rating.product.title')}</DialogTitle>
          <DialogDescription>
            {t('rating.product.orderDescription', { vendorName, ratedCount, totalCount })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Liste des produits avec statut */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {products.map((product, index) => (
              <button
                key={product.id}
                onClick={() => !product.rated && setCurrentProductIndex(index)}
                disabled={product.rated}
                className={`flex-shrink-0 p-2 rounded-lg border transition-all ${
                  index === currentProductIndex
                    ? 'border-primary bg-primary/5'
                    : product.rated
                    ? 'border-green-500 bg-green-50 dark:bg-green-950 opacity-60'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="relative w-12 h-12">
                  {product.product_image ? (
                    <img
                      src={product.product_image}
                      alt={product.product_name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  {product.rated && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Produit actuel */}
          {currentProduct && (
            <Card className="border-primary/20">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <div className="w-14 h-14 flex-shrink-0">
                    {currentProduct.product_image ? (
                      <img
                        src={currentProduct.product_image}
                        alt={currentProduct.product_name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">{currentProduct.product_name}</h4>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {t('rating.product.quantityLabel', { quantity: currentProduct.quantity })}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Système de notation par étoiles */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">{t('rating.product.askRating')}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && t('rating.level.1')}
                {rating === 2 && t('rating.level.2')}
                {rating === 3 && t('rating.level.3')}
                {rating === 4 && t('rating.level.4')}
                {rating === 5 && t('rating.level.5Excellent')}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('rating.product.commentLabel')}
            </label>
            <Textarea
              placeholder={t('rating.product.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={submitting}
          >
            {ratedCount > 0 ? t('rating.product.finish') : t('rating.product.later')}
          </Button>
          <Button
            onClick={handleSubmitRating}
            disabled={submitting || rating === 0}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('rating.product.submitting')}
              </>
            ) : (
              <>
                {t('rating.product.submit')}
                {ratedCount < totalCount - 1 && <ChevronRight className="w-4 h-4" />}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
