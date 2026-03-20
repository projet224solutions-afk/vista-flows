/**
 * 🔐 CLIENT-SIDE HMAC REQUEST SIGNER
 * Signe toutes les requêtes de paiement avec HMAC-SHA256
 * 
 * Headers générés:
 * - X-API-KEY: identifiant client
 * - X-SIGNATURE: HMAC-SHA256(METHOD + PATH + BODY + TIMESTAMP + NONCE)
 * - X-TIMESTAMP: Date.now()
 * - X-NONCE: UUID unique
 * 
 * 224Solutions
 */

// API Key (publishable, safe for client)
const HMAC_API_KEY = import.meta.env.VITE_HMAC_API_KEY || "";
// Secret for signing (loaded from env)
const HMAC_SECRET = import.meta.env.VITE_HMAC_SECRET || "";

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
}

/**
 * 🔐 Sign a request for secure Edge Function calls
 * 
 * @param method - HTTP method (POST, GET, etc.)
 * @param path - URL path (e.g., /paypal-deposit)
 * @param body - Request body as string
 * @returns Headers to include in the request
 */
export async function signRequest(
  method: string,
  path: string,
  body: string = ""
): Promise<SignedHeaders> {
  const timestamp = Date.now().toString();
  const nonce = generateNonce();

  // Signature payload: METHOD + PATH + BODY + TIMESTAMP + NONCE
  const payload = `${method.toUpperCase()}${path}${body}${timestamp}${nonce}`;
  const signature = await hmacSha256(HMAC_SECRET, payload);

  return {
    "x-api-key": HMAC_API_KEY,
    "x-signature": signature,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
  };
}

/**
 * 🔐 Helper: invoke a Supabase Edge Function with HMAC signature
 */
export async function signedInvoke(
  functionName: string,
  body: Record<string, unknown>,
  supabaseClient: { functions: { invoke: (name: string, options: any) => Promise<any> } }
) {
  const bodyStr = JSON.stringify(body);
  const path = `/${functionName}`;
  const headers = await signRequest("POST", path, bodyStr);

  return supabaseClient.functions.invoke(functionName, {
    body,
    headers,
  });
}

/**
 * Check if HMAC signing is configured
 */
export function isHmacConfigured(): boolean {
  return Boolean(HMAC_API_KEY && HMAC_SECRET);
}
