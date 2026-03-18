/**
 * 🤖 SECTION DE RECOMMANDATIONS IA - Style Alibaba
 */

import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Clock, Gift, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import TranslatedProductCard from "./TranslatedProductCard";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface AIProduct {
  product_id: string;
  name: string;
  price: number;
  images: string[];
  rating: number | null;
  reason?: string;
  score?: number;
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
  const Icon = icons[icon];

  if (!isLoading && (!products || products.length === 0)) return null;

  const displayProducts = products?.slice(0, maxItems) || [];

  return (
    <div className={cn("py-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
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

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {displayProducts.map((p) => (
            <div key={p.product_id} className="relative">
              <TranslatedProductCard
                id={p.product_id}
                title={p.name}
                price={p.price}
                image={p.images || []}
                rating={p.rating || 0}
                reviewCount={0}
                vendor=""
                onBuy={() => navigate(`/product/${p.product_id}`)}
              />
              {showReason && p.reason && (
                <div className="absolute top-2 left-2 z-10">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/90 text-primary-foreground font-medium backdrop-blur-sm">
                    {p.reason}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
