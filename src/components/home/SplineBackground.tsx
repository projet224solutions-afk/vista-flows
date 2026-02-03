/**
 * SPLINE BACKGROUND - 3D Globe Animation
 * 224Solutions - Immersive Hero Background
 * Uses Web Component for better compatibility
 */

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const SPLINE_SCENE_URL = 'https://prod.spline.design/h5xspcRA7yF54Tzy/scene.splinecode';
const SPLINE_VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.12.48/build/spline-viewer.js';

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Delay loading for better initial page performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Load Spline viewer script dynamically
  useEffect(() => {
    if (!shouldLoad || isMobile) return;

    // Check if script already loaded
    if (document.querySelector(`script[src="${SPLINE_VIEWER_SCRIPT}"]`)) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = SPLINE_VIEWER_SCRIPT;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.warn('Failed to load Spline viewer');
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup to avoid reloading
    };
  }, [shouldLoad, isMobile]);

  // Don't render 3D on mobile for battery/performance
  if (isMobile) {
    return (
      <div className={cn('absolute inset-0 z-0 overflow-hidden', className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
      </div>
    );
  }

  return (
    <div className={cn('absolute inset-0 z-0 overflow-hidden', className)} ref={containerRef}>
      {/* Loading state */}
      {!isLoaded && <LoadingFallback />}

      {/* Spline 3D Globe - Web Component */}
      {shouldLoad && (
        <div 
          className={cn(
            'absolute inset-0 opacity-0 transition-opacity duration-1000',
            isLoaded && 'opacity-30 sm:opacity-40'
          )}
        >
          {/* @ts-ignore - Web Component */}
          <spline-viewer 
            url={SPLINE_SCENE_URL}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}

      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background pointer-events-none" />
    </div>
  );
}

export default SplineBackground;
