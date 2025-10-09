/**
 * Utilitaires pour la gestion sécurisée des erreurs TypeScript
 * Remplace l'utilisation de 'any' dans les catch blocks
 */

/**
 * Vérifie si une valeur est une instance d'Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extrait le message d'erreur de manière sécurisée
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'Une erreur est survenue'): string {
  if (isError(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return defaultMessage;
}

/**
 * Crée un objet d'erreur standardisé pour les API
 */
export function createErrorResponse(error: unknown): { message: string; details?: string } {
  const message = getErrorMessage(error);
  
  return {
    message,
    details: isError(error) ? error.stack : undefined
  };
}

/**
 * Type guard pour les erreurs Supabase
 */
export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/**
 * Gère les erreurs Supabase de manière sécurisée
 */
export function handleSupabaseError(error: unknown, defaultMessage: string = 'Erreur de base de données'): string {
  if (isSupabaseError(error)) {
    return error.message || defaultMessage;
  }
  
  return getErrorMessage(error, defaultMessage);
}

/**
 * Utilitaire pour logger les erreurs en production
 */
export function logError(error: unknown, context: string): void {
  const message = getErrorMessage(error);
  
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  } else {
    // En production, on peut envoyer vers un service de logging
    console.error(`[${context}] ${message}`);
  }
}
