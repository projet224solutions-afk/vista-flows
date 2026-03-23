/**
 * 🤖 SECTION DE RECOMMANDATIONS IA - Style Alibaba
 * Navigation horizontale fluide avec swipe, flèches et snap
 */

import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Clock, Gift, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import TranslatedProductCard from "./TranslatedProductCard";
import { HorizontalScrollRow, ScrollItem } from "./HorizontalScrollRow";
import { useTranslation } from "@/hooks/useTranslation";
import { useResponsive } from "@/hooks/useResponsive";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIProduct {
  product_id: string;
  name: string;
  price: number;
  images: string[];
  rating: number | null;
  reason?: string;
  score?: number;
  vendor_id?: string;
  vendor_name?: string;
  currency?: string;
}

interface AIRecommendationSectionProps {
  title: string;
  subtitle?: string;
  products: AIProduct[] | undefined;
  isLoading: boolean;
  icon?: 'sparkles' | 'trending' | 'clock' | 'gift';
  showReason?: boolean;
  seeAllLink?: string;
  maxItems?: number;
  className?: string;
}

const icons = {
  sparkles: Sparkles,
  trending: TrendingUp,
  clock: Clock,
  gift: Gift,
};

export function AIRecommendationSection({
  title,
  subtitle,
  products,
  isLoading,
  icon = 'sparkles',
  showReason = true,
  seeAllLink,
  maxItems = 12,
  className,
}: AIRecommendationSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isMobile, isTablet } = useResponsive();
  const { addToCart } = useCart();
  const Icon = icons[icon];

  if (!isLoading && (!products || products.length === 0)) return null;

  const displayProducts = products?.slice(0, maxItems) || [];

  // Responsive card width
  const cardWidth = isMobile ? '44vw' : isTablet ? '200px' : '220px';

  const handleAddToCart = (p: AIProduct) => {
    addToCart({
      id: p.product_id,
      name: p.name,
      price: p.price,
      image: p.images?.[0],
      vendor_id: p.vendor_id || '',
      vendor_name: p.vendor_name,
      currency: p.currency || 'GNF',
    });
  };

  return (
    <div className={cn("py-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {seeAllLink && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary hover:text-primary/80"
            onClick={() => navigate(seeAllLink)}
          >
            {t('marketplace.seeAll') || 'Voir tout'}
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Products - Horizontal Scroll */}
      {isLoading ? (
        <HorizontalScrollRow showArrows={false} gap={12}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ScrollItem key={i} width={cardWidth}>
              <Skeleton className="h-52 rounded-xl w-full" />
            </ScrollItem>
          ))}
        </HorizontalScrollRow>
      ) : (
        <HorizontalScrollRow
          showArrows={!isMobile}
          arrowSize={isMobile ? 'sm' : 'md'}
          gap={isMobile ? 8 : 12}
          autoScroll={displayProducts.length > 3}
          autoScrollInterval={5000}
        >
          {displayProducts.map((p) => (
            <ScrollItem key={p.product_id} width={cardWidth} snapAlign="start">
              <TranslatedProductCard
                  id={p.product_id}
                  title={p.name}
                  price={p.price}
                  currency={p.currency || 'GNF'}
                  image={p.images || []}
                  rating={p.rating || 0}
                  reviewCount={0}
                  vendor=""
                  onBuy={() => navigate(`/product/${p.product_id}`)}
                  onAddToCart={() => handleAddToCart(p)}
                />
            </ScrollItem>
          ))}
        </HorizontalScrollRow>
      )}
    </div>
  );
}
