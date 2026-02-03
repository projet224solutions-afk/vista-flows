/**
 * SPLINE BACKGROUND - 3D Globe Animation
 * 224Solutions - Immersive Hero Background
 * Lazy loaded for optimal performance
 */

import { Suspense, lazy, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy load Spline component for performance
const Spline = lazy(() => import('@splinetool/react-spline'));

const SPLINE_SCENE_URL = 'https://prod.spline.design/h5xspcRA7yF54Tzy/scene.splinecode';

interface SplineBackgroundProps {
  className?: string;
}

// Loading fallback with animated gradient
function LoadingFallback() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 animate-pulse" />
  );
}

export function SplineBackground({ className }: SplineBackgroundProps) {
  const isMobile = useIsMobile();
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Delay loading for better initial page performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 1500); // Load after 1.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // Don't render on mobile for battery/performance
  if (isMobile) {
    return (
      <div className={cn(
        'absolute inset-0 z-0 overflow-hidden',
        className
      )}>
        {/* Static gradient fallback for mobile */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
      </div>
    );
  }

  // Error fallback
  if (hasError) {
    return (
      <div className={cn(
        'absolute inset-0 z-0 overflow-hidden',
        className
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>
    );
  }

  return (
    <div className={cn(
      'absolute inset-0 z-0 overflow-hidden',
      className
    )}>
      {/* Spline 3D Globe */}
      {shouldLoad && (
        <Suspense fallback={<LoadingFallback />}>
          <div className="absolute inset-0 opacity-30 sm:opacity-40">
            <Spline
              scene={SPLINE_SCENE_URL}
              onError={() => setHasError(true)}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </Suspense>
      )}

      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background pointer-events-none" />
    </div>
  );
}

export default SplineBackground;
