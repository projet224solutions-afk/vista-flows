/**
 * ProductImageCarousel - Composant Premium pour Marketplace
 * 224Solutions - Auto-défilement fluide avec animations premium
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ProductImageCarouselProps {
  images: string[];
  alt?: string;
  className?: string;
  autoPlayInterval?: number;
  showDots?: boolean;
}

export function ProductImageCarousel({
  images = [],
  alt = 'Product image',
  className,
  autoPlayInterval = 1800,
  showDots = true,
}: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Si pas d'images ou qu'une seule, pas de carousel
  if (!images || images.length === 0) {
    return (
      <div className={cn('relative w-full aspect-square bg-muted/30 rounded-lg overflow-hidden', className)}>
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          No image
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className={cn('relative w-full aspect-square bg-muted/10 rounded-lg overflow-hidden', className)}>
        <img
          src={images[0]}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Auto-défilement
  useEffect(() => {
    // Ne démarrer que si on a plusieurs images et pas en hover
    if (images.length <= 1 || isHovered) {
      return;
    }

    const interval = setInterval(() => {
      setDirection('next');
      setCurrentIndex((prev) => {
        const next = (prev + 1) % images.length;
        // Lazy load de l'image suivante
        setLoadedImages((loaded) => new Set(loaded).add(next));
        return next;
      });
    }, autoPlayInterval);

    return () => {
      clearInterval(interval);
    };
  }, [images.length, autoPlayInterval, isHovered]);

  // Cleanup des timeouts
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, []);

  // Gérer le hover
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Retourner à la première image
    if (currentIndex !== 0) {
      setDirection('prev');
      setCurrentIndex(0);
    }
  };

  // Gérer le touch (swipe)
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsHovered(true); // Pause l'auto-play
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      // Redémarrer l'auto-play après 2 secondes
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 2000);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setDirection('next');
      setCurrentIndex((prev) => {
        const next = (prev + 1) % images.length;
        setLoadedImages((loaded) => new Set(loaded).add(next));
        return next;
      });
    }

    if (isRightSwipe) {
      setDirection('prev');
      setCurrentIndex((prev) => {
        const next = (prev - 1 + images.length) % images.length;
        setLoadedImages((loaded) => new Set(loaded).add(next));
        return next;
      });
    }

    // Redémarrer l'auto-play après 2 secondes
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 2000);
  };

  // Navigation par dots
  const goToSlide = (index: number) => {
    setIsHovered(true);
    setDirection(index > currentIndex ? 'next' : 'prev');
    setCurrentIndex(index);
    setLoadedImages((loaded) => new Set(loaded).add(index));
    
    // Redémarrer après 3 secondes
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 3000);
  };

  // Preload des images au hover
  useEffect(() => {
    if (isHovered) {
      // Charger toutes les images
      images.forEach((_, index) => {
        setLoadedImages((loaded) => new Set(loaded).add(index));
      });
    }
  }, [isHovered, images]);

  return (
    <div
      className={cn(
        'relative w-full aspect-square bg-gradient-to-br from-muted/5 to-muted/20 rounded-lg overflow-hidden group',
        'cursor-pointer select-none',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Images Stack */}
      <div className="relative w-full h-full">
        {images.map((image, index) => {
          const isActive = index === currentIndex;
          const shouldLoad = loadedImages.has(index);

          return (
            <div
              key={index}
              className={cn(
                'absolute inset-0 transition-all duration-700 ease-out',
                isActive
                  ? 'opacity-100 scale-100 z-10'
                  : 'opacity-0 scale-95 z-0',
                direction === 'next' && isActive && 'animate-slide-in-right',
                direction === 'prev' && isActive && 'animate-slide-in-left'
              )}
            >
              {shouldLoad ? (
                <img
                  src={image}
                  alt={`${alt} ${index + 1}`}
                  className={cn(
                    'w-full h-full object-cover transition-transform duration-700',
                    'group-hover:scale-105'
                  )}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    // Fallback si l'image ne charge pas
                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted/10 to-muted/30 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay subtil au hover */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20'
        )}
      />

      {/* Indicateurs (Dots) */}
      {showDots && images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={cn(
                'transition-all duration-300 rounded-full',
                'hover:scale-110 active:scale-95',
                index === currentIndex
                  ? 'w-6 h-1.5 bg-white shadow-lg'
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Badge nombre d'images (discret) */}
      {images.length > 1 && (
        <div className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium">
            {currentIndex + 1}/{images.length}
          </div>
        </div>
      )}

      {/* Loading overlay pour la première image */}
      {!loadedImages.has(0) && (
        <div className="absolute inset-0 z-40 bg-muted/20 animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductImageCarousel;
