/**
 * 💳 DJOMY SERVICE - Centralisé côté Node.js
 *
 * Responsabilités :
 *  - Gestion du token OAuth2 avec cache en mémoire et auto-renouvellement
 *  - Initiation des paiements mobile money (OM, MTN, KULU, CARD, MOMO)
 *  - Vérification secondaire d'une transaction via l'API Djomy
 *
 * Migré depuis l'Edge Function payment-core / djomy-secure-webhook
 */

import { logger } from '../config/logger.js';

interface DjomyTokenData {
  accessToken: string;
  expiresAt: number; // timestamp ms
}

export interface DjomyPaymentPayload {
  paymentMethod: 'OM' | 'MTN' | 'KULU' | 'CARD' | 'MOMO';
  payerIdentifier: string;
  amount: number;
  countryCode?: string;
  merchantPaymentReference: string;
  description: string;
}

export interface DjomyPaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  data?: unknown;
}

// ── Token cache en mémoire (singleton de processus) ──
const tokenCache: Record<string, DjomyTokenData> = {};

function getBaseUrl(): string {
  return process.env.DJOMY_SANDBOX === 'true'
    ? 'https://sandbox-api.djomy.africa'
    : 'https://api.djomy.africa';
}

async function generateToken(): Promise<DjomyTokenData> {
  const clientId = process.env.DJOMY_CLIENT_ID?.trim();
  const clientSecret = process.env.DJOMY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('DJOMY_CLIENT_ID / DJOMY_CLIENT_SECRET non configurés');
  }

  const baseUrl = getBaseUrl();
  logger.info('[Djomy] Generating new OAuth2 token');

  const resp = await fetch(`${baseUrl}/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': '224solutions-backend/1.0',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  const responseText = await resp.text();

  if (!resp.ok) {
    throw new Error(`Djomy token error ${resp.status}: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  const expiresIn: number = data.expires_in || 3600;
  const tokenData: DjomyTokenData = {
    accessToken: data.access_token || data.accessToken,
    expiresAt: Date.now() + (expiresIn - 300) * 1000, // -5 min de marge
  };

  tokenCache['main'] = tokenData;
  logger.info('[Djomy] Token generated', { expiresAt: new Date(tokenData.expiresAt).toISOString() });
  return tokenData;
}

async function getAccessToken(): Promise<string> {
  const cached = tokenCache['main'];
  if (cached && cached.expiresAt > Date.now()) {
    const remainingMin = Math.round((cached.expiresAt - Date.now()) / 60000);
    logger.debug(`[Djomy] Using cached token (${remainingMin} min remaining)`);
    return cached.accessToken;
  }
  const t = await generateToken();
  return t.accessToken;
}

/**
 * Initie un paiement mobile money via l'API Djomy.
 * Gère automatiquement le renouvellement du token en cas de 401.
 */
export async function initiateDjomyPayment(
  payload: DjomyPaymentPayload
): Promise<DjomyPaymentResult> {
  const baseUrl = getBaseUrl();

  const doRequest = async (token: string): Promise<Response> => {
    return fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': '224solutions-backend/1.0',
      },
      body: JSON.stringify({
        paymentMethod: payload.paymentMethod,
        payerIdentifier: payload.payerIdentifier.replace(/\s/g, ''),
        amount: payload.amount,
        countryCode: payload.countryCode || 'GN',
        merchantPaymentReference: payload.merchantPaymentReference,
        description: payload.description,
      }),
    });
  };

  try {
    let token = await getAccessToken();
    let resp = await doRequest(token);

    // Si token expiré, renouveler et réessayer une fois
    if (resp.status === 401 || resp.status === 403) {
      logger.warn('[Djomy] Token rejected — clearing cache and retrying');
      delete tokenCache['main'];
      token = await getAccessToken();
      resp = await doRequest(token);
    }

    const responseText = await resp.text();
    logger.debug('[Djomy] Payment response', { status: resp.status, body: responseText.slice(0, 200) });

    if (!resp.ok) {
      return { success: false, error: `${resp.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    return {
      success: true,
      transactionId: data.transactionId || data.id,
      data,
    };
  } catch (err: any) {
    logger.error(`[Djomy] Payment initiation exception: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Vérification secondaire d'une transaction Djomy via l'API.
 * Utilisé par le webhook pour double-vérification.
 */
export async function verifyDjomyTransaction(
  transactionId: string
): Promise<{ verified: boolean; status: string; data: unknown }> {
  const baseUrl = getBaseUrl();

  try {
    const token = await getAccessToken();
    const resp = await fetch(`${baseUrl}/v1/payments/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': '224solutions-backend/1.0',
      },
    });

    const data = await resp.json();
    return {
      verified: resp.ok && data.status === 'SUCCESS',
      status: data.status || 'UNKNOWN',
      data,
    };
  } catch (err: any) {
    logger.error(`[Djomy] Transaction verification error: ${err.message}`);
    return { verified: false, status: 'ERROR', data: { error: err.message } };
  }
}
