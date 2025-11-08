/**
 * GESTIONNAIRE D'ERREURS API ROBUSTE
 * Gère les erreurs réseau, timeouts, et retry automatique
 * 224Solutions
 */

import { toast } from "sonner";

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: any) => void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wrapper pour exécuter une fonction avec retry et timeout
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000, // 30 secondes par défaut
    onRetry
  } = config;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Créer une promesse avec timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);

      return result;
    } catch (error: any) {
      lastError = error;

      // Ne pas retenter si c'est une erreur d'authentification ou de validation
      if (
        error?.message?.includes('JWT') ||
        error?.message?.includes('authentication') ||
        error?.message?.includes('permission') ||
        error?.code === 'PGRST301' || // RLS violation
        error?.code === '42501' // Insufficient privilege
      ) {
        throw new ApiError(
          'Erreur d\'authentification. Veuillez vous reconnecter.',
          error.code,
          error.status,
          error
        );
      }

      // Si c'est le dernier essai, lancer l'erreur
      if (attempt === maxRetries) {
        break;
      }

      // Appeler le callback de retry si fourni
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Attendre avant de réessayer avec backoff exponentiel
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Créer une erreur descriptive
  const errorMessage = getErrorMessage(lastError);
  throw new ApiError(
    errorMessage,
    lastError?.code,
    lastError?.status,
    lastError
  );
}

/**
 * Extraire un message d'erreur lisible
 */
function getErrorMessage(error: any): string {
  if (error?.message) {
    // Traduire les erreurs communes
    if (error.message.includes('timeout')) {
      return 'La requête a pris trop de temps. Vérifiez votre connexion.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Erreur de connexion réseau. Vérifiez votre connexion Internet.';
    }
    if (error.message.includes('Failed to fetch')) {
      return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    }
    return error.message;
  }

  return 'Une erreur inconnue est survenue. Veuillez réessayer.';
}

/**
 * Gérer et afficher les erreurs à l'utilisateur
 */
export function handleApiError(error: any, context?: string): void {
  console.error(`[API Error${context ? ` - ${context}` : ''}]:`, error);

  let message = getErrorMessage(error);
  
  if (context) {
    message = `${context}: ${message}`;
  }

  // Déterminer le type de toast selon la gravité
  if (
    error?.message?.includes('timeout') ||
    error?.message?.includes('network') ||
    error?.message?.includes('fetch')
  ) {
    toast.error(message, {
      description: 'Vérifiez votre connexion Internet',
      duration: 5000
    });
  } else if (error?.message?.includes('authentication')) {
    toast.error(message, {
      description: 'Vous devez vous reconnecter',
      duration: 5000,
      action: {
        label: 'Se reconnecter',
        onClick: () => {
          window.location.href = '/auth';
        }
      }
    });
  } else {
    toast.error(message, {
      duration: 4000
    });
  }
}

/**
 * Vérifier l'état de la connexion réseau
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Wrapper pour les appels Supabase avec gestion d'erreur automatique
 */
export async function supabaseCall<T>(
  call: () => Promise<{ data: T | null; error: any }>,
  config?: RetryConfig & { context?: string; silent?: boolean }
): Promise<T> {
  if (!isOnline()) {
    const error = new ApiError(
      'Vous êtes hors ligne. Vérifiez votre connexion Internet.',
      'OFFLINE'
    );
    if (!config?.silent) {
      handleApiError(error, config?.context);
    }
    throw error;
  }

  try {
    const result = await withRetry(call, {
      maxRetries: config?.maxRetries ?? 2,
      retryDelay: config?.retryDelay ?? 1000,
      timeout: config?.timeout ?? 30000,
      onRetry: config?.onRetry
    });

    if (result.error) {
      throw result.error;
    }

    if (result.data === null && !config?.silent) {
      console.warn('[Supabase] Received null data:', config?.context);
    }

    return result.data as T;
  } catch (error: any) {
    if (!config?.silent) {
      handleApiError(error, config?.context);
    }
    throw error;
  }
}
