/**
 * 🎯 SECTION RECOMMANDATIONS PRODUITS - 224SOLUTIONS
 * Affiche les produits recommandés dans différentes sections
 */

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, ShoppingBag, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TranslatedProductCard } from '@/components/marketplace/TranslatedProductCard';
import { cn } from '@/lib/utils';

interface RecommendedProduct {
  product_id: string;
  name: string;
  price: number;
  images: string[];
  rating: number | null;
  reason?: string;
}

interface ProductRecommendationSectionProps {
  title: string;
  subtitle?: string;
  products: RecommendedProduct[];
  loading?: boolean;
  icon?: 'sparkles' | 'trending' | 'shopping' | 'star';
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  className?: string;
  currency?: string;
}

const ICONS = {
  sparkles: Sparkles,
  trending: TrendingUp,
  shopping: ShoppingBag,
  star: Star,
};

export function ProductRecommendationSection({
  title,
  subtitle,
  products,
  loading = false,
  icon = 'sparkles',
  onProductClick,
  onAddToCart,
  className
}: ProductRecommendationSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const Icon = ICONS[icon];

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    const visibleWidth = scrollRef.current.clientWidth;
    const scrollAmount = Math.max(Math.floor(visibleWidth * 0.8), 180);

    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;

    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      scrollRef.current.scrollBy({
        left: event.deltaY,
        behavior: 'smooth'
      });
    }
  };

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className={cn('py-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {products.length > 1 && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Products carousel */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden scrollbar-hide pb-2 snap-x snap-mandatory -mx-1 px-1 pr-2 touch-pan-x scroll-smooth"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x'
        }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[172px] max-w-[172px] sm:min-w-[190px] sm:max-w-[190px] snap-start shrink-0">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-3 w-1/2 mt-1" />
            </div>
          ))
        ) : (
          products.map((product) => (
            <div
              key={product.product_id}
              className="min-w-[172px] max-w-[172px] sm:min-w-[190px] sm:max-w-[190px] snap-start shrink-0"
              onClick={() => onProductClick?.(product.product_id)}
            >
              <TranslatedProductCard
                id={product.product_id}
                image={product.images?.[0] || '/placeholder.svg'}
                title={product.name}
                price={product.price}
                rating={product.rating || 0}
                reviewCount={0}
                vendor=""
                onAddToCart={() => onAddToCart?.(product.product_id)}
              />
              {product.reason && (
                <div className="mt-1">
                  <ReasonBadge reason={product.reason} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  const labels: Record<string, { text: string; className: string }> = {
    category_affinity: { text: '🎯 Pour vous', className: 'bg-primary/10 text-primary' },
    featured: { text: '⭐ En vedette', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    trending: { text: '🔥 Tendance', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    popular: { text: '📈 Populaire', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  };

  const badge = labels[reason] || labels.popular;

  return (
    <span className={cn('inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full', badge.className)}>
      {badge.text}
    </span>
  );
}

export default ProductRecommendationSection;
