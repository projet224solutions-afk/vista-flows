/**
 * LATEST PRODUCTS SECTION - Ultra Professional Design
 * 224Solutions - Products Grid with Premium Layout
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarketplaceGrid } from '@/components/marketplace/MarketplaceGrid';
import { MarketplaceProductCard } from '@/components/marketplace/MarketplaceProductCard';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string | string[];
  vendor_id?: string;
  vendor_name?: string;
  rating?: number;
  reviews_count?: number;
  is_hot?: boolean;
}

interface LatestProductsSectionProps {
  products: Product[];
  loading: boolean;
  onProductClick: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  className?: string;
}

export function LatestProductsSection({
  products,
  loading,
  onProductClick,
  onAddToCart,
  className,
}: LatestProductsSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className={cn('px-4 py-6 md:px-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-bold text-foreground">
            {t('home.latestProducts')}
          </h2>
          <p className="text-xs text-muted-foreground hidden md:block">
            Les dernières nouveautés du marketplace
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/marketplace')}
          className="gap-1 text-primary hover:text-primary hover:bg-primary/10 group"
        >
          {t('home.seeAll')}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-muted/50 rounded-full mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">{t('home.noProducts')}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/marketplace')}
            className="gap-2"
          >
            {t('home.exploreMarketplace')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <MarketplaceGrid>
          {products.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <MarketplaceProductCard
                id={product.id}
                image={
                  typeof product.images === 'string'
                    ? product.images
                    : product.images?.[0] ||
                      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop'
                }
                title={product.name}
                price={product.price}
                vendor={product.vendor_name}
                rating={product.rating}
                reviewCount={product.reviews_count}
                onBuy={() => onProductClick(product.id)}
                onAddToCart={() => onAddToCart(product)}
                onContact={() => navigate(`/messages?vendorId=${product.id}`)}
                isPremium={product.is_hot}
              />
            </div>
          ))}
        </MarketplaceGrid>
      )}
    </section>
  );
}

export default LatestProductsSection;
