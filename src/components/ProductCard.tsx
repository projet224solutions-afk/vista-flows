import { Star, ShoppingCart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: string;
  image: string;
  title: string;
  price: number;
  originalPrice?: number;
  vendor: string;
  rating: number;
  reviewCount: number;
  isPremium?: boolean;
  onBuy?: () => void;
  onContact?: () => void;
}

export default function ProductCard({
  image,
  title,
  price,
  originalPrice,
  vendor,
  rating,
  reviewCount,
  isPremium,
  onBuy,
  onContact
}: ProductCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-elegant transition-all duration-300 hover:scale-[1.02] group">
      <div className="relative">
        <img 
          src={image} 
          alt={title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isPremium && (
          <Badge className="absolute top-2 left-2 bg-vendeur-primary text-white">
            Premium
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 h-12">
          {title}
        </h3>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium ml-1">{rating}</span>
            <span className="text-xs text-muted-foreground ml-1">({reviewCount})</span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">{vendor}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-vendeur-primary">
              {price.toLocaleString()} FCFA
            </span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {originalPrice.toLocaleString()} FCFA
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={onBuy}
            className="flex-1 bg-vendeur-primary hover:bg-vendeur-primary/90"
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Acheter
          </Button>
          <Button 
            onClick={onContact}
            variant="outline" 
            size="sm"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}