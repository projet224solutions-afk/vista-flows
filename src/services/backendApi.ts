/**
 * 🔗 BACKEND API CLIENT — Phase 5
 * Client centralisé pour appeler le backend Node.js
 * Gère : auth JWT, idempotency, retry, abort, erreurs métier structurées
 */

import { backendConfig } from '@/config/backend';
import { supabase } from '@/integrations/supabase/client';

const MAX_RETRIES = 2;
const TIMEOUT_MS = 15000;

interface BackendRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface BackendResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
  details?: unknown;
  meta?: { limit: number; offset: number; total: number };
}

/** Error codes métier retournés par le backend */
export type BackendErrorCode =
  | 'STOCK_INSUFFICIENT'
  | 'PRODUCT_LIMIT_REACHED'
  | 'IMAGE_LIMIT_REACHED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_PAYLOAD_MISMATCH'
  | 'ORDER_NOT_CANCELLABLE'
  | 'SUBSCRIPTION_EXPIRED'
  | 'ESCROW_FAILED'
  | 'VENDOR_INACTIVE'
  | 'SELF_PURCHASE'
  | 'TRANSITION_DENIED'
  | 'NEGATIVE_STOCK'
  | 'PROCESSING';

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Traduit un code d'erreur backend en message utilisateur
 */
export function translateBackendError(response: BackendResponse): string {
  const code = response.error_code;
  const fallback = response.error || 'Une erreur est survenue';

  const translations: Record<string, string> = {
    STOCK_INSUFFICIENT: 'Stock insuffisant pour un ou plusieurs produits',
    PRODUCT_LIMIT_REACHED: 'Limite de produits atteinte pour votre plan. Passez à un plan supérieur.',
    IMAGE_LIMIT_REACHED: 'Limite d\'images par produit atteinte pour votre plan.',
    IDEMPOTENCY_CONFLICT: 'Opération déjà en cours de traitement, veuillez patienter.',
    IDEMPOTENCY_PAYLOAD_MISMATCH: 'Conflit de données détecté. Rafraîchissez la page.',
    ORDER_NOT_CANCELLABLE: 'Cette commande ne peut plus être annulée.',
    SUBSCRIPTION_EXPIRED: 'Votre abonnement a expiré. Renouvelez pour continuer.',
    ESCROW_FAILED: 'Erreur lors de la mise en séquestre. Réessayez.',
    VENDOR_INACTIVE: 'Cette boutique est actuellement inactive.',
    SELF_PURCHASE: 'Vous ne pouvez pas commander dans votre propre boutique.',
    TRANSITION_DENIED: 'Ce changement de statut n\'est pas autorisé.',
    NEGATIVE_STOCK: 'Le stock résultant serait négatif.',
    PROCESSING: 'Opération en cours, veuillez patienter.',
  };

  return code ? (translations[code] || fallback) : fallback;
}

export async function backendFetch<T = unknown>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<BackendResponse<T>> {
  const { body, idempotencyKey, signal: externalSignal, ...rest } = options;

  if (
    !backendConfig.baseUrl &&
    typeof window !== 'undefined' &&
    !import.meta.env.DEV &&
    (/^capacitor:\/\//i.test(window.location.origin) || /^ionic:\/\//i.test(window.location.origin) || /^http:\/\/localhost(:\d+)?$/i.test(window.location.origin))
  ) {
    return {
      success: false,
      error: 'Configuration backend mobile manquante (VITE_BACKEND_MOBILE_URL).',
    };
  }

  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'Non authentifié', error_code: undefined };
  }

  const url = `${backendConfig.baseUrl}${path}`;
  const publicFallbackUrl = `${backendConfig.publicBaseUrl}${path}`;
  const rawHeaders = ((rest.headers as Record<string, string>) || {});
  const isRawBody =
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...rawHeaders,
  };

  if (!headers['Content-Type'] && (!isRawBody || typeof body === 'string')) {
    headers['Content-Type'] = 'application/json';
  }

  const requestBody = body == null
    ? undefined
    : isRawBody
      ? body
      : JSON.stringify(body);

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  async function executeRequest(requestUrl: string): Promise<BackendResponse<T>> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      if (externalSignal) {
        externalSignal.addEventListener('abort', () => controller.abort());
      }

      try {
        const response = await fetch(requestUrl, {
          ...rest,
          headers,
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const json = await response.json();

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: json.error || `Erreur ${response.status}`,
              error_code: json.error_code,
              details: json.details,
            };
          }

          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }

          return { success: false, error: json.error || 'Erreur serveur', error_code: json.error_code };
        }

        return json as BackendResponse<T>;
      } catch (err: any) {
        clearTimeout(timeout);

        if (err.name === 'AbortError') {
          return { success: false, error: 'Requête annulée ou timeout' };
        }

        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        return { success: false, error: 'Erreur réseau' };
      }
    }

    return { success: false, error: 'Échec après plusieurs tentatives' };
  }

  const primaryResult = await executeRequest(url);
  const isLocalApiRequest = import.meta.env.DEV && (backendConfig.baseUrl === '' || /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(backendConfig.baseUrl));
  const shouldTryPublicFallback =
    isLocalApiRequest &&
    primaryResult.success === false &&
    (primaryResult.error === 'Erreur réseau' || primaryResult.error === 'Requête annulée ou timeout') &&
    Boolean(backendConfig.publicBaseUrl) &&
    publicFallbackUrl !== url;

  if (shouldTryPublicFallback) {
    const fallbackResult = await executeRequest(publicFallbackUrl);
    if (fallbackResult.success || (fallbackResult.error && fallbackResult.error !== 'Erreur réseau')) {
      return fallbackResult;
    }

    return { success: false, error: 'Serveur backend local indisponible et API publique injoignable.' };
  }

  if (isLocalApiRequest && primaryResult.success === false && primaryResult.error === 'Erreur réseau') {
    return { success: false, error: 'Serveur backend local indisponible. Lancez npm run dev:backend.' };
  }

  return primaryResult;
}
