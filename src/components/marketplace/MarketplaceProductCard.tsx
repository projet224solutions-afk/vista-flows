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
 */

import { Star, ShoppingCart, MessageCircle, MapPin, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MarketplaceProductCardProps {
  id: string;
  image: string | string[];
  title: string;
  price: number;
  originalPrice?: number;
  vendor: string;
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
  image,
  title,
  price,
  originalPrice,
  vendor,
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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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

  return (
    <Card className="marketplace-card group overflow-hidden">
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
            <span>Livraison: {deliveryTime}</span>
          </div>
        )}
        
        {/* Price + Stock Status */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="marketplace-card-price">
              {formatPrice(price)} GNF
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[11px] text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          {stock !== undefined && (
            <span className={cn(
              "text-[10px] font-semibold",
              stock === 0 ? "text-destructive" : "text-green-600"
            )}>
              {stock === 0 ? "Rupture de stock" : "En stock"}
            </span>
          )}
        </div>
        
        {/* Actions - CTA modernisés */}
        <div className="marketplace-card-actions">
          <Button 
            onClick={onBuy}
            className="flex-1 h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            size="sm"
          >
            Voir
          </Button>
          <Button 
            onClick={onAddToCart}
            variant="outline" 
            size="sm"
            className="h-8 w-8 p-0 border-border/60 hover:bg-accent hover:border-primary/30"
            title="Ajouter au panier"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </Button>
          <Button 
            onClick={onContact}
            variant="outline" 
            size="sm"
            className="h-8 w-8 p-0 border-border/60 hover:bg-accent hover:border-primary/30"
            title="Contacter le vendeur"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketplaceProductCard;
