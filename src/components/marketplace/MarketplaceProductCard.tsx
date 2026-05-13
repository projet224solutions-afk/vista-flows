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

import { Star, ShoppingCart, MessageCircle, MapPin, Package, ExternalLink } from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { formatCurrency as formatCurrencyLib } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { usePriceConverter } from "@/hooks/usePriceConverter";
import { useTranslation } from "@/hooks/useTranslation";
import { useDisplayCurrency } from "./CurrencyIndicator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CertifiedIcon } from "@/components/vendor/CertifiedVendorBadge";
import { useVendorCertificationCached } from "@/hooks/useVendorCertificationCache";
import { ProductImageCarousel } from "./ProductImageCarousel";

interface MarketplaceProductCardProps {
  id: string;
  image: string | string[];
  promotionalVideos?: string[];
  title: string;
  price: number;
  originalPrice?: number;
  currency?: string; // Devise du produit (USD, EUR, GNF, etc.)
  vendor: string;
  vendorId?: string;
  vendorPublicId?: string; // public_id du vendeur (VND0001, etc.)
  vendorLocation?: string;
  vendorRating?: number;
  vendorRatingCount?: number;
  rating: number;
  reviewCount: number;
  isPremium?: boolean;
  stock?: number;
  category?: string;
  itemType?: 'product' | 'digital_product' | 'professional_service';
  productMode?: 'direct' | 'affiliate';
  affiliateUrl?: string;
  deliveryTime?: string;
  onBuy?: () => void;
  onAddToCart?: () => void;
  onContact?: () => void;
}

export function MarketplaceProductCard({
  id,
  image,
  promotionalVideos = [],
  title,
  price,
  originalPrice,
  currency = 'GNF', // Devise par défaut
  vendor,
  vendorId,
  vendorPublicId,
  vendorLocation,
  _vendorRating = 0,
  _vendorRatingCount = 0,
  rating,
  reviewCount,
  isPremium,
  stock,
  category,
  itemType,
  productMode,
  affiliateUrl,
  deliveryTime,
  onBuy,
  onAddToCart,
  onContact
}: MarketplaceProductCardProps) {
  const [_imageLoaded, _setImageLoaded] = useState(false);
  const [_imageError, _setImageError] = useState(false);
  const images = Array.isArray(image) ? image : [image];
  const _primaryImage = images[0] || '/placeholder.svg';

  // Hooks pour la conversion et traduction
  const { convert, loading: priceLoading } = usePriceConverter();
  const { t } = useTranslation();
  const { _displayCurrency } = useDisplayCurrency();

  // Hook pour certification vendeur (cache global)
  const { isCertified } = useVendorCertificationCached(vendorId);

  const normalizedCategory = (category || '').trim().toLowerCase();
  const isAffiliateAirTicket =
    productMode === 'affiliate' &&
    (!!affiliateUrl || price === 0) &&
    /billet[_\s-]*avion/.test(normalizedCategory);
  const isPartnerProduct = productMode === 'affiliate';
  const usesDirectCheckout = itemType === 'digital_product' || isPartnerProduct;
  const primaryActionLabel = isAffiliateAirTicket
    ? 'Réserver'
    : isPartnerProduct
      ? "Voir l'offre"
      : t('common.view') || 'Voir';

  // Calcule le prix une seule fois (évite double appel convert)
  const priceResult = !priceLoading ? convert(price, currency) : null;
  const originalPriceResult = !priceLoading && originalPrice ? convert(originalPrice, currency) : null;

  const formatPrice = (value: number) => {
    if (priceLoading) return '—';
    if (value === price && priceResult) return priceResult.formatted;
    if (value === originalPrice && originalPriceResult) return originalPriceResult.formatted;
    return convert(value, currency).formatted;
  };

  // Prix original formaté (pour tooltip)
  const getOriginalPrice = (value: number) => formatCurrencyLib(value, currency);

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
      {/* Image Container - Format Carré Grande avec Carousel */}
      <div className="relative">
        <ProductImageCarousel
          images={images}
          videos={promotionalVideos}
          alt={title}
          className="marketplace-card-image-container"
        />

        {/* Badge Premium */}
        {isPremium && (
          <div className="marketplace-card-badge">
             <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold shadow-lg px-2 py-0.5">
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

        {/* Favorite Button */}
        <div className="absolute top-1.5 right-1.5 z-20" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton productId={id} size="sm" />
        </div>

      </div>

      {/* Content */}
      <CardContent className="marketplace-card-content">
        {/* Type de produit si existant */}
        {category && (
          <span className="text-[10px] text-primary font-medium uppercase tracking-wide mb-0.5 block truncate">
            {category}
          </span>
        )}

        {/* Title */}
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
          <span className="truncate flex-1 flex items-center gap-1">
            {vendorPublicId && (
              <span className="text-primary font-semibold">{vendorPublicId}</span>
            )}
            {vendorPublicId && <span className="text-muted-foreground">•</span>}
            {vendor}
            {isCertified && (
              <CertifiedIcon status="CERTIFIE" className="w-3.5 h-3.5" />
            )}
          </span>
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
        <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
          {!isAffiliateAirTicket && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                    <span className="marketplace-card-price">
                      {priceLoading ? (
                        <span className="inline-block w-16 h-4 bg-muted animate-pulse rounded" />
                      ) : (
                        formatPrice(price)
                      )}
                    </span>
                    {originalPrice && originalPrice > price && (
                      <span className="text-[11px] text-muted-foreground line-through">
                        {priceLoading ? '' : formatPrice(originalPrice)}
                      </span>
                    )}
                    {/* Indicateur devise source quand pas de taux backend */}
                    {!priceLoading && priceResult && !priceResult.wasConverted && priceResult.originalCurrency !== 'GNF' && (
                      <span className="text-[9px] text-muted-foreground/70 truncate">
                        {priceResult.originalCurrency}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                {!priceLoading && priceResult && (
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      {priceResult.wasConverted ? (
                        <>
                          <p className="font-semibold">{t('marketplace.card.originalPrice') || 'Prix original'}:</p>
                          <p>{priceResult.originalFormatted}</p>
                          {originalPriceResult?.wasConverted && originalPrice && originalPrice > price && (
                            <p className="text-muted-foreground line-through">{originalPriceResult.originalFormatted}</p>
                          )}
                          <p className="text-muted-foreground/70 text-[10px]">
                            Taux: 1 {priceResult.originalCurrency} = {priceResult.rate.toFixed(4)} {priceResult.userCurrency}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">{t('marketplace.card.originalPrice') || 'Prix original'}:</p>
                          <p>{getOriginalPrice(price)}</p>
                          <p className="text-muted-foreground/70 text-[10px]">
                            Taux non disponible — prix affiché en {priceResult.originalCurrency}
                          </p>
                        </>
                      )}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {isAffiliateAirTicket && (
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <span className="marketplace-card-price text-orange-600">
                Prix partenaire
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                Disponibilités en temps réel
              </span>
            </div>
          )}
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
            className={cn(
              "flex-1 h-7 sm:h-8 text-[10px] sm:text-xs font-semibold border border-transparent shadow-sm px-2 sm:px-3 focus-visible:ring-1 focus-visible:ring-offset-0",
              isAffiliateAirTicket
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-primary text-primary-foreground hover:bg-background hover:text-foreground hover:border-border"
            )}
            size="sm"
          >
            {isPartnerProduct && <ExternalLink className="w-3 h-3 mr-1" />}
            {primaryActionLabel}
          </Button>
          {!usesDirectCheckout && (
            <Button
              onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
              variant="outline"
              size="sm"
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-border/60 hover:bg-accent hover:border-primary/30"
              title={t('marketplace.addToCart') || 'Ajouter au panier'}
            >
              <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          )}
          <Button
            onClick={(e) => { e.stopPropagation(); onContact?.(); }}
            variant="outline"
            size="sm"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-border/60 hover:bg-accent hover:border-primary/30"
            title={t('marketplace.contactVendor') || 'Contacter le vendeur'}
          >
            <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketplaceProductCard;
