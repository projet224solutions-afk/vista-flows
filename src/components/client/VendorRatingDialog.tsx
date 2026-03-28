import { useState } from 'react';
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
import { Star, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

interface VendorRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  vendorId: string;
  vendorName: string;
  onRatingSubmitted?: () => void;
}

export default function VendorRatingDialog({
  open,
  onOpenChange,
  orderId,
  vendorId,
  vendorName,
  onRatingSubmitted
}: VendorRatingDialogProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(t('rating.vendor.selectRating'));
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Insérer la note dans la table vendor_ratings
      const { error } = await supabase
        .from('vendor_ratings')
        .insert({
          vendor_id: vendorId,
          customer_id: user.id,
          order_id: orderId,
          rating: rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      toast.success(t('rating.vendor.successTitle'), {
        description: t('rating.vendor.successDescription', { vendorName, rating })
      });

      onRatingSubmitted?.();
      onOpenChange(false);
      
      // Réinitialiser le formulaire
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(t('rating.vendor.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rating.vendor.title')}</DialogTitle>
          <DialogDescription>
            {t('rating.vendor.description', { vendorName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Système de notation par étoiles */}
          <div className="flex flex-col items-center gap-4">
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
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
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
                {rating === 5 && t('rating.level.5')}
              </p>
            )}
          </div>

          {/* Commentaire optionnel */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('rating.vendor.commentLabel')}
            </label>
            <Textarea
              placeholder={t('rating.vendor.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('rating.vendor.later')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('rating.vendor.submitting')}
              </>
            ) : (
              t('rating.vendor.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
