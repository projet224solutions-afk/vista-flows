/**
 * MARKETPLACE PRODUCT CARD - Card Produit Premium
 * 224Solutions - Design Professionnel E-Commerce
 * 
 * Features:
 * - Images grandes et haute qualité
 * - Avis clients (étoiles + nombre)
 * - Informations vendeur
 * - Design moderne avec coins arrondis et ombres
 * - Lazy loading optimisé
 * - Responsive premium
 * - Conversion de devise automatique
 * - Interface traduite
 */

import { Star, ShoppingCart, MessageCircle, MapPin, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/shared/ShareButton";
import { usePriceConverter } from "@/hooks/usePriceConverter";
import { useTranslation } from "@/hooks/useTranslation";
import { useDisplayCurrency } from "./CurrencyIndicator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MarketplaceProductCardProps {
  id: string;
  image: string | string[];
  title: string;
  price: number;
  originalPrice?: number;
  vendor: string;
  vendorId?: string;
  vendorLocation?: string;
  vendorRating?: number;
  vendorRatingCount?: number;
  rating: number;
  reviewCount: number;
  isPremium?: boolean;
  stock?: number;
  category?: string;
  deliveryTime?: string;
  onBuy?: () => void;
  onAddToCart?: () => void;
  onContact?: () => void;
}

export function MarketplaceProductCard({
  id,
  image,
  title,
  price,
  originalPrice,
  vendor,
  vendorId,
  vendorLocation,
  vendorRating = 0,
  vendorRatingCount = 0,
  rating,
  reviewCount,
  isPremium,
  stock,
  category,
  deliveryTime,
  onBuy,
  onAddToCart,
  onContact
}: MarketplaceProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const images = Array.isArray(image) ? image : [image];
  const primaryImage = images[0] || '/placeholder.svg';
  
  // Hooks pour la conversion et traduction
  const { convert, loading: priceLoading } = usePriceConverter();
  const { t } = useTranslation();
  const { displayCurrency } = useDisplayCurrency();

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Formater le prix avec conversion automatique
  const formatPrice = (value: number) => {
    if (priceLoading) {
      return `${value.toLocaleString('fr-GN')} GNF`;
    }
    
    if (displayCurrency !== 'GNF') {
      return convert(value, 'GNF').formatted;
    }
    
    return `${value.toLocaleString('fr-GN')} GNF`;
  };
  
  // Prix original formaté (pour tooltip)
  const getOriginalGNF = (value: number) => `${value.toLocaleString('fr-GN')} GNF`;

  // Render stars pour les avis
  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const starSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={cn(
              starSize,
              i < fullStars 
                ? 'fill-yellow-400 text-yellow-400' 
                : i === fullStars && hasHalf
                  ? 'fill-yellow-400/50 text-yellow-400'
                  : 'text-muted-foreground/30'
            )} 
          />
        ))}
      </div>
    );
  };

  const handleCardClick = () => {
    if (onBuy) {
      onBuy();
    }
  };

  return (
    <Card 
      className="marketplace-card group overflow-hidden cursor-pointer" 
      onClick={handleCardClick}
    >
      {/* Image Container - Format Carré Grande */}
      <div className="marketplace-card-image-container">
        {/* Placeholder skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-secondary animate-pulse" />
        )}
        
        <img 
          src={imageError ? '/placeholder.svg' : primaryImage}
          alt={title}
          loading="lazy"
          className={cn(
            "marketplace-card-image",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
        />
        
        {/* Badge Premium */}
        {isPremium && (
          <div className="marketplace-card-badge">
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] font-semibold shadow-lg px-2 py-0.5">
              ★ Premium
            </Badge>
          </div>
        )}

        {/* Discount Badge */}
        {originalPrice && originalPrice > price && (
          <div className="marketplace-card-discount">
            <Badge 
              variant="destructive" 
              className="text-[10px] font-bold shadow-md"
            >
              -{Math.round((1 - price / originalPrice) * 100)}%
            </Badge>
          </div>
        )}

      </div>
      
      {/* Content */}
      <CardContent className="marketplace-card-content">
        {/* Category si existante */}
        {category && (
          <span className="text-[10px] text-primary font-medium uppercase tracking-wide mb-1 block">
            {category}
          </span>
        )}

        {/* Title - 1 ligne */}
        <h3 className="marketplace-card-title" title={title}>
          {title}
        </h3>
        
        {/* Rating / Avis clients */}
        <div className="marketplace-card-rating">
          {renderStars(rating)}
          <span className="text-[11px] font-medium text-foreground ml-1">{rating.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
        </div>
        
        {/* Vendor Info avec localisation */}
        <div className="marketplace-card-vendor">
          <span className="truncate flex-1">{vendor}</span>
          {vendorLocation && (
            <>
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate text-[10px]">{vendorLocation}</span>
            </>
          )}
        </div>

        {/* Temps de livraison si disponible */}
        {deliveryTime && (
          <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
            <Package className="w-2.5 h-2.5" />
            <span>{t('marketplace.delivery') || 'Livraison'}: {deliveryTime}</span>
          </div>
        )}
        
        {/* Price + Stock Status avec conversion automatique */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col">
                  <span className="marketplace-card-price">
                    {formatPrice(price)}
                  </span>
                  {originalPrice && originalPrice > price && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      {formatPrice(originalPrice)}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              {displayCurrency !== 'GNF' && !priceLoading && (
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold">{t('marketplace.card.originalPrice') || 'Prix original'}:</p>
                    <p>{getOriginalGNF(price)}</p>
                    {originalPrice && originalPrice > price && (
                      <p className="text-muted-foreground line-through">{getOriginalGNF(originalPrice)}</p>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {stock !== undefined && (
            <span className={cn(
              "text-[10px] font-semibold",
              stock === 0 ? "text-destructive" : "text-green-600"
            )}>
              {stock === 0 
                ? (t('marketplace.outOfStock') || 'Rupture de stock') 
                : (t('marketplace.inStock') || 'En stock')}
            </span>
          )}
        </div>
        
        {/* Actions - CTA compacts pour mobile */}
        <div className="marketplace-card-actions" onClick={(e) => e.stopPropagation()}>
          <Button 
            onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            className="flex-1 h-7 sm:h-8 text-[10px] sm:text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-2 sm:px-3"
            size="sm"
          >
            {t('common.view') || 'Voir'}
          </Button>
          <Button 
            onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
            variant="outline" 
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-border/60 hover:bg-accent hover:border-primary/30"
            title={t('marketplace.addToCart') || 'Ajouter au panier'}
          >
            <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Button>
          <Button 
            onClick={(e) => { e.stopPropagation(); onContact?.(); }}
            variant="outline" 
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-border/60 hover:bg-accent hover:border-primary/30"
            title={t('marketplace.contactVendor') || 'Contacter le vendeur'}
          >
            <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Button>
          <div onClick={handleShareClick}>
            <ShareButton
              title={title}
              text={`${t('marketplace.discover') || 'Découvrez'} ${title} - ${formatPrice(price)}`}
              url={`${window.location.origin}/product/${id}`}
              variant="outline"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 border-border/60 hover:bg-accent hover:border-primary/30"
              resourceType="product"
              resourceId={id}
              useShortUrl={true}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketplaceProductCard;
