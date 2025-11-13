import { Star, ShoppingCart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useState, useEffect } from "react";

interface ProductCardProps {
  id: string;
  image: string | string[]; // Support pour images multiples
  title: string;
  price: number;
  originalPrice?: number;
  vendor: string;
  vendorRating?: number;
  vendorRatingCount?: number;
  rating: number;
  reviewCount: number;
  isPremium?: boolean;
  onBuy?: () => void;
  onAddToCart?: () => void;
  onContact?: () => void;
}

export default function ProductCard({
  image,
  title,
  price,
  originalPrice,
  vendor,
  vendorRating = 0,
  vendorRatingCount = 0,
  rating,
  reviewCount,
  isPremium,
  onBuy,
  onAddToCart,
  onContact
}: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = Array.isArray(image) ? image : [image];

  // Auto-scroll pour le carrousel (toutes les 3 secondes)
  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [images.length]);

  return (
    <Card className="overflow-hidden hover:shadow-glow transition-all duration-500 hover:scale-[1.02] group bg-card border-border/50 animate-bounce-in shadow-card">
      <div className="relative">
        {images.length > 1 ? (
          <Carousel className="w-full" opts={{ loop: true }}>
            <CarouselContent>
              {images.map((img, index) => (
                <CarouselItem key={index}>
                  <div className="relative h-48 bg-gradient-to-br from-secondary to-muted rounded-t-2xl overflow-hidden flex items-center justify-center">
                    <img 
                      src={img} 
                      alt={`${title} - Image ${index + 1}`}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-white/95 border-primary/20 text-foreground hover:bg-primary hover:text-white shadow-md" />
            <CarouselNext className="right-2 bg-white/95 border-primary/20 text-foreground hover:bg-primary hover:text-white shadow-md" />
            
            {/* Pagination dots */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentImageIndex 
                      ? 'bg-primary w-6 shadow-glow' 
                      : 'bg-foreground/40 hover:bg-foreground/60'
                  }`}
                  aria-label={`Image ${index + 1}`}
                />
              ))}
            </div>
          </Carousel>
        ) : (
          <div className="relative h-48 bg-gradient-to-br from-secondary to-muted rounded-t-2xl overflow-hidden flex items-center justify-center">
            <img 
              src={images[0]} 
              alt={title}
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
            />
          </div>
        )}
        
        {isPremium && (
          <Badge className="absolute top-3 left-3 bg-primary text-white shadow-glow border-0 font-poppins font-semibold">
            Premium
          </Badge>
        )}
      </div>
      
      <CardContent className="p-5 space-y-3 bg-gradient-to-b from-white to-secondary/20">
        <h3 className="font-poppins font-bold text-foreground mb-2 line-clamp-2 h-12 text-base">
          {title}
        </h3>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium ml-1 text-foreground">{rating}</span>
            <span className="text-xs text-muted-foreground ml-1">({reviewCount})</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground font-inter">{vendor}</p>
          {vendorRating > 0 && (
            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-foreground">{vendorRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({vendorRatingCount})</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-rubik font-semibold text-vendeur-secondary price-text">
              {price.toLocaleString()} GNF
            </span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through font-inter">
                {originalPrice.toLocaleString()} GNF
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={onBuy}
            className="flex-1 bg-primary hover:bg-primary/90 text-white glow-on-hover font-inter font-medium border-0 shadow-lg"
            size="sm"
          >
            Acheter
          </Button>
          <Button 
            onClick={onAddToCart}
            variant="outline" 
            size="sm"
            className="border-primary/30 hover:bg-primary/10 hover:border-primary text-foreground"
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
          <Button 
            onClick={onContact}
            variant="outline" 
            size="sm"
            className="border-primary/30 hover:bg-primary/10 hover:border-primary text-foreground"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}