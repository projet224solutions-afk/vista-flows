/**
 * 🔐 CLIENT-SIDE HMAC REQUEST SIGNER V2
 * Signe toutes les requêtes de paiement avec HMAC-SHA256
 * 
 * Headers générés:
 * - X-API-KEY: identifiant client (PayPal Client ID)
 * - X-SIGNATURE: HMAC-SHA256(METHOD + PATH + BODY + TIMESTAMP + NONCE)
 * - X-TIMESTAMP: Date.now()
 * - X-NONCE: UUID unique
 * - Idempotency-Key: UUID pour anti-double-transaction
 * 
 * 224Solutions
 */

import { supabase } from '@/integrations/supabase/client';

// API Key (publishable PayPal Client ID - from env only)
const HMAC_API_KEY = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

// Signing secret must never live in frontend code.
// Keep disabled client-side; signing must be handled server-side only.
const HMAC_SECRET = "";

const encoder = new TextEncoder();

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a unique nonce (UUID v4)
 */
function generateNonce(): string {
  return crypto.randomUUID();
}

export interface SignedHeaders {
  "x-api-key": string;
  "x-signature": string;
  "x-timestamp": string;
  "x-nonce": string;
  "idempotency-key"?: string;
}

/**
 * 🔐 Sign a request for secure Edge Function calls
 */
export async function signRequest(
  method: string,
  path: string,
  body: string = "",
  options?: { idempotencyKey?: string }
): Promise<SignedHeaders> {
  const timestamp = Date.now().toString();
  const nonce = generateNonce();

  const payload = `${method.toUpperCase()}${path}${body}${timestamp}${nonce}`;
  const signature = await hmacSha256(HMAC_SECRET, payload);

  const headers: SignedHeaders = {
    "x-api-key": HMAC_API_KEY,
    "x-signature": signature,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
  };

  if (options?.idempotencyKey) {
    headers["idempotency-key"] = options.idempotencyKey;
  }

  return headers;
}

/**
 * 🔐 Invoke a Supabase Edge Function with HMAC signature + idempotency
 * Anti-double-transaction: generates a unique idempotency key per call
 */
export async function signedInvoke(
  functionName: string,
  body: Record<string, unknown>,
  options?: { 
    idempotencyKey?: string;
    skipSigning?: boolean;
  }
) {
  const bodyStr = JSON.stringify(body);
  const path = `/${functionName}`;
  
  // If HMAC secret is not configured, invoke without signing
  if (!HMAC_SECRET || options?.skipSigning) {
    return supabase.functions.invoke(functionName, { body });
  }

  const idempotencyKey = options?.idempotencyKey || generateNonce();
  const headers = await signRequest("POST", path, bodyStr, { idempotencyKey });

  return supabase.functions.invoke(functionName, {
    body,
    headers: headers as unknown as Record<string, string>,
  });
}

/**
 * Check if HMAC signing is configured
 */
export function isHmacConfigured(): boolean {
  return Boolean(HMAC_API_KEY && HMAC_SECRET);
}

/**
 * Generate a unique idempotency key for a transaction
 * Format: txn_<type>_<userId_short>_<timestamp>_<random>
 */
export function generateIdempotencyKey(
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment',
  userId?: string
): string {
  const userPart = userId ? userId.substring(0, 8) : 'anon';
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `txn_${type}_${userPart}_${ts}_${rand}`;
}
