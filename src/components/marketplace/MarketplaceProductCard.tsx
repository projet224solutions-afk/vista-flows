/**
 * MARKETPLACE PRODUCT CARD - Card Produit Professionnelle
 * 224Solutions - Standard International E-Commerce
 * 
 * Design moderne avec:
 * - Image carrée optimisée
 * - Coins arrondis (10px)
 * - Ombre légère professionnelle
 * - Lazy loading pour performance
 * - Texte clair et espacé
 */

import { Star, ShoppingCart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

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

  return (
    <Card className="marketplace-card group overflow-hidden">
      {/* Image Container - Format Carré */}
      <div className="marketplace-card-image-container">
        {/* Placeholder skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
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
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium shadow-md">
            Premium
          </Badge>
        )}

        {/* Discount Badge */}
        {originalPrice && originalPrice > price && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2 text-xs font-medium"
          >
            -{Math.round((1 - price / originalPrice) * 100)}%
          </Badge>
        )}
      </div>
      
      {/* Content */}
      <CardContent className="marketplace-card-content">
        {/* Title */}
        <h3 className="marketplace-card-title">
          {title}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({reviewCount})</span>
        </div>
        
        {/* Vendor Info */}
        <div className="flex items-center gap-1 mb-2">
          <p className="text-xs text-muted-foreground truncate flex-1">{vendor}</p>
          {vendorLocation && (
            <span className="text-xs text-muted-foreground/70 truncate">• {vendorLocation}</span>
          )}
        </div>
        
        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="marketplace-card-price">
            {formatPrice(price)} GNF
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-1.5">
          <Button 
            onClick={onBuy}
            className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            Acheter
          </Button>
          <Button 
            onClick={onAddToCart}
            variant="outline" 
            size="sm"
            className="h-8 w-8 p-0 border-border hover:bg-accent"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </Button>
          <Button 
            onClick={onContact}
            variant="outline" 
            size="sm"
            className="h-8 w-8 p-0 border-border hover:bg-accent"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper cn function for conditional classes
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default MarketplaceProductCard;
