/**
 * 🔗 BACKEND API CLIENT
 * Client centralisé pour appeler le backend Node.js Phase 4+
 * Gère : auth JWT, idempotency, retry, abort
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

interface BackendResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  meta?: { limit: number; offset: number; total: number };
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export async function backendFetch<T = unknown>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<BackendResponse<T>> {
  const { body, idempotencyKey, signal: externalSignal, ...rest } = options;

  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'Non authentifié' };
  }

  const url = `${backendConfig.baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...((rest.headers as Record<string, string>) || {}),
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Combine external abort signal
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const json = await response.json();

      if (!response.ok) {
        // Don't retry 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          return { success: false, error: json.error || `Erreur ${response.status}`, details: json.details };
        }
        // Retry 5xx on non-last attempt
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return { success: false, error: json.error || 'Erreur serveur' };
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
