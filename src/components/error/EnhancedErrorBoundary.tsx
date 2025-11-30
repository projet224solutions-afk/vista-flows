/**
 * ENHANCED ERROR BOUNDARY
 * 224Solutions - Capture et gestion élégante des erreurs React
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { secureLogger } from '@/services/SecureLogger';

/**
 * Types
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'app';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * Composant fallback par défaut
 */
const DefaultFallback: React.FC<{
  error: Error;
  resetError: () => void;
  level: 'page' | 'component' | 'app';
}> = ({ error, resetError, level }) => {
  const isAppLevel = level === 'app';
  const isPageLevel = level === 'page';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isAppLevel && 'Application Error'}
            {isPageLevel && 'Page Error'}
            {!isAppLevel && !isPageLevel && 'Component Error'}
          </AlertTitle>
          <AlertDescription>
            {isAppLevel && 'Une erreur critique est survenue. Veuillez rafraîchir la page.'}
            {isPageLevel && 'Cette page a rencontré un problème. Veuillez réessayer.'}
            {!isAppLevel && !isPageLevel && 'Ce composant a rencontré un problème.'}
          </AlertDescription>
        </Alert>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              Erreur (développement uniquement):
            </h3>
            <pre className="text-xs text-red-700 overflow-auto max-h-40">
              {error.message}
            </pre>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer">
                  Stack trace
                </summary>
                <pre className="text-xs text-red-600 overflow-auto max-h-60 mt-2">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={resetError}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>

          {(isAppLevel || isPageLevel) && (
            <Button
              onClick={() => window.location.href = '/'}
              variant="default"
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Retour Accueil
            </Button>
          )}
        </div>

        <p className="text-sm text-gray-500 text-center mt-4">
          Si le problème persiste, contactez le support technique.
        </p>
      </div>
    </div>
  );
};

/**
 * Enhanced Error Boundary Component
 */
class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorResetTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  /**
   * Capture erreur React
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Gérer erreur capturée
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Incrémenter compteur erreurs
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Logger de manière sécurisée
    secureLogger.error(
      'system',
      `React Error Boundary: ${error.message}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        level: this.props.level || 'component',
        errorCount: this.state.errorCount + 1
      }
    );

    // Callback personnalisé
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Envoyer à monitoring service
    this.reportToMonitoring(error, errorInfo);

    // Auto-reset si erreur répétée (possible loop)
    if (this.state.errorCount >= 3) {
      console.warn('⚠️ Trop d\'erreurs détectées, redirection...');
      this.redirectToSafePage();
    }
  }

  /**
   * Reporter à monitoring service
   */
  private async reportToMonitoring(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const { monitoringService } = await import('@/services/MonitoringService');
      
      await monitoringService.logError(
        'critical',
        'react_error',
        `React Error Boundary: ${error.message}`,
        {
          componentStack: errorInfo.componentStack,
          stack: error.stack,
          level: this.props.level || 'component',
          errorCount: this.state.errorCount
        }
      );
    } catch (err) {
      console.error('Erreur report monitoring:', err);
    }
  }

  /**
   * Rediriger vers page sûre
   */
  private redirectToSafePage(): void {
    // Nettoyer state local
    try {
      localStorage.setItem('lastError', JSON.stringify({
        message: this.state.error?.message,
        timestamp: new Date().toISOString()
      }));
    } catch {
      // Ignorer si localStorage indisponible
    }

    // Rediriger vers page d'accueil
    window.location.href = '/';
  }

  /**
   * Réinitialiser erreur
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Clear timeout précédent
    if (this.errorResetTimeout) {
      clearTimeout(this.errorResetTimeout);
    }

    // Reset compteur après 10 secondes
    this.errorResetTimeout = setTimeout(() => {
      this.setState({ errorCount: 0 });
    }, 10000);
  };

  /**
   * Nettoyer avant unmount
   */
  componentWillUnmount(): void {
    if (this.errorResetTimeout) {
      clearTimeout(this.errorResetTimeout);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback par défaut
      return (
        <DefaultFallback
          error={this.state.error}
          resetError={this.resetError}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * HOC pour wrapper composant avec Error Boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <EnhancedErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </EnhancedErrorBoundary>
    );
  };
}

/**
 * Hook pour capturer erreurs asynchrones
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const handleError = React.useCallback((err: Error) => {
    secureLogger.error('system', `Async error: ${err.message}`, err);
    setError(err);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { handleError, resetError };
}

/**
 * Fonction utilitaire pour try-catch élégant
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<[T | null, Error | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    secureLogger.error(
      'system',
      errorMessage || `Error in tryCatch: ${err.message}`,
      err
    );

    return [null, err];
  }
}

/**
 * Fonction utilitaire pour try-catch synchrone
 */
export function tryCatchSync<T>(
  fn: () => T,
  errorMessage?: string
): [T | null, Error | null] {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    secureLogger.error(
      'system',
      errorMessage || `Error in tryCatchSync: ${err.message}`,
      err
    );

    return [null, err];
  }
}

export default EnhancedErrorBoundary;
