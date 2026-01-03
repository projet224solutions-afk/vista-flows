/**
 * Carte Universelle Marketplace - 224SOLUTIONS
 * Affiche produits, services professionnels et produits numériques de manière unifiée
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Star, 
  MapPin, 
  ShoppingCart, 
  Briefcase, 
  Download, 
  Clock,
  Phone,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceItem } from '@/hooks/useMarketplaceUniversal';
import { useState } from 'react';
import { usePriceConverter } from '@/hooks/usePriceConverter';
import { useTranslation } from '@/hooks/useTranslation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDisplayCurrency } from './CurrencyIndicator';

interface UniversalMarketplaceCardProps {
  item: MarketplaceItem;
  onAddToCart?: (itemId: string) => void;
  onViewDetails?: (itemId: string) => void;
  className?: string;
}

export function UniversalMarketplaceCard({
  item,
  onAddToCart,
  onViewDetails,
  className
}: UniversalMarketplaceCardProps) {
  const [imageError, setImageError] = useState(false);
  const { convert, userCurrency, loading: priceLoading } = usePriceConverter();
  const { t } = useTranslation();
  const { displayCurrency } = useDisplayCurrency();

  // Image par défaut selon le type
  const defaultImage = 
    item.item_type === 'professional_service' 
      ? 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400' // Service
      : item.item_type === 'digital_product'
      ? 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400' // Numérique
      : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'; // Produit

  const mainImage = item.images && item.images.length > 0 && !imageError && item.images[0]?.trim()
    ? item.images[0]
    : defaultImage;

  // Badge selon le type
  const getTypeBadge = () => {
    switch (item.item_type) {
      case 'professional_service':
        return (
          <Badge className="absolute top-2 left-2 bg-blue-500 text-white">
            <Briefcase className="w-3 h-3 mr-1" />
            {t('marketplace.card.badge.service') || 'Service Pro'}
          </Badge>
        );
      case 'digital_product':
        return (
          <Badge className="absolute top-2 left-2 bg-purple-500 text-white">
            <Download className="w-3 h-3 mr-1" />
            {t('marketplace.card.badge.digital') || 'Numérique'}
          </Badge>
        );
      default:
        return item.free_shipping ? (
          <Badge className="absolute top-2 left-2 bg-green-500 text-white">
            {t('marketplace.card.badge.freeShipping') || 'Livraison gratuite'}
          </Badge>
        ) : null;
    }
  };

  // Action principale selon le type
  const handleMainAction = () => {
    if (item.item_type === 'professional_service') {
      onViewDetails?.(item.id);
    } else {
      onAddToCart?.(item.id);
    }
  };

  const getMainActionLabel = () => {
    switch (item.item_type) {
      case 'professional_service':
        return t('marketplace.card.action.viewService') || 'Voir le service';
      case 'digital_product':
        return t('marketplace.card.action.buy') || 'Acheter';
      default:
        return t('marketplace.card.action.addToCart') || 'Ajouter au panier';
    }
  };

  const getMainActionIcon = () => {
    switch (item.item_type) {
      case 'professional_service':
        return <ExternalLink className="w-4 h-4" />;
      case 'digital_product':
        return <Download className="w-4 h-4" />;
      default:
        return <ShoppingCart className="w-4 h-4" />;
    }
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden hover:shadow-lg transition-all duration-300",
        "border border-border/50 hover:border-primary/50",
        className
      )}
      onClick={() => onViewDetails?.(item.id)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={mainImage}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={() => setImageError(true)}
        />
        
        {/* Badge type */}
        {getTypeBadge()}

        {/* Rating badge (si présent) */}
        {item.rating > 0 && (
          <Badge className="absolute top-2 right-2 bg-white/90 text-gray-900">
            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
            {item.rating.toFixed(1)}
          </Badge>
        )}

        {/* Prix barré (si promotion) */}
        {item.originalPrice && item.originalPrice > item.price && (
          <Badge className="absolute bottom-2 right-2 bg-red-500 text-white">
            -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        {/* Catégorie */}
        <p className="text-xs text-muted-foreground mb-1">
          {item.category_name}
        </p>

        {/* Nom */}
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {item.name}
        </h3>

        {/* Informations spécifiques au type */}
        {item.item_type === 'professional_service' && (
          <div className="space-y-1 mb-3">
            {item.address && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{item.address}</span>
              </div>
            )}
            {item.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{item.phone}</span>
              </div>
            )}
            {item.opening_hours && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{t('marketplace.card.hoursAvailable') || 'Horaires disponibles'}</span>
              </div>
            )}
          </div>
        )}

        {item.item_type === 'digital_product' && (
          <div className="space-y-1 mb-3">
            {item.file_size && (
              <p className="text-xs text-muted-foreground">
                {t('marketplace.card.fileSize') || 'Taille'}: {item.file_size}
              </p>
            )}
            {item.license_type && (
              <Badge variant="outline" className="text-xs">
                {item.license_type}
              </Badge>
            )}
          </div>
        )}

        {/* Prix */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {item.item_type === 'professional_service' && item.price === 0 ? (
              <span className="text-lg font-bold text-primary">
                {t('marketplace.card.onQuote') || 'Sur devis'}
              </span>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-primary">
                        {priceLoading ? (
                          `${item.price.toLocaleString('fr-GN')} GNF`
                        ) : displayCurrency !== 'GNF' ? (
                          convert(item.price, 'GNF').formatted
                        ) : (
                          `${item.price.toLocaleString('fr-GN')} GNF`
                        )}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {priceLoading || displayCurrency === 'GNF' ? (
                            `${item.originalPrice.toLocaleString('fr-GN')} GNF`
                          ) : (
                            convert(item.originalPrice, 'GNF').formatted
                          )}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {displayCurrency !== 'GNF' && !priceLoading && (
                      <div className="text-xs">
                        <p className="font-semibold">
                          {t('marketplace.card.originalPrice') || 'Prix original'}:
                        </p>
                        <p>{item.price.toLocaleString('fr-GN')} GNF</p>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <p className="text-muted-foreground line-through">
                            {item.originalPrice.toLocaleString('fr-GN')} GNF
                          </p>
                        )}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Vendeur et avis */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="line-clamp-1">
            {item.item_type === 'professional_service' 
              ? t('marketplace.card.by') || 'Par' 
              : t('marketplace.card.soldBy') || 'Vendu par'} {item.vendor_name}
          </span>
          {item.reviews_count > 0 && (
            <span>({item.reviews_count} {t('marketplace.card.reviews') || 'avis'})</span>
          )}
        </div>

        {/* Bouton d'action */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleMainAction();
          }}
          className="w-full"
          size="sm"
        >
          {getMainActionIcon()}
          <span className="ml-2">{getMainActionLabel()}</span>
        </Button>
      </CardContent>
    </Card>
  );
}
