/**
 * COMPOSANT LAZY LOADING OPTIMISÉ
 * Chargement différé des composants lourds
 * 224Solutions - Lazy Loading System
 */

import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface LazyComponentProps {
  fallback?: ReactNode;
  errorBoundary?: boolean;
  preload?: boolean;
}

// Skeleton de chargement par défaut
const DefaultFallback = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

// Spinner de chargement
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-2 text-sm text-gray-600">Chargement...</span>
  </div>
);

// Boundary d'erreur
class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ LazyComponent Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-8 text-red-600">
          <div className="text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-sm">Erreur de chargement</div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC pour créer des composants lazy
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentProps = {}
) {
  const LazyComponent = lazy(importFn);
  
  return function WrappedLazyComponent(props: P) {
    const { fallback = <DefaultFallback />, errorBoundary = true } = options;
    
    const Component = (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );

    if (errorBoundary) {
      return <ErrorBoundary fallback={fallback}>{Component}</ErrorBoundary>;
    }

    return Component;
  };
}

/**
 * Composant de lazy loading générique
 */
export function LazyComponent<P extends object>({
  importFn,
  fallback,
  errorBoundary = true,
  ...props
}: {
  importFn: () => Promise<{ default: ComponentType<P> }>;
  fallback?: ReactNode;
  errorBoundary?: boolean;
} & P) {
  const LazyComponent = lazy(importFn);
  
  const Component = (
    <Suspense fallback={fallback || <DefaultFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  if (errorBoundary) {
    return <ErrorBoundary fallback={fallback}>{Component}</ErrorBoundary>;
  }

  return Component;
}

/**
 * Hook pour le preloading des composants
 */
export function usePreload(importFn: () => Promise<any>) {
  const [preloaded, setPreloaded] = React.useState(false);
  
  React.useEffect(() => {
    let mounted = true;
    
    const preload = async () => {
      try {
        await importFn();
        if (mounted) {
          setPreloaded(true);
        }
      } catch (error) {
        console.error('❌ Preload error:', error);
      }
    };

    // Preload après un délai pour ne pas bloquer le rendu initial
    const timer = setTimeout(preload, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [importFn]);

  return preloaded;
}

/**
 * Composant de lazy loading avec preloading
 */
export function LazyComponentWithPreload<P extends object>({
  importFn,
  preloadDelay = 1000,
  fallback,
  ...props
}: {
  importFn: () => Promise<{ default: ComponentType<P> }>;
  preloadDelay?: number;
  fallback?: ReactNode;
} & P) {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, preloadDelay);
    
    return () => clearTimeout(timer);
  }, [preloadDelay]);

  if (!shouldLoad) {
    return <>{fallback || <DefaultFallback />}</>;
  }

  return <LazyComponent importFn={importFn} fallback={fallback} {...props} />;
}

/**
 * Composant de lazy loading avec intersection observer
 */
export function LazyComponentWithIntersection<P extends object>({
  importFn,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}: {
  importFn: () => Promise<{ default: ComponentType<P> }>;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
} & P) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  if (!isVisible) {
    return (
      <div ref={ref} className="min-h-[200px]">
        {fallback || <DefaultFallback />}
      </div>
    );
  }

  return <LazyComponent importFn={importFn} fallback={fallback} {...props} />;
}

// Export des composants de fallback pour réutilisation
export { DefaultFallback, LoadingSpinner, ErrorBoundary };
